import {
  H3,
  Text,
  Dialog,
  VisuallyHidden,
} from 'tamagui';
import { CircleX } from '@tamagui/lucide-icons';
import { ChevronRight } from 'lucide-react';

import { IValidator } from '@/types';
import {
  formatToken,
  formatCommissionRate,
  formatAddress,
  percent,
} from '@/utils/format';
import { calculatePercent } from '@/utils/helpers';

interface IValidatorModal {
  onClose: () => void;
  isOpen: boolean;
  bond_denom: string;
  validators: IValidator[];
  totalPower: number;
  getUptime: (validator: IValidator) => number;
  onSelectValidator: (validator: string) => void;
}

export default function ValidatorModal({
  isOpen,
  bond_denom,
  validators,
  totalPower,
  getUptime,
  onClose,
  onSelectValidator,
}: IValidatorModal) {
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
            <div className='flex justify-between items-center mb-4'>
              <h3 className='text-2xl font-bold text-white'>Select a Validator</h3>
              <button className='btn-close-modal cursor-pointer' onClick={onClose}><CircleX /></button>
            </div>
            <div className='max-h-[80vh] overflow-auto !min-w-[950px]'>
              <table className='w-full table staking-table'>
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
                  {validators?.map((validator, index) => {
                    const uptime = getUptime(validator);
                    const uptimePercent = percent(uptime);
                    return (
                      <tr
                        key={validator.operator_address}
                        className={`cursor-pointer ${index % 2 === 0 ? '!bg-gray-900' : ''}`}
                        onClick={() => onSelectValidator(validator.operator_address)}
                      >
                        <td data-label="Validator: ">
                          {validator.description.moniker || formatAddress(validator.operator_address, 10, -5)}
                        </td>
                        <td data-label="Staked Amount: " align='right'>
                          {formatToken({
                            amount: validator.tokens,
                            denom: bond_denom,
                          }, true, '0,0')}
                        </td>
                        <td data-label="Commission: " align='right'>
                          <Text>{formatCommissionRate(validator.commission?.commission_rates?.rate)}</Text>
                        </td>
                        <td data-label="Voting Power: " align='right'><Text>{calculatePercent(validator.delegator_shares, totalPower)}</Text></td>
                        <td data-label="Uptime: ">
                          <div className='flex justify-between items-center'>
                            <Text className={uptime && uptime > 0.95 ? 'text-green-500' : 'text-red-500'}>{uptimePercent}</Text>
                            <button className='rounded-full p-2 hover:bg-lumera-sub-label cursor-pointer transition-all duration-300'><ChevronRight className='w-5 h-5' /></button>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog>
  )
}
