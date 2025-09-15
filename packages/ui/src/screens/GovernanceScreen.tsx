import React from 'react'
import { YStack, H2, Button, Card, H3, Input, SizableText } from 'tamagui'
import { Logs, BadgeCheck, Beaker, Search, Activity, Coins, Timer, CheckCircle } from '@tamagui/lucide-icons'

export const GovernanceScreen = () => {
  return (
    <YStack flex={1} alignItems="center" justifyContent="center" gap="$2">
      <div className='flex justify-between w-full items-center'>
        <H2 className='font-bold text-white text-[32px] leading-none'>Governance</H2>
        <div className='btn-primary'>
          <Button>
            <span className='font-bold'>Create Proposal</span>
          </Button>
        </div>
      </div>
      <div className='mt-5 grid grid-cols-4 gap-6 w-full governance-overview'>
        <Card elevate size="$4" bordered className='w-full'>
          <Card.Header padded>
            <div className='flex items-center gap-3'>
              <div className='governance-proposals-icon'>
                <Logs size="$3" />
              </div>
              <div>
                <H3 className='text-base text-lumera-label leading-none'>Total Proposals</H3>
                <div className='leading-none mt-3'>
                  <span className='text-[32px] font-bold text-white'>5</span>
                </div>
              </div>
            </div>
          </Card.Header>
        </Card>
        <Card elevate size="$4" bordered className='w-full'>
          <Card.Header padded>
            <div className='flex items-center gap-3'>
              <div className='governance-passed-icon'>
                <BadgeCheck size="$3" />
              </div>
              <div>
                <H3 className='text-base text-lumera-label leading-none'>Passed</H3>
                <div className='leading-none mt-3'>
                  <span className='text-[32px] font-bold text-white'>1</span>
                </div>
              </div>
            </div>
          </Card.Header>
        </Card>
        <Card elevate size="$4" bordered className='w-full'>
          <Card.Header padded>
            <div className='flex items-center gap-3'>
              <div className='governance-voting-period-icon'>
                <Beaker size="$3" />
              </div>
              <div>
                <H3 className='text-base text-lumera-label leading-none'>Voting Period</H3>
                <div className='leading-none mt-3'>
                  <span className='text-[32px] font-bold text-white'>7 Days</span>
                </div>
              </div>
            </div>
          </Card.Header>
        </Card>
        <Card elevate size="$4" bordered className='w-full'>
          <Card.Header padded>
            <div className='flex items-center gap-3'>
              <div className='governance-deposit-icon'>
                <Beaker size="$3" />
              </div>
              <div>
                <H3 className='text-base text-lumera-label leading-none'>Deposit Required</H3>
                <div className='leading-none mt-3'>
                  <span className='text-[32px] font-bold text-white'>500 LUME</span>
                </div>
              </div>
            </div>
          </Card.Header>
        </Card>
      </div>
      <Card elevate size="$4" bordered className='w-full p-5 mt-4'>
        <div className='flex justify-between items-center governance-control'>
          <ul className='tabs-secondary'>
            <li className='tab-item active'>
              <button className='tab-button whitespace-nowrap'>All (5)</button>
            </li>
            <li className='tab-item'>
              <button className='tab-button whitespace-nowrap'>Expedited (1)</button>
            </li>
            <li className='tab-item'>
              <button className='tab-button whitespace-nowrap'>Deposit (1)</button>
            </li>
            <li className='tab-item'>
              <button className='tab-button whitespace-nowrap'>Voting (1)</button>
            </li>
            <li className='tab-item'>
              <button className='tab-button whitespace-nowrap'>Passed (1)</button>
            </li>
            <li className='tab-item'>
              <button className='tab-button whitespace-nowrap'>Rejected (1)</button>
            </li>
          </ul>
          <div className='input-wrapper'>
            <Input id="amount" placeholder="Search validator" className='input has-symbol' />
            <span className='input-symbol'>
              <Search />
            </span>
          </div>
        </div>
        <div className='mt-6 grid grid-cols-2 gap-6 governance-card-wrapper'>
          <Card elevate size="$4" bordered className='w-full'>
            <div className='p-5'>
              <div className='flex justify-between items-start gap-6 governance-card-header'>
                <div className='flex flex-col'>
                  <SizableText className='text-lumera-label'>LIP-009</SizableText>
                  <H3 className='!leading-6'>Emergence Security Patch for a/staking Module</H3>
                </div>
                <div className='btn-purple'>
                  <Button>
                    <Activity /> <span>Expedited</span>
                  </Button>
                </div>
              </div>
              <div className='mt-5'>
                This is an emergence proposal to patch a critical vulnerability found in the a/staking module. An Expedited voting period is requested to ...
              </div>
              <div className='mt-5'>
                <div className='status-bar-wrapper'>
                  <div className='status-bar-left' style={{ width: '90%' }}></div>
                  <div className='status-bar-center' style={{ width: '5%' }}></div>
                </div>
                <div className='flex justify-between mt-2'>
                  <div className='text-lumera-label'><span className='text-lumera-green-light'>For</span>: 1.2M</div>
                  <div className='text-lumera-label'><span className='text-lumera-red-light'>No</span>: 0.1M</div>
                  <div className='text-lumera-label'><span className='text-lumera-sub-label'>Abstain</span>: 0.0M</div>
                </div>
              </div>
            </div>
            <div className='text-lumera-label text-right bg-lumera-sub-card p-3 rounded-9'>Voting ends in -30 days</div>
          </Card>
          <Card elevate size="$4" bordered className='w-full'>
            <div className='p-5'>
              <div className='flex justify-between items-start gap-6 governance-card-header'>
                <div className='flex flex-col'>
                  <SizableText className='text-lumera-label'>LIP-008</SizableText>
                  <H3 className='!leading-6'>Fund a new Community Marketing Initiative</H3>
                </div>
                <div className='btn-yellow'>
                  <Button>
                    <Coins /> <span>Deposit</span>
                  </Button>
                </div>
              </div>
              <div className='mt-5'>
                This proposal seeks to allocate 100,000 LUME to a community-led marketing campaign to increase brand awareness and attract new ...
              </div>
              <div className='mt-5'>
                <div className='status-bar-wrapper'>
                  <div className='status-bar-left' style={{ width: '0' }}></div>
                  <div className='status-bar-center' style={{ width: '0%' }}></div>
                </div>
                <div className='flex justify-between mt-2'>
                  <div className='text-lumera-label'><span className='text-lumera-green-light'>For</span>: 0.0M</div>
                  <div className='text-lumera-label'><span className='text-lumera-red-light'>No</span>: 0.0M</div>
                  <div className='text-lumera-label'><span className='text-lumera-sub-label'>Abstain</span>: 0.0M</div>
                </div>
              </div>
            </div>
            <div className='text-lumera-label text-right bg-lumera-sub-card p-3 rounded-9'>
              <div className='btn-blue flex justify-end'>
                <Button>Deposit</Button>
              </div>
            </div>
          </Card>
          <Card elevate size="$4" bordered className='w-full'>
            <div className='p-5'>
              <div className='flex justify-between items-start gap-6 governance-card-header'>
                <div className='flex flex-col'>
                  <SizableText className='text-lumera-label'>LIP-007</SizableText>
                  <H3 className='!leading-6'>Integrate New Cross-Chain Bridge for Enhanced Liquidity</H3>
                </div>
                <div className='btn-emerald'>
                  <Button>
                    <Timer /> <span>Voting</span>
                  </Button>
                </div>
              </div>
              <div className='mt-5'>
                This proposal suggests integrating the Stargate bridge to allow seamless asset transfer from other major chains, aiming to increase...
              </div>
              <div className='mt-5'>
                <div className='status-bar-wrapper'>
                  <div className='status-bar-left' style={{ width: '80%' }}></div>
                  <div className='status-bar-center' style={{ width: '15%' }}></div>
                </div>
                <div className='flex justify-between mt-2'>
                  <div className='text-lumera-label'><span className='text-lumera-green-light'>For</span>: 8.2M</div>
                  <div className='text-lumera-label'><span className='text-lumera-red-light'>No</span>: 1.5M</div>
                  <div className='text-lumera-label'><span className='text-lumera-sub-label'>Abstain</span>: 0.3M</div>
                </div>
              </div>
            </div>
            <div className='text-lumera-label text-right bg-lumera-sub-card p-3 rounded-9'>Voting ends in -29 days</div>
          </Card>
          <Card elevate size="$4" bordered className='w-full'>
            <div className='p-5'>
              <div className='flex justify-between items-start gap-6 governance-card-header'>
                <div className='flex flex-col'>
                  <SizableText className='text-lumera-label'>LIP-006</SizableText>
                  <H3 className='!leading-6'>Adjust Staking APY to Stabilize Token Emissions</H3>
                </div>
                <div className='btn-green'>
                  <Button>
                    <CheckCircle /> <span>Passed</span>
                  </Button>
                </div>
              </div>
              <div className='mt-5'>
                A proposal to slightly decrease the base staking APY from 9.5% to 8.72% to ensure long-term sustainability of the rewards pool.
              </div>
              <div className='mt-5'>
                <div className='status-bar-wrapper'>
                  <div className='status-bar-left' style={{ width: '90%' }}></div>
                  <div className='status-bar-center' style={{ width: '5%' }}></div>
                </div>
                <div className='flex justify-between mt-2'>
                  <div className='text-lumera-label'><span className='text-lumera-green-light'>For</span>: 11.5M</div>
                  <div className='text-lumera-label'><span className='text-lumera-red-light'>No</span>: 0.8M</div>
                  <div className='text-lumera-label'><span className='text-lumera-sub-label'>Abstain</span>: 0.3M</div>
                </div>
              </div>
            </div>
          </Card>
        </div>
      </Card>
    </YStack>
  )
}
