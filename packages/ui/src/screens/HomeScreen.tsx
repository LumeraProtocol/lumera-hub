import React from 'react';
import ReactECharts from 'echarts-for-react'
import { YStack, H2, Paragraph, Card, H3, H4, Button, Text, SizableText } from 'tamagui'
import { LaptopMinimalCheck, Database, BarChart2, Warehouse } from '@tamagui/lucide-icons'

const COLORS = ['#4d4adc', '#62bbf3'];

const option = {
  tooltip: {
    trigger: 'item'
  },
  color: COLORS,
  series: [
    {
      name: 'Portfolio',
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
        { value: 10, name: 'Stacked' },
        { value: 30, name: 'Liquid' }
      ]
    }
  ]
};

export const HomeScreen = ({ address }: { address: string}) => {
  return (
    <YStack flex={1} alignItems="center" justifyContent="center" gap="$2">
      {!address ?
        <div className='flex flex-col gap-3 justify-between items-center max-w-[400px] text-center mt-10'>
          <div className="w-20 h-20 grid place-items-center">
            <img src="/lumera-symbol.svg" alt="Lumera" />
          </div>
          <H2 className='font-bold text-white text-[32px] leading-none'>Welcome to the Lumera Hub</H2>
          <Paragraph className='text-base text-lumera-gray'>Connect your wallet to manage assets, participate in governance, and access the full suite of Lumera services.</Paragraph>
        </div> :
        <>
          <div className='w-full flex flex-col gap-6'>
            <div className='flex justify-between gap-6 w-full'>
              <Card bordered className='w-46p'>
                <Card.Header padded>
                  <H3>Portfolio Overview</H3>
                  <div className='mt-5 flex justify-between items-center'>
                    <div className='w-1/2'>
                      <ReactECharts option={option} style={{ height: '200px', width: '100%' }} />
                    </div>
                    <div className='w-1/2'>
                      <div>
                        <div className='flex gap-1 items-center'>
                          <span className='w-3 h-3 rounded-full block' style={{ backgroundColor: COLORS[0] }}></span>
                          <SizableText className='text-lumera-label font-bold'>Stacked</SizableText>
                        </div>
                        <div className='text-2xl font-bold'>5,000 LUME</div>
                      </div>
                      <div className='mt-4'>
                        <div className='flex gap-1 items-center'>
                          <span className='w-3 h-3 rounded-full block' style={{ backgroundColor: COLORS[1] }}></span>
                          <SizableText className='text-lumera-label font-bold'>Liquid</SizableText>
                        </div>
                        <div className='text-2xl font-bold'>15,234.88 LUME</div>
                      </div>
                    </div>
                  </div>
                </Card.Header>
              </Card>
              <Card elevate size="$4" bordered className='w-1/4'>
                <Card.Header padded>
                  <H3 className='text-lumera-label'>Total Balance</H3>
                  <div>
                    <span className='text-[40px] font-bold text-white'>20,234.88</span> <span className='text-base text-lumera-label'>LUME</span>
                  </div>
                </Card.Header>
              </Card>
              <Card elevate size="$4" bordered className='w-1/4'>
                <Card.Header padded>
                  <H3 className='text-lumera-label'>Claimable Rewards</H3>
                  <div>
                    <H4 className='!text-lumera-green font-bold text-[40px]'>125.43</H4>
                    <div className='mt-4 btn-full btn-secondary'>
                      <Button>Claim All Rewards</Button>
                    </div>
                  </div>
                </Card.Header>
              </Card>
            </div>
            <div className='flex justify-between gap-6'>
              <div className='w-2/3'>
                <Card elevate size="$4" bordered>
                  <Card.Header padded>
                    <div className='flex justify-between items-center'>
                      <H3>Active Governance Proposals</H3>
                      <a href="#" className='text-link text-sm'>View All</a>
                    </div>
                    <div className='mt-5 flex justify-between gap-5 w-full sub-card p-3 rounded-md'>
                      <div className='flex flex-col'>
                        <Text>Integrate New Cross-Chain Bridge for Enhanced Liquidity</Text>
                        <SizableText className='text-sm text-lumera-label'>LIP-007</SizableText>
                      </div>
                      <div className='btn-primary'><Button>Vote Now</Button></div>
                    </div>
                  </Card.Header>
                </Card>
              </div>
              <div className='w-1/3'>
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
