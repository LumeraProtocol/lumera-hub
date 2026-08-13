import React from 'react'
import {
  YStack,
  H2,
  Button,
  Card,
  H3,
  Input,
} from 'tamagui';
import {
  Logs,
  Search,
  Activity,
  Coins,
  Timer,
  CheckCircle,
} from '@tamagui/lucide-icons';
import dayjs from 'dayjs';
import { LandmarkIcon, Hourglass, BadgeCheck, List } from 'lucide-react';

import AppLink from '@/components/AppLink';
import Loading from '@/components/Loading';
import DepositModal from '@/components/DepositModal';
import CreateProposalModal from '@/components/CreateProposalModal';
import Skeleton from '@/components/Skeleton';
import { IProposal } from '@/hooks/useProposals';
import { formatNumber, formatToken } from '@/utils/format';
import { VoteModal } from './HomeScreen';

interface IGovernanceScreen {
  transactionUnavailableReason: string;
  selectedItem: IProposal | null;
  setSelectedItem: (item: IProposal) => void;
  isLoading: boolean,
  isSumaryLoading: boolean,
  governances: IProposal[];
  totalVotes: number;
  nextKey: string;
  handlePageClick: () => void;
  msg: {
    type: string;
    message: string;
  };
  sumary: {
    totalProposals: number;
    passed: number;
    votingPeriod: number;
    depositRequired: number;
    rejected: number;
    unspecified: number;
    failed: number;
    depositRequiredParam: {
      denom: string;
      amount: string;
    };
    votingPeriodParam: string;
  };
  onTabChange: (status: string) => void;
  currentTab: string;
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
  handleResetError: () => void;
  address: string;
  isVoteOpen: boolean;
  setVoteOpen: (status: boolean) => void;
  deposit: {
    isOpen: boolean;
    setOpen: (status: boolean) => void;
    sender: string;
    onVoteClick: () => void;
    setModalOpen: (status: boolean) => void;
    setProposalId: (id: string) => void;
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
    transactionHash: string;
    handleCloseCongratulationsModal: () => void;
  };
  voteTransactionHash?: string;
  onCloseVoteCongratulationsModal?: () => void;
  createProposal: {
    step: number;
    selectedModal: string;
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
    onOpenCreateProposalModalClick: () => void;
    onCloseCreateProposalModalClick: () => void;
    onNextStepsClick: () => void;
    onBackClick: () => void;
    onCreateProposalClick: () => void;
    onInputChange: (name: string, value: string, type?: string, checked?: boolean) => void;
  };
}

