import {
  Button,
  Dialog,
  Label,
  Input,
  Select,
  XStack,
  VisuallyHidden,
} from 'tamagui';
import { CircleX, Check as CheckIcon, ChevronDown } from '@tamagui/lucide-icons';
import numeral from 'numeral';
import {
  Check as CheckCircle,
} from 'lucide-react';

import { AppLoading } from '@/components/Loading';
import { IValidator } from '@/types/validator';
import AppLink from '@/components/AppLink';

interface IRedelegateModal {
  isOpen: boolean;
  isRedelegateLoading: boolean;
  error: string | null;
  optionsAdvanced: {
    fees: string;
    gas: string;
    memo: string;
    senderAddress: string;
    amount: string;
    destinationValidator: string;
    sourceValidator: string;
    validatorName: string;
  };
  availableAmount: number;
  showAdvanced: boolean;
  onCloseDailogChange: () => void;
  onSendClick: () => void;
  onInputChange: (name: string, value: string) => void;
  onAdvancedCheckedChange: (checked: boolean) => void;
  validators: IValidator[];
  transactionHash?: string;
  onCloseCongratulationsModal?: () => void;
}

export default function RedelegateModal({
    isOpen,
    isRedelegateLoading,
    error,
    optionsAdvanced,
    availableAmount,
    validators,
    transactionHash = '',
    onCloseDailogChange,
    onSendClick,
    onInputChange,
    onCloseCongratulationsModal,
}: IRedelegateModal) {
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
                <h3 className='text-2xl font-bold text-white'>Redelegate from Validator</h3>
                <button className='btn-close-modal cursor-pointer' onClick={onCloseCongratulationsModal}><CircleX /></button>
              </div>
              <div className='mt-2 text-center'>
                <div className='flex justify-center'>
                  <CheckCircle className='w-12 h-12 text-lumera-green border border-lumera-green rounded-full p-3' />
                </div>
                <div className='mt-5 text-2xl'>Redelegate Successfully</div>
                {optionsAdvanced?.amount ?
                  <div className='mt-1'>You have restaked {optionsAdvanced?.amount} Lume</div> : null
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
            <AppLoading
              isLoading={isRedelegateLoading}
              className="w-10 h-10 !border-2"
              iconWidth={20}
              iconHeight={20}
              containerClassName='absolute top-1/2 left-1/2 -translate-1/2 w-10 h-10 z-50'
            />
            <div className='flex justify-between items-center'>
              <h3 className='text-2xl font-bold text-white'>Redelegate from Validator</h3>
              <button className='btn-close-modal cursor-pointer' onClick={onCloseDailogChange}><CircleX /></button>
            </div>
            <div className='mt-1 hidden'>
              <Label htmlFor="sender" className='text-base'>Sender</Label>
              <div className='input-wrapper'>
                <Input
                  id="sender"
                  placeholder="Sender"
                  className='input'
                  value={optionsAdvanced.senderAddress}
                  onChangeText={(newValue) => onInputChange('senderAddress', newValue)}
                />
              </div>
            </div>
            <div className='mt-1'>
              <Label htmlFor="sourceValidator" className='text-base'>Source Validator</Label>
              <div className='input-wrapper'>
                <Input
                  id="sourceValidator"
                  placeholder="Source Validator"
                  className='input !opacity-30'
                  value={optionsAdvanced.sourceValidator}
                  onChangeText={(newValue) => onInputChange('sourceValidator', newValue)}
                  readOnly
                />
              </div>
            </div>
            <div className='mt-1'>
              <Label htmlFor="destinationValidator" className='text-base'>Destination Validator</Label>
              <div className='w-full'>
                <Select
                  id="destinationValidator"
                  value={optionsAdvanced.destinationValidator}
                  onValueChange={(newValue) => onInputChange('destinationValidator', newValue)}
                >
                  <Select.Trigger width={'100%'} iconAfter={<ChevronDown size="$1" />}>
                    <Select.Value placeholder="Select a destination validator" />
                  </Select.Trigger>
                  <Select.Content zIndex={200000}>
                      <Select.Viewport minWidth={200}>
                      <Select.Group>
                        {validators?.map((item, index) => {
                          return (
                            <Select.Item
                              key={index}
                              index={index}
                              value={item.operator_address}
                            >
                              <Select.ItemText>{item.description.moniker} ({Number(Number(item.commission.commission_rates.rate).toFixed(2)) * 100}%)</Select.ItemText>
                              <XStack flex={1} />
                              <Select.ItemIndicator marginLeft="auto">
                                <CheckIcon size={16} />
                              </Select.ItemIndicator>
                            </Select.Item>
                          )
                        })}
                      </Select.Group>
                      </Select.Viewport>
                  </Select.Content>
                </Select>
              </div>
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
                  placeholder={`Available: ${numeral(availableAmount).format('0.[000000]')} lume`}
                  className='input has-symbol'
                  value={optionsAdvanced.amount}
                  onChangeText={(newValue) => onInputChange('amount', newValue)}
                />
                <span className='input-symbol'>lume</span>
              </div>
            </div>

            <div className='mt-5 btn-primary full'>
              <Button onPress={onSendClick} disabled={isRedelegateLoading}>
                <strong>Restake</strong>
              </Button>
            </div>
            {error && !isRedelegateLoading ?
              <div className='text-lumera-red-light mt-3 max-w-sm'>{error}</div> : null
            }
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog>
  )
}
