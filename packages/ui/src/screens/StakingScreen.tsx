import React from 'react'
import { YStack, H2, Paragraph, Card, SizableText, H3, Input, Label, Text, Progress, Button } from 'tamagui'
import { Wallet, Calculator, Search } from '@tamagui/lucide-icons'

export const StakingScreen = ({ address }: { address: string}) => {
  return (
    <YStack flex={1} alignItems="center" justifyContent="center" gap="$2">
      {!address ?
        <Card elevate size="$4" bordered className='w-full'>
          <div className='flex flex-col items-center justify-center min-h-[80vh]'>
            <div className="w-20 h-20 rounded-full grid place-items-center staking-icon wallet">
              <Wallet size="$3" />
            </div>
            <H2 className='font-bold text-white text-[32px] leading-none !mt-5'>Connect Your Wallet</H2>
            <Paragraph className='text-base text-lumera-gray mx-auto max-w-[400px] text-center !mt-3'>Please connect your wallet to view this page and interact with the Lumera ecosystem.</Paragraph>
          </div>
        </Card> :
        <div className='w-full'>
          <div className='w-full'>
            <ul className='flex gap-0 list-none tabs'>
              <li className='tab-iem active'>
                <button className='tab-button cursor-pointer'>All Validators</button>
              </li>
              <li className='tab-iem'>
                <button className='tab-button cursor-pointer'>My Staking</button>
              </li>
            </ul>
          </div>
          <div>
          <div className='grid grid-cols-2 w-full gap-6 mt-6 staking-summary-wrapper'>
            <Card elevate size="$4" bordered className='w-full'>
              <Card.Header padded>
                <H3 className='text-lumera-label'>Total LUME Staked</H3>
                <div className='text-[40px] font-bold text-white'>
                  125.43 LUME
                </div>
              </Card.Header>
            </Card>
            <Card elevate size="$4" bordered className='w-full'>
              <Card.Header padded>
                <H3 className='text-lumera-label'>Current Staking APR</H3>
                <div className='!text-lumera-green font-bold text-[40px]'>
                  8.72%
                </div>
              </Card.Header>
            </Card>
          </div>
          <Card elevate size="$4" bordered className='w-full mt-6'>
            <Card.Header padded>
              <div className='grid grid-cols-2 gap-6 w-full rewards-calculator-wrapper'>
                <div className='w-full'>
                  <H3 className='!flex gap-2 items-center rewards-calculator-icon'><Calculator /> <span>Rewards Calculator</span></H3>
                  <Text className='text-lumera-label text-base'>Estimate your potential earnings from staking LUME.</Text>
                  <div className='mt-5'>
                    <Label htmlFor="amount" className='text-base'>Amount to Stake</Label>
                    <div className='input-wrapper'>
                      <Input id="amount" placeholder="0.00" className='input has-symbol' />
                      <span className='input-symbol'>LUME</span>
                    </div>
                  </div>
                </div>
                <Card elevate size="$4" bordered className='w-full estimated-rewards-card'>
                  <Card.Header padded>
                    <H3>Estimated Rewards</H3>
                    <div className='mt-3 grid grid-cols-2 gap-2'>
                      <div className='flex flex-col'>
                        <SizableText className='text-lumera-label'>1 Day</SizableText>
                        <Text className='!text-lumera-green'><span className='font-bold text-base'>0.00</span> <SizableText className='text-lumera-label'>LUME</SizableText></Text>
                      </div>
                      <div className='flex flex-col'>
                        <SizableText className='text-lumera-label'>7 Days</SizableText>
                        <Text className='!text-lumera-green'><span className='font-bold text-base'>0.00</span> <SizableText className='text-lumera-label'>LUME</SizableText></Text>
                      </div>
                      <div className='flex flex-col'>
                        <SizableText className='text-lumera-label'>30 Days</SizableText>
                        <Text className='!text-lumera-green'><span className='font-bold text-base'>0.00</span> <SizableText className='text-lumera-label'>LUME</SizableText></Text>
                      </div>
                      <div className='flex flex-col'>
                        <SizableText className='text-lumera-label'>365 Days</SizableText>
                        <Text className='!text-lumera-green'><span className='font-bold text-base'>0.00</span> <SizableText className='text-lumera-label'>LUME</SizableText></Text>
                      </div>
                    </div>
                    <div className='!mt-3 text-lumera-label text-sm'>* All calculations are estimates based on the current APR and are subject to change.</div>
                  </Card.Header>
                </Card>
              </div>
            </Card.Header>
          </Card>
          <Card elevate size="$4" bordered className='w-full mt-6'>
            <Card.Header padded>
              <div className='flex justify-between w-full validators-control'>
                <div className='flex flex-col'>
                  <H3 className='leading-none'>All Validators</H3>
                  <SizableText className='text-lumera-label'>Delegate your stake to a validator to earn rewards.</SizableText>
                </div>
                <div>
                  <div className='input-wrapper'>
                    <Input id="amount" placeholder="Search validator" className='input has-symbol' />
                    <span className='input-symbol'>
                      <Search />
                    </span>
                  </div>
                </div>
              </div>
              <div className='mt-5'>
                <ul className='flex gap-0 list-none tabs'>
                  <li className='tab-iem active'>
                    <button className='tab-button cursor-pointer px-3'>Active (4)</button>
                  </li>
                  <li className='tab-iem'>
                    <button className='tab-button cursor-pointer px-3'>Inactive (1)</button>
                  </li>
                </ul>
                <table className='w-full table mt-5 staking-table'>
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
                    <tr className='active'>
                      <td data-label="Validator: ">CosmoStation</td>
                      <td data-label="Staked Amount: " align='right'>12,500,000 LUME</td>
                      <td data-label="Commission: " align='right'><Text>5.0%</Text></td>
                      <td data-label="Voting Power: " align='right'><Text>7.80%</Text></td>
                      <td data-label="Uptime: ">
                        <div className='flex w-full justify-end items-center gap-3 action-col'>
                          <div className='flex items-center gap-3'>
                            <div className='custom-progress'>
                              <Progress size="$4" value={99}>
                                <Progress.Indicator animation="bouncy" />
                              </Progress>
                            </div>
                            <Text>99.98%</Text>
                          </div>
                          <div className='btn-secondary'>
                            <Button>Delegate</Button>
                          </div>
                        </div>
                      </td>
                    </tr>
                    <tr>
                      <td data-label="Validator: ">CosmoStation</td>
                      <td data-label="Staked Amount: " align='right'>12,500,000 LUME</td>
                      <td data-label="Commission: " align='right'><Text>5.0%</Text></td>
                      <td data-label="Voting Power: " align='right'><Text>7.80%</Text></td>
                      <td data-label="Uptime: ">
                        <div className='flex w-full justify-end items-center gap-3 action-col'>
                          <div className='flex items-center gap-3'>
                            <div className='custom-progress'>
                              <Progress size="$4" value={50}>
                                <Progress.Indicator animation="bouncy" />
                              </Progress>
                            </div>
                            <Text>50.98%</Text>
                          </div>
                          <div className='btn-secondary'>
                            <Button>Delegate</Button>
                          </div>
                        </div>
                      </td>
                    </tr>
                    <tr>
                      <td data-label="Validator: ">CosmoStation</td>
                      <td data-label="Staked Amount: " align='right'>12,500,000 LUME</td>
                      <td data-label="Commission: " align='right'><Text>5.0%</Text></td>
                      <td data-label="Voting Power: " align='right'><Text>7.80%</Text></td>
                      <td data-label="Uptime: ">
                        <div className='flex w-full justify-end items-center gap-3 action-col'>
                          <div className='flex items-center gap-3'>
                            <div className='custom-progress'>
                              <Progress size="$4" value={99}>
                                <Progress.Indicator animation="bouncy" />
                              </Progress>
                            </div>
                            <Text>99.98%</Text>
                          </div>
                          <div className='btn-secondary'>
                            <Button>Delegate</Button>
                          </div>
                        </div>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </Card.Header>
          </Card>
        </div>
      </div>
      }
    </YStack>
  )
}
