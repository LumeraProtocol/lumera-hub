import React from 'react'
import { YStack, H2, Paragraph, Card, SizableText, H3, Input, Label, Text, Progress, Button } from 'tamagui'
import { Wallet, Calculator, Search } from '@tamagui/lucide-icons'
import { fromHex, toBase64, fromBase64, toHex } from '@cosmjs/encoding';

import Loading from '@/components/Loading';
import DelegateModal from '@/components/DelegateModal';
import { ConnectWalletButton } from '@/components/ConnectWallet';
import { AccountInfoData, Coin } from '@/hooks/useAccountInfo';
import { RATE_VALUE } from '@/hooks/useDeposit';
import { IValidator } from '@/types/validator';
import { formatToken, formatCommissionRate, formatNumber, percent } from '@/utils/format';
import { calculateTotalPower, calculatePercent, valconsToBase64, consensusPubkeyToHexAddress } from '@/utils/helpers';

type TSigningInfos = {
  address: string;
  index_offset: string;
  jailed_until: string;
  missed_blocks_counter: string;
  start_height: string;
  tombstoned: boolean;
}

type Ireward = {
  validator_address: string;
  reward: Coin[];
}

interface IStakingScreen {
  address: string;
  delegateOptions: {
    isVoteLoading: boolean;
    error: string | null;
    optionsAdvanced: {
        fees: string; 
        gas: string; 
        memo: string; 
        senderAddress: string; 
        amount: string; 
        validator: string; 
    };
    showAdvanced: boolean;
    validators: IValidator[];
    totalValidators: string;
    isLoading: boolean;
    isOpenModal: boolean;
    transactionHash?: string;
    onCloseCongratulationsModal?: () => void;
    onCloseDailogChange: () => void;
    onSendClick: () => void;
    onInputChange: (name: string, value: string) => void;
    onAdvancedCheckedChange: (checked: boolean) => void;
    onOpenModal: (validator: string) => void;
  };
  staking: {
    validators: IValidator[];
    totalValidators: string;
    currentTab: string;
    isLoading: boolean;
    params: {
      bond_denom: string;
      historical_entries: number;
      max_entries: number;
      max_validators: number;
      min_commission_rate: string;
      unbonding_time: string;
    };
    slashingParams: {
      signed_blocks_window: string;
      min_signed_per_window: string;
      downtime_jail_duration: string;
      slash_fraction_double_sign: string;
      slash_fraction_downtime: string;
    };
    signingInfos: TSigningInfos[];
    validatorTab: string;
    rewards: Ireward[];
    onValidatorTabChange: (tab: string) => void;
    onTabChange: (tab: string) => void;
  };
  accountInfo: AccountInfoData | null;
}

