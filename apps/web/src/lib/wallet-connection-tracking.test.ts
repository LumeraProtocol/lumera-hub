import { DataSource } from 'typeorm'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { persistWalletConnection } from './wallet-connection-tracking'

const ADDRESS = '0x1111111111111111111111111111111111111111'

describe('wallet connection persistence', () => {
  let dataSource: DataSource

  beforeEach(async () => {
    dataSource = new DataSource({
      type: 'sqlite',
      database: ':memory:',
    })
    await dataSource.initialize()
    await dataSource.query(`
      CREATE TABLE hub_address (
        address TEXT PRIMARY KEY,
        first_connected TEXT,
        last_connected TEXT,
        total_connected INTEGER,
        acquisition_source TEXT
      )
    `)
    await dataSource.query(`
      CREATE TABLE address (
        address TEXT PRIMARY KEY,
        timestamp TEXT,
        type TEXT,
        created_at TEXT,
        updated_at TEXT
      )
    `)
    await dataSource.query(`
      CREATE TABLE hub_address_connected_log (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        address TEXT NOT NULL,
        ip TEXT,
        browser TEXT,
        other_info TEXT,
        created_at TEXT NOT NULL,
        acquisition_source TEXT
      )
    `)
  })

  afterEach(async () => {
    if (dataSource.isInitialized) {
      await dataSource.destroy()
    }
  })

  it('serializes concurrent first-connect writes without a unique-key failure', async () => {
    const record = {
      address: ADDRESS,
      acquisitionSource: 'Direct',
      browser: 'Chrome',
      ip: '127.0.0.1',
      otherInfo: '{}',
      timestamp: '2026-08-20T20:30:50.489Z',
    }

    const results = await Promise.all([
      persistWalletConnection(dataSource, record),
      persistWalletConnection(dataSource, {
        ...record,
        timestamp: '2026-08-20T20:30:50.490Z',
      }),
    ])

    expect(results).toEqual([{ isNewHub: true }, { isNewHub: false }])
    expect(
      await dataSource.query(
        'SELECT address, total_connected FROM hub_address',
      ),
    ).toEqual([{ address: ADDRESS, total_connected: 2 }])
    expect(await dataSource.query('SELECT address FROM address')).toEqual([
      { address: ADDRESS },
    ])
    expect(
      await dataSource.query(
        'SELECT COUNT(*) AS count FROM hub_address_connected_log',
      ),
    ).toEqual([{ count: 2 }])
  })

  it('rolls back the whole connection record when a required write fails', async () => {
    await dataSource.query('DROP TABLE hub_address_connected_log')

    await expect(
      persistWalletConnection(dataSource, {
        address: ADDRESS,
        acquisitionSource: 'Direct',
        browser: null,
        ip: '127.0.0.1',
        otherInfo: '{}',
        timestamp: '2026-08-20T20:30:50.489Z',
      }),
    ).rejects.toThrow()

    expect(await dataSource.query('SELECT * FROM hub_address')).toEqual([])
    expect(await dataSource.query('SELECT * FROM address')).toEqual([])
  })
})
