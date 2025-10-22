// apps/web/src/app/staking/[validator]/page.tsx
'use client'
import { use, useEffect } from 'react';
import { Helmet } from "react-helmet-async";

import { StakingDetailsScreen } from '@lumera-hub/ui/src/screens/StakingDetailsScreen';

interface ParamsProps {
  params: Promise<{ validator: string }>;
}

export default function Page({ params }: ParamsProps) {
  const resolvedParams = use(params);
  const { validator } = resolvedParams;
  useEffect(() => {
    document.title = 'Staking Details';
  }, []);

  return (
    <>
      <Helmet>
        <title>Staking Details</title>
      </Helmet>
      <div className="staking-details-content">
        <StakingDetailsScreen validatorAddress={validator} />
      </div>
    </>
  )
}
