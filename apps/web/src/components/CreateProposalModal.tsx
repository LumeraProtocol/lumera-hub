import {
  H3,
  Dialog,
  VisuallyHidden,
  Select,
  XStack,
  Input,
  TextArea,
  Checkbox,
} from 'tamagui';
import {
  CircleX,
  ChevronDown,
  Check as CheckIcon,
} from '@tamagui/lucide-icons';
import { Check as CheckCircle, Info } from 'lucide-react';

import AppButton from '@/components/AppButton';
import Tooltip from '@/components/Tooltip';
import AppLink from '@/components/AppLink';
import Loading from '@/components/Loading';
import { formatNumber } from '@/utils/format';
import { STEPS, proposalTypes, GOVERNANCE_STATS } from '@/hooks/useGovernances';

interface ICreateProposalModal {
  isOpen: boolean;
  className?: string;
  step: number;
  proposal: {
    type: string;
    title: string;
    description: string;
    isExpedited: boolean;
    recipient: string;
    amount: string;
    module: string;
    key: string;
    newValue: string;
    upgradeVersion: string;
    policyCID: string;
    modelName: string;
    newWeight: string;
    nodeAddress: string;
    newCommission: string;
    delegationAddress: string;
    initialDeposit: string;
  };
  isLoading: boolean;
  msg: {
    type: string;
    message: string;
  };
  transactionHash: string;
  requiredDeposit: number;
  onNextClick: () => void;
  onBackClick: () => void;
  onCloseModal: () => void;
  onCreateProposalClick: () => void;
  onInputChange: (name: string, value: string, type?: string, checked?: boolean) => void;
}

