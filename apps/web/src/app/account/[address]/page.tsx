// apps/web/src/app/account/[address]/page.tsx
'use client'
import { useEffect } from "react";
import { Helmet } from "react-helmet-async";

import { useDispatch } from '@/redux/hooks';
import { setCurrentPath, setViewTitle } from '@/redux/app.slice';
import useAccount from '@/hooks/useAccount';
import useTransaction from '@/hooks/useTransaction';
import { AccountScreen } from '@lumera-hub/ui/src/screens/AccountScreen';

export default function Page() {
  const dispatch = useDispatch();

  useEffect(() => {
    document.title = 'Account - Lumera Hub';
    dispatch(setCurrentPath({
      currentPath: '/account',
    }));
    dispatch(setViewTitle({
      viewTitle: 'Account',
    }));
  }, []);

  const { addressFormats, isValidAddress, accountInfo, isLoading, error } = useAccount();
  const sentTransactions = useTransaction({
    address: addressFormats?.bech32Address ?? '',
    direction: 'sent',
  });
  const receivedTransactions = useTransaction({
    address: addressFormats?.bech32Address ?? '',
    direction: 'received',
  });

  return (
    <>
      <Helmet>
        <title>Account - Lumera Hub</title>
      </Helmet>
      <div className="account-content">
        <AccountScreen
          bech32Address={addressFormats?.bech32Address ?? ''}
          ethAddress={addressFormats?.ethAddress ?? ''}
          isValidAddress={isValidAddress}
          accountInfo={accountInfo}
          isLoading={isLoading}
          error={error}
          sentTransactions={sentTransactions}
          receivedTransactions={receivedTransactions}
        />
      </div>
    </>
  )
}
