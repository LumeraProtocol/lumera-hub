// src/scripts/update-wallet.ts

import { getDataSource } from '@/lib/data-source';
import { Action } from '@/entities/Action';
import { Transaction } from '@/entities/Transaction';

let isSyncing = false;

const updateAction = async () => {
  if (isSyncing) {
    return;
  }
  const processingTimeStart = Date.now();
  isSyncing = true;
  try {
    const dataSource = await getDataSource();
    const actionRepo = dataSource.getRepository(Action);
    const transactionRepo = dataSource.getRepository(Transaction);

    const items = await transactionRepo.createQueryBuilder()
      .select("strftime('%Y-%m-%d', timestamp)", 'day')
      .addSelect('COUNT(1)', 'total')
      .groupBy("strftime('%Y-%m-%d', timestamp)")
      .orderBy("day", "ASC")
      .getRawMany();
    for (const item of items) {
      console.log(`Processing date ${item.day}`);
      const payload = {
        date: item.day,
        total: item.total,
      };
      await actionRepo.save(payload);
    }
  } catch (error) {
    console.error('syncBlock error: ', error);
  }
  isSyncing = false;
  console.log(
    `Processing update action finished in ${
      Date.now() - processingTimeStart
    }ms`,
  );
}

updateAction();