export default function CreateProposalModal({
  isOpen,
  step,
  className = 'w-full md:w-[680px] max-w-[96vw]',
  proposal,
  isLoading,
  msg,
  transactionHash,
  requiredDeposit,
  onNextClick,
  onBackClick,
  onCloseModal,
  onInputChange,
  onCreateProposalClick,
}: ICreateProposalModal) {

  if (transactionHash && isOpen) {
    return (
      <Dialog
        open
        onOpenChange={onCloseModal}
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
                <H3 className='text-lumera-label text-[32px]'>Create Proposal</H3>
                <button className='btn-close-modal cursor-pointer' onClick={onCloseModal}><CircleX /></button>
              </div>
              <div className='mt-2 text-center'>
                <div className='flex justify-center'>
                  <CheckCircle className='w-12 h-12 text-lumera-green border border-lumera-green rounded-full p-3' />
                </div>
                <div className='mt-5 text-2xl'>Create Proposal Successfully</div>
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
                    onClick={onCloseModal}
                  >
                    Back to Governance
                  </button>
                </div>
              </div>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog>
    )
  }

  const renderStep3 = () => {
    switch(proposal.type) {
      case proposalTypes[1].value: // Parameter Change Proposal
        return (
          <>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Module</label>
              <Input
                id="module"
                className='input has-symbol'
                value={proposal.module}
                onChangeText={(newValue) => onInputChange('module', newValue)}
              />
              {msg?.type === 'module' ?
                <div className='text-lumera-red-light mt-5'>
                  {msg.message}
                </div> : null
              }
            </div>
            <div className='mt-3'>
              <label className="block text-sm font-medium text-gray-300 mb-1">Key</label>
              <Input
                id="key"
                className='input has-symbol'
                value={proposal.key}
                onChangeText={(newValue) => onInputChange('key', newValue)}
              />
              {msg?.type === 'key' ?
                <div className='text-lumera-red-light mt-5'>
                  {msg.message}
                </div> : null
              }
            </div>
            <div className='mt-3'>
              <label className="block text-sm font-medium text-gray-300 mb-1">New Value</label>
              <Input
                id="newValue"
                className='input has-symbol'
                value={proposal.newValue}
                onChangeText={(newValue) => onInputChange('newValue', newValue)}
              />
              {msg?.type === 'newValue' ?
                <div className='text-lumera-red-light mt-5'>
                  {msg.message}
                </div> : null
              }
            </div>
          </>
        );
      case proposalTypes[2].value: // Community Spend Proposal
        return (
          <>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1" htmlFor='recipient'>Recipient Address</label>
              <Input
                id="recipient"
                className='input has-symbol'
                value={proposal.recipient}
                onChangeText={(newValue) => onInputChange('recipient', newValue)}
              />
              {msg?.type === 'recipient' ?
                <div className='text-lumera-red-light mt-5'>
                  {msg.message}
                </div> : null
              }
            </div>
            <div className='mt-3'>
              <label className="block text-sm font-medium text-gray-300 mb-1">Amount (LUME)</label>
              <Input
                keyboardType="numeric"
                id="amount"
                className='input has-symbol'
                value={proposal.amount}
                onChangeText={(newValue) => onInputChange('amount', newValue)}
              />
              {msg?.type === 'amount' ?
                <div className='text-lumera-red-light mt-5'>
                  {msg.message}
                </div> : null
              }
            </div>
          </>
        );
      case proposalTypes[3].value: // Software Upgrade Proposal
        return (
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Upgrade Version</label>
            <Input
              id="upgradeVersion"
              className='input has-symbol'
              value={proposal.upgradeVersion}
              onChangeText={(newValue) => onInputChange('upgradeVersion', newValue)}
            />
            {msg?.type === 'upgradeVersion' ?
              <div className='text-lumera-red-light mt-5'>
                {msg.message}
              </div> : null
            }
          </div>
        );
      default:
        return <p className="text-gray-400">No specific parameters required for this proposal type.</p>;
    }
  };

  const getExpeditedProposalTooltip = () => {
    return (
      <div className='max-w-80 text-white'>
        If you choose the Expedited Proposal option, the minimum deposit is {formatNumber(GOVERNANCE_STATS.expeditedDepositRequired, { decimalsLength: 0 })} LUME.
      </div>
    )
  }

  const renderStep5 = () => {
    switch(proposal.type) {
      case proposalTypes[1].value: // Parameter Change Proposal
        return (
          <>
            <p className='mb-4'><strong className="text-gray-400">Module:</strong> {proposal.module}</p>
            <p className='mb-4'><strong className="text-gray-400">Key:</strong> {proposal.key}</p>
            <p className='mb-4'><strong className="text-gray-400">New Value:</strong> {proposal.newValue}</p>
          </>
        );
      case proposalTypes[2].value: // Community Spend Proposal
        return (
          <>
            <p className='mb-4'><strong className="text-gray-400">Recipient Address:</strong> {proposal.recipient}</p>
            <p className='mb-4'><strong className="text-gray-400">Amount (LUME):</strong> {proposal.amount}</p>
          </>
        );
      case proposalTypes[3].value: // Software Upgrade Proposal
        return (
          <>
            <p><strong className="text-gray-400">Upgrade Version:</strong> {proposal.upgradeVersion}</p>
          </>
        );
      default:
        return <p className="text-gray-400">No specific parameters required for this proposal type.</p>;
    }
  };

  return (
    <Dialog
      open={isOpen}
      onOpenChange={onCloseModal}
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
          <div className={`relative p-3 ${className}`}>
            <div className='flex justify-between items-center'>
              <H3 className='text-lumera-label text-[32px]'>Create Proposal</H3>
              <button className='btn-close-modal cursor-pointer' onClick={onCloseModal}>
                <CircleX />
              </button>
            </div>
            <div className='mt-5 relative'>
              <Loading isLoading={isLoading} />
              <div className="mb-6">
                <div className="flex justify-between mb-1">
                  {STEPS.map((s, i) => (
                    <div key={s} className={`w-full text-center text-sm font-medium ${step > i + 1 ? 'text-lumera-teal' : step === i + 1 ? 'text-white' : 'text-gray-500'}`}>{s}</div>
                  ))}
                </div>
                <div className="flex">
                  {STEPS.map((_, i) => (
                    <div key={i} className={`w-full h-1 rounded-full ${step > i ? 'bg-lumera-teal' : 'bg-gray-700'}`}></div>
                  ))}
                </div>
              </div>

              {step === 1 && (
                <div className="space-y-4">
                  <h3 className="font-medium text-white">Select Proposal Type</h3>
                  <Select
                    id="type"
                    value={proposal.type}
                    onValueChange={(newValue) => onInputChange('type', newValue)}
                  >
                    <Select.Trigger width={'100%'} iconAfter={<ChevronDown size="$1" />}>
                      <Select.Value placeholder="Select a type" />
                    </Select.Trigger>
                    <Select.Content zIndex={200000}>
                        <Select.Viewport minWidth={200}>
                        <Select.Group>
                          {proposalTypes?.map((item, index) => {
                            return (
                              <Select.Item
                                  key={item.value}
                                  index={index}
                                  value={item.value}
                              >
                                  <Select.ItemText>{item.label}</Select.ItemText>
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
              )}

              {step === 2 && (
                <div className="space-y-4">
                  <h3 className="font-medium text-white">Proposal Details</h3>
                  <div>
                    <label htmlFor='title' className="block text-sm font-medium text-gray-300 mb-1">Title</label>
                    <Input
                      id="title"
                      className='input has-symbol'
                      value={proposal.title}
                      onChangeText={(newValue) => onInputChange('title', newValue)}
                    />
                    {msg?.type === 'title' ?
                      <div className='text-lumera-red-light mt-5'>
                        {msg.message}
                      </div> : null
                    }
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">Description</label>
                    <TextArea
                      id="description"
                      value={proposal.description}
                      onChangeText={(newValue) => onInputChange('description', newValue)}
                      rows={5}
                      className="w-full bg-gray-900/50 border-gray-600 rounded-lg"
                    />
                    {msg?.type === 'description' ?
                      <div className='text-lumera-red-light mt-5'>
                        {msg.message}
                      </div> : null
                    }
                  </div>
                  <div className="flex items-center">
                     <Checkbox
                      id="isExpedited"
                      size="$4"
                      checked={proposal.isExpedited}
                      onCheckedChange={(checked) => onInputChange('isExpedited', '', 'checkbox', checked as boolean)}
                    >
                      <Checkbox.Indicator>
                        <CheckIcon />
                      </Checkbox.Indicator>
                    </Checkbox>
                    <div className='flex items-center gap-2'>
                      <label htmlFor="isExpedited" className="ml-2 text-sm text-gray-300">
                        Expedited Proposal (requires higher deposit)
                      </label>
                      <Tooltip icon={<Info />} content={getExpeditedProposalTooltip()} />
                    </div>
                  </div>
                </div>
              )}

              {step === 3 && (
                <div className="space-y-4">
                  <h3 className="font-medium text-white">Specific Parameters</h3>
                  {renderStep3()}
                </div>
              )}

              {step === 4 && (
                <div className="space-y-4">
                  <h3 className="font-medium text-white">Initial Deposit</h3>
                  <p className="text-sm text-gray-400">An initial deposit is required to submit a proposal. This amount is returned if the proposal passes or is rejected, but is burned if it fails to meet the deposit threshold.</p>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">Deposit Amount (min. {formatNumber(requiredDeposit, { decimalsLength: 0 })} LUME)</label>
                    <Input
                      id="initialDeposit"
                      className='input has-symbol'
                      value={proposal.initialDeposit}
                      onChangeText={(newValue) => onInputChange('initialDeposit', newValue)}
                    />
                    {msg?.type === 'initialDeposit' ?
                      <div className='text-lumera-red-light mt-5'>
                        {msg.message}
                      </div> : null
                    }
                  </div>
                </div>
              )}

              {step === 5 && (
                <div className="space-y-4 text-sm">
                  <h3 className="font-medium text-white">Review Proposal</h3>
                  <p className='mb-4'><strong className="text-gray-400">Type:</strong> {proposal.type}</p>
                  <p className='mb-4'><strong className="text-gray-400">Title:</strong> {proposal.title}</p>
                  <p className='mb-4'><strong className="text-gray-400">Description:</strong> {proposal.description}</p>
                  <p className='mb-4'><strong className="text-gray-400">Expedited:</strong> {proposal.isExpedited ? 'Yes' : 'No'}</p>
                  <div className="pt-4 border-t border-gray-700/20">
                    {renderStep5()}
                  </div>
                  <p className="pt-4 border-t border-gray-700/50">
                    <strong className="text-gray-400">Initial Deposit:</strong> {formatNumber(proposal.initialDeposit, { decimalsLength: 0 })} LUME
                  </p>
                </div>
              )}

              <div className="mt-8 flex justify-between">
                <AppButton onClick={onBackClick} variant="secondary" disabled={step === 1}>Back</AppButton>
                {step < 5 && <AppButton onClick={onNextClick}>Next</AppButton>}
                {step === 5 && <AppButton onClick={onCreateProposalClick}>Submit Proposal</AppButton>}
              </div>
              {msg?.type === 'error' ?
                <div className='text-lumera-red-light mt-5'>
                  {msg.message}
                </div> : null
              }
              {msg?.type === 'success' ?
                <div className='text-lumera-green mt-5'>
                  {msg.message}
                </div> : null
              }
            </div>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog>
  )
}
