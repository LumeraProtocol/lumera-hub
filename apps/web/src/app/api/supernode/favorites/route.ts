// app/api/favorites/route.ts
import { NextRequest, NextResponse } from 'next/server';

import { getDataSource } from '@/lib/data-source';
import { Favorites } from '@/entities/Favorites';

export async function POST(req: NextRequest) {
  const { lumeraAddress, supernodeAccount } = await req.json();

  if (!lumeraAddress || !supernodeAccount) {
    return NextResponse.json({ error: 'Missing data' }, { status: 400 });
  }

  try {
    const dataSource = await getDataSource();
    const favoritesRepo = dataSource.getRepository(Favorites);

    // Toggle favorite
    const existing = await favoritesRepo
      .createQueryBuilder()
      .select('lumeraAddress')
      .where('lumeraAddress = :lumeraAddress', { lumeraAddress })
      .andWhere('supernodeAccount = :supernodeAccount', { supernodeAccount })
      .getRawOne()      ;

    if (existing) {
      await favoritesRepo
        .createQueryBuilder()
        .delete()
        .where('lumeraAddress = :lumeraAddress', { lumeraAddress })
        .andWhere('supernodeAccount = :supernodeAccount', { supernodeAccount })
        .execute();
      return NextResponse.json({ favorited: false });
    } else {
      await favoritesRepo.save({
        lumeraAddress,
        supernodeAccount,
      });
      return NextResponse.json({ favorited: true });
    }
  } catch (e) {
    console.error('Toggle favorite error: ', e)
    return NextResponse.json({ error: 'Database error' }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  const lumeraAddress = req.nextUrl.searchParams.get('lumeraAddress');
  if (!lumeraAddress) return NextResponse.json([]);

  const dataSource = await getDataSource();
  const favoritesRepo = dataSource.getRepository(Favorites);

  const userFavorites = await favoritesRepo
    .createQueryBuilder()
    .select('supernodeAccount')
    .where('lumeraAddress = :lumeraAddress', { lumeraAddress })
    .getRawMany();

  return NextResponse.json(userFavorites.map(f => f.supernodeAccount));
}
