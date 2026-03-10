// src/scripts/update-staking.ts
import dayjs from 'dayjs';
import isoWeek from 'dayjs/plugin/isoWeek';
import hash from 'object-hash';

import { getDataSource } from '@/lib/data-source';
import { Address } from '@/entities/Address';
import { Transaction } from '@/entities/Transaction';
import { RetentionRateWeek } from '@/entities/RetentionRateWeek';
import { RetentionRateWeekDetails } from '@/entities/RetentionRateWeekDetail';

let isSyncing = false;

dayjs.extend(isoWeek);

const updateRetentionRate = async () => {
  if (isSyncing) {
    return;
  }
  const processingTimeStart = Date.now();
  isSyncing = true;
  try {
    const dataSource = await getDataSource();
    const addressRepo = dataSource.getRepository(Address);
    const transactionRepo = dataSource.getRepository(Transaction);
    const retentionRateWeekRepo = dataSource.getRepository(RetentionRateWeek);
    const retentionRateWeekDetailsRepo = dataSource.getRepository(RetentionRateWeekDetails);

    let selectYear = dayjs().format('YYYY');
    if (process.argv[2]) {
      selectYear = process.argv[2];
    }

    const diff = Number(dayjs().format('YYYY')) - Number(selectYear);
    for (let i = 0; i <= diff; i++) {
      const year = Number(selectYear) + i;
      retentionRateWeekDetailsRepo.createQueryBuilder().delete().where('year = :year', { year }).execute();
      retentionRateWeekRepo.createQueryBuilder().delete().where('year = :year', { year }).execute();
      console.log(`Processing year ${year}`);

      const current = dayjs(`${year}-01-04`);
      let weekStart = current.startOf('isoWeek');
      if (weekStart.year() < Number(year)) {
        weekStart = weekStart.add(1, 'week');
      }
      while (weekStart.year() === Number(year)) {
        const weekEnd = weekStart.endOf('isoWeek');
        console.log(`Processing week ${weekStart.isoWeek()}`);
        if (weekEnd.year() === Number(year)) {
          const addresses = await addressRepo.createQueryBuilder()
            .select('address')
            .where('timestamp >= :start', { start: weekStart.toISOString() })
            .andWhere('timestamp <= :end', { end: weekEnd.toISOString() })
            .groupBy('address')
            .getRawMany();

          if (addresses?.length) {
            const arrAddresses = addresses.map((adr) => adr.address);
             await retentionRateWeekRepo.save({
              hash: hash({
                start_date: weekStart.format('YYYY-MM-DD'),
                week: weekStart.isoWeek(),
                year,
              }),
              address: JSON.stringify(arrAddresses),
              week: weekStart.isoWeek(),
              year,
              start_date: weekStart.format('YYYY-MM-DD'),
              end_date: weekEnd.format('YYYY-MM-DD'),
            });
          }

          const groupAddress = await retentionRateWeekRepo.createQueryBuilder()
            .select('hash')
            .addSelect('address')
            .addSelect('week')
            .addSelect('year')
            .addSelect('start_date')
            .addSelect('end_date')
            .where('end_date <= :end_date', { end_date: weekStart.format('YYYY-MM-DD') })
            .getRawMany();

          for (const item of groupAddress) {
            const parseAddress = JSON.parse(item.address);
            const startDate = weekStart.startOf('day').toISOString();
            const endDate = weekEnd.endOf('day').toISOString();
            const transactions = await transactionRepo.createQueryBuilder()
              .select('message_type')
              .addSelect('COUNT(message_type)', 'total')
              .where('creator IN (:...addresses)', { addresses: parseAddress })
              .andWhere('timestamp >= :startDate', { startDate })
              .andWhere('timestamp <= :endDate', { endDate })
              .groupBy('message_type')
              .orderBy('creator')
              .getRawMany();

            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const entity: any = {
              week_hash: item.hash,
              week: weekStart.isoWeek(),
              year,
            }
            let totalActivation = 0;
            if (transactions?.length) {
              for (const tx of transactions) {
                entity[`${tx.message_type.replace('/', '').replaceAll('.', '_')}`] = tx.total;
                totalActivation += Number(tx.total);
              }
              entity.total_activation = totalActivation;
            }

            await retentionRateWeekDetailsRepo.save(entity);
          }
        }
        weekStart = weekStart.add(1, 'week');
      }
    }


  } catch (error) {
    console.error('updateTracking error: ', error);
  }
  isSyncing = false;
  console.log(
    `Processing update retention rate finished in ${
      Date.now() - processingTimeStart
    }ms`,
  );
}

updateRetentionRate();
