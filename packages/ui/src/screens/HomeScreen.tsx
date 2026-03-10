import React, { useState } from 'react';
import dayjs from 'dayjs';
import ReactECharts from 'echarts-for-react';
import {
  YStack,
  Card,
  H3,
  H4,
  Text,
  SizableText,
  Dialog,
  Label,
  Input,
  RadioGroup,
  Checkbox,
  Select,
  XStack,
  VisuallyHidden,
} from 'tamagui';
import { CircleX, Check as CheckIcon, ChevronDown } from '@tamagui/lucide-icons';
import relativeTime from 'dayjs/plugin/relativeTime';
import {
  Vote,
  ArrowUpRight,
  BanknoteArrowUp,
  Unlink,
  Star,
  ClockPlus,
  Layers,
  Check as CheckCircle,
  Blocks,
  Landmark,
  ChartNoAxesCombined,
  LockKeyhole,
  DollarSign,
  Users,
  Upload,
} from 'lucide-react';

import { AppLoading } from '@/components/Loading';
import AppLink from '@/components/AppLink';
import AppButton from '@/components/AppButton';
import Skeleton from '@/components/Skeleton';
import { NAV_ITEMS } from '@/components/layout/AppShell';
import NoWalletConnected from '@/components/NoWalletConnected';
import SectionTitle from '@/components/SectionTitle';
import { AccountInfoData, getTotalRewards } from '@/hooks/useAccountInfo';
import useAppRouter from '@/hooks/useAppRouter';
import { IRecentActivity, TMessage } from '@/hooks/useRecentActivity';
import { IProposal, VOTE_OPTIONS, broadcastModeOptions } from '@/hooks/useProposals';
import useStats from '@/hooks/useStats';
import { formatToken, formatTokenDisplay } from '@/utils/format';
import { DENOM } from '@/contants/network';

dayjs.extend(relativeTime);

const COLORS = ['#078A8A', '#47C78A'];

interface IHomeScreen {
  address: string;
  loading: boolean;
  accountInfo: AccountInfoData | null;
  proposals: IProposal[];
  isProposalLoading: boolean;
  recentActivities: IRecentActivity[];
  isRecentActivityLoading: boolean;
  onOptionChange: (val: string) => void;
  onVoteClick: (item: IProposal | null) => void;
  isVoteLoading: boolean;
  error: string | null;
  voteAdvanced: {
    fees: string;
    gas: string;
    memo: string;
    broadcastMode: string;
  };
  handleVoteAdvancedChange: (name: string, value: string) => void;
  onClaimButtonClick: () => void;
  handleResetError: () => void;
  isClaimLoading: boolean;
  claimInfo: {
    senderAddress: string;
    fees: string;
    gas: string;
    memo: string;
    totalRewards: string;
  };
  errorClaim: string | null;
  handleClaimChange: (name: string, value: string) => void;
  handleToggleClaimModal: (status: boolean) => void;
  isClaimModalOpen: boolean;
  transactionHash?: string;
  onCloseCongratulationsModal?: () => void;
  voteTransactionHash?: string;
  onCloseVoteCongratulationsModal?: () => void;
  selectedItem: IProposal | null;
  setSelectedItem: (item: IProposal) => void;
}

interface IPortfolioOverviewChart {
  stacked: number;
  liquid: number;
}

interface IVoteModal {
  isOpen: boolean;
  setOpen: (status: boolean) => void;
  sender: string;
  onOptionChange: (val: string) => void;
  onVoteClick: (item: IProposal | null) => void;
  item: IProposal | null;
  isVoteLoading: boolean;
  error: string | null;
  voteAdvanced: {
    fees: string;
    gas: string;
    memo: string;
    broadcastMode: string;
  };
  handleVoteAdvancedChange: (name: string, value: string) => void;
  transactionHash?: string;
  onCloseCongratulationsModal?: () => void;
}

interface IClaimableRewardsModal {
  isOpen: boolean;
  setOpen: (status: boolean) => void;
  sender: string;
  onSendClick: () => void;
  isVoteLoading: boolean;
  error: string | null;
  voteAdvanced: {
    fees: string;
    gas: string;
    memo: string;
  };
  handleVoteAdvancedChange: (name: string, value: string) => void;
  transactionHash?: string;
  onCloseCongratulationsModal?: () => void;
  congratulationsMessage?: string;
  message?: {
    amount: string;
    from: string;
  };
  backButtonText?: string;
}

