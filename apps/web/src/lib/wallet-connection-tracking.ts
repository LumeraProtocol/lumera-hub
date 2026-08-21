import type { DataSource } from 'typeorm'

export interface WalletConnectionRecord {
  address: string
  acquisitionSource: string
  browser: string | null
  ip: string
  otherInfo: string
  timestamp: string
}

export interface WalletConnectionResult {
  isNewHub: boolean
}

// TypeORM's SQLite driver shares one connection. Keep transactions from two
// simultaneous wallet effects from nesting on that connection, while the SQL
// conflict clauses still protect deployments with more than one process.
let walletTrackingWriteTail: Promise<void> = Promise.resolve()

const serializeWalletTrackingWrite = async <T>(
  write: () => Promise<T>,
): Promise<T> => {
  const previousWrite = walletTrackingWriteTail
  let releaseWrite: () => void = () => undefined
  walletTrackingWriteTail = new Promise<void>((resolve) => {
    releaseWrite = resolve
  })

  await previousWrite
  try {
    return await write()
  } finally {
    releaseWrite()
  }
}

export const persistWalletConnection = async (
  dataSource: DataSource,
  record: WalletConnectionRecord,
): Promise<WalletConnectionResult> =>
  serializeWalletTrackingWrite(() =>
    dataSource.transaction(async (manager) => {
      // The first-connect decision must come from the insert itself. A
      // pre-check SELECT races a second process between check and write, and
      // both processes would then report isNewHub and double-award
      // first-connect side effects (referral bonuses). SQLite's changes()
      // reports, per connection, whether OR-IGNORE actually inserted.
      await manager.query(
        `
      INSERT INTO hub_address (
        address,
        first_connected,
        last_connected,
        total_connected,
        acquisition_source
      ) VALUES (?, ?, ?, 1, ?)
      ON CONFLICT(address) DO NOTHING
      `,
        [
          record.address,
          record.timestamp,
          record.timestamp,
          record.acquisitionSource,
        ],
      )
      const [{ inserted }] = await manager.query('SELECT changes() AS inserted')
      const isNewHub = Number(inserted) === 1

      if (!isNewHub) {
        await manager.query(
          `
      UPDATE hub_address SET
        last_connected = ?,
        total_connected = COALESCE(total_connected, 0) + 1,
        acquisition_source = COALESCE(acquisition_source, ?)
      WHERE address = ?
      `,
          [record.timestamp, record.acquisitionSource, record.address],
        )
      }

      await manager.query(
        `
      INSERT INTO address (address, timestamp, type, created_at, updated_at)
      VALUES (?, ?, 'hub', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      ON CONFLICT(address) DO NOTHING
      `,
        [record.address, record.timestamp],
      )

      await manager.query(
        `
      INSERT INTO hub_address_connected_log (
        address,
        ip,
        browser,
        other_info,
        created_at,
        acquisition_source
      ) VALUES (?, ?, ?, ?, ?, ?)
      `,
        [
          record.address,
          record.ip,
          record.browser,
          record.otherInfo,
          record.timestamp,
          record.acquisitionSource,
        ],
      )

      return { isNewHub }
    }),
  )
