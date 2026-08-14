import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'next/navigation';

import { fetchAccountInfo, AccountInfoData } from '@/hooks/useAccountInfo';
import { parseAccountAddress } from '@/utils/account';

const useAccount = () => {
  const params = useParams();
  const rawAddress = typeof params?.address === 'string' ? params.address : '';
  const addressFormats = useMemo(() => parseAccountAddress(rawAddress), [rawAddress]);

  const [accountInfo, setAccountInfo] = useState<AccountInfoData | null>(null);
  const [isLoading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!addressFormats) {
      setAccountInfo(null);
      return;
    }
    let cancelled = false;
    const fetchData = async () => {
      setLoading(true);
      setError('');
      try {
        const info = await fetchAccountInfo(addressFormats.bech32Address);
        if (!cancelled) {
          setAccountInfo(info);
        }
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : 'Unable to load account data.');
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };
    fetchData();
    return () => {
      cancelled = true;
    };
  }, [addressFormats]);

  return {
    addressFormats,
    isValidAddress: Boolean(addressFormats),
    accountInfo,
    isLoading,
    error,
  };
};

export default useAccount;