const getOption = (data: IPortfolioOverviewChart) => {
  return {
    tooltip: {
      trigger: 'item'
    },
    color: COLORS,
    series: [
      {
        name: 'Portfolio Overview',
        type: 'pie',
        radius: ['90%', '55%'],
        label: {
          show: false,
          position: 'center'
        },
        labelLine: {
          show: false
        },
        data: [
          { value: data.stacked, name: 'Stacked' },
          { value: data.liquid, name: 'Liquid' }
        ]
      }
    ]
  }
}

const getPortfolioData = (accountInfo: AccountInfoData | null) => {
  let stacked = 0;
  let liquid = 0;
  if (accountInfo) {
    stacked = accountInfo.delegations.reduce((total, item) => Number(item.balance.amount) + total, 0)
    liquid = accountInfo.balances.reduce((total, item) => Number(item.amount) + total, 0)
  }
  return {
    stacked,
    liquid,
  }
}

const formatMessage = (msgs: TMessage[]) => {
  if (msgs) {
    const sum: Record<string, number> = msgs
      .map((msg) => {
        const msgType = msg['@type'] || 'unknown';
        return msgType
          .substring(msgType.lastIndexOf('.') + 1)
          .replace('Msg', '');
      })
      .reduce((s, c) => {
        const sh: Record<string, number> = s;
        if (sh[c]) {
          sh[c] += 1;
        } else {
          sh[c] = 1;
        }
        return sh;
      }, {});
    const output: string[] = [];
    Object.keys(sum).forEach((k) => {
      output.push(sum[k] > 1 ? `${k}×${sum[k]}` : k);
    });
    return output.join(', ');
  }
}

