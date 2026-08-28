import {
  YStack,
  Dialog,
  Label,
  Input,
  Checkbox,
  VisuallyHidden,
} from 'tamagui';
import { CircleX, Check as CheckIcon } from '@tamagui/lucide-icons';

import { formatTokenDisplay } from '@/utils/format';
import { AppLoading } from '@/components/Loading';
import AppLink from '@/components/AppLink';
import { DENOM } from '@/contants/network';
import SectionTitle from '@/components/SectionTitle';
import AppButton from '@/components/AppButton';
import { RATE_VALUE } from '@/contants';

interface IVoteModal {
  isEvm: boolean;
  isOpen: boolean;
  isVoteLoading: boolean;
  error: string | null;
  optionsAdvanced: {
    fees: string;
    gas: string;
    memo: string;
    senderAddress: string;
    amount: string;
    recipient: string;
    balances: string;
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

export default function SendModal({
    isEvm,
    isOpen,
    isVoteLoading,
    error,
    optionsAdvanced,
    showAdvanced,
    availableAmount,
    transactionHash,
    onCloseDailogChange,
    onSendClick,
    onInputChange,
    onAdvancedCheckedChange,
    onCloseCongratulationsModal,
}: IVoteModal) {
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
                <SectionTitle className='!text-green-500 !leading-0'>Congratulations! send completed successfully.</SectionTitle>
              </div>
              <div className='mt-3'>
                {isEvm ? (
                  <span className='font-mono text-sm break-all'>{transactionHash}</span>
                ) : (
                <AppLink href={`/tx/${transactionHash}`} className='text-lumera-teal hover:text-lumera-green text-sm'>View Transaction</AppLink>
                )}
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
              isLoading={isVoteLoading}
              className="w-10 h-10 !border-2"
              iconWidth={20}
              iconHeight={20}
              containerClassName='absolute top-1/2 left-1/2 -translate-1/2 w-10 h-10 z-50'
            />
            <div className='flex justify-between items-center'>
              <SectionTitle>Send</SectionTitle>
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
                  disabled={isEvm}
                  onChangeText={(newValue) => onInputChange('senderAddress', newValue)}
                />
              </div>
            </div>
            <div className='mt-1'>
              <Label htmlFor="recipient" className='text-base'>Recipient</Label>
              <div className='input-wrapper'>
                <Input
                  id="recipient"
                  placeholder={isEvm ? 'Lumera or 0x address' : 'Recipient'}
                  className='input'
                  value={optionsAdvanced.recipient}
                  onChangeText={(newValue) => onInputChange('recipient', newValue)}
                />
              </div>
            </div>
            <div className='mt-1'>
              <div className='flex items-center justify-between'>
                  <Label htmlFor="amount" className='text-base'>Amount</Label>
                  <span className='text-sm text-gray-600'>
                    {formatTokenDisplay({
                      amount: `${availableAmount * RATE_VALUE}`,
                      denom: DENOM,
                      })} lume
                    </span>
              </div>
              <div className='input-wrapper'>
                  <Input
                      id="amount"
                      placeholder={`Available: ${formatTokenDisplay({
                        amount: `${availableAmount * RATE_VALUE}`,
                        denom: DENOM,
                      })} lume`}
                      className='input has-symbol'
                      value={optionsAdvanced.amount}
                      onChangeText={(newValue) => onInputChange('amount', newValue)}
                  />
                  <span className='input-symbol'>lume</span>
              </div>
            </div>

            {showAdvanced && !isEvm ?
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
                {!isEvm ? <div className='flex gap-3 items-center'>
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
                </div> : null}
                <div className='btn-primary flex justify-end mt-3'>
                  <AppButton onClick={onSendClick} disabled={isVoteLoading}>Send</AppButton>
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
