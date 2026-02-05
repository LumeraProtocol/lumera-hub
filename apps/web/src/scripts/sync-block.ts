/* eslint-disable @typescript-eslint/no-explicit-any */
// src/scripts/sync-block.ts
import { Repository } from "typeorm";
import { sha256 } from "@cosmjs/crypto";
import { toHex } from "@cosmjs/encoding";

import { getDataSource } from '@/lib/data-source';
import { Block } from '@/entities/Block';
import { Transaction } from '@/entities/Transaction';
import { Address } from '@/entities/Address';
import * as instance from '@/utils/api';
import { delay } from '@/utils/helpers';

let isSyncing = false;

const getTxHashFromBase64 = (rawTxBase64: string) => {
  const txBytes = Buffer.from(rawTxBase64, 'base64');
  return toHex(sha256(txBytes)).toUpperCase();
}

const syncAndSaveTransaction = async (
  transactionRepo: Repository<Transaction>,
  addressRepo: Repository<Address>,
  txs: string[],
  blockHeight: number,
) => {
  try {
    transactionRepo.createQueryBuilder().delete().where('height = :blockHeight', { blockHeight }).execute();
    for (const val of txs) {
      const { data } = await instance.get(`/cosmos/tx/v1beta1/txs/${val}`);
      if (!data) {
        return;
      }
      const tx = data.tx;
      const response = data.tx_response;

      const creator = tx.body.messages[0].creator || tx.body.messages[0].delegator_address;
      const entity: any = {
        tx_hash: response.txhash,
        height: response.height,
        code: response.code,
        codespace: response.codespace,
        gas_wanted: Number(response.gas_wanted),
        gas_used: Number(response.gas_used),
        timestamp: response.timestamp,
        memo: tx.body.memo,
        timeout_height: tx.body.timeout_height,
        message_type: tx.body.messages[0]["@type"],
        creator,
      };

      if (entity.message_type.includes('MsgRequestAction')) {
        const msg = tx.body.messages[0];
        entity.action_type = msg.actionType;
        entity.price = msg.price;
        entity.expiration_time = msg.expirationTime;
        entity.file_size_kbs = Number(msg.fileSizeKbs);
        entity.rq_ids_ic = Number(msg.rq_ids_ic);

        if (msg.metadata) {
          entity.metadata_json = msg.metadata;
          try {
            const meta = JSON.parse(msg.metadata);
            entity.data_hash = meta.data_hash;
            entity.file_name = meta.file_name;
          } catch (e) {
            console.warn('Parse metadata failed:', e);
          }
        }
      }

      if (entity.message_type.includes('MsgDelegate')) {
        const msg = tx.body.messages[0];
        entity.validator_address = msg.validator_address;
      }

      if (entity.message_type.includes('MsgWithdrawDelegatorReward')) {
        const msg = tx.body.messages[0];
        entity.validator_address = msg.validator_address;
      }

      if (tx.auth_info?.signer_infos?.[0]) {
        const signer = tx.auth_info.signer_infos[0];
        entity.sequence = Number(signer.sequence);
        entity.signer_pubkey = signer.public_key?.key;
        entity.sign_mode = signer.mode_info?.single?.mode;
      }

      if (tx.auth_info?.fee?.amount?.[0]) {
        entity.fee_amount = tx.auth_info.fee.amount[0].amount;
        entity.fee_denom = tx.auth_info.fee.amount[0].denom;
        entity.gas_limit = Number(tx.auth_info.fee.gas_limit);
      }

      await transactionRepo.save(entity);
      await addressRepo.save({
        address: creator,
      });
      await delay(1000);
    }
  } catch (error) {
    console.error('syncAndSaveTransaction error: ', error);
  }
}


const saveBlockData = async (blockRepo: Repository<Block>, data: any) => {
  if (!data) {
    return null;
  }
  const txs: string[] = data?.sdk_block?.data?.txs?.map((tx: string) => getTxHashFromBase64(tx)) || [];
  const height = data.block.header.height;
  const payload = {
    height,
    chain_id: data.block.header.chain_id,
    time: data.block.header.time,
    block_hash: data.block_id.hash,
    part_set_total: data.block_id.part_set_header.total,
    part_set_hash: data.block_id.part_set_header.hash,
    version_block: data.block.header.version.block,
    version_app: data.block.header.version.app,
    last_block_hash: data.block.header.last_block_id.hash,
    last_part_total: data.block.header.last_block_id.part_set_header.total,
    last_part_hash: data.block.header.last_block_id.part_set_header.hash,
    last_commit_hash: data.block.header.last_commit_hash,
    data_hash: data.block.header.data_hash,
    validators_hash: data.block.header.validators_hash,
    next_validators_hash: data.block.header.next_validators_hash,
    consensus_hash: data.block.header.consensus_hash,
    app_hash: data.block.header.app_hash,
    last_results_hash: data.block.header.last_results_hash,
    evidence_hash: data.block.header.evidence_hash,
    proposer_address: data.block.header.proposer_address,
    txs: JSON.stringify(txs),
    last_commit_height: data.block.last_commit.height,
    last_commit_round: data.block.last_commit.round,
    last_commit_block_hash: data.block.last_commit.block_id.hash,
    last_commit_part_total: data.block.last_commit.block_id.part_set_header.total,
    last_commit_part_hash: data.block.last_commit.block_id.part_set_header.hash,
  };
  await blockRepo.save(payload);
  return {
    txs,
    height,
  };
}

const syncBlock = async () => {
  if (isSyncing) {
    return;
  }
  const processingTimeStart = Date.now();
  isSyncing = true;
  try {
    const dataSource = await getDataSource();
    const blockRepo = dataSource.getRepository(Block);
    const transactionRepo = dataSource.getRepository(Transaction);
    const addressRepo = dataSource.getRepository(Address);

    let startingBlock = 1
    if (!process.argv[2]) {
      const latestDBBlock = await blockRepo.createQueryBuilder().select('height').orderBy('height', 'DESC').getRawOne();
      startingBlock = Number(latestDBBlock?.height || 0) + 1;
    } else {
      startingBlock = Number(process.argv[2]);
    }
    while (true) {
      console.log(`Processing block ${startingBlock}`);
      try {
        const { data } = await instance.get(`/cosmos/base/tendermint/v1beta1/blocks/${startingBlock}`);
        if (!data) {
          break;
        }
        const result = await saveBlockData(blockRepo, data);

        if (result?.height && result?.txs?.length) {
          await syncAndSaveTransaction(transactionRepo, addressRepo, result.txs, result.height);
        }
        startingBlock++;
        await delay(2000);
      } catch (error) {
        console.error('blocks error: ', error);
        break;
      }
    }
  } catch (error) {
    console.error('syncBlock error: ', error);
  }
  isSyncing = false;
  console.log(
    `Processing update blocks finished in ${
      Date.now() - processingTimeStart
    }ms`,
  );
}

syncBlock();
