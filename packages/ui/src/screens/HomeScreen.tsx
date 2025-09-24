import React, { useState } from 'react';
import dayjs from 'dayjs';
import ReactECharts from 'echarts-for-react'
import { 
  YStack, 
  H2, 
  Paragraph, 
  Card, 
  H3, 
  H4, 
  Button, 
  Text, 
  SizableText, 
  Dialog, 
  Label, 
  Input, 
  RadioGroup, 
  Checkbox, 
  Select, 
  XStack,
} from 'tamagui'
import { LaptopMinimalCheck, Database, BarChart2, Warehouse, Send } from '@tamagui/lucide-icons'
import { Wallet, CircleX, Check as CheckIcon, ChevronDown } from '@tamagui/lucide-icons'
import relativeTime from 'dayjs/plugin/relativeTime'

import Skeleton from '@/components/Skeleton';
import { AccountInfoData } from '@/hooks/useAccountInfo'
import { IRecentActivity, TMessage } from '@/hooks/useRecentActivity'
import { IProposal, VOTE_OPTIONS, broadcastModeOptions } from '@/hooks/useProposals'
import { formatNumber } from '@/utils/format'
import { NAV_ITEMS } from '@/components/layout/AppShell';

dayjs.extend(relativeTime);

const COLORS = ['#4d4adc', '#62bbf3'];

interface IHomeScreen {
  address: string; 
  connect: () => void;
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
}

interface IPortfolioOverviewChart {
  stacked: number;
  liquid: number;
}

interface IVoteModal {
  isOpen: boolean;
  setOpen: (status: boolean) => void;
  sernder: string;
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
}

const RATE_VALUE = 1000000

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
        radius: ['50%', '70%'],
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
  let rewards = 0;
  if (accountInfo) {
    stacked = accountInfo.delegations.reduce((total, item) => Number(item.balance.amount) + total, 0)
    liquid = accountInfo.balances.reduce((total, item) => Number(item.amount) + total, 0)
    rewards = accountInfo.rewards.reduce((total, item) => Number(item.reward[0].amount) + total, 0)
  }
  return {
    stacked: Number((stacked / RATE_VALUE).toFixed(2)),
    liquid: Number((liquid / RATE_VALUE).toFixed(2)),
    rewards: Number((rewards / RATE_VALUE).toFixed(2)),
  }
}

const governanceNav = NAV_ITEMS.find((item) => item.id === 'governance');

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

