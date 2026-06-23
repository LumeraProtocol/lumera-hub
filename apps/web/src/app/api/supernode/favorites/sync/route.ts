// app/api/favorites/sync/route.ts
import { NextRequest, NextResponse } from 'next/server';

import { getDataSource } from '@/lib/data-source';
import { Favorites } from '@/entities/Favorites';

export async function POST(req: NextRequest) {
  const { lumeraAddress, localFavorites } = await req.json();

  if (!lumeraAddress || !Array.isArray(localFavorites)) {
    return NextResponse.json({ error: 'Invalid data' }, { status: 400 });
  }

  try {
    const dataSource = await getDataSource();
    const favoritesRepo = dataSource.getRepository(Favorites);

    const existing = await favoritesRepo
      .createQueryBuilder()
      .select('lumeraAddress')
      .addSelect('supernodeAccount')
      .where('lumeraAddress = :lumeraAddress', { lumeraAddress })
      .getRawMany()      ;

    const existingIds = new Set(existing.map(f => f.supernodeAccount));

    const toInsert = localFavorites
      .filter(id => !existingIds.has(id))
      .map(supernodeAccount => ({ lumeraAddress, supernodeAccount }));

    if (toInsert.length > 0) {
      await favoritesRepo.save(toInsert);
    }

    const allFavorites = await favoritesRepo
      .createQueryBuilder()
      .select('lumeraAddress')
      .addSelect('supernodeAccount')
      .where('lumeraAddress = :lumeraAddress', { lumeraAddress })
      .getRawMany()      ;

    const syncedFavorites = allFavorites.map(f => f.supernodeAccount);

    return NextResponse.json({
      status: true,
      syncedFavorites
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Sync failed' }, { status: 500 });
  }
}
