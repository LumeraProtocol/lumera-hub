import { useEffect, useState } from 'react';

/**
 * Keybase pictures for validators that publish an identity.
 *
 * Operators put a 16-hex Keybase key fingerprint in `description.identity`;
 * that is the only avatar source Cosmos chains have. Everyone else keeps their
 * monogram, which is most of the set.
 *
 * Lookups are cached for the tab and capped, because Keybase rate-limits and
 * the list can run to a hundred validators.
 */

const cache = new Map<string, string | null>();
const KEYBASE_ID = /^[0-9A-Fa-f]{16}$/;

const lookup = async (identity: string) => {
  if (cache.has(identity)) return cache.get(identity) ?? null;
  try {
    const response = await fetch(
      `https://keybase.io/_/api/1.0/user/lookup.json?key_suffix=${identity}&fields=pictures`,
    );
    const json = await response.json();
    const url: string | null = json?.them?.[0]?.pictures?.primary?.url || null;
    cache.set(identity, url);
    return url;
  } catch {
    cache.set(identity, null);
    return null;
  }
};

const useValidatorLogos = (
  validators: Array<{ operator_address: string; description?: { identity?: string } }> | undefined,
  limit = 60,
) => {
  const [logos, setLogos] = useState<Record<string, string>>({});

  // Only the identities matter for the dependency: re-running because a
  // validator's token count ticked would hammer Keybase.
  const identityKey = (validators || [])
    .map((v) => `${v.operator_address}:${v.description?.identity || ''}`)
    .join('|');

  useEffect(() => {
    const withIdentity = (validators || [])
      .filter((v) => KEYBASE_ID.test(v.description?.identity || ''))
      .slice(0, limit);
    if (!withIdentity.length) return;

    let cancelled = false;
    Promise.all(
      withIdentity.map(async (v) => {
        const url = await lookup(v.description!.identity!);
        return url ? ([v.operator_address, url] as const) : null;
      }),
    ).then((pairs) => {
      if (cancelled) return;
      const found = pairs.filter(Boolean) as Array<readonly [string, string]>;
      if (!found.length) return;
      setLogos((prev) => {
        const next = { ...prev };
        found.forEach(([address, url]) => {
          next[address] = url;
        });
        return next;
      });
    });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [identityKey, limit]);

  return logos;
};

export default useValidatorLogos;
