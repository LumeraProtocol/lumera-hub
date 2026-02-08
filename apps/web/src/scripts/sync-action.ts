// src/scripts/sync-wallet.ts
import dayjs from 'dayjs';

import { getDataSource } from '@/lib/data-source';
import { Action } from '@/entities/Action';
import { Transaction } from '@/entities/Transaction';

let isSyncing = false;

const syncAction = async () => {
  if (isSyncing) {
    return;
  }
  const processingTimeStart = Date.now();
  isSyncing = true;
  try {
    const dataSource = await getDataSource();
    const actionRepo = dataSource.getRepository(Action);
    const transactionRepo = dataSource.getRepository(Transaction);

    const currentDate = dayjs().format('YYYY-MM-DD');
    const transactions = await transactionRepo.createQueryBuilder('tx')
      .select('1')
      .where('timestamp LIKE :date', { date: `%${currentDate}%` })
      .getRawMany();

    const payload = {
      date: currentDate,
      total: transactions?.length,
    };
    await actionRepo.save(payload);
  } catch (error) {
    console.error('syncBlock error: ', error);
  }
  isSyncing = false;
  console.log(
    `Processing sync action finished in ${
      Date.now() - processingTimeStart
    }ms`,
  );
}

syncAction();
