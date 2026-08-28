// apps/web/src/app/account/[address]/page.tsx
'use client'
import { useEffect } from "react";
import { Helmet } from "react-helmet-async";

import { useDispatch } from '@/redux/hooks';
import { setCurrentPath, setViewTitle } from '@/redux/app.slice';
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

  return (
    <>
      <Helmet>
        <title>Account - Lumera Hub</title>
      </Helmet>
      <div className="account-content">
        <AccountScreen />
      </div>
    </>
  )
}
