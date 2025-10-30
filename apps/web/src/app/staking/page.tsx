// apps/web/src/app/staking/page.tsx
'use client'
import { useEffect } from "react";
import { Helmet } from "react-helmet-async";

import { StakingScreen } from '@lumera-hub/ui/src/screens/StakingScreen'
import useWalletConnect from '@/hooks/useWalletConnect';
import useDelegate from '@/hooks/useDelegate';
import useStaking from '@/hooks/useStaking';
import useAccountInfo from '@/hooks/useAccountInfo';
import useUnbond from '@/hooks/useUnbond';
import useRedelegate from '@/hooks/useRedelegate';

export default function Page() {
 const { address } = useWalletConnect();
 const delegate = useDelegate();
 const staking = useStaking(address);
 const unbond = useUnbond();
 const redelegate = useRedelegate();
 const {
    loading,
    accountInfo,
    isClaimLoading,
    claimInfo,
    errorClaim,
    isClaimModalOpen,
    transactionHash,
    selectedClaim,
    handleToggleClaimItemModal,
    handleClaimButtonClick,
    handleClaimChange,
    handleToggleClaimModal,
    handleCloseCongratulationsModal,
  } = useAccountInfo();

  useEffect(() => {
    document.title = 'Staking';
  }, []);

  const handleRedelegate = () => {
    const { amount, customMemo, validator } = staking.selectedData;
    staking.handleCloseModal();
    redelegate.handleOpenModal(validator, amount, customMemo);
  }

  const handleUnbond = () => {
    const { amount, customMemo, validator } = staking.selectedData;
    staking.handleCloseModal();
    unbond.handleOpenModal(validator, amount, customMemo);
  }

  return (
    <>
      <Helmet>
        <title>Staking</title>
      </Helmet>
      <div className="staking-content">
        <StakingScreen
          address={address}
          accountInfo={accountInfo}
          isAccountInfoLoading={loading}
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
          staking={{
            totalValidators: staking.totalValidators,
            validators: staking.validators,
            currentTab: staking.currentTab,
            params: staking.params,
            isLoading: staking.isLoading,
            slashingParams: staking.slashingParams,
            signingInfos: staking.signingInfos,
            validatorTab: staking.validatorTab,
            rewards: staking.rewards,
            subTab: staking.subTab,
            apr: staking.apr,
            isAPRLoading: staking.isAPRLoading,
            bondedTokens: staking.bondedTokens,
            selectedModal: staking.selectedModal,
            selectedData: staking.selectedData,
            onSubTabChange: staking.handleSubTabChange,
            onValidatorTabChange: staking.handleValidatorTabChange,
            onTabChange: staking.handleTabChange,
            handleOpenModal: staking.handleOpenModal,
            handleCloseModal: staking.handleCloseModal,
            handleShowConfirmModal: staking.handleShowConfirmModal,
          }}
          claim={{
            onClaimButtonClick: handleClaimButtonClick,
            isClaimLoading: isClaimLoading,
            claimInfo: claimInfo,
            errorClaim: errorClaim,
            selectedClaim: selectedClaim,
            handleClaimChange: handleClaimChange,
            handleToggleClaimModal: handleToggleClaimModal,
            handleToggleClaimItemModal: handleToggleClaimItemModal,
            isClaimModalOpen: isClaimModalOpen,
            transactionHash: transactionHash,
            onCloseCongratulationsModal: handleCloseCongratulationsModal,
          }}
          activityData={{
            isActivitiesLoading: staking.isActivitiesLoading,
            activities: staking.activities,
            activitiesError: staking.activitiesError,
          }}
          unbonding={{
            isLoading: staking.isUnbondingDelegationsLoading,
            unbondingDelegations: staking.unbondingDelegations,
            unbondingDelegationsError: staking.unbondingDelegationsError,
          }}
          unbondOptions={{
            isUnbondLoading: unbond.isLoading,
            error: unbond.error,
            optionsAdvanced: unbond.optionsAdvanced,
            showAdvanced: unbond.showAdvanced,
            isOpenModal: unbond.isOpenModal,
            availableAmount: unbond.availableAmount,
            transactionHash: unbond.transactionHash,
            onCloseCongratulationsModal: unbond.handleCloseCongratulationsModal,
            onCloseDailogChange: unbond.handleCloseModal,
            onOpenModal: handleUnbond,
            onSendClick: unbond.handleSendClick,
            onInputChange: unbond.handleInputChange,
            onAdvancedCheckedChange: unbond.handleShowAdvancedChange,
          }}
          redelegateOptions={{
            isRedelegateLoading: redelegate.isLoading,
            error: redelegate.error,
            optionsAdvanced: redelegate.optionsAdvanced,
            showAdvanced: redelegate.showAdvanced,
            isOpenModal: redelegate.isOpenModal,
            availableAmount: redelegate.availableAmount,
            validators: redelegate.validators,
            transactionHash: redelegate.transactionHash,
            onCloseCongratulationsModal: redelegate.handleCloseCongratulationsModal,
            onCloseDailogChange: redelegate.handleCloseModal,
            onOpenModal: handleRedelegate,
            onSendClick: redelegate.handleSendClick,
            onInputChange: redelegate.handleInputChange,
            onAdvancedCheckedChange: redelegate.handleShowAdvancedChange,
          }}
        />
      </div>
    </>
  )
}
