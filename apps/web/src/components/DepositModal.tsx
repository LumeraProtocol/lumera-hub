import { 
  YStack, 
  H3, 
  Button, 
  Dialog, 
  Label, 
  Input, 
  Checkbox, 
} from 'tamagui'
import { CircleX, Check as CheckIcon } from '@tamagui/lucide-icons'

import { formatNumber } from '@/utils/format';
import Loading from '@/components/Loading';

interface IVoteModal {
  isOpen: boolean;
  setOpen: (status: boolean) => void;
  sender: string;
  onVoteClick: () => void;
  isVoteLoading: boolean;
  error: string | null;
  voteAdvanced: {
    fees: string; 
    gas: string; 
    memo: string; 
    senderAddress: string; 
    depositAmount: string; 
  };
  handleVoteAdvancedChange: (name: string, value: string) => void;
  showAdvanced: boolean;
  handleAdvancedCheckedChange: (checked: boolean) => void;
  availableAmount: number;
}

export default function DepositModal({
    isOpen, 
    sender, 
    isVoteLoading, 
    error,
    voteAdvanced,
    showAdvanced,
    availableAmount,
    setOpen, 
    onVoteClick, 
    handleVoteAdvancedChange,
    handleAdvancedCheckedChange,
}: IVoteModal) {
    return (
      <Dialog
        open={isOpen}
        onOpenChange={setOpen}
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
                <H3 className='text-lumera-label text-[32px]'>Deposit</H3>
                <button className='btn-close-modal cursor-pointer' onClick={() => setOpen(false)}><CircleX /></button>
              </div>
              <div className='mt-1'>
                <Label htmlFor="sender" className='text-base'>Sender</Label>
                <div className='input-wrapper'>
                  <Input id="sender" placeholder="Sender" className='input' defaultValue={sender} readOnly />
                </div>
              </div>
              <div className='mt-1'>
                <div className='flex items-center justify-between'>
                    <Label htmlFor="depositAmount" className='text-base'>Amount</Label>
                    <span className='text-sm text-gray-600'>{formatNumber(availableAmount, { decimalsLength: 6})}lume</span>
                </div>
                <div className='input-wrapper'>
                    <Input 
                        id="depositAmount" 
                        placeholder={`Available: ${formatNumber(availableAmount, { decimalsLength: 6})}lume`}
                        className='input has-symbol' 
                        value={voteAdvanced.depositAmount} 
                        onChangeText={(newValue) => handleVoteAdvancedChange('depositAmount', newValue)} 
                    />
                    <span className='input-symbol'>ulume</span>
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
                        value={voteAdvanced.fees} 
                        onChangeText={(newValue) => handleVoteAdvancedChange('fees', newValue)} 
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
                        value={voteAdvanced.gas} 
                        onChangeText={(newValue) => handleVoteAdvancedChange('gas', newValue)} 
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
                        value={voteAdvanced.memo} 
                        onChangeText={(newValue) => handleVoteAdvancedChange('memo', newValue)} 
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
                      onCheckedChange={handleAdvancedCheckedChange}
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
                    <Button onPress={onVoteClick} disabled={isVoteLoading}>Send</Button>
                  </div>
                </div>
              </YStack>
              {error && !isVoteLoading ? 
                <div className='text-lumera-red-light mt-3'>{error}</div> : null
              }
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog>  
    )
}