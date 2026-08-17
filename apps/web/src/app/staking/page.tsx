// apps/web/src/app/staking/page.tsx
'use client'
import { useEffect } from "react";
import { Helmet } from "react-helmet-async";

import { StakingScreen, getTotalBalances } from '@lumera-hub/ui/src/screens/StakingScreen'
import useWalletConnect from '@/hooks/useWalletConnect';
import useDelegate from '@/hooks/useDelegate';
import useStaking from '@/hooks/useStaking';
import useAccountInfo from '@/hooks/useAccountInfo';
import useUnbond from '@/hooks/useUnbond';
import useRedelegate from '@/hooks/useRedelegate';
import { useDispatch } from '@/redux/hooks';
import { setModalOpen } from '@/redux/wallet.slice';
import { KEPLR_WALLET_NAME } from '@/utils/wallet-selection';

export default function Page() {
  const dispatch = useDispatch();
  const { address, isEvm } = useWalletConnect();
  const staking = useStaking(address, isEvm);
  const {
    loading,
    accountInfo,
    isClaimLoading,
    claimInfo,
    errorClaim,
    isClaimModalOpen,
    transactionHash,
    selectedClaim,
    fetchData,
    handleToggleClaimItemModal,
    handleClaimButtonClick,
    handleClaimChange,
    handleToggleClaimModal,
    handleCloseCongratulationsModal,
  } = useAccountInfo();

  const delegate = useDelegate({
    availableAmount: `${getTotalBalances(accountInfo)}`,
    callback: fetchData,
    validators: staking.activeValidators,
    totalValidators: staking.totalValidators,
    isValidatorDataLoading: staking.isLoading,
  });
  const unbond = useUnbond({
    callback: () => {
      staking.fetchUnbondingDelegations();
      fetchData();
    },
  });

  const redelegate = useRedelegate({
    callback: () => {
      staking.fetchUnbondingDelegations();
      fetchData();
    },
  });

  useEffect(() => {
    document.title = 'Staking - Lumera Hub';
  }, []);

  return (
    <>
      <Helmet>
        <title>Staking - Lumera Hub</title>
      </Helmet>
      <div className="staking-content">
        <StakingScreen
          address={address}
          accountInfo={accountInfo}
          isAccountInfoLoading={loading}
          onRefreshBalance={fetchData}
          delegateOptions={{
            canDelegate: delegate.canDelegate,
            isVoteLoading: delegate.isLoading,
            error: delegate.error,
            optionsAdvanced: delegate.optionsAdvanced,
            showAdvanced: delegate.showAdvanced,
            validators: delegate.validators,
            totalValidators: delegate.totalValidators,
            isLoading: delegate.isFetchValidatorLoading,
            isOpenModal: delegate.isOpenModal,
            transactionHash: delegate.transactionHash,
            selectedModal: delegate.selectedModal,
            onCloseCongratulationsModal: delegate.handleCloseCongratulationsModal,
            onCloseDailogChange: delegate.handleCloseModal,
            onOpenModal: delegate.handleOpenModal,
            onSendClick: delegate.handleSendClick,
            onInputChange: delegate.handleInputChange,
            onAdvancedCheckedChange: delegate.handleShowAdvancedChange,
            onStakingButtonClick: delegate.handleStakingButtonClick,
            onCloseContinueToStakingModal: delegate.handleCloseContinueToStakingModal,
            onSelectValidator: delegate.handleSelectValidator,
            onStakingAmountChange: delegate.handleStakingAmountChange,
            onSwitchWallet: () => dispatch(setModalOpen({
              status: true,
              preferredWalletName: KEPLR_WALLET_NAME,
            })),
          }}
          staking={{
            totalValidators: staking.totalValidators,
            validators: staking.validators,
            currentTab: staking.currentTab,
            params: staking.params,
            isLoading: staking.isLoading,
            isRefreshing: staking.isRefreshing,
            refreshProgress: staking.refreshProgress,
            lastUpdated: staking.lastUpdated,
            refreshError: staking.error,
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
            onRefresh: staking.refreshOverview,
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
            onOpenModal: unbond.handleOpenModal,
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
            onOpenModal: redelegate.handleOpenModal,
            onSendClick: redelegate.handleSendClick,
            onInputChange: redelegate.handleInputChange,
            onAdvancedCheckedChange: redelegate.handleShowAdvancedChange,
          }}
        />
      </div>
    </>
  )
}
