import SnagSolutions from '@snagsolutions/sdk';

/**
 * The Snag SDK constructor throws when it cannot find an API key, and Next.js
 * imports every API route module during the "collect page data" build phase.
 * Constructing at module scope therefore made `next build` fail on any machine
 * without Snag credentials (turbo's build env allowlist also strips
 * SNAG_API_KEY, so an exported shell variable did not help). Construction is
 * deferred to the first actual use instead, so importing this module is safe
 * with no environment at all.
 */
let instance: SnagSolutions | undefined;

const getClient = (): SnagSolutions => {
  if (instance === undefined) {
    // Only a successful construction is cached, so a misconfigured deployment
    // keeps raising the SDK's own "X_API_KEY is missing" error on every request
    // rather than caching a broken client or degrading into a silent no-op.
    instance = new SnagSolutions({
      apiKey: process.env.SNAG_API_KEY,
      baseURL: process.env.SNAG_BASE_URL,
      timeout: 30000,
      maxRetries: 2,
    });
  }
  return instance;
};

// Methods have to run with the genuine instance as `this`. The SDK's compiled
// output keeps private state in WeakMaps (`_APIClient_baseURLOverridden`, read
// by `buildURL` through `__classPrivateFieldGet(this, ...)`) and brands
// instances in a WeakSet (`_SnagSolutions_instances`), all keyed on the object
// the constructor saw. Calling such a method with a Proxy as `this` throws
// "Cannot read private member ... from an object whose class did not declare
// it", so every function is bound to the real instance before it is handed out.
const boundMembers = new Map<PropertyKey, unknown>();

const client = new Proxy({} as SnagSolutions, {
  get(_target, property) {
    if (property === 'then' && instance === undefined) {
      // Promise resolution probes `then` on every awaited or returned value, and
      // the SDK client has no `then`. Answering undefined without constructing
      // keeps an incidental `await client` from building the client early -- or,
      // with no key configured, from throwing far away from any real API call.
      return undefined;
    }
    const real = getClient();
    const value: unknown = Reflect.get(real, property, real);
    if (typeof value !== 'function') {
      // Sub-resources such as `loyalty` are built in the SDK constructor and
      // already hold a reference to the real client, so returning them as-is
      // keeps `client.loyalty.rules` on the unproxied path.
      return value;
    }
    const cached = boundMembers.get(property);
    if (cached !== undefined) {
      return cached;
    }
    const bound = (value as (...args: unknown[]) => unknown).bind(real);
    boundMembers.set(property, bound);
    return bound;
  },
  set(_target, property, value) {
    boundMembers.delete(property);
    return Reflect.set(getClient(), property, value);
  },
  has(_target, property) {
    return Reflect.has(getClient(), property);
  },
  getPrototypeOf() {
    return Reflect.getPrototypeOf(getClient());
  },
});

export default client;
