// apps/web/src/app/staking/[validator]/page.tsx
'use client'

import { useEffect } from 'react';
import { Helmet } from "react-helmet-async";

import { StakingDetailsScreen } from '@lumera-hub/ui/src/screens/StakingDetailsScreen';
import useValidator from '@/hooks/useValidator';
import useDelegate from '@/hooks/useDelegate';
import useAccountInfo from '@/hooks/useAccountInfo';

export default function Page() {
  const delegate = useDelegate();

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
    totalDelegators,
    handlePageClick,
  } = useValidator();
   const { accountInfo } = useAccountInfo();

  useEffect(() => {
    document.title = `${validator?.description?.moniker || 'Staking Details'} - Lumera Hub`;
  }, [validator]);

  return (
    <>
      <Helmet>
        <title>{validator?.description?.moniker || 'Staking Details'} - Lumera Hub</title>
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
          delegateOptions={{
            isVoteLoading: delegate.isLoading,
            error: delegate.error,
            optionsAdvanced: delegate.optionsAdvanced,
            showAdvanced: delegate.showAdvanced,
            validators: delegate.validators,
            totalValidators: delegate.totalValidators,
            isLoading: delegate.isFetchValidatorLoading,
            isOpenModal: delegate.isOpenModal,
            transactionHash: delegate.transactionHash,
            onCloseCongratulationsModal: delegate.handleCloseCongratulationsModal,
            onCloseDailogChange: delegate.handleCloseModal,
            onOpenModal: delegate.handleOpenModal,
            onSendClick: delegate.handleSendClick,
            onInputChange: delegate.handleInputChange,
            onAdvancedCheckedChange: delegate.handleShowAdvancedChange,
          }}
          accountInfo={accountInfo}
          totalDelegators={totalDelegators}
          onPageClick={handlePageClick}
        />
      </div>
    </>
  )
}