export const StakingScreen = ({ 
  address,
  delegateOptions,
  staking,
  accountInfo,
}: IStakingScreen) => {
  const getValidators = () => {
    const validators = staking?.currentTab === 'active' ? delegateOptions.validators : staking.validators;
    if (staking.validatorTab === 'my') {
      const validatorAddress = staking?.rewards?.map((item) => item.validator_address);
      if (validatorAddress?.length) {
        return validators.filter((item) => validatorAddress.includes(item.operator_address));
      }
    }
    return validators
  }

  const calcTotalValidatorByTab = (tab: string) => {
    if (staking.validatorTab === 'my') {
      const validatorAddress = staking?.rewards?.map((item) => item.validator_address);
       if (validatorAddress?.length) {
        switch (tab) {
          case "active":
            return delegateOptions.validators.filter((item) => validatorAddress.includes(item.operator_address)).length;
          case "inactive":
            return staking.validators.filter((item) => validatorAddress.includes(item.operator_address)).length;
          default:
            return "0";
        }
      }
    }

    switch (tab) {
      case "active":
        return delegateOptions?.totalValidators;
      case "inactive":
        return staking?.totalValidators;
      default:
          return "0";
    }
  }

  const getAllValidators = () => {
    if (staking.validatorTab === 'my') {
      const validatorAddress = staking?.rewards?.map((item) => item.validator_address);
      if (validatorAddress?.length) {
        return [...delegateOptions.validators, ...staking.validators].filter((item) => validatorAddress.includes(item.operator_address));
      }
    }

    return [...delegateOptions.validators, ...staking.validators];
  }

  const totalPower = calculateTotalPower(getValidators());
  const totalStaked = calculateTotalPower(getAllValidators());

  const getValidatorsBySort = () => {
    const validators = getValidators();

    return validators.sort((a, b) => Number(calculatePercent(b.delegator_shares, totalPower).replace('%', '')) - Number(calculatePercent(a.delegator_shares, totalPower).replace('%', '')));
  }

  const getTotalBalances = () => {
    let total = 0;
    if (accountInfo?.balances?.length) {
      for (const item of accountInfo?.balances) {
        if (item.denom === 'ulume') {
          total += Number(item.amount);
        }
      }
    }
    if (accountInfo?.delegations?.length) {
      for (const item of accountInfo?.delegations) {
        if (item.balance.denom === 'ulume') {
          total += Number(item.balance.amount);
        }
      }
    }
    return total / RATE_VALUE;
  }

  const getCurrentStakingAPR = () => {
    const validators = getAllValidators();
    const totalReward = validators.reduce((total, validator) => {
      const reward = Number(formatCommissionRate(validator.commission?.commission_rates?.rate).replace('%', '')) * Number(validator.delegator_shares) / 100;
      return reward + total
    }, 0);
    return percent(totalReward / totalStaked);
  }

  const getUptime = (validator: IValidator) => {
    const slashingParams = staking.slashingParams;
    const signingInfos = staking.signingInfos;
    const hex = consensusPubkeyToHexAddress(validator.consensus_pubkey);
    const window = Number(slashingParams.signed_blocks_window || 0);
    const signing = signingInfos.find((item) => {
      return toBase64(fromHex(hex)) === valconsToBase64(item.address)
    });
    return signing && window > 0
      ? (window - Number(signing.missed_blocks_counter)) / window
      : 0
  }

  return (
    <YStack flex={1} alignItems="center" justifyContent="center" gap="$2">
      {!address ?
        <Card elevate size="$4" bordered className='w-full'>
          <div className='flex flex-col items-center justify-center min-h-[80vh]'>
            <div className="w-20 h-20 rounded-full grid place-items-center staking-icon wallet">
              <Wallet size="$3" />
            </div>
            <H2 className='font-bold text-white text-[32px] leading-none !mt-5'>Connect Your Wallet</H2>
            <Paragraph className='text-base text-lumera-gray mx-auto max-w-[400px] text-center !mt-3'>Please connect your wallet to view this page and interact with the Lumera ecosystem.</Paragraph>
            <div className='text-center mt-4'>
              <ConnectWalletButton />
            </div>
          </div>
        </Card> :
        <div className='w-full'>
          <div className='w-full'>
            <ul className='flex gap-0 list-none tabs'>
              <li className={`tab-item ${staking.validatorTab === 'all' ? 'active' : ''}`}>
                <button className='tab-button cursor-pointer px-3' onClick={() => staking.onValidatorTabChange('all')}>All Validators</button>
              </li>
              <li className={`tab-item ${staking.validatorTab === 'my' ? 'active' : ''}`}>
                <button className='tab-button cursor-pointer px-3' onClick={() => staking.onValidatorTabChange('my')}>My Staking</button>
              </li>
            </ul>
          </div>
          <div>
          <div className='flex justify-between w-full gap-6 mt-6 staking-summary-wrapper relative'>
            <Loading isLoading={staking.isLoading || delegateOptions.isLoading} />
            <Card elevate size="$4" bordered className='w-2/3'>
              <Card.Header padded>
                <H3 className='text-lumera-label'>Total LUME Staked</H3>
                <div className='text-[40px] font-bold text-white'>
                  {formatNumber(totalStaked / 1000000, { decimalsLength: 0})} LUME
                </div>
              </Card.Header>
            </Card>
            <Card elevate size="$4" bordered className='current-staking-apr'>
              <Card.Header padded>
                <H3 className='text-lumera-label'>Current Staking APR</H3>
                <div className='!text-lumera-green font-bold text-[40px]'>
                  Coming soon
                </div>
              </Card.Header>
            </Card>
          </div>
          <Card elevate size="$4" bordered className='w-full mt-6'>
            <Card.Header padded>
              <div className='grid grid-cols-2 gap-6 w-full rewards-calculator-wrapper'>
                <div className='w-full'>
                  <H3 className='!flex gap-2 items-center rewards-calculator-icon'><Calculator /> <span>Rewards Calculator</span></H3>
                  <Text className='text-lumera-label text-base'>Estimate your potential earnings from staking LUME.</Text>
                  <div className='mt-5'>
                    <Label htmlFor="amount" className='text-base'>Amount to Stake</Label>
                    <div className='input-wrapper'>
                      <Input id="amount" placeholder="0.00" className='input has-symbol' />
                      <span className='input-symbol'>LUME</span>
                    </div>
                  </div>
                </div>
                <Card elevate size="$4" bordered className='w-full estimated-rewards-card'>
                  <Card.Header padded>
                    <H3>Estimated Rewards</H3>
                    <div className='mt-3 grid grid-cols-2 gap-2'>
                      <div className='flex flex-col'>
                        <SizableText className='text-lumera-label'>1 Day</SizableText>
                        <Text className='!text-lumera-green'><span className='font-bold text-base'>0.00</span> <SizableText className='text-lumera-label'>LUME</SizableText></Text>
                      </div>
                      <div className='flex flex-col'>
                        <SizableText className='text-lumera-label'>7 Days</SizableText>
                        <Text className='!text-lumera-green'><span className='font-bold text-base'>0.00</span> <SizableText className='text-lumera-label'>LUME</SizableText></Text>
                      </div>
                      <div className='flex flex-col'>
                        <SizableText className='text-lumera-label'>30 Days</SizableText>
                        <Text className='!text-lumera-green'><span className='font-bold text-base'>0.00</span> <SizableText className='text-lumera-label'>LUME</SizableText></Text>
                      </div>
                      <div className='flex flex-col'>
                        <SizableText className='text-lumera-label'>365 Days</SizableText>
                        <Text className='!text-lumera-green'><span className='font-bold text-base'>0.00</span> <SizableText className='text-lumera-label'>LUME</SizableText></Text>
                      </div>
                    </div>
                    <div className='!mt-3 text-lumera-label text-sm'>* All calculations are estimates based on the current APR and are subject to change.</div>
                  </Card.Header>
                </Card>
              </div>
            </Card.Header>
          </Card>
          <Card elevate size="$4" bordered className='w-full mt-6'>
            <Card.Header padded>
              <div className='flex justify-between w-full validators-control'>
                <div className='flex flex-col'>
                  <H3 className='leading-none'>All Validators</H3>
                  <SizableText className='text-lumera-label'>Delegate your stake to a validator to earn rewards.</SizableText>
                </div>
                <div className='hidden'>
                  <div className='input-wrapper'>
                    <Input id="amount" placeholder="Search validator" className='input has-symbol' />
                    <span className='input-symbol'>
                      <Search />
                    </span>
                  </div>
                </div>
              </div>
              <div className='mt-5 relative'>
                <Loading isLoading={staking.isLoading || delegateOptions.isLoading} />
                <ul className='flex gap-0 list-none tabs'>
                  <li className={`tab-item ${staking?.currentTab === 'active' ? 'active' : ''}`}>
                    <button className='tab-button cursor-pointer px-3' onClick={() => staking.onTabChange('active')}>Active ({calcTotalValidatorByTab('active')})</button>
                  </li>
                  <li className={`tab-item ${staking?.currentTab === 'inactive' ? 'active' : ''}`}>
                    <button className='tab-button cursor-pointer px-3' onClick={() => staking.onTabChange('inactive')}>Inactive ({calcTotalValidatorByTab('inactive')})</button>
                  </li>
                </ul>
                <table className='w-full table mt-5 staking-table'>
                  <thead>
                    <tr>
                      <th align='left' className='text-lumera-label validator'>Validator</th>
                      <th align='right' className='text-lumera-label staked-amount'>Staked Amount</th>
                      <th align='right' className='text-lumera-label commission'>Commission</th>
                      <th align='right' className='text-lumera-label voting-power'>Voting Power</th>
                      <th align='left' className='text-lumera-label uptime'>Uptime</th>
                    </tr>
                  </thead>
                  <tbody>
                    {getValidatorsBySort()?.map((validator) => {
                      const uptime = getUptime(validator);
                      const uptimePercent = percent(uptime);
                      return (
                        <tr key={validator.operator_address}>
                          <td data-label="Validator: ">
                            {validator.description.moniker}
                          </td>
                          <td data-label="Staked Amount: " align='right'>{formatToken({
                            amount: validator.tokens,
                            denom: staking.params.bond_denom,
                          }, true, '0,0')}</td>
                          <td data-label="Commission: " align='right'><Text>{formatCommissionRate(validator.commission?.commission_rates?.rate)}</Text></td>
                          <td data-label="Voting Power: " align='right'><Text>{calculatePercent(validator.delegator_shares, totalPower)}</Text></td>
                          <td data-label="Uptime: ">
                            <div className='flex w-full justify-between items-center gap-3 action-col'>
                              <div className='flex items-center gap-3'>
                                <div className='custom-progress'>
                                  <Progress size="$4" value={Number(uptimePercent.replace('%', ''))}>
                                    <Progress.Indicator animation="bouncy" />
                                  </Progress>
                                </div>
                                <Text className={uptime && uptime > 0.95 ? 'text-green-500' : 'text-red-500'}>{uptimePercent}</Text>
                              </div>
                              <div className='btn-secondary'>
                                <Button onPress={() => delegateOptions.onOpenModal(validator.operator_address)}>Delegate</Button>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </Card.Header>
          </Card>
        </div>
        <DelegateModal
          isOpen={delegateOptions.isOpenModal}
          availableAmount={getTotalBalances()}
          isVoteLoading={delegateOptions.isVoteLoading}
          onAdvancedCheckedChange={delegateOptions.onAdvancedCheckedChange}
          onCloseDailogChange={delegateOptions.onCloseDailogChange}
          onInputChange={delegateOptions.onInputChange}
          onSendClick={delegateOptions.onSendClick}
          optionsAdvanced={delegateOptions.optionsAdvanced}
          showAdvanced={delegateOptions.showAdvanced}
          error={delegateOptions.error}
          validators={delegateOptions.validators}
          transactionHash={delegateOptions.transactionHash}
          onCloseCongratulationsModal={delegateOptions.onCloseCongratulationsModal}
        />
      </div>
      }
    </YStack>
  )
}