export const GovernanceScreen = ({
  transactionUnavailableReason,
  isLoading,
  governances,
  sumary,
  currentTab,
  address,
  isVoteLoading,
  error,
  voteAdvanced,
  isVoteOpen,
  deposit,
  isSumaryLoading,
  nextKey,
  voteTransactionHash,
  selectedItem,
  createProposal,
  setSelectedItem,
  onCloseVoteCongratulationsModal,
  handlePageClick,
  onTabChange,
  onOptionChange,
  onVoteClick,
  handleVoteAdvancedChange,
  handleResetError,
  setVoteOpen
}: IGovernanceScreen) => {

  const getStatus = (status: string) => {
    switch (status) {
      case 'PROPOSAL_STATUS_PASSED':
        return (
          <div className='btn-green'>
            <Button>
              <CheckCircle /> <span>Passed</span>
            </Button>
          </div>
        )
      case 'PROPOSAL_STATUS_DEPOSIT_PERIOD':
        return (
          <div className='btn-yellow'>
            <Button>
              <Coins /> <span>Deposit</span>
            </Button>
          </div>
        )
      case 'PROPOSAL_STATUS_VOTING_PERIOD':
        return (
          <div className='btn-emerald'>
            <Button>
              <Timer /> <span>Voting</span>
            </Button>
          </div>
        )
      case 'PROPOSAL_STATUS_UNSPECIFIED':
        return (
          <div className='btn-purple'>
            <Button>
              <Activity /> <span>Unspecified</span>
            </Button>
          </div>
        )
      case 'PROPOSAL_STATUS_REJECTED':
        return (
          <div className='btn-red'>
            <Button>
              <Activity /> <span>Rejected</span>
            </Button>
          </div>
        )
      case 'PROPOSAL_STATUS_FAILED':
        return (
          <div className='btn-red'>
            <Button>
              <Activity /> <span>Failed</span>
            </Button>
          </div>
        )
      default:
        return '';
    }
  }

  const handleDepositClick = (item: IProposal) => {
    deposit.setProposalId(item.id);
    deposit.setModalOpen(true);
    setSelectedItem(item);
  }

  const getControls = (item: IProposal) => {
    const now = dayjs();
    const expiryDate = dayjs(item.deposit_end_time);
    const isExpired = expiryDate.isBefore(now);

    if (['PROPOSAL_STATUS_FAILED', 'PROPOSAL_STATUS_REJECTED'].includes(item?.status) || (isExpired && item.status !== 'PROPOSAL_STATUS_VOTING_PERIOD')) {
      return null;
    }
    return (
      <div className='text-lumera-label text-right bg-lumera-sub-card p-3 rounded-9'>
        <div className='btn-primary flex justify-end gap-3'>
          {item.status === 'PROPOSAL_STATUS_VOTING_PERIOD' ?
            <Button
              disabled={Boolean(transactionUnavailableReason)}
              onPress={() => handleVotePress(item)}
            >Vote</Button> : null
          }
          <Button
            disabled={Boolean(transactionUnavailableReason)}
            onPress={() => handleDepositClick(item)}
          >Deposit</Button>
        </div>
        {transactionUnavailableReason ? (
          <p className='text-sm text-left mt-2'>{transactionUnavailableReason}</p>
        ) : null}
      </div>
    );
  }

  const getPoolPercent = (item: IProposal) => {
    const total = Number(item.final_tally_result.abstain_count) + Number(item.final_tally_result.no_count) + Number(item.final_tally_result.no_with_veto_count) + Number(item.final_tally_result.yes_count)
    return {
      yesPercent: Number(item.final_tally_result.yes_count) ? Number(item.final_tally_result.yes_count) * 100 / total : 0,
      noPercent: Number(item.final_tally_result.no_count) ? Number(item.final_tally_result.no_count) * 100 / total : 0,
      noWithVetoPercent: Number(item.final_tally_result.no_with_veto_count) ? Number(item.final_tally_result.no_with_veto_count) * 100 / total : 0,
      abstainPercent: Number(item.final_tally_result.abstain_count) ? Number(item.final_tally_result.abstain_count) * 100 / total : 0,
    }
  }

  const handleVotePress = (item: IProposal) => {
    handleResetError();
    setVoteOpen(true);
    setSelectedItem(item);
  }

  return (
    <YStack flex={1} alignItems="center" justifyContent="center" gap="$2">
      <div className='flex justify-between gap-5 w-full items-center flex-wrap sm:flex-nowrap'>
        <H2 className='!font-bold text-white !text-[32px] leading-none'>Governance</H2>
        <div className='btn-primary'>
          <Button
            disabled={Boolean(transactionUnavailableReason)}
            onPress={createProposal.onOpenCreateProposalModalClick}
          >
            <span className='font-bold whitespace-nowrap'>Create Proposal</span>
          </Button>
        </div>
      </div>
      {transactionUnavailableReason ? (
        <div className='w-full rounded-md bg-lumera-sub-card p-3 text-sm text-lumera-label'>
          {transactionUnavailableReason}
        </div>
      ) : null}
      <div className='relative w-full'>
        <div className='mt-5 grid grid-cols-4 gap-6 w-full governance-overview relative'>
          <Card elevate size="$4" bordered className='w-full'>
            <Card.Header padded>
              <div className='flex items-center gap-3'>
                <div className='governance-proposals-icon'>
                  <List className="w-8 h-8 text-indigo-400"/>
                </div>
                <div>
                  <H3 className='text-sm text-lumera-label !leading-none'>Total Proposals</H3>
                  <div className='leading-none mt-1'>
                    <span className='text-3xl font-bold text-white'>
                      {isSumaryLoading ?
                        <Skeleton /> : <>
                          {formatNumber(sumary?.totalProposals || 0, { decimalsLength: 0 })}
                        </>
                      }
                    </span>
                  </div>
                </div>
              </div>
            </Card.Header>
          </Card>
          <Card elevate size="$4" bordered className='w-full'>
            <Card.Header padded>
              <div className='flex items-center gap-3'>
                <div className='governance-passed-icon'>
                  <BadgeCheck className="w-8 h-8 text-green-400"/>
                </div>
                <div>
                  <H3 className='text-sm text-lumera-label !leading-none'>Passed</H3>
                  <div className='leading-none mt-1'>
                    <span className='text-3xl font-bold text-white'>
                      {isSumaryLoading ?
                        <Skeleton /> : <>
                          {formatNumber(sumary?.passed || 0, { decimalsLength: 0 })}
                        </>
                      }
                    </span>
                  </div>
                </div>
              </div>
            </Card.Header>
          </Card>
          <Card elevate size="$4" bordered className='w-full'>
            <Card.Header padded>
              <div className='flex items-center gap-3'>
                <div className='governance-voting-period-icon'>
                  <Hourglass className="w-8 h-8 text-amber-400"/>
                </div>
                <div>
                  <H3 className='text-sm text-lumera-label !leading-none'>Voting Period</H3>
                  <div className='leading-none mt-1'>
                    <span className='text-3xl font-bold text-white'>
                      {isSumaryLoading ?
                        <Skeleton /> : <>
                          {formatNumber(Number(sumary.votingPeriodParam.replace('s', '')) / 86400, { decimalsLength: 0 })} Days
                        </>
                      }
                    </span>
                  </div>
                </div>
              </div>
            </Card.Header>
          </Card>
          <Card elevate size="$4" bordered className='w-full'>
            <Card.Header padded>
              <div className='flex items-center gap-3'>
                <div className='governance-deposit-icon'>
                  <LandmarkIcon className="w-8 h-8 text-sky-400"/>
                </div>
                <div>
                  <H3 className='text-sm text-lumera-label !leading-none !whitespace-nowrap'>Deposit Required</H3>
                  <div className='leading-none mt-1'>
                    {isSumaryLoading ?
                      <Skeleton /> : <>
                        <span className='text-3xl font-bold text-white'>
                          {formatToken({
                            amount: sumary.depositRequiredParam.amount,
                            denom: sumary.depositRequiredParam.denom,
                          }, false, '0,0')}<span className='text-xl ml-1'>LUME</span>
                        </span>
                      </>
                    }

                  </div>
                </div>
              </div>
            </Card.Header>
          </Card>
        </div>
        <Card elevate size="$4" bordered className='w-full p-5 mt-4'>
          <div className='flex justify-between items-center governance-control relative'>
            <Loading isLoading={isSumaryLoading} />
            <div className='overflow-x-auto w-full'>
              <ul className='tabs-secondary flex-nowrap min-w-[670px]'>
                <li className={`tab-item ${!currentTab ? 'active' : ''}`}>
                  <button
                    className='tab-button whitespace-nowrap'
                    onClick={() => onTabChange('')}
                  >
                    All ({formatNumber(sumary?.totalProposals || 0, { decimalsLength: 0 })})
                  </button>
                </li>
                <li className={`tab-item ${currentTab === 'PROPOSAL_STATUS_DEPOSIT_PERIOD' ? 'active' : ''}`}>
                  <button
                    className='tab-button whitespace-nowrap'
                    onClick={() => onTabChange('PROPOSAL_STATUS_DEPOSIT_PERIOD')}
                  >
                    Deposit ({formatNumber(sumary?.depositRequired || 0, { decimalsLength: 0 })})
                  </button>
                </li>
                <li className={`tab-item ${currentTab === 'PROPOSAL_STATUS_VOTING_PERIOD' ? 'active' : ''}`}>
                  <button
                    className='tab-button whitespace-nowrap'
                    onClick={() => onTabChange('PROPOSAL_STATUS_VOTING_PERIOD')}
                  >
                    Voting ({formatNumber(sumary?.votingPeriod || 0, { decimalsLength: 0 })})
                  </button>
                </li>
                <li className={`tab-item ${currentTab === 'PROPOSAL_STATUS_PASSED' ? 'active' : ''}`}>
                  <button
                    className='tab-button whitespace-nowrap'
                    onClick={() => onTabChange('PROPOSAL_STATUS_PASSED')}
                  >
                    Passed ({formatNumber(sumary?.passed || 0, { decimalsLength: 0 })})
                  </button>
                </li>
                <li className={`tab-item ${currentTab === 'PROPOSAL_STATUS_REJECTED' ? 'active' : ''}`}>
                  <button
                    className='tab-button whitespace-nowrap'
                    onClick={() => onTabChange('PROPOSAL_STATUS_REJECTED')}
                  >
                    Rejected ({formatNumber(sumary?.rejected || 0, { decimalsLength: 0 })})
                  </button>
                </li>
                <li className={`tab-item ${currentTab === 'PROPOSAL_STATUS_FAILED' ? 'active' : ''}`}>
                  <button
                    className='tab-button whitespace-nowrap'
                    onClick={() => onTabChange('PROPOSAL_STATUS_FAILED')}
                  >
                    Failed ({formatNumber(sumary?.failed || 0, { decimalsLength: 0 })})
                  </button>
                </li>
              </ul>
            </div>
            <div className='input-wrapper hidden'>
              <Input id="amount" placeholder="Search validator" className='input has-symbol' />
              <span className='input-symbol'>
                <Search />
              </span>
            </div>
          </div>
          <div className='mt-6 grid grid-cols-1 md:grid-cols-2 gap-6 governance-card-wrapper relative'>
            <Loading isLoading={isLoading} />
            {!governances?.length && !isLoading ?
              <div><H3 className='!leading-6'>No data</H3></div> : null
            }
            {governances?.map((item) => {
              const { yesPercent, noPercent, noWithVetoPercent, abstainPercent } = getPoolPercent(item);
              return (
                <Card elevate size="$4" bordered className='w-full' key={item.id}>
                  <div className='p-5'>
                    <div className='flex justify-between items-start gap-6 governance-card-header'>
                      <div className='flex flex-col'>
                        <AppLink href={`/governance/${item.id}`}>
                          <H3 className='!leading-6'>{item.title}</H3>
                        </AppLink>
                      </div>
                      {getStatus(item.status)}
                    </div>
                    <div className='mt-5 min-h-12'>
                      {item.summary}
                    </div>
                    <div className='mt-5'>
                      <div className='status-bar-wrapper'>
                        <div className='status-bar-yes' style={{ width: `${yesPercent}%` }}></div>
                        <div className='status-bar-no' style={{ width: `${noPercent}%` }}></div>
                        <div className='status-bar-no-with-veto' style={{ width: `${noWithVetoPercent}%` }}></div>
                        <div className='status-bar-abstain' style={{ width: `${abstainPercent}%` }}></div>
                      </div>
                      <div className='flex justify-between gap-3 mt-2 status-bar-label'>
                        <div className='text-lumera-label'>
                          <span className='text-lumera-green-light'>Yes</span>: {yesPercent.toFixed(1)}%
                        </div>
                        <div className='text-lumera-label'>
                          <span className='text-lumera-red-light'>No</span>: {noPercent.toFixed(1)}%
                        </div>
                        <div className='text-lumera-label'>
                          <span className='text-lumera-red-light'>No With Veto</span>: {noWithVetoPercent.toFixed(1)}%
                        </div>
                        <div className='text-lumera-label'>
                          <span className='text-lumera-sub-label'>Abstain</span>: {abstainPercent.toFixed(1)}%
                        </div>
                      </div>
                    </div>
                  </div>
                  {getControls(item)}
                </Card>
              )
            })}
          </div>
          {nextKey ?
            (
              <div className='w-full flex justify-end mt-2'>
                <Button onPress={handlePageClick}>Load More</Button>
              </div>
            ) : null
          }
        </Card>
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
        <DepositModal
          isOpen={deposit.isOpen}
          sender={deposit.sender}
          isVoteLoading={deposit.isVoteLoading}
          error={deposit.error}
          voteAdvanced={deposit.voteAdvanced}
          showAdvanced={deposit.showAdvanced}
          availableAmount={deposit.availableAmount}
          transactionHash={deposit.transactionHash}
          setOpen={deposit.setOpen}
          onVoteClick={deposit.onVoteClick}
          handleVoteAdvancedChange={deposit.handleVoteAdvancedChange}
          handleAdvancedCheckedChange={deposit.handleAdvancedCheckedChange}
          onCloseCongratulationsModal={deposit.handleCloseCongratulationsModal}
        />
        <CreateProposalModal
          isOpen={createProposal.selectedModal === 'create'}
          step={createProposal.step}
          proposal={createProposal.proposal}
          isLoading={createProposal.isLoading}
          msg={createProposal.msg}
          transactionHash={createProposal.transactionHash}
          requiredDeposit={createProposal.requiredDeposit}
          onNextClick={createProposal.onNextStepsClick}
          onCloseModal={createProposal.onCloseCreateProposalModalClick}
          onInputChange={createProposal.onInputChange}
          onBackClick={createProposal.onBackClick}
          onCreateProposalClick={createProposal.onCreateProposalClick}
        />
      </div>
    </YStack>
  )
}
