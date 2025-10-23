// apps/web/src/app/staking/page.tsx
'use client'
import { useEffect } from "react";
import { Helmet } from "react-helmet-async";

import { StakingScreen } from '@lumera-hub/ui/src/screens/StakingScreen'
import useWalletConnect from '@/hooks/useWalletConnect';
import useDelegate from '@/hooks/useDelegate';
import useStaking from '@/hooks/useStaking';
import useAccountInfo from '@/hooks/useAccountInfo';

export default function Page() {
 const { address } = useWalletConnect();
 const delegate = useDelegate();
 const staking = useStaking(address);
 const {
    loading,
    accountInfo,
    handleClaimButtonClick,
    isClaimLoading,
    claimInfo,
    errorClaim,
    handleClaimChange,
    handleToggleClaimModal,
    isClaimModalOpen,
    transactionHash,
    handleCloseCongratulationsModal,
  } = useAccountInfo();

  useEffect(() => {
    document.title = 'Staking';
  }, []);

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
            onSubTabChange: staking.handleSubTabChange,
            onValidatorTabChange: staking.handleValidatorTabChange,
            onTabChange: staking.handleTabChange,
          }}
          claim={{
            onClaimButtonClick: handleClaimButtonClick,
            isClaimLoading: isClaimLoading,
            claimInfo: claimInfo,
            errorClaim: errorClaim,
            handleClaimChange: handleClaimChange,
            handleToggleClaimModal: handleToggleClaimModal,
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
        />
      </div>
    </>
  )
}
