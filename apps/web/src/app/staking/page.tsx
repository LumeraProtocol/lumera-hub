// apps/web/src/app/staking/page.tsx
'use client'

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
    accountInfo,
  } = useAccountInfo();

  return (
    <>
      <Helmet>
          <title>Staking</title>
      </Helmet>
      <div className="staking-content">
        <StakingScreen 
          address={address} 
          accountInfo={accountInfo}
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
            onValidatorTabChange: staking.handleValidatorTabChange,
            onTabChange: staking.handleTabChange,
          }}
        />
      </div>
    </>
  )
}
