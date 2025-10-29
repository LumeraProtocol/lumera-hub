// apps/web/src/app/staking/[validator]/page.tsx
'use client'

import { useEffect } from 'react';
import { Helmet } from "react-helmet-async";

import { StakingDetailsScreen } from '@lumera-hub/ui/src/screens/StakingDetailsScreen';
import useValidator from '@/hooks/useValidator';

export default function Page() {
  const {
    isLoading,
    validator,
    validatorAddress,
    signingInfos,
    slashingParams,
    isFetchParamsLoading,
    isFetchValidatorsLoading,
    validators,
    isFetchDelegatorsLoading,
    delegators,
  } = useValidator();

  useEffect(() => {
    document.title = validator?.description?.moniker || 'Staking Details';
  }, [validator]);

  return (
    <>
      <Helmet>
        <title>Staking Details</title>
      </Helmet>
      <div className="staking-details-content">
        <StakingDetailsScreen
          validatorAddress={validatorAddress}
          isLoading={isLoading}
          validator={validator}
          signingInfos={signingInfos}
          slashingParams={slashingParams}
          isFetchParamsLoading={isFetchParamsLoading}
          isFetchValidatorsLoading={isFetchValidatorsLoading}
          validators={validators}
          delegators={delegators}
          isFetchDelegatorsLoading={isFetchDelegatorsLoading}
        />
      </div>
    </>
  )
}
