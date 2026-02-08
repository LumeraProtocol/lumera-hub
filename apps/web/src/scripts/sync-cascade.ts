// src/scripts/sync-cascade.ts
import dayjs from 'dayjs';

import { getDataSource } from '@/lib/data-source';
import { Cascade } from '@/entities/Cascade';
import { Transaction } from '@/entities/Transaction';
import { IMAGE_EXT, DOCUMENT_EXT, VIDEO_EXT, ARCHIVE_EXT, PROGRAM_EXT } from '@/hooks/useCascade';

let isSyncing = false;

const syncCascade = async () => {
  if (isSyncing) {
    return;
  }
  const processingTimeStart = Date.now();
  isSyncing = true;
  try {
    const dataSource = await getDataSource();
    const cascadeRepo = dataSource.getRepository(Cascade);
    const transactionRepo = dataSource.getRepository(Transaction);

    const currentDate = dayjs().format('YYYY-MM-DD');
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
  } catch (error) {
    console.error('syncCascade error: ', error);
  }
  isSyncing = false;
  console.log(
    `Processing sync cascade finished in ${
      Date.now() - processingTimeStart
    }ms`,
  );
}

syncCascade();
