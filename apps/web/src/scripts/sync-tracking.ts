// src/scripts/update-staking.ts
import dayjs from 'dayjs';

import { getDataSource } from '@/lib/data-source';
import { Transaction } from '@/entities/Transaction';
import { Tracking } from '@/entities/Tracking';
import { IMAGE_EXT, DOCUMENT_EXT, VIDEO_EXT, ARCHIVE_EXT, PROGRAM_EXT } from '@/contants';

let isSyncing = false;

const syncTracking = async () => {
  if (isSyncing) {
    return;
  }
  const processingTimeStart = Date.now();
  isSyncing = true;
  try {
    const dataSource = await getDataSource();
    const transactionRepo = dataSource.getRepository(Transaction);
    const trackingRepo = dataSource.getRepository(Tracking);

    const currentDate = dayjs().format('YYYY-MM-DD');
    let payload = {
      date: currentDate,
      delegate: 0,
      delegate_lume: 0,
      redelegate: 0,
      redelegate_lume: 0,
      unstaking: 0,
      unstaking_lume: 0,
      claim: 0,
      claim_lume: 0,
      cascade_upload: 0,
      cascade_image: 0,
      cascade_video: 0,
      cascade_program: 0,
      cascade_archive: 0,
      cascade_document: 0,
      cascade_other: 0,
      cascade_total_price: 0,
      cascade_total_fee: 0,
      total_address: 0,
      new_address: 0,
      total_transaction: 0,
      transaction_extra: '',
    }

    // stacking
    const stakingTransactions = await transactionRepo.createQueryBuilder('tx')
      .select('message_type')
      .addSelect('COUNT(message_type)', 'total')
      .addSelect('SUM(price)', 'price')
      .where('timestamp LIKE :date', { date: `%${currentDate}%` })
      .andWhere("(message_type LIKE :staking OR message_type LIKE :claim)", { staking: `%cosmos.staking.v1beta1%`, claim: `%MsgWithdrawDelegatorReward%` })
      .groupBy('message_type')
      .getRawMany();

    if (stakingTransactions?.length) {
      let delegate = 0;
      let delegate_lume = 0;
      let redelegate = 0;
      let redelegate_lume = 0;
      let unstaking = 0;
      let unstaking_lume = 0;
      let claim = 0;
      let claim_lume = 0;

      for (const tx of stakingTransactions) {
        if (tx.message_type.indexOf('MsgDelegate') !== -1) {
          delegate = tx.total;
          delegate_lume = tx.price;
        } else if (tx.message_type.indexOf('MsgUndelegate') !== -1) {
          unstaking = tx.total;
          unstaking_lume = tx.price;
        } else if (tx.message_type.indexOf('MsgBeginRedelegate') !== -1) {
          redelegate = tx.total;
          redelegate_lume = tx.price;
        } else if (tx.message_type.indexOf('MsgWithdrawDelegatorReward') !== -1) {
          claim = tx.total;
          claim_lume = tx.price;
        }
      }
      payload = {
        ...payload,
        delegate,
        delegate_lume,
        redelegate,
        redelegate_lume,
        unstaking,
        unstaking_lume,
        claim,
        claim_lume,
      }
    }

    // cascade
    const cascadeTransactions = await transactionRepo.createQueryBuilder('tx')
      .select('price')
      .addSelect('file_size_kbs')
      .addSelect('file_name')
      .addSelect('fee_amount')
      .addSelect('fee_denom')
      .where('timestamp LIKE :date', { date: `%${currentDate}%` })
      .andWhere('creator IS NOT NULL')
      .andWhere("message_type LIKE '%MsgRequestAction%'")
      .andWhere("action_type  = 'cascade'")
      .groupBy('creator')
      .getRawMany();
    if (cascadeTransactions?.length) {
      let totalPrice = 0;
      let totalFee = 0;
      const results = {
        images: 0,
        program: 0,
        document: 0,
        video: 0,
        archive: 0,
        others: 0
      };

      for (const item of cascadeTransactions) {
        totalPrice += Number(item.price);
        totalFee   += Number(item.file_size_kbs);

        const ext = item.file.split('.').pop()?.toLowerCase() || '';
        if (IMAGE_EXT.includes(ext)) {
          results.images++;
        } else if (PROGRAM_EXT.includes(ext)) {
          results.program++;
        } else if (DOCUMENT_EXT.includes(ext)) {
          results.document++;
        } else if (VIDEO_EXT.includes(ext)) {
          results.video++;
        } else if (ARCHIVE_EXT.includes(ext)) {
          results.archive++;
        } else {
          results.others++;
        }
      }

      payload = {
        ...payload,
        cascade_upload: cascadeTransactions.length,
        cascade_image: results.images,
        cascade_video: results.video,
        cascade_program: results.program,
        cascade_archive: results.archive,
        cascade_document: results.document,
        cascade_other: results.others,
        cascade_total_price: totalPrice,
        cascade_total_fee: totalFee,
      };
    }

    // activities
    const activitiesTransaction = await transactionRepo.createQueryBuilder('tx')
      .select('count(1)', 'total')
      .addSelect('message_type')
      .where('timestamp LIKE :date', { date: `%${currentDate}%` })
      .groupBy('message_type')
      .getRawMany();

    if (activitiesTransaction?.length) {
      let totalTransaction = 0;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const transactionExtra: any = [];
      for (const item of activitiesTransaction) {
        totalTransaction += Number(item.total);
        transactionExtra.push({
          message_type: item.message_type,
          total: item.total,
        });
      }
      payload = {
        ...payload,
        total_transaction: totalTransaction,
        transaction_extra: JSON.stringify(transactionExtra),
      };
    }

    // wallet
    const startDate = dayjs(currentDate).set('hour', 0).set('minute', 0).set('second', 1).toISOString();
    const endDate = dayjs(currentDate).add(1, 'day').set('hour', 0).set('minute', 0).set('second', 1).toISOString();
    const walletTransactions = await transactionRepo.createQueryBuilder('tx')
      .select('creator')
      .addSelect(`EXISTS (SELECT 1 FROM address addr WHERE addr.address = tx.creator AND timestamp < '${startDate}')`, 'existsInAddresses')
      .addSelect(`(SELECT COUNT(1) FROM transactions WHERE creator IS NOT NULL AND timestamp < '${endDate}')`, 'total')
      .where('timestamp LIKE :date', { date: `%${currentDate}%` })
      .andWhere('creator IS NOT NULL')
      .groupBy('creator')
      .getRawMany();
    if (walletTransactions?.length) {
      const newAddresses = walletTransactions.filter((tx) => !tx.existsInAddresses);
      payload = {
        ...payload,
        total_address: walletTransactions[0].total || newAddresses.length,
        new_address: newAddresses.length,
      };
    }

    await trackingRepo.save(payload);
  } catch (error) {
    console.error('sync tracking error: ', error);
  }
  isSyncing = false;
  console.log(
    `Processing sync tracking finished in ${
      Date.now() - processingTimeStart
    }ms`,
  );
}

syncTracking();