export const VoteModal = ({
  isOpen,
  setOpen,
  sender,
  onOptionChange,
  onVoteClick,
  item,
  isVoteLoading,
  error,
  voteAdvanced,
  handleVoteAdvancedChange,
  transactionHash,
  onCloseCongratulationsModal,
}: IVoteModal) => {
  if (!isOpen) {
    return null;
  }
  const [showAdvanced, setShowAdvanced] = useState(false);

  const handleAdvancedCheckedChange = (checked: boolean) => {
    setShowAdvanced(checked);
  }

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
            <VisuallyHidden>
              <Dialog.Title></Dialog.Title>
            </VisuallyHidden>
            <div className='withdraw-main-content relative text-center p-5 max-w-[450px]'>
              <div className='flex justify-between items-center'>
                <div>&nbsp;</div>
                <button className='btn-close-modal cursor-pointer' onClick={onCloseCongratulationsModal}><CircleX /></button>
              </div>
              <div className='mt-4'>
                <SectionTitle className='!text-green-500 !leading-0'>Congratulations! vote completed successfully.</SectionTitle>
              </div>
              <div className='mt-3'>
                <AppLink href={`/tx/${transactionHash}`} className='text-lumera-teal hover:text-lumera-green text-base'>View Transaction</AppLink>
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
            <VisuallyHidden>
              <Dialog.Title></Dialog.Title>
            </VisuallyHidden>
            <div className='vote-main-content relative'>
              <AppLoading
                isLoading={isVoteLoading}
                className="w-10 h-10 !border-2"
                iconWidth={20}
                iconHeight={20}
                containerClassName='absolute top-1/2 left-1/2 -translate-1/2 w-10 h-10 z-50'
              />
              <div className='flex justify-between items-center'>
                <SectionTitle className='mb-0'>Vote</SectionTitle>
                <button className='btn-close-modal cursor-pointer' onClick={() => setOpen(false)}><CircleX /></button>
              </div>
              <div className='mt-1'>
                <Label htmlFor="sender" className='text-base'>Sender</Label>
                <div className='input-wrapper'>
                  <Input id="sender" placeholder="Sender" className='input' defaultValue={sender} readOnly />
                </div>
              </div>
              <div className='mt-1'>
                <Label htmlFor="option" className='text-base'>Option</Label>
                <RadioGroup aria-labelledby="Select one item" defaultValue="1" name="option" id="option" onValueChange={onOptionChange}>
                  <div className='flex items-center gap-6'>
                    {VOTE_OPTIONS?.map((item) => (
                      <div className='flex items-center gap-3' key={item.value}>
                        <RadioGroup.Item value={item.value} id={`radiogroup-${item.value}`} size="$4">
                          <RadioGroup.Indicator />
                        </RadioGroup.Item>

                        <Label size="$4" id={`radiogroup-${item.value}`} className='leading-none'>
                          {item.label}
                        </Label>
                      </div>
                    ))}
                  </div>
                </RadioGroup>
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
                  <div className='mt-1'>
                    <Label htmlFor="broadcastMode" className='text-base'>Broadcast Mode</Label>
                    <div className=''>
                      <Select
                        id="broadcastMode"
                        value={voteAdvanced.broadcastMode}
                        onValueChange={(newValue) => handleVoteAdvancedChange('broadcastMode', newValue)}
                      >
                        <Select.Trigger width={220} iconAfter={<ChevronDown size="$1" />}>
                          <Select.Value placeholder="Broadcast Mode" />
                        </Select.Trigger>

                        <Select.Content zIndex={200000}>
                          <Select.Viewport minWidth={200}>
                            <Select.Group>
                              {broadcastModeOptions.map((item, i) => (
                                <Select.Item
                                  index={i}
                                  key={item.value}
                                  value={item.value}
                                >
                                  <Select.ItemText>{item.name}</Select.ItemText>
                                  <XStack flex={1} />
                                  <Select.ItemIndicator marginLeft="auto">
                                    <CheckIcon size={16} />
                                  </Select.ItemIndicator>
                                </Select.Item>
                              ))}
                            </Select.Group>
                          </Select.Viewport>
                        </Select.Content>
                      </Select>
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
                    <AppButton onClick={() => onVoteClick(item)} disabled={isVoteLoading}>Send</AppButton>
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

export const ClaimableRewardsModal = ({
  isOpen,
  sender,
  isVoteLoading,
  error,
  transactionHash,
  message,
  setOpen,
  onSendClick,
  onCloseCongratulationsModal,
  backButtonText = 'Back to Staking',
}: IClaimableRewardsModal) => {
  if (!isOpen) {
    return null;
  }

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
            <VisuallyHidden>
              <Dialog.Title></Dialog.Title>
            </VisuallyHidden>
            <div className='withdraw-main-content relative text-center p-5 max-w-[450px]'>
              <div className='flex justify-between items-center'>
                <SectionTitle className='mb-0'>Claim Rewards</SectionTitle>
                <button className='btn-close-modal cursor-pointer' onClick={onCloseCongratulationsModal}><CircleX /></button>
              </div>
              <div className='mt-2 text-center'>
                <div className='flex justify-center'>
                  <CheckCircle className='w-12 h-12 text-lumera-green border border-lumera-green rounded-full p-3' />
                </div>
                <div className='mt-5 text-2xl'>Claim Rewards Successfully</div>
                {message?.amount ?
                  <div className='mt-1'>You have claim {message?.amount} Lume</div> : null
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
                  <AppButton
                    className='cursor-pointer'
                    onClick={onCloseCongratulationsModal}
                  >
                    {backButtonText}
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
            <VisuallyHidden>
              <Dialog.Title></Dialog.Title>
            </VisuallyHidden>
            <div className='withdraw-main-content relative max-w-[450px]'>
              <AppLoading
                isLoading={isVoteLoading}
                className="w-10 h-10 !border-2"
                iconWidth={20}
                iconHeight={20}
                containerClassName='absolute top-1/2 left-1/2 -translate-1/2 w-10 h-10 z-50'
              />
              <div className='flex justify-between items-center'>
                <SectionTitle className='mb-0'>Withdraw</SectionTitle>
                <button className='btn-close-modal cursor-pointer' onClick={() => setOpen(false)}><CircleX /></button>
              </div>
              <div className='mt-1 hidden'>
                <Label htmlFor="sender" className='text-base'>Sender</Label>
                <div className='input-wrapper'>
                  <Input id="sender" placeholder="Sender" className='input' defaultValue={sender} readOnly />
                </div>
              </div>
              <div className='mt-5 text-base'>
                Claim <strong>{message?.amount} LUME</strong> available rewards from <strong>{message?.from}</strong> Delegation Now!
              </div>

              <div className='mt-5'>
                {error && !isVoteLoading ?
                  <div className='text-lumera-red-light'>{error}</div> : null
                }
                <div className='btn-primary full mt-3'>
                  <AppButton onClick={onSendClick} disabled={isVoteLoading}>
                    <span>Claim</span>
                  </AppButton>
                </div>
              </div>

            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog>
  )
}

const Stats = () => {
  const { isLoading, isLatestBlockLoading, stats, latestBlock } = useStats();

  return (
    <div className='grid grid-cols-2 sm:grid-cols-3 1-5xl:grid-cols-6 gap-6'>
      <Card elevate size="$4" bordered className='w-full'>
        <div className='p-[18px]'>
          {isLatestBlockLoading ?
            <div className='relative min-h-[100px] block w-full'>
              <AppLoading
                isLoading
                className="w-10 h-10 !border-2"
                iconWidth={20}
                iconHeight={20}
                containerClassName='absolute top-1/2 left-1/2 -translate-1/2 w-10 h-10 z-50'
              />
            </div> :
            <div className='flex items-center gap-2 flex-col justify-center'>
              <div className="rounded-full grid place-items-center bg-lumera-icon-bg p-3">
                <Blocks className='w-5 h-5 text-blue-400' />
              </div>
              <div className="text-center">
                <div className='text-base font-bold'>{latestBlock.height}</div>
                <div className='text-base text-lumera-label'>Block Height</div>
              </div>
            </div>
          }
        </div>
      </Card>
      <Card elevate size="$4" bordered className='w-full'>
        <div className='p-[18px]'>
          {isLatestBlockLoading ?
            <div className='relative min-h-[100px] block w-full'>
              <AppLoading
                isLoading
                className="w-10 h-10 !border-2"
                iconWidth={20}
                iconHeight={20}
                containerClassName='absolute top-1/2 left-1/2 -translate-1/2 w-10 h-10 z-50'
              />
            </div> :
            <div className='flex items-center gap-2 flex-col justify-center'>
              <div className="rounded-full grid place-items-center bg-lumera-icon-bg p-3">
                <Users className='w-5 h-5 text-lumera-red-light' />
              </div>
              <div className="text-center">
                <div className='text-base font-bold'>{latestBlock.validators}</div>
                <div className='text-base text-lumera-label'>Validators</div>
              </div>
            </div>
          }
        </div>
      </Card>
      <Card elevate size="$4" bordered className='w-full'>
        <div className='p-[18px]'>
          {isLoading ?
            <div className='relative min-h-[100px] block w-full'>
              <AppLoading
                isLoading
                className="w-10 h-10 !border-2"
                iconWidth={20}
                iconHeight={20}
                containerClassName='absolute top-1/2 left-1/2 -translate-1/2 w-10 h-10 z-50'
              />
            </div> :
            <div className='flex items-center gap-2 flex-col justify-center'>
              <div className="rounded-full grid place-items-center bg-lumera-icon-bg p-3">
                <DollarSign className='w-5 h-5 text-teal-400' />
              </div>
              <div className="text-center">
                <div className='text-base font-bold'>{stats.supply}</div>
                <div className='text-base text-lumera-label'>Supply</div>
              </div>
            </div>
          }
        </div>
      </Card>
      <Card elevate size="$4" bordered className='w-full'>
        <div className='p-[18px]'>
          {isLoading ?
            <div className='relative min-h-[100px] block w-full'>
              <AppLoading
                isLoading
                className="w-10 h-10 !border-2"
                iconWidth={20}
                iconHeight={20}
                containerClassName='absolute top-1/2 left-1/2 -translate-1/2 w-10 h-10 z-50'
              />
            </div> :
            <div className='flex items-center gap-2 flex-col justify-center'>
              <div className="rounded-full grid place-items-center bg-lumera-icon-bg p-3">
                <LockKeyhole className='w-5 h-5 text-amber-600' />
              </div>
              <div className="text-center">
                <div className='text-base font-bold'>{stats.bondedTokens}</div>
                <div className='text-base text-lumera-label'>Bonded Tokens</div>
              </div>
            </div>
          }
        </div>
      </Card>
      <Card elevate size="$4" bordered className='w-full'>
        <div className='p-[18px]'>
          {isLoading ?
            <div className='relative min-h-[100px] block w-full'>
              <AppLoading
                isLoading
                className="w-10 h-10 !border-2"
                iconWidth={20}
                iconHeight={20}
                containerClassName='absolute top-1/2 left-1/2 -translate-1/2 w-10 h-10 z-50'
              />
            </div> :
            <div className='flex items-center gap-2 flex-col justify-center'>
              <div className="rounded-full grid place-items-center bg-lumera-icon-bg p-3">
                <ChartNoAxesCombined className='w-5 h-5 text-blue-800' />
              </div>
              <div className="text-center">
                <div className='text-base font-bold'>{stats.inflation}</div>
                <div className='text-base text-lumera-label'>Inflation</div>
              </div>
            </div>
          }
        </div>
      </Card>
      <Card elevate size="$4" bordered className='w-full'>
        <div className='p-[18px]'>
          {isLoading ?
            <div className='relative min-h-[100px] block w-full'>
              <AppLoading
                isLoading
                className="w-10 h-10 !border-2"
                iconWidth={20}
                iconHeight={20}
                containerClassName='absolute top-1/2 left-1/2 -translate-1/2 w-10 h-10 z-50'
              />
            </div> :
            <div className='flex items-center gap-2 flex-col justify-center'>
              <div className="rounded-full grid place-items-center bg-lumera-icon-bg p-3">
                <Landmark className='w-5 h-5 text-amber-400' />
              </div>
              <div className="text-center">
                <div className='text-base font-bold'>{stats.communityPool} <span className='text-sm'>LUME</span></div>
                <div className='text-base text-lumera-label'>Community Pool</div>
              </div>
            </div>
          }
        </div>
      </Card>
    </div>
  )
}

export const HomeScreen = ({
  address,
  loading,
  accountInfo,
  proposals,
  isProposalLoading,
  recentActivities,
  isRecentActivityLoading,
  onOptionChange,
  onVoteClick,
  isVoteLoading,
  error,
  voteAdvanced,
  handleVoteAdvancedChange,
  onClaimButtonClick,
  handleResetError,
  isClaimLoading,
  claimInfo,
  errorClaim,
  handleClaimChange,
  handleToggleClaimModal,
  isClaimModalOpen,
  transactionHash,
  onCloseCongratulationsModal,
  voteTransactionHash,
  onCloseVoteCongratulationsModal,
  selectedItem,
  setSelectedItem,
}: IHomeScreen) => {
  const { stacked, liquid } = getPortfolioData(accountInfo);
  const { redirect } = useAppRouter();
  const [isVoteOpen, setVoteOpen] = React.useState(false);

  const getActivity = (item: IRecentActivity) => {
    const messages = item.tx.body.messages;
    const message = formatMessage(messages)?.toLowerCase();

    switch (message) {
      case 'requestaction':
        return (
          <div className='flex justify-between gap-3 mb-3' key={item.txhash}>
            <div className="rounded-full grid place-items-center recent-activity-icon">
              <Upload className='w-5 h-5 text-teal-400' />
            </div>
            <div className='w-full flex flex-col'>
              <Text className='!text-base'>
                Cascade upload {formatToken({
                  amount: `${parseInt((messages[0] as any)?.price)}`,
                  denom: DENOM,
                }, true, '0,0.[000000]')}
              </Text>
              <SizableText className='!text-sm text-lumera-label leading-none'>
                {dayjs(item.timestamp).fromNow()}
              </SizableText>
            </div>
          </div>
        )
      case 'delegate':
        return (
          <div className='flex justify-between gap-3 mb-3' key={item.txhash}>
            <div className="rounded-full grid place-items-center recent-activity-icon">
              <Layers className='w-5 h-5 text-teal-400' />
            </div>
            <div className='w-full flex flex-col'>
              <Text className='!text-base'>
                Staked {messages[0].amount.denom === 'lume' ? formatToken({
                  amount: `${messages[0].amount.amount}`,
                  denom: 'lume',
                }, true, '0,0.[000000]') : formatToken({
                  amount: `${messages[0].amount.amount}`,
                  denom: DENOM,
                }, true, '0,0.[000000]')}
              </Text>
              <SizableText className='!text-sm text-lumera-label leading-none'>
                {dayjs(item.timestamp).fromNow()}
              </SizableText>
            </div>
          </div>
        )
      case 'deposit':
        return (
          <div className='flex justify-between gap-3 mb-3' key={item.txhash}>
            <div className="rounded-full grid place-items-center recent-activity-icon">
              <BanknoteArrowUp className='w-5 h-5 text-lumera-red-light' />
            </div>
            <div className='w-full flex flex-col'>
              <Text className='!text-base'>
                Deposit {formatToken({
                  amount: `${messages[0].amount[0].amount}`,
                  denom: messages[0].amount[0].denom,
                }, true, '0,0.[000000]')}
              </Text>
              <SizableText className='!text-sm text-lumera-label leading-none'>
                {dayjs(item.timestamp).fromNow()}
              </SizableText>
            </div>
          </div>
        )
      case 'undelegate':
        return (
          <div className='flex justify-between gap-3 mb-3' key={item.txhash}>
            <div className="rounded-full grid place-items-center recent-activity-icon">
              <Unlink className='w-5 h-5 text-red-600' />
            </div>
            <div className='w-full flex flex-col'>
              <Text className='!text-base'>
                Unbond {messages[0]?.amount?.length ? formatToken({
                  amount: `${messages[0].amount[0].amount}`,
                  denom: messages[0].amount[0].denom,
                }, true, '0,0.[000000]') : formatToken({
                  amount: `${messages[0].amount.amount}`,
                  denom: messages[0].amount.denom,
                }, true, '0,0.[000000]')}
              </Text>
              <SizableText className='!text-sm text-lumera-label leading-none'>
                {dayjs(item?.timestamp).fromNow()}
              </SizableText>
            </div>
          </div>
        )
      case 'beginredelegate':
        return (
          <div className='flex justify-between gap-3 mb-3' key={item.txhash}>
            <div className="rounded-full grid place-items-center recent-activity-icon">
              <ClockPlus className='w-5 h-5 text-lumera-blue-light' />
            </div>
            <div className='w-full flex flex-col'>
              <Text className='!text-base'>
                Begin redelegate {formatToken({
                  amount: `${messages?.[0]?.amount?.amount}`,
                  denom: messages?.[0]?.amount?.denom,
                }, true, '0,0.[000000]')}
              </Text>
              <SizableText className='!text-sm text-lumera-label leading-none'>
                {dayjs(item?.timestamp).fromNow()}
              </SizableText>
            </div>
          </div>
        )
      case 'send':
        return (
          <div className='flex justify-between gap-3 mb-3' key={item.txhash}>
            <div className="rounded-full grid place-items-center recent-activity-icon">
              <ArrowUpRight className="w-5 h-5 text-lumera-green" />
            </div>
            <div className='w-full flex flex-col'>
              <Text className='!text-base'>Send {formatToken({
                    amount: `${messages[0].amount[0].amount}`,
                    denom: DENOM,
                  }, true, '0,0.[000000]')}</Text>
              <SizableText className='!text-sm text-lumera-label leading-none'>{dayjs(item.timestamp).fromNow()}</SizableText>
            </div>
          </div>
        )
      default:
        if (message?.indexOf('withdrawdelegatorreward') !== -1) {
          const event = item.events.find((i) => i.type === 'withdraw_rewards');
          const amount = event?.attributes?.find((i) => i.key === 'amount');
          return (
            <div className='flex justify-between gap-3 mb-3' key={item.txhash}>
              <div className="rounded-full grid place-items-center recent-activity-icon claimed-icon">
                <Star className="w-5 h-5 text-amber-400" />
              </div>
              <div className='w-full flex flex-col'>
                <Text className='!text-base'>Claimed {formatToken({
                                  amount: `${amount?.value.replace('ulume', '').replace('stake', '')}`,
                                  denom: DENOM,
                                }, true, '0,0.[000000]')} in rewards</Text>
                <SizableText className='!text-sm text-lumera-label leading-none'>{dayjs(item.timestamp).fromNow()}</SizableText>
              </div>
            </div>
          )
        }
        return (
          <div className='flex justify-between gap-3 mb-3' key={item.txhash}>
            <div className="rounded-full  grid place-items-center recent-activity-icon voted-icon">
              <Vote className="w-5 h-5 text-indigo-400" />
            </div>
            <div className='w-full flex flex-col'>
              <Text className='!text-base'>{formatMessage(messages)}</Text>
              <SizableText className='!text-sm text-lumera-label leading-none'>{dayjs(item.timestamp).fromNow()}</SizableText>
            </div>
          </div>
        )
    }
  }

  const handleVotePress = (item: IProposal) => {
    handleResetError();
    setVoteOpen(true);
    setSelectedItem(item);
  }

  const handleViewAllProposalsClick = () => {
    redirect(NAV_ITEMS[3].url);
  }

  return (
    <>
      {!address ?
        <>
          <Stats />
          <div className='mt-6'>
            <NoWalletConnected variant='home' />
          </div>
        </> :
        <YStack flex={1} alignItems="center" justifyContent="center" gap="$2">
          <div className='w-full flex flex-col gap-6'>
            <Stats />
            <div className='grid grid-cols-2 gap-6 w-full overview-wrapper'>
              <Card bordered className='w-full portfolio-overview'>
                <Card.Header padded>
                  <SectionTitle className='mb-2'>Portfolio Overview</SectionTitle>
                  <div className='mt-5 flex justify-between items-center chart-wrapper relative min-h-[200px]'>
                    {loading ?
                      <AppLoading
                        isLoading
                        hideOverlay
                        className="w-10 h-10 !border-2"
                        iconWidth={20}
                        iconHeight={20}
                        containerClassName='absolute top-1/2 left-1/2 -translate-1/2 w-10 h-10 z-50'
                      /> : (
                        <>
                          <div className='w-1/2 relative'>
                            <ReactECharts option={getOption({
                              stacked: Number(formatTokenDisplay({
                                      amount: `${stacked}`,
                                      denom: DENOM,
                                    }, false, '0,0.[000000]')),
                              liquid: Number(formatTokenDisplay({
                                      amount: `${liquid}`,
                                      denom: DENOM,
                                    }, false, '0,0.[000000]'))
                              })} style={{ height: '200px', width: '100%' }} />
                          </div>
                          <div className='w-1/2'>
                            <div>
                              <div className='flex gap-1 items-center'>
                                <span className='w-3 h-3 rounded-full block' style={{ backgroundColor: COLORS[0] }}></span>
                                <SizableText className='text-lumera-label !text-base'>Staked</SizableText>
                              </div>
                              <div className='text-xl font-bold'>
                                {formatTokenDisplay({
                                  amount: `${stacked}`,
                                  denom: DENOM,
                                }, false, '0,0.[000000]')} <span className='whitespace-nowrap'>LUME</span>
                                </div>
                            </div>
                            <div className='mt-4'>
                              <div className='flex gap-1 items-center'>
                                <span className='w-3 h-3 rounded-full block' style={{ backgroundColor: COLORS[1] }}></span>
                                <SizableText className='text-lumera-label !text-base'>Liquid</SizableText>
                              </div>
                              <div className='text-xl font-bold'>
                                {formatTokenDisplay({
                                  amount: `${liquid}`,
                                  denom: DENOM,
                                }, false, '0,0.[000000]')} <span className='whitespace-nowrap'>LUME</span>
                              </div>
                            </div>
                          </div>
                        </>
                      )
                    }
                  </div>
                </Card.Header>
              </Card>
              <div className='grid grid-cols-2 gap-6 w-full balance-rewards-overview'>
                <Card elevate size="$4" bordered className='w-full total-balance'>
                  <Card.Header padded>
                    <SectionTitle className='mb-2'>Total Balance</SectionTitle>
                    <div>
                      {loading ?
                        <div className='min-h-16 relative mt-5'>
                          <AppLoading
                            isLoading
                            hideOverlay
                            className="w-10 h-10 !border-2"
                            iconWidth={20}
                            iconHeight={20}
                            containerClassName='absolute top-1/2 left-1/2 -translate-1/2 w-10 h-10 z-50'
                          />
                        </div> :
                        <H4 className='!text-white !font-bold !text-2xl'>
                          {loading ?
                            <Skeleton /> :
                            <>
                              {formatTokenDisplay({
                                amount: `${stacked + liquid}`,
                                denom: DENOM,
                              })} <span className='whitespace-nowrap'>LUME</span>
                            </>
                          }
                        </H4>
                      }
                    </div>
                  </Card.Header>
                </Card>
                <Card elevate size="$4" bordered className='w-full claimable-rewards'>
                  <Card.Header padded>
                    <SectionTitle className='mb-2'>Claimable Rewards</SectionTitle>
                    <div>
                      {loading ?
                        <div className='min-h-16 relative mt-5'>
                          <AppLoading
                            isLoading
                            hideOverlay
                            className="w-10 h-10 !border-2"
                            iconWidth={20}
                            iconHeight={20}
                            containerClassName='absolute top-1/2 left-1/2 -translate-1/2 w-10 h-10 z-50'
                          />
                        </div> :
                        <>
                          <H4 className='!text-lumera-green !font-bold !text-2xl'>
                            {formatTokenDisplay({
                              amount: `${getTotalRewards(accountInfo)}`,
                              denom: DENOM,
                            }, false, '0,0.[0000]')} <span className='whitespace-nowrap'>LUME</span>
                          </H4>
                          <div className='mt-4 btn-full btn-secondary'>
                            <AppButton
                              onClick={() => handleToggleClaimModal(true)}
                              disabled={isClaimLoading || loading}
                              className="w-full"
                            >
                              <span>Claim All Rewards</span>
                            </AppButton>
                          </div>
                        </>
                      }
                    </div>
                  </Card.Header>
                </Card>
              </div>
            </div>
            <div className='flex justify-between gap-6 governance-proposals-activity'>
              <div className='w-2/3 active-governance-proposals'>
                <Card elevate size="$4" bordered>
                  <Card.Header padded>
                    <div className='flex justify-between sm:items-center flex-col sm:flex-row'>
                      <SectionTitle className='mb-2'>Active Governance Proposals</SectionTitle>
                      <span
                        onClick={handleViewAllProposalsClick}
                        className='text-link text-base whitespace-nowrap cursor-pointer text-right'
                      >
                        View All
                      </span>
                    </div>
                    <div className='mt-5'>
                      {isProposalLoading ?
                        <div className='min-h-[284px] relative'>
                          <AppLoading
                            isLoading
                            hideOverlay
                            className="w-10 h-10 !border-2"
                            iconWidth={20}
                            iconHeight={20}
                            containerClassName='absolute top-1/2 left-1/2 -translate-1/2 w-10 h-10 z-50'
                          />
                        </div> :
                        <>
                          {!isProposalLoading && proposals?.length <= 0 ?
                            <div className='flex items-center justify-center min-h-28 md:min-h-[284px] my-2'>
                              <H3 className='text-3xl'>No active proposals</H3>
                            </div> : <div className='min-h-[284px]'>
                              {proposals?.map((item) => (
                                <div className='mt-3 flex justify-between flex-col sm:flex-row gap-5 w-full sub-card p-3 rounded-md' key={item.id}>
                                  <div className='flex flex-col'>
                                    <AppLink href={`/governance/${item.id}`}>
                                      <Text className='!text-base font-bold'>{item.title}</Text>
                                    </AppLink>
                                    <SizableText className='!text-base text-lumera-label'>{item.proposer}</SizableText>
                                  </div>
                                  {item.status === 'PROPOSAL_STATUS_VOTING_PERIOD' ?
                                    <div className='btn-primary'>
                                      <AppButton onClick={() => handleVotePress(item)}>Vote Now</AppButton>
                                    </div> : null
                                  }
                                </div>
                              ))}
                            </div>
                          }
                        </>
                      }
                    </div>
                  </Card.Header>
                </Card>
              </div>
              <div className='w-1/3 recent-activity'>
                <Card elevate size="$4" bordered>
                  <Card.Header padded>
                    <SectionTitle className='mb-2'>Recent Activity</SectionTitle>
                    <div className='mt-5'>
                      {isRecentActivityLoading ?
                        <div className='min-h-[296px] relative'>
                          <AppLoading
                            isLoading
                            hideOverlay
                            className="w-10 h-10 !border-2"
                            iconWidth={20}
                            iconHeight={20}
                            containerClassName='absolute top-1/2 left-1/2 -translate-1/2 w-10 h-10 z-50'
                          />
                        </div> :
                        <>
                          {recentActivities.slice(0, 6)?.map((item) => getActivity(item))}
                        </>
                      }
                    </div>
                  </Card.Header>
                </Card>
              </div>
            </div>
          </div>
          <VoteModal
            isOpen={isVoteOpen}
            setOpen={setVoteOpen}
            sender={address}
            onOptionChange={onOptionChange}
            onVoteClick={onVoteClick}
            item={selectedItem}
            isVoteLoading={isVoteLoading}
            error={error}
            voteAdvanced={voteAdvanced}
            handleVoteAdvancedChange={handleVoteAdvancedChange}
            transactionHash={voteTransactionHash}
            onCloseCongratulationsModal={onCloseVoteCongratulationsModal}
          />
          <ClaimableRewardsModal
            isOpen={isClaimModalOpen}
            setOpen={handleToggleClaimModal}
            sender={claimInfo.senderAddress}
            onSendClick={onClaimButtonClick}
            isVoteLoading={isClaimLoading}
            error={errorClaim}
            voteAdvanced={claimInfo}
            handleVoteAdvancedChange={handleClaimChange}
            transactionHash={transactionHash}
            onCloseCongratulationsModal={onCloseCongratulationsModal}
            message={{
              amount: formatToken({
                amount: `${claimInfo.totalRewards}`,
                denom: DENOM,
              }, false, '0,0.[0000]'),
              from: 'All',
            }}
            backButtonText="Back to Dashboard"
          />
        </YStack>
      }
    </>
  )
}