const VoteModal = ({ 
  isOpen, 
  setOpen, 
  sernder, 
  onOptionChange, 
  onVoteClick, 
  item, 
  isVoteLoading, 
  error,
  voteAdvanced,
  handleVoteAdvancedChange,
}: IVoteModal) => {
  if (!isOpen) {
    return null;
  }
  const [showAdvanced, setShowAdvanced] = useState(false);

  const handleAdvancedCheckedChange = (checked: boolean) => {
    setShowAdvanced(checked);
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
            <div className='vote-main-content'>
              <div className='flex justify-between items-center'>
                <H3 className='text-lumera-label text-[32px]'>Vote</H3>
                <button className='btn-close-modal cursor-pointer' onClick={() => setOpen(false)}><CircleX /></button>
              </div>
              <div className='mt-1'>
                <Label htmlFor="sender" className='text-base'>Sender</Label>
                <div className='input-wrapper'>
                  <Input id="sender" placeholder="Sender" className='input' defaultValue={sernder} readOnly />
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
                    <Button onPress={() => onVoteClick(item)} disabled={isVoteLoading}>Send</Button>
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

export const HomeScreen = ({ 
  address, 
  connect, 
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
}: IHomeScreen) => {
  const { stacked, liquid, rewards } = getPortfolioData(accountInfo);
  const [isVoteOpen, setVoteOpen] = React.useState(false);
  const [selectedItem, setSelectedItem] = useState<IProposal | null>(null)

  const getActivity = (item: IRecentActivity) => {
    const messages = item.tx.body.messages;

    switch (formatMessage(messages)?.toLowerCase()) {
      case 'delegate':
        return (
          <div className='flex justify-between gap-3 mb-3' key={item.txhash}>
            <div className="rounded-full grid place-items-center recent-activity-icon stacked-icon">
              <Warehouse size="$1" />
            </div>
            <div className='w-full flex flex-col'>
              <Text>Staked {formatNumber((Number(messages[0].amount.amount) / RATE_VALUE).toFixed(2))} LUME</Text>
              <SizableText className='!text-sm text-lumera-label leading-none'>{dayjs(item.timestamp).fromNow()}</SizableText>
            </div>
          </div>
        )
      case 'send':
        return (
          <div className='flex justify-between gap-3 mb-3' key={item.txhash}>
            <div className="rounded-full grid place-items-center recent-activity-icon stacked-icon">
              <Send size="$1" />
            </div>
            <div className='w-full flex flex-col'>
              <Text>Send {formatNumber((Number(messages[0].amount[0].amount) / RATE_VALUE).toFixed(2))} LUME</Text>
              <SizableText className='!text-sm text-lumera-label leading-none'>{dayjs(item.timestamp).fromNow()}</SizableText>
            </div>
          </div>
        )
      case 'withdrawdelegatorreward':
        const event = item.events.find((i) => i.type === 'withdraw_rewards');
        const amount = event?.attributes?.find((i) => i.key === 'amount');
        return (
          <div className='flex justify-between gap-3 mb-3' key={item.txhash}>
            <div className="rounded-full grid place-items-center recent-activity-icon claimed-icon">
              <BarChart2 size="$1" />
            </div>
            <div className='w-full flex flex-col'>
              <Text>Claimed {formatNumber((Number(amount?.value.replace('ulume', '')) / RATE_VALUE).toFixed(2))} LUME in rewards</Text>
              <SizableText className='!text-sm text-lumera-label leading-none'>{dayjs(item.timestamp).fromNow()}</SizableText>
            </div>
          </div>
        )
      default:
        return (
          <div className='flex justify-between gap-3 mb-3' key={item.txhash}>
            <div className="rounded-full  grid place-items-center recent-activity-icon voted-icon">
              <LaptopMinimalCheck size="$1" />
            </div>
            <div className='w-full flex flex-col'>
              <Text>{formatMessage(messages)}</Text>
              <SizableText className='!text-sm text-lumera-label leading-none'>{dayjs(item.timestamp).fromNow()}</SizableText>
            </div>
          </div>
        )
    }
    // <div className='flex justify-between gap-3 mb-3'>
    //   <div className="rounded-full  grid place-items-center recent-activity-icon voted-icon">
    //     <LaptopMinimalCheck size="$1" />
    //   </div>
    //   <div className='w-full flex flex-col'>
    //     <Text>Voted 'For' on Proposal LIP-007</Text>
    //     <SizableText className='!text-sm text-lumera-label leading-none'>3 hours ago</SizableText>
    //   </div>
    // </div>
    // <div className='flex justify-between gap-3'>
    // <div className="rounded-full grid place-items-center recent-activity-icon uploaded-icon">
    //     <Database size="$1" />
    //   </div>
    //   <div className='w-full flex flex-col'>
    //     <Text>Uploaded document to Cascade</Text>
    //     <SizableText className='!text-sm text-lumera-label leading-none'>5 days ago</SizableText>
    //   </div>
    // </div>
  }

  const handleVotePress = (item: IProposal) => {
    setVoteOpen(true);
    setSelectedItem(item);
  }

  return (
    <YStack flex={1} alignItems="center" justifyContent="center" gap="$2">
      {!address ?
        <Card elevate size="$4" bordered className='w-full'>
          <div className='flex items-center justify-center h-[84vh]'>
            <div className='flex flex-col gap-3 justify-between items-center max-w-[450px] text-center mt-10'>
              <div className="w-20 h-20 grid place-items-center">
                <img src="/lumera-symbol.svg" alt="Lumera" />
              </div>
              <H2 className='font-bold text-white text-[32px] leading-none'>Welcome to the Lumera Hub</H2>
              <Paragraph className='text-base text-lumera-gray'>Connect your wallet to manage assets, participate in governance, and access the full suite of Lumera services.</Paragraph>
              <div className='text-center'>
                <button
                  onClick={connect}
                  className="bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors flex cursor-pointer"
                >
                  <Wallet size="$1" /> <div className="ml-1 connect-wallet-label">Connect Wallet</div>
                </button>
              </div>
            </div>
          </div> 
        </Card> :
        <>
          <div className='w-full flex flex-col gap-6'>
            <div className='grid grid-cols-2 gap-6 w-full overview-wrapper'>
              <Card bordered className='w-full portfolio-overview'>
                <Card.Header padded>
                  <H3>Portfolio Overview</H3>
                  <div className='mt-5 flex justify-between items-center chart-wrapper'>
                    <div className='w-1/2'>
                      <ReactECharts option={getOption({ stacked, liquid })} style={{ height: '200px', width: '100%' }} />
                    </div>
                    <div className='w-1/2'>
                      <div>
                        <div className='flex gap-1 items-center'>
                          <span className='w-3 h-3 rounded-full block' style={{ backgroundColor: COLORS[0] }}></span>
                          <SizableText className='text-lumera-label font-bold'>Staked</SizableText>
                        </div>
                        <div className='text-2xl font-bold'>
                          {loading ?
                           <Skeleton /> : <>
                              {formatNumber(stacked)} LUME
                            </>
                          }
                          </div>
                      </div>
                      <div className='mt-4'>
                        <div className='flex gap-1 items-center'>
                          <span className='w-3 h-3 rounded-full block' style={{ backgroundColor: COLORS[1] }}></span>
                          <SizableText className='text-lumera-label font-bold'>Liquid</SizableText>
                        </div>
                        <div className='text-2xl font-bold'>
                          {loading ?
                            <Skeleton /> : 
                            <>
                              {formatNumber(liquid)} LUME
                            </>
                          }
                        </div>
                      </div>
                    </div>
                  </div>
                </Card.Header>
              </Card>
              <div className='grid grid-cols-2 gap-6 w-full balance-rewards-overview'>
                <Card elevate size="$4" bordered className='w-full total-balance'>
                  <Card.Header padded>
                    <H3 className='text-lumera-label'>Total Balance</H3>
                    <div>
                      {loading ?
                        <Skeleton /> : 
                        <>
                          <span className='text-[40px] font-bold text-white break-words'>{formatNumber((stacked + liquid).toFixed(2))}</span> <span className='text-base text-lumera-label'>LUME</span>
                        </>
                      }
                    </div>
                  </Card.Header>
                </Card>
                <Card elevate size="$4" bordered className='w-full claimable-rewards'>
                  <Card.Header padded>
                    <H3 className='text-lumera-label'>Claimable Rewards</H3>
                    <div>
                      <H4 className='!text-lumera-green font-bold !text-[40px]'>
                        {loading ? <Skeleton /> : formatNumber(rewards)}
                      </H4>
                      <div className='mt-4 btn-full btn-secondary'>
                        <Button>Claim All Rewards</Button>
                      </div>
                    </div>
                  </Card.Header>
                </Card>
              </div>
            </div>
            <div className='flex justify-between gap-6 governance-proposals-activity'>
              <div className='w-2/3 active-governance-proposals'>
                <Card elevate size="$4" bordered>
                  <Card.Header padded>
                    <div className='flex justify-between items-center'>
                      <H3>Active Governance Proposals</H3>
                      <a href={governanceNav?.url || '#'} className='text-link text-sm'>View All</a>
                    </div>
                    <div className='mt-5'>
                      {isProposalLoading ?
                        <Skeleton /> : 
                        <>
                        {proposals?.map((item) => (
                          <div className='mt-3 flex justify-between gap-5 w-full sub-card p-3 rounded-md' key={item.id}>
                            <div className='flex flex-col'>
                              <a href={`/governance/${item.id}`}>
                                <Text>{item.title}</Text>
                              </a>
                              <SizableText className='text-sm text-lumera-label'>{item.proposer}</SizableText>
                            </div>
                            <div className='btn-primary'><Button onPress={() => handleVotePress(item)}>Vote Now</Button></div>
                          </div>
                        ))}
                        </>
                      }
                      
                    </div>
                  </Card.Header>
                </Card>
              </div>
              <div className='w-1/3 recent-activity'>
                <Card elevate size="$4" bordered>
                  <Card.Header padded>
                    <H3>Recent Activity</H3>
                    <div className='mt-5'>
                      {isRecentActivityLoading ?
                        <Skeleton /> : 
                        <>
                          {recentActivities?.map((item) => getActivity(item))}
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
            sernder={address} 
            onOptionChange={onOptionChange} 
            onVoteClick={onVoteClick} 
            item={selectedItem} 
            isVoteLoading={isVoteLoading} 
            error={error} 
            voteAdvanced={voteAdvanced}
            handleVoteAdvancedChange={handleVoteAdvancedChange}
          />
        </>
      }
    </YStack>
  )
}
