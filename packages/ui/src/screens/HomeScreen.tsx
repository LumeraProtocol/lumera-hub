import React from 'react';
import ReactECharts from 'echarts-for-react'
import { YStack, H2, Paragraph, Card, H3, H4, Button, Text, SizableText, Spinner } from 'tamagui'
import { LaptopMinimalCheck, Database, BarChart2, Warehouse } from '@tamagui/lucide-icons'
import { Wallet } from '@tamagui/lucide-icons'

import Skeleton from '@/components/Skeleton';
import { AccountInfoData } from '@/hooks/useAccountInfo'
import { IProposal } from '@/hooks/useProposals'
import { formatNumber } from '@/utils/format'
import { NAV_ITEMS } from '@/components/layout/AppShell';

const COLORS = ['#4d4adc', '#62bbf3'];

interface IHomeScreen {
  address: string; 
  connect: () => void;
  loading: boolean;
  accountInfo: AccountInfoData | null;
  proposals: IProposal[];
  isProposalLoading: boolean;
}

interface IPortfolioOverviewChart {
  stacked: number;
  liquid: number;
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

export const HomeScreen = ({ address, connect, loading, accountInfo, proposals, isProposalLoading }: IHomeScreen) => {
  const { stacked, liquid, rewards } = getPortfolioData(accountInfo)
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
                          <SizableText className='text-lumera-label font-bold'>Stacked</SizableText>
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
                              <Text>{item.title}</Text>
                              <SizableText className='text-sm text-lumera-label'>{item.proposer}</SizableText>
                            </div>
                            <div className='btn-primary'><Button>Vote Now</Button></div>
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
                      <div className='flex justify-between gap-3 mb-3'>
                        <div className="rounded-full  grid place-items-center recent-activity-icon voted-icon">
                          <LaptopMinimalCheck size="$1" />
                        </div>
                        <div className='w-full flex flex-col'>
                          <Text>Voted 'For' on Proposal LIP-007</Text>
                          <SizableText className='!text-sm text-lumera-label leading-none'>3 hours ago</SizableText>
                        </div>
                      </div>
                      <div className='flex justify-between gap-3 mb-3'>
                      <div className="rounded-full grid place-items-center recent-activity-icon stacked-icon">
                          <Warehouse size="$1" />
                        </div>
                        <div className='w-full flex flex-col'>
                          <Text>Stacked 2,000 LUME</Text>
                          <SizableText className='!text-sm text-lumera-label leading-none'>2 days ago</SizableText>
                        </div>
                      </div>
                      <div className='flex justify-between gap-3 mb-3'>
                      <div className="rounded-full grid place-items-center recent-activity-icon claimed-icon">
                          <BarChart2 size="$1" />
                        </div>
                        <div className='w-full flex flex-col'>
                          <Text>Claimed 125.43 LUME in rewards</Text>
                          <SizableText className='!text-sm text-lumera-label leading-none'>2 days ago</SizableText>
                        </div>
                      </div>
                      <div className='flex justify-between gap-3'>
                      <div className="rounded-full grid place-items-center recent-activity-icon uploaded-icon">
                          <Database size="$1" />
                        </div>
                        <div className='w-full flex flex-col'>
                          <Text>Uploaded document to Cascade</Text>
                          <SizableText className='!text-sm text-lumera-label leading-none'>5 days ago</SizableText>
                        </div>
                      </div>
                    </div>
                  </Card.Header>
                </Card>
              </div>
            </div>
          </div>
        </>
      }
    </YStack>
  )
}
