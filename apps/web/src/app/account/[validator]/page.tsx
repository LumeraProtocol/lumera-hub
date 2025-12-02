// apps/web/src/app/inference/page.tsx
'use client'
import { useEffect } from "react";
import { Helmet } from "react-helmet-async";

import { AccountScreen } from '@lumera-hub/ui/src/screens/AccountScreen';

export default function Page() {
  useEffect(() => {
    document.title = 'Account - Lumera Hub';
  }, []);

  return (
    <>
      <Helmet>
        <title>Account</title>
      </Helmet>
      <div className="account-content">
        <AccountScreen />
      </div>
    </>
  )
}
