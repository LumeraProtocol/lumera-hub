import {
  H3,
  Button,
  Dialog,
  Label,
  Input,
  VisuallyHidden,
} from 'tamagui';
import { CircleX } from '@tamagui/lucide-icons';
import numeral from 'numeral';

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
                <div>&nbsp;</div>
                <button className='btn-close-modal cursor-pointer' onClick={onCloseCongratulationsModal}><CircleX /></button>
              </div>
              <div className='mt-4'>
                <H3 className='!text-green-500 text-[32px] !leading-0'>Congratulations! unbond completed successfully.</H3>
              </div>
              <div className='mt-3'>
                <AppLink href={`/tx/${transactionHash}`} className='text-lumera-label text-sm'>View Transaction</AppLink>
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
              <H3 className='text-lumera-label text-[32px]'>Unstake {validatorName}</H3>
              <button className='btn-close-modal cursor-pointer' onClick={onCloseDailogChange}><CircleX /></button>
            </div>
            <div className='mt-1'>
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
                  placeholder={`Available: ${numeral(availableAmount).format('0.[000000]%')} lume`}
                  className='input has-symbol'
                  value={optionsAdvanced.amount}
                  onChangeText={(newValue) => onInputChange('amount', newValue)}
                />
                <span className='input-symbol'>lume</span>
              </div>
            </div>

            <div className='mt-5'>
               {error && !isUnbondLoading ?
                <div className='text-lumera-red-light mt-3 max-w-sm'>{error}</div> : null
              }
              <div className='btn-primary full mt-3'>
                <Button onPress={onSendClick} disabled={isUnbondLoading}><strong>Unstake</strong></Button>
              </div>
            </div>

          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog>
  )
}
