// src/scripts/update-wallet.ts

import { getDataSource } from '@/lib/data-source';
import { Wallet } from '@/entities/Wallet';
import { Transaction } from '@/entities/Transaction';

let isSyncing = false;

const updateWallet = async () => {
  if (isSyncing) {
    return;
  }
  const processingTimeStart = Date.now();
  isSyncing = true;
  try {
    const dataSource = await getDataSource();
    const walletRepo = dataSource.getRepository(Wallet);
    const transactionRepo = dataSource.getRepository(Transaction);

    const dates = await transactionRepo.createQueryBuilder()
      .select("strftime('%Y-%m-%d', timestamp)", 'day')
      .where('creator IS NOT NULL')
      .groupBy("strftime('%Y-%m-%d', timestamp)")
      .orderBy("day", "ASC")
      .getRawMany();
    for (const date of dates) {
      const currentDate = date.day;
      console.log(`Processing date ${currentDate}`);
      const transactions = await transactionRepo.createQueryBuilder('tx')
        .select('creator')
        .addSelect('EXISTS (SELECT 1 FROM address addr WHERE addr.address = tx.creator)', 'existsInAddresses')
        .where('timestamp LIKE :date', { date: `%${currentDate}%` })
        .andWhere('creator IS NOT NULL')
        .groupBy('creator')
        .getRawMany();

      if (transactions?.length) {
        const newAddresses = transactions.filter((tx) => !tx.existsInAddresses);
        const totalAddress = transactions.length;
        const payload = {
          date: currentDate,
          total_address: totalAddress,
          new_address: newAddresses.length,
        };
        await walletRepo.save(payload);
      }
    }
  } catch (error) {
    console.error('syncBlock error: ', error);
  }
  isSyncing = false;
  console.log(
    `Processing update wallet finished in ${
      Date.now() - processingTimeStart
    }ms`,
  );
}

updateWallet();
