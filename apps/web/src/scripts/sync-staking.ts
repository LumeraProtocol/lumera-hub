// src/scripts/sync-wallet.ts
import dayjs from 'dayjs';

import { getDataSource } from '@/lib/data-source';
import { Staking } from '@/entities/Staking';
import { Transaction } from '@/entities/Transaction';

let isSyncing = false;

const syncStaking = async () => {
  if (isSyncing) {
    return;
  }
  const processingTimeStart = Date.now();
  isSyncing = true;
  try {
    const dataSource = await getDataSource();
    const stakingRepo = dataSource.getRepository(Staking);
    const transactionRepo = dataSource.getRepository(Transaction);

    const currentDate = dayjs().format('YYYY-MM-DD');
    const transactions = await transactionRepo.createQueryBuilder('tx')
      .select('message_type')
      .addSelect('COUNT(message_type)', 'total')
      .where('timestamp LIKE :date', { date: `%${currentDate}%` })
      .andWhere("(message_type LIKE :staking OR message_type LIKE :claim)", { staking: `%cosmos.staking.v1beta1%`, claim: `%MsgWithdrawDelegatorReward%` })
      .groupBy('message_type')
      .getRawMany();
    if (transactions?.length) {
      const delegate = transactions.find((tx) => tx.message_type.indexOf('MsgDelegate') !== -1);
      const unstaking = transactions.find((tx) => tx.message_type.indexOf('MsgUndelegate') !== -1);
      const redelegate = transactions.find((tx) => tx.message_type.indexOf('MsgBeginRedelegate') !== -1);
      const claim = transactions.find((tx) => tx.message_type.indexOf('MsgWithdrawDelegatorReward') !== -1);

      const payload = {
        date: currentDate,
        delegate: delegate?.total || 0,
        redelegate: redelegate?.total || 0,
        unstaking: unstaking?.total || 0,
        claim: claim?.total || 0,
      };
      await stakingRepo.save(payload);
    }
  } catch (error) {
    console.error('syncBlock error: ', error);
  }
  isSyncing = false;
  console.log(
    `Processing sync staking finished in ${
      Date.now() - processingTimeStart
    }ms`,
  );
}

syncStaking();
