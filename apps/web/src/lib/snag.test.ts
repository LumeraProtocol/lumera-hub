import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// Counting subclass of the genuine SDK class: constructions become observable
// while the real private-field brands, resource wiring and error messages stay
// in play, so these tests exercise the actual SDK behaviour rather than a stub.
const { constructions } = vi.hoisted(() => ({ constructions: { count: 0 } }));

vi.mock('@snagsolutions/sdk', async () => {
  const actual = await vi.importActual<typeof import('@snagsolutions/sdk')>('@snagsolutions/sdk');
  const Real = actual.default;
  class CountingSnagSolutions extends Real {
    constructor(options?: ConstructorParameters<typeof Real>[0]) {
      constructions.count += 1;
      super(options);
    }
  }
  return { ...actual, default: CountingSnagSolutions };
});

// SNAG_* are what this module reads; X_API_KEY and SNAG_SOLUTIONS_BASE_URL are
// the SDK's own fallbacks and would otherwise mask an absent credential.
const MANAGED_KEYS = [
  'SNAG_API_KEY',
  'SNAG_BASE_URL',
  'X_API_KEY',
  'SNAG_SOLUTIONS_BASE_URL',
] as const;

const saved = new Map<string, string | undefined>();

// Returning the proxy from an async function makes promise resolution probe
// `then` on it, which must not force construction.
const importClient = async () => {
  vi.resetModules();
  const loaded = await import('./snag');
  return loaded.default;
};

beforeEach(() => {
  saved.clear();
  for (const key of MANAGED_KEYS) {
    saved.set(key, process.env[key]);
    delete process.env[key];
  }
  constructions.count = 0;
});

afterEach(() => {
  for (const [key, value] of saved) {
    if (value === undefined) {
      delete process.env[key];
    } else {
      process.env[key] = value;
    }
  }
});

describe('lib/snag', () => {
  it('imports without an API key present, so `next build` can collect page data', async () => {
    await expect(importClient()).resolves.toBeDefined();
    expect(constructions.count).toBe(0);
  });

  it('raises the SDK\'s own missing-credential error on first property access', async () => {
    const client = await importClient();

    let caught: unknown;
    try {
      expect(client.loyalty).toBeUndefined();
    } catch (error) {
      caught = error;
    }

    // A misconfigured deployment must fail loudly at request time rather than
    // get a no-op client, and the failure must be the SDK's own diagnostic --
    // not a proxy artefact such as a private-field TypeError.
    expect(caught).toBeInstanceOf(Error);
    expect((caught as Error).constructor.name).toBe('SnagSolutionsError');
    expect((caught as Error).message).toContain('X_API_KEY environment variable is missing');
    expect((caught as Error).message).not.toMatch(/private member/);
    expect(constructions.count).toBe(1);
  });

  it('exposes the real nested resource surface without a private-field TypeError', async () => {
    process.env.SNAG_API_KEY = 'dummy-key';
    const client = await importClient();

    // The nested paths the API routes actually use.
    expect(typeof client.loyalty.rules.list).toBe('function');
    expect(typeof client.loyalty.ruleGroups.getRuleGroups).toBe('function');
    expect(typeof client.loyalty.currencies.list).toBe('function');

    // buildURL reads the WeakMap-backed #baseURLOverridden through
    // __classPrivateFieldGet(this, ...). Called with a Proxy as `this` it throws
    // "Cannot read private member ... whose class did not declare it", so this
    // asserts methods run against the genuine instance.
    expect(client.buildURL('/api/loyalty/rules', null)).toBe(
      'https://admin.snagsolutions.io/api/loyalty/rules'
    );

    // Options are forwarded unchanged.
    expect(client.apiKey).toBe('dummy-key');
    expect(client.timeout).toBe(30000);
    expect(client.maxRetries).toBe(2);
  });

  it('constructs the client at most once across repeated accesses', async () => {
    process.env.SNAG_API_KEY = 'dummy-key';
    const client = await importClient();
    expect(constructions.count).toBe(0);

    expect(client.loyalty).toBeDefined();
    expect(client.loyalty.rules).toBeDefined();
    expect(client.apiKey).toBe('dummy-key');
    expect(client.buildURL('/api/loyalty/rules', null)).toContain('/api/loyalty/rules');

    expect(constructions.count).toBe(1);
    // A single instance also means resource objects keep their identity.
    expect(client.loyalty).toBe(client.loyalty);
  });
});
