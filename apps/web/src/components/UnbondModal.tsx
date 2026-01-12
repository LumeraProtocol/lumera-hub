import { useState } from 'react';
import {
  H3,
  Button,
  Dialog,
  Label,
  Input,
  VisuallyHidden,
  Checkbox,
} from 'tamagui';
import { CircleX } from '@tamagui/lucide-icons';
import numeral from 'numeral';
import {
  Check as CheckCircle,
} from 'lucide-react';

import Loading from '@/components/Loading';
import AppLink from '@/components/AppLink';

interface IUnbondModal {
  isOpen: boolean;
  isUnbondLoading: boolean;
  error: string | null;
  optionsAdvanced: {
    fees: string;
    gas: string;
    memo: string;
    senderAddress: string;
    amount: string;
    validator: string;
    validatorName: string;
  };
  availableAmount: number;
  showAdvanced: boolean;
  transactionHash?: string;
  validatorName?: string;
  onCloseDailogChange: () => void;
  onSendClick: () => void;
  onInputChange: (name: string, value: string) => void;
  onAdvancedCheckedChange: (checked: boolean) => void;
  onCloseCongratulationsModal?: () => void;
}

export default function UnbondModal({
  isOpen,
  isUnbondLoading,
  error,
  optionsAdvanced,
  availableAmount,
  transactionHash = '',
  validatorName = '',
  onCloseDailogChange,
  onSendClick,
  onInputChange,
  onCloseCongratulationsModal,
}: IUnbondModal) {
  const [isYes, setYes] = useState(false);

  if (transactionHash && isOpen) {
    return (
      <Dialog
        open
        onOpenChange={onCloseCongratulationsModal}
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
            <div className='withdraw-main-content relative text-center p-5 max-w-[450px]'>
              <div className='flex justify-between items-center'>
                <h3 className='text-2xl font-bold text-white'>Unstake {optionsAdvanced?.validatorName}</h3>
                <button className='btn-close-modal cursor-pointer' onClick={onCloseCongratulationsModal}><CircleX /></button>
              </div>
              <div className='mt-2 text-center'>
                <div className='flex justify-center'>
                  <CheckCircle className='w-12 h-12 text-lumera-green border border-lumera-green rounded-full p-3' />
                </div>
                <div className='mt-5 text-2xl'>Unbond Successfully</div>
                {optionsAdvanced?.amount ?
                  <div className='mt-1'>You have unbonded {optionsAdvanced?.amount} Lume</div> : null
                }
                <div className='mt-5'>
                  <AppLink
                    href={`/tx/${transactionHash}`}
                    className='text-lumera-teal hover:text-lumera-green text-sm'
                  >
                    View Transaction
                  </AppLink>
                </div>
                <div className='mt-2 pb-3'>
                  <button
                    className='cursor-pointer bg-lumera-teal hover:bg-lumera-green text-white rounded-[9px] px-4 py-2'
                    onClick={onCloseCongratulationsModal}
                  >
                    Back to Staking
                  </button>
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
      onOpenChange={onCloseDailogChange}
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
          <div className='withdraw-main-content relative'>
            <Loading isLoading={isUnbondLoading} />
            <div className='flex justify-between items-center'>
              <h3 className='text-2xl font-bold text-white'>Unstake LUME</h3>
              <button className='btn-close-modal cursor-pointer' onClick={onCloseDailogChange}><CircleX /></button>
            </div>
            <div className='mt-5'>
              {validatorName ?
                <div className='mb-1 flex gap-2 justify-between flex-nowrap sm:flex-wrap'>
                  <span>Selected Validator</span><span className='font-bold'>{validatorName}</span>
                </div> : null
              }
              <div className='flex items-center justify-between'>
                <Label htmlFor="amount" className='text-base'>Amount</Label>
                <div className='text-sm font-normal flex gap-2 items-center text-gray-600'>
                  <span>Available: {numeral(availableAmount).format('0.[000000]')}</span>
                  <button type='button' className='bg-lumera-teal rounded-[9px] text-white py-0.5 px-2 text-[12px] cursor-pointer' onClick={() => onInputChange('amount', `${availableAmount}`)}>MAX</button>
                </div>
              </div>
              <div className='input-wrapper'>
                <Input
                  id="amount"
                  placeholder={`Available: ${numeral(availableAmount).format('0.[000000]')} lume`}
                  className='input has-symbol'
                  value={optionsAdvanced.amount}
                  onChangeText={(newValue) => onInputChange('amount', newValue)}
                />
                <span className='input-symbol'>lume</span>
              </div>
            </div>
            <div className='flex gap-3 items-start mt-5'>
              <Checkbox
                id="termOfUse"
                size="$4"
                checked={isYes}
                onCheckedChange={(checked: boolean) => setYes(checked)}
              >
                <Checkbox.Indicator>
                  <CheckCircle />
                </Checkbox.Indicator>
              </Checkbox>

              <Label size="$4" htmlFor="termOfUse" className='!leading-[20px]'>
                I understand unstaking process will take 21 days and I will not be able to use my LUME during this period.
              </Label>
            </div>
            <div className='mt-5'>
               {error && !isUnbondLoading ?
                <div className='text-lumera-red-light mt-3 max-w-sm'>{error}</div> : null
              }
              <div className={`${!isYes ? 'btn-secondary' : 'btn-primary'} mt-8 full`}>
                <Button onPress={onSendClick} disabled={isUnbondLoading}><strong>Unstake</strong></Button>
              </div>
            </div>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog>
  )
}
