import { 
  YStack, 
  H3, 
  Button, 
  Dialog, 
  Label, 
  Input, 
  Checkbox, 
  Select,
  XStack,
} from 'tamagui';
import { CircleX, Check as CheckIcon, ChevronDown } from '@tamagui/lucide-icons';

import { formatNumber } from '@/utils/format';
import Loading from '@/components/Loading';
import { IValidator } from '@/types/validator';

interface IVoteModal {
  isOpen: boolean;
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

export default function DelegateModal({
    isOpen, 
    isVoteLoading, 
    error,
    optionsAdvanced,
    showAdvanced,
    availableAmount,
    validators,
    transactionHash = '',
    onCloseDailogChange, 
    onSendClick, 
    onInputChange,
    onAdvancedCheckedChange,
    onCloseCongratulationsModal,
}: IVoteModal) {
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
              <H3 className='!text-green-500 text-[32px]'>Congratulations! delegate completed successfully.</H3>
              <div className='mt-3'>
                <a href={`/tx/${transactionHash}`} className='text-lumera-label text-sm'>View Transaction</a>
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
            <Loading isLoading={isVoteLoading} />
            <div className='flex justify-between items-center'>
              <H3 className='text-lumera-label text-[32px]'>Stake</H3>
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
              <Label htmlFor="validator" className='text-base'>Validator</Label>
              <div className=''>
                  <Select
                    id="validator"
                    value={optionsAdvanced.validator}
                    onValueChange={(newValue) => onInputChange('validator', newValue)}
                  >
                  <Select.Trigger width={220} iconAfter={<ChevronDown size="$1" />}>
                      <Select.Value placeholder="Select a validator" />
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
                  <span className='text-sm text-gray-600'>{formatNumber(availableAmount, { decimalsLength: 6})} lume</span>
              </div>
              <div className='input-wrapper'>
                  <Input 
                      id="amount" 
                      placeholder={`Available: ${formatNumber(availableAmount, { decimalsLength: 6})} lume`}
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
                  <Button onPress={onSendClick} disabled={isVoteLoading}>Send</Button>
                </div>
              </div>
            </YStack>
            {error && !isVoteLoading ? 
              <div className='text-lumera-red-light mt-3 max-w-sm'>{error}</div> : null
            }
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog>  
  )
}