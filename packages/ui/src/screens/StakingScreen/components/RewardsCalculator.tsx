import { useState } from 'react';
import {
  Card,
  SizableText,
  Input,
  Label,
  Text,
} from 'tamagui';
import { Calculator } from '@tamagui/lucide-icons';
import {  RefreshCcw } from 'lucide-react';

import { AppLoading } from '@/components/Loading';
import AppButton from '@/components/AppButton';
import SectionTitle from '@/components/SectionTitle';
import { RATE_VALUE } from '@/contants';
import { DENOM } from '@/contants/network';
import { formatTokenDisplay } from '@/utils/format';

interface IRewardsCalculator {
  apr: number;
  availableAmount: number;
  canDelegate: boolean;
  isLoading: boolean;
  onStakingButtonClick: (amount: string) => void;
  onRefreshBalance: () => void;
}

export default function RewardsCalculator({
  apr,
  availableAmount,
  canDelegate,
  isLoading,
  onStakingButtonClick,
  onRefreshBalance,
}: IRewardsCalculator) {
  const [amount, setAmount] = useState('0');
  const [error, setError] = useState('');
  const [estimatedRewards, setEstimatedRewards] = useState(0);

  const handleAmountChange = (text: string) => {
    const numericText = text.replace(/[^0-9.]/g, '');
    const parts = numericText.split('.');
    let amount = 0;
    if (parts.length > 2) {
      const filteredText = parts[0] + '.' + parts.slice(1).join('');
      setAmount(filteredText);
      amount = Number(filteredText);
    } else {
      setAmount(numericText);
      amount = Number(numericText);
    }
    const t = 1;
    const result = amount * (apr / 100) * (t / 365);
    setEstimatedRewards(result);
  }

  const handleStakingClick = () => {
    setError('');
    if (!Number(amount)) {
      setError('Please enter amount.');
      return;
    }
    if (Number(amount) <= 0) {
      setError('Amount must not be less than 0.');
      return;
    }
    if (availableAmount && Number(amount) > Number(availableAmount)) {
      setError('Amount cannot exceed the available balance.');
      return;
    }
    onStakingButtonClick(`${amount}`);
  }

  return (
    <Card elevate size="$4" bordered className='w-full mt-6'>
      <Card.Header padded>
        <div className='grid grid-cols-1 md:grid-cols-2 gap-6 w-full rewards-calculator-wrapper'>
          <div className='w-full'>
            <SectionTitle className='rewards-calculator-icon flex gap-2 items-center'><Calculator /> <span>Stake LUME</span></SectionTitle>
            <Text className='text-lumera-label text-base'>Estimate your potential rewards based on current network APR</Text>
            <div className='mt-5'>
              <div className='flex justify-between items-center gap-3'>
                <Label htmlFor="amount" className='!text-base !font-semibold'>
                  Amount
                </Label>
                {availableAmount ?
                  <div className='text-sm font-normal flex gap-2 items-center'>
                    {isLoading ?
                      <div className='relative min-h-9 w-9 mr-1'>
                        <AppLoading
                          isLoading
                          hideOverlay
                          className="w-8 h-8 !border-3"
                          iconWidth={16}
                          iconHeight={16}
                          containerClassName='absolute top-1/2 left-1/2 -translate-1/2 w-8 h-8 z-50'
                        />
                      </div> :
                      <>
                        <button type="button" onClick={onRefreshBalance} className='cursor-pointer'>
                          <RefreshCcw className='w-4 h-4' />
                        </button>
                        <span>Available: {formatTokenDisplay({
                          amount: `${availableAmount * RATE_VALUE}`,
                          denom: DENOM,
                        })}</span>
                        <button
                          type='button'
                          className='bg-lumera-teal rounded-[9px] text-white py-0.5 px-2 text-[12px] cursor-pointer'
                          onClick={() => handleAmountChange(`${availableAmount}`)}
                        >
                          MAX
                        </button>
                      </>
                    }
                  </div> : null
                }
              </div>
              <div className='input-wrapper'>
                <Input
                  id="amount"
                  placeholder="0.00"
                  className='input has-symbol'
                  keyboardType="numeric"
                  value={amount}
                  onChangeText={handleAmountChange}
                />
                <span className='input-symbol'>LUME</span>
              </div>
              {error ?
                <div className='text-lumera-red-light mt-3 max-w-sm'>{error}</div> : null
              }
              <div className={`${!canDelegate || !amount || amount === '0' ? 'btn-secondary' : 'btn-primary'} mt-5`}>
                <AppButton onClick={handleStakingClick} disabled={!canDelegate || !amount || amount === '0'}>
                  <span>{canDelegate ? 'Continue to Staking' : 'Connect Keplr to stake'}</span>
                </AppButton>
              </div>
            </div>
          </div>
          <Card elevate size="$4" bordered className='w-full estimated-rewards-card'>
            <Card.Header padded>
              <SectionTitle className='mb-0'>Estimated Staking Rewards</SectionTitle>
              <div className='mt-3 grid grid-cols-2 gap-2 estimated-rewards-results text-base'>
                <div className='flex flex-col'>
                  <SizableText className='text-lumera-label'>1 Day</SizableText>
                  <Text className='!text-lumera-green'>
                    <span className='font-bold text-base'>{estimatedRewards.toFixed(2)}</span> <SizableText className='text-lumera-label !text-base'>LUME</SizableText>
                  </Text>
                </div>
                <div className='flex flex-col'>
                  <SizableText className='text-lumera-label'>7 Days</SizableText>
                  <Text className='!text-lumera-green'>
                    <span className='font-bold text-base'>{(estimatedRewards * 7).toFixed(2)}</span> <SizableText className='text-lumera-label !text-base'>LUME</SizableText>
                  </Text>
                </div>
                <div className='flex flex-col'>
                  <SizableText className='text-lumera-label'>30 Days</SizableText>
                  <Text className='!text-lumera-green'>
                    <span className='font-bold text-base'>{(estimatedRewards * 30).toFixed(2)}</span> <SizableText className='text-lumera-label !text-base'>LUME</SizableText>
                  </Text>
                </div>
                <div className='flex flex-col'>
                  <SizableText className='text-lumera-label'>365 Days</SizableText>
                  <Text className='!text-lumera-green'>
                    <span className='font-bold text-base'>{(estimatedRewards * 365).toFixed(2)}</span> <SizableText className='text-lumera-label !text-base'>LUME</SizableText>
                  </Text>
                </div>
              </div>
              <div className='mt-3 text-lumera-label text-base'>* All calculations are estimates based on the current APR and are subject to change.</div>
            </Card.Header>
          </Card>
        </div>
      </Card.Header>
    </Card>
  );
}
