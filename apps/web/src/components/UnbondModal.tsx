import {
  YStack,
  H3,
  Button,
  Dialog,
  Label,
  Input,
  Checkbox,
} from 'tamagui';
import { CircleX, Check as CheckIcon } from '@tamagui/lucide-icons';

import { formatNumber } from '@/utils/format';
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
  onCloseDailogChange: () => void;
  onSendClick: () => void;
  onInputChange: (name: string, value: string) => void;
  onAdvancedCheckedChange: (checked: boolean) => void;
  transactionHash?: string;
  onCloseCongratulationsModal?: () => void;
}

export default function UnbondModal({
    isOpen,
    isUnbondLoading,
    error,
    optionsAdvanced,
    showAdvanced,
    availableAmount,
    transactionHash = '',
    onCloseDailogChange,
    onSendClick,
    onInputChange,
    onAdvancedCheckedChange,
    onCloseCongratulationsModal,
}: IUnbondModal) {
  if (transactionHash) {
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
            <div className='withdraw-main-content relative text-center p-5'>
              <H3 className='!text-green-500 text-[32px]'>Congratulations! unbond completed successfully.</H3>
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
          <div className='withdraw-main-content relative'>
            <Loading isLoading={isUnbondLoading} />
            <div className='flex justify-between items-center'>
              <H3 className='text-lumera-label text-[32px]'>Unbond</H3>
              <button className='btn-close-modal cursor-pointer' onClick={onCloseDailogChange}><CircleX /></button>
            </div>
            <div className='mt-1'>
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
              <div className='flex items-center justify-between'>
                <Label htmlFor="amount" className='text-base'>Amount</Label>
                <span className='text-sm text-gray-600'>{formatNumber(availableAmount, { decimalsLength: 2})} lume</span>
              </div>
              <div className='input-wrapper'>
                <Input
                  id="amount"
                  placeholder={`Available: ${formatNumber(availableAmount, { decimalsLength: 2})} lume`}
                  className='input has-symbol'
                  value={optionsAdvanced.amount}
                  onChangeText={(newValue) => onInputChange('amount', newValue)}
                />
                <span className='input-symbol'>lume</span>
              </div>
            </div>

            {showAdvanced ?
              <div className='mt-1'>
                <div>
                  <Label htmlFor="fees" className='text-base'>Fees</Label>
                  <div className='input-wrapper'>
                    <Input
                      id="fees"
                      placeholder="Fees"
                      className='input has-symbol'
                      value={optionsAdvanced.fees}
                      onChangeText={(newValue) => onInputChange('fees', newValue)}
                    />
                    <span className='input-symbol'>ulume</span>
                  </div>
                </div>
                <div className='mt-1'>
                  <Label htmlFor="gas" className='text-base'>Gas</Label>
                  <div className='input-wrapper'>
                    <Input
                      id="gas"
                      placeholder="Gas"
                      className='input'
                      value={optionsAdvanced.gas}
                      onChangeText={(newValue) => onInputChange('gas', newValue)}
                    />
                  </div>
                </div>
                <div className='mt-1'>
                  <Label htmlFor="memo" className='text-base'>Memo</Label>
                  <div className='input-wrapper'>
                    <Input
                      id="memo"
                      placeholder="Memo"
                      className='input'
                      value={optionsAdvanced.memo}
                      onChangeText={(newValue) => onInputChange('memo', newValue)}
                    />
                  </div>
                </div>
              </div>: null
            }

            <YStack space="$2" marginTop="$3">
              <div className='flex justify-between items-center'>
                <div className='flex gap-3 items-center'>
                  <Checkbox
                    id="advanced"
                    size="$4"
                    checked={showAdvanced}
                    onCheckedChange={onAdvancedCheckedChange}
                  >
                    <Checkbox.Indicator>
                      <CheckIcon />
                    </Checkbox.Indicator>
                  </Checkbox>

                  <Label size="$4" htmlFor="advanced">
                    Advanced
                  </Label>
                </div>
                <div className='btn-primary flex justify-end mt-3'>
                  <Button onPress={onSendClick} disabled={isUnbondLoading}>Send</Button>
                </div>
              </div>
            </YStack>
            {error && !isUnbondLoading ?
              <div className='text-lumera-red-light mt-3 max-w-sm'>{error}</div> : null
            }
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog>
  )
}
