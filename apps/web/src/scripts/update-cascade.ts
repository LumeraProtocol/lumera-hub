// src/scripts/update-cascade.ts

import { getDataSource } from '@/lib/data-source';
import { Cascade } from '@/entities/Cascade';
import { Transaction } from '@/entities/Transaction';
import { IMAGE_EXT, DOCUMENT_EXT, VIDEO_EXT, ARCHIVE_EXT, PROGRAM_EXT } from '@/hooks/useCascade';

let isSyncing = false;

const updateCascade = async () => {
  if (isSyncing) {
    return;
  }
  const processingTimeStart = Date.now();
  isSyncing = true;
  try {
    const dataSource = await getDataSource();
    const cascadeRepo = dataSource.getRepository(Cascade);
    const transactionRepo = dataSource.getRepository(Transaction);

    const dates = await transactionRepo.createQueryBuilder()
      .select("strftime('%Y-%m-%d', timestamp)", 'day')
      .where('creator IS NOT NULL')
      .andWhere("message_type LIKE '%MsgRequestAction%'")
      .andWhere("action_type  = 'cascade'")
      .groupBy("strftime('%Y-%m-%d', timestamp)")
      .orderBy("day", "ASC")
      .getRawMany();

    for (const date of dates) {
      const currentDate = date.day;
      console.log(`Processing date ${currentDate}`);
      const transactions = await transactionRepo.createQueryBuilder('tx')
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

      if (transactions?.length) {
        const totalPrice = transactions.reduce((total, item) => total + parseInt(item.price), 0);
        const totalFee = transactions.reduce((total, item) => total + parseInt(item.file_size_kbs), 0);
        const results = transactions.reduce((acc, item) => {
          const ext = item.file.split('.').pop().toLowerCase();
          if (IMAGE_EXT.includes(ext)) {
            acc.images++;
          } else if (PROGRAM_EXT.includes(ext)) {
            acc.program++;
          } else if (DOCUMENT_EXT.includes(ext)) {
            acc.document++;
          } else if (VIDEO_EXT.includes(ext)) {
            acc.video++;
          } else if (ARCHIVE_EXT.includes(ext)) {
            acc.archive++;
          } else {
            acc.others++;
          }

          return acc;
        }, { images: 0, program: 0, document: 0, video: 0, archive: 0, others: 0 });

        const payload = {
          date: currentDate,
          upload: transactions.length,
          download: 0,
          image: results.images,
          video: results.video,
          program: results.program,
          archive: results.archive,
          document: results.document,
          other: results.others,
          total_price: totalPrice,
          total_fee: totalFee,
        };
        await cascadeRepo.save(payload);
      }
    }
  } catch (error) {
    console.error('updateCascade error: ', error);
  }
  isSyncing = false;
  console.log(
    `Processing update cascade finished in ${
      Date.now() - processingTimeStart
    }ms`,
  );
}

updateCascade();
