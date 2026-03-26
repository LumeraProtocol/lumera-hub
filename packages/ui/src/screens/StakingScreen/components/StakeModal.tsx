import { useState } from 'react';
import {
  Input,
  Label,
  Dialog,
  VisuallyHidden,
  Checkbox,
} from 'tamagui';
import { CircleX, Check as CheckIcon } from '@tamagui/lucide-icons';
import {
  Check as CheckCircle,
  RefreshCcw,
} from 'lucide-react';

import AppLink from '@/components/AppLink';
import { AppLoading } from '@/components/Loading';
import Skeleton from '@/components/Skeleton';
import AppButton from '@/components/AppButton';
import SectionTitle from '@/components/SectionTitle';
import { RATE_VALUE } from '@/contants';
import { IValidator } from '@/types';
import { DENOM } from '@/contants/network';
import { formatTokenDisplay } from '@/utils/format';

interface IStakeModal {
  isOpen: boolean;
  isLoading: boolean;
  availableAmount: number;
  validators: IValidator[];
  validator: string;
  amount: string;
  error: string;
  transactionHash?: string;
  isAccountLoading: boolean;
  onRefreshBalance: () => void;
  onClose: () => void;
  onSendClick: () => void;
  onCloseContinueToStakingModal: () => void;
  onStakingAmountChange: (amount: string) => void;
}

export default function StakeModal({
  isOpen,
  availableAmount,
  validators,
  validator,
  amount,
  transactionHash,
  isLoading,
  error,
  isAccountLoading,
  onRefreshBalance,
  onClose,
  onStakingAmountChange,
  onSendClick,
  onCloseContinueToStakingModal,
}: IStakeModal) {
  const info = validators.find((item) => item.operator_address === validator);
  const [isYes, setYes] = useState(false);

  const handleAdvancedCheckedChange = (checked: boolean) => {
    setYes(checked);
  }

  if (transactionHash) {
    return (
      <Dialog
        open={isOpen}
        onOpenChange={onCloseContinueToStakingModal}
        modal
      >
        <Dialog.Trigger asChild>
        </Dialog.Trigger>
        <Dialog.Portal>
          <Dialog.Overlay
            key="overlay"
            animation="quick"
            opacity={0.5}
            enterStyle={{ opacity: 0 }}
            exitStyle={{ opacity: 0 }}
          />

          <Dialog.Content
            bordered
            elevate
            key="content"
            animation={[
              'quick',
              {
                opacity: {
                  overshootClamping: true,
                },
              },
            ]}
            enterStyle={{ x: 0, y: -20, opacity: 0, scale: 0.9 }}
            exitStyle={{ x: 0, y: 10, opacity: 0, scale: 0.95 }}
            x={0}
            scale={1}
            opacity={1}
            y={0}
          >
            <VisuallyHidden>
              <Dialog.Title></Dialog.Title>
            </VisuallyHidden>
            <div className='withdraw-main-content relative p-5'>
              <div className='flex justify-between items-center mb-4'>
                <SectionTitle className='mb-0'>Stake {info?.description?.moniker}</SectionTitle>
                <button className='btn-close-modal cursor-pointer' onClick={onCloseContinueToStakingModal}><CircleX /></button>
              </div>
              <div className='mt-2 text-center'>
                <div className='flex justify-center'>
                  <CheckCircle className='w-12 h-12 text-lumera-green border border-lumera-green rounded-full p-3' />
                </div>
                <div className='mt-5 text-2xl'>Staked Successfully</div>
                <div className='mt-1'>You have staked {amount} Lume</div>
                <div className='mt-5'>
                  <AppLink
                    href={`/tx/${transactionHash}`}
                    className='text-lumera-teal hover:text-lumera-green text-sm'
                  >
                    View Transaction
                  </AppLink>
                </div>
                <div className='mt-2 flex justify-center'>
                  <AppButton
                    className='cursor-pointer'
                    onClick={onCloseContinueToStakingModal}
                  >
                    Back to Staking
                  </AppButton>
                </div>
              </div>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog>
    )
  }

  return (
    <Dialog
      open={isOpen}
      onOpenChange={onClose}
      modal
    >
      <Dialog.Trigger asChild>
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay
          key="overlay"
          animation="quick"
          opacity={0.5}
          enterStyle={{ opacity: 0 }}
          exitStyle={{ opacity: 0 }}
        />

        <Dialog.Content
          bordered
          elevate
          key="content"
          animation={[
            'quick',
            {
              opacity: {
                overshootClamping: true,
              },
            },
          ]}
          enterStyle={{ x: 0, y: -20, opacity: 0, scale: 0.9 }}
          exitStyle={{ x: 0, y: 10, opacity: 0, scale: 0.95 }}
          x={0}
          scale={1}
          opacity={1}
          y={0}
        >
          <VisuallyHidden>
            <Dialog.Title></Dialog.Title>
          </VisuallyHidden>
          <div className='withdraw-main-content relative p-5'>
            <AppLoading
              isLoading={isLoading}
              className="w-10 h-10 !border-2"
              iconWidth={20}
              iconHeight={20}
              containerClassName='absolute top-1/2 left-1/2 -translate-1/2 w-10 h-10 z-50'
            />
            <div className='flex justify-between items-center mb-4'>
              <SectionTitle className='mb-0'>Stake LUME</SectionTitle>
              <button className='btn-close-modal cursor-pointer' onClick={onClose}><CircleX /></button>
            </div>
            <div className='mt-5 relative'>
              {info?.description?.moniker ?
                <div className='mb-1 flex gap-2 justify-between flex-nowrap sm:flex-wrap'>
                  <span>Selected Validator</span><span className='font-bold'>{info?.description?.moniker}</span>
                </div> : null
              }
              <div className='flex justify-between items-center gap-3'>
                <Label htmlFor="amount" className='text-base !font-semibold'>
                  Amount
                </Label>
                {availableAmount ?
                  <div className='text-sm font-normal flex gap-2 items-center'>
                    {isAccountLoading ?
                      <Skeleton /> :
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
                          onClick={() => onStakingAmountChange(`${availableAmount}`)}
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
                  onChangeText={onStakingAmountChange}
                />
                <span className='input-symbol'>LUME</span>
              </div>
              <div className='flex gap-3 items-start mt-5'>
                <Checkbox
                  id="termOfUse"
                  size="$4"
                  checked={isYes}
                  onCheckedChange={handleAdvancedCheckedChange}
                >
                  <Checkbox.Indicator>
                    <CheckIcon />
                  </Checkbox.Indicator>
                </Checkbox>

                <Label size="$4" htmlFor="termOfUse" className='!leading-[20px]'>
                  I understand that unstaking will take 21 days for LUME to become liquid upon withdrawal.
                </Label>
              </div>
              <div className={`${!isYes ? 'btn-secondary' : 'btn-primary'} mt-8 full flex justify-end`}>
                <AppButton onClick={onSendClick} disabled={!isYes}>
                  <span>Stake</span>
                </AppButton>
              </div>
              {error && !isLoading ?
                <div className='text-lumera-red-light mt-3 max-w-sm'>{error}</div> : null
              }
            </div>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog>
  )
}
