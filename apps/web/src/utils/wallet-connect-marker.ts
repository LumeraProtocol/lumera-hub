/**
 * Session-scoped record of which addresses already had their wallet connect
 * reported to /api/admin/trackings/save-wallet-connect. A single-slot marker
 * re-fires the request (and double-counts the connect server side) whenever
 * the user alternates between two accounts, so every tracked address is kept.
 *
 * Legacy values in the same key: 'true' (tracked, address unknown) and a bare
 * address string. Both are migrated on read.
 */
const STORAGE_KEY = 'new_connect';

interface MarkerStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

const readTrackedAddresses = (storage: MarkerStorage): string[] => {
  const raw = storage.getItem(STORAGE_KEY);
  if (!raw || raw === 'true') return [];
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed.filter((entry): entry is string => typeof entry === 'string');
    }
  } catch {
    // Legacy single-address value, handled below.
  }
  return [raw];
};

export const isConnectTracked = (storage: MarkerStorage, address: string) =>
  readTrackedAddresses(storage).includes(address);

export const markConnectTracked = (storage: MarkerStorage, address: string) => {
  const tracked = readTrackedAddresses(storage);
  if (tracked.includes(address)) return;
  storage.setItem(STORAGE_KEY, JSON.stringify([...tracked, address]));
};

export const clearTrackedConnects = (storage: MarkerStorage) => {
  storage.removeItem(STORAGE_KEY);
};
