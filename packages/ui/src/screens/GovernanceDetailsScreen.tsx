import {
  YStack,
  Card,
  H2,
  H3,
  Text,
  SizableText,
  Button,
} from 'tamagui';
import dayjs from 'dayjs';
import { ChevronLeft } from 'lucide-react';
import ReactECharts from 'echarts-for-react';
import ReactPaginate from 'react-paginate';

import Loading from '@/components/Loading';
import DepositModal from '@/components/DepositModal';
import CountDown from '@/components/CountDown';
import PastTime from '@/components/PastTime';
import AppLink from '@/components/AppLink';
import { IProposal } from '@/hooks/useProposals';
import { VOTE_LIMIT } from '@/hooks/useGovernanceDetails';
import { IBlock, IVote } from '@/hooks/useGovernanceDetails';
import { formatAddress, formatToken } from '@/utils/format';
import { DENOM } from '@/contants/network';
import { VoteModal } from './HomeScreen';

import 'react-paginate/theme/basic/react-paginate.css';

interface IGovernanceDetailsScreen {
  transactionUnavailableReason: string;
  isLoading: boolean;
  isVoteLoading: boolean;
  governance: IProposal | null;
  pool: {
      bonded_tokens: string;
      not_bonded_tokens: string;
  };
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
  vote: {
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
    address: string;
    isVoteOpen: boolean;
    setVoteOpen: (status: boolean) => void;
    handleResetError: () => void;
    transactionHash: string;
    handleCloseCongratulationsModal: () => void;
  };
  block: IBlock | null;
  votes: IVote[];
  totalVotes: number;
  handlePageClick: ({ selected }: { selected: number }) => void;
}

interface IVoteChartOptions {
  yes: number;
  noWithVeto: number;
  no: number;
  abstain: number;
}

const COLORS = ['#2dd4bf', '#f87171', '#fb923c', '#9ca3af'];

export const GovernanceDetailsScreen = ({
  transactionUnavailableReason,
  isLoading,
  governance,
  pool,
  deposit,
  vote,
  block,
  votes,
  totalVotes,
  isVoteLoading,
  handlePageClick,
}: IGovernanceDetailsScreen) => {
  const getMessage = () => {
    if (!governance?.messages?.length) {
        return null;
    }
    const item = governance.messages[0];
    const getTotalDeposit = () => {
        return governance.total_deposit.reduce((total, deposit) => total + Number(deposit.amount), 0);
    }
    return (
      <div>
        <H3 className='text-lumera-label'>Description</H3>
        <div className='w-full'>
            {governance.summary}
        </div>
        <div className='grid grid-cols-1 md:grid-cols-2 gap-3 w-full mt-3'>
          <div className='mt-3 flex justify-between gap-5 w-full sub-card p-3 rounded-md'>
            <div className='flex flex-col w-full'>
              <Text className='!text-gray-500'>@type</Text>
              <SizableText className='text-sm text-lumera-label truncate !whitespace-nowrap'>{item['@type']}</SizableText>
            </div>
          </div>
          <div className='mt-3 flex justify-between gap-5 w-full sub-card p-3 rounded-md'>
            <div className='flex flex-col w-full'>
              <Text className='!text-gray-500'>Authority</Text>
              <SizableText className='text-sm text-lumera-label truncate !whitespace-nowrap'>{item.authority}</SizableText>
            </div>
          </div>
        </div>
        <div className='mt-3 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 w-full sub-card p-3 rounded-md'>
          <div>
            <Text className='!text-gray-500'>Proposal Type</Text>
            <div>
              <SizableText className='text-sm text-lumera-label truncate'>
                {item?.plan?.info}
              </SizableText>
            </div>
          </div>
          <div>
            <Text className='!text-gray-500'>Proposed On</Text>
            <div>
              <SizableText className='text-sm text-lumera-label truncate !whitespace-nowrap'>
                {dayjs(governance.voting_start_time).format('MM/DD/YYYY')}
              </SizableText>
            </div>
          </div>
          <div>
            <Text className='!text-gray-500'>Voting End</Text>
            <div>
              <SizableText className='text-sm text-lumera-label truncate !whitespace-nowrap'>
                {dayjs(governance.voting_end_time).format('MM/DD/YYYY')}
              </SizableText>
            </div>
          </div>
          <div>
            <Text className='!text-gray-500'>Deposit</Text>
            <div>
              <SizableText className='text-sm text-lumera-label truncate !whitespace-nowrap'>
                {formatToken({ amount: `${getTotalDeposit()}`, denom: DENOM, })}
              </SizableText>
            </div>
          </div>
        </div>
      </div>
    )
  }

  const getPoolPercent = () => {
    if (!governance?.final_tally_result) {
      return {
        yesPercent: 0,
        noPercent: 0,
        turnout: 0,
      }
    }
    const item = governance.final_tally_result;
    const total = Number(item.abstain_count) + Number(item.no_count) + Number(item.no_with_veto_count) + Number(item.yes_count);
    const yesNoTotal = Number(item.no_count) + Number(item.yes_count);
    const bonded = pool?.bonded_tokens || '1';
    return {
      yesPercent: Number(item.yes_count) ? Number(item.yes_count) * 100 / yesNoTotal : 0,
      noPercent: Number(item.no_count) ? Number(item.no_count) * 100 / yesNoTotal : 0,
      turnout: Number(total) / Number(bonded) * 100 || 0,
    }
  }

  const handleDepositClick = (item: IProposal) => {
    deposit.setProposalId(item.id);
    deposit.setModalOpen(true);
  }

  const handleVotePress = () => {
    vote.handleResetError();
    vote.setVoteOpen(true);
  }

  const getControls = () => {
    if (!governance) {
      return null;
    }
    const now = dayjs();
    const expiryDate = dayjs(governance.deposit_end_time);
    const isExpired = expiryDate.isBefore(now);

    if (['PROPOSAL_STATUS_FAILED', 'PROPOSAL_STATUS_REJECTED'].includes(governance?.status) || (isExpired && governance.status !== 'PROPOSAL_STATUS_VOTING_PERIOD')) {
      return null;
    }
    return (
      <div className='text-lumera-label text-right bg-lumera-sub-card p-3 rounded-9'>
        <div className='btn-primary flex justify-end gap-3'>
          {governance.status === 'PROPOSAL_STATUS_VOTING_PERIOD' ?
            <Button
              disabled={Boolean(transactionUnavailableReason)}
              onPress={handleVotePress}
            >Vote</Button> : null
          }
          <Button
            disabled={Boolean(transactionUnavailableReason)}
            onPress={() => handleDepositClick(governance)}
          >Deposit</Button>
        </div>
        {transactionUnavailableReason ? (
          <p className='text-sm text-left mt-2'>{transactionUnavailableReason}</p>
        ) : null}
      </div>
    );
  }

  const getDate = (date: string) => {
    if (!date) {
      return null;
    }

    return dayjs(date).format("YYYY-MM-DD HH:mm")
  }

  const { yesPercent, noPercent, turnout } = getPoolPercent();

  if ((!governance || !block) && !isLoading) {
    return (
      <YStack flex={1} alignItems="center" justifyContent="center" gap="$2">
        <div className="w-full relative">
          <H3>No data</H3>
        </div>
      </YStack>
    );
  }

  const upgradeCountdown = () => {
    if (!governance || !block) {
      return new Date().getTime();
    }

    const height = Number(governance.messages[0]?.plan?.height);
    if (height > 0) {
      const current = Number(block.header.height || 0);
      return (height - current) * Number((new Date(block.header.time).getTime() / 1000).toFixed()) * 1000;
    }
    const now = new Date();
    const end = new Date(governance.messages[0]?.plan?.time || '');
    return end.getTime() - now.getTime();
  }

  const getStatus = (status: string) => {
    switch (status) {
      case 'PROPOSAL_STATUS_PASSED':
        return (
          <div className='btn-green'>
            <span className='is_Button rounded-2xl px-3 py-1'>
              <span>Passed</span>
            </span>
          </div>
        )
      case 'PROPOSAL_STATUS_DEPOSIT_PERIOD':
        return (
          <div className='btn-yellow'>
            <span className='is_Button rounded-2xl px-3 py-1'>
              <span>Deposit</span>
            </span>
          </div>
        )
      case 'PROPOSAL_STATUS_VOTING_PERIOD':
        return (
          <div className='btn-emerald'>
            <span className='is_Button rounded-2xl px-3 py-1'>
              <span>Voting</span>
            </span>
          </div>
        )
      case 'PROPOSAL_STATUS_UNSPECIFIED':
        return (
          <div className='btn-purple'>
            <span className='is_Button rounded-2xl px-3 py-1'>
              <span>Unspecified</span>
            </span>
          </div>
        )
      case 'PROPOSAL_STATUS_REJECTED':
        return (
          <div className='btn-black'>
            <span className='is_Button rounded-2xl px-3 py-1'>
              <span>Rejected</span>
            </span>
          </div>
        )
      case 'PROPOSAL_STATUS_FAILED':
        return (
          <div className='btn-red'>
            <span className='is_Button rounded-2xl px-3 py-1'>
              <span>Failed</span>
            </span>
          </div>
        )
      default:
        return '';
    }
  }

  const getStatusText = (status: string) => {
    switch (status) {
      case 'PROPOSAL_STATUS_DEPOSIT_PERIOD':
        return 'Deposit';
      case 'PROPOSAL_STATUS_VOTING_PERIOD':
        return 'Voting';
      case 'PROPOSAL_STATUS_PASSED':
        return 'Passed';
      case 'PROPOSAL_STATUS_REJECTED':
        return 'Rejected';
      case 'PROPOSAL_STATUS_FAILED':
        return 'Failed';
      default:
        return 'Unspecified';
    }
  }

  const getOption = (data: IVoteChartOptions) => {
    return {
      tooltip: {
      trigger: 'item'
      },
      color: COLORS,
      series: [
        {
          name: 'Votes & Voters',
          type: 'pie',
          radius: '90%',
          label: {
            show: false,
            position: 'center'
          },
          labelLine: {
            show: false
          },
          data: [
            { value: Number(data.yes), name: 'Yes' },
            { value: Number(data.no), name: 'No' },
            { value: Number(data.noWithVeto), name: 'No with Veto' },
            { value: Number(data.abstain), name: 'Abstain' }
          ]
        }
      ]
    }
  }

  const VoterTypePill = (vote: IVote) => {
    switch (vote.options[0].option) {
      case 'VOTE_OPTION_YES':
        return (
          <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-teal-500/20 text-teal-300">Yes</span>
        );
      case 'VOTE_OPTION_NO':
        return (
          <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-red-500/20 text-red-300">No</span>
        );
      case 'VOTE_OPTION_NO_WITH_VETO':
        return (
          <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-orange-500/20 text-orange-300">No with Veto</span>
        );
      default:
        return (
          <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-gray-500/20 text-gray-300">Abstain</span>
        );
    }
  }

  const getGovernanceData = () => {
    if (!governance) {
      return {
        yes: {
          value: 0,
          percent: '0',
        },
        no: {
          value: 0,
          percent: '0',
        },
        noWithVeto: {
          value: 0,
          percent: '0',
        },
        abstain: {
          value: 0,
          percent: '0',
        },
      }
    }
    const { abstain_count, no_with_veto_count, no_count, yes_count } = governance.final_tally_result;

    const totalVotes = Number(yes_count) + Number(no_count) + Number(no_with_veto_count) + Number(abstain_count);
    return {
      yes: {
        value: Number(yes_count),
        percent: Number(yes_count) ? (Number(yes_count) * 100 / totalVotes)?.toFixed(2) : '0',
      },
      no: {
        value: Number(no_count),
        percent: Number(no_count) ? (Number(no_count) * 100 / totalVotes)?.toFixed(2) : '0',
      },
      noWithVeto: {
        value: Number(no_with_veto_count),
        percent: Number(no_with_veto_count) ? (Number(no_with_veto_count) * 100 / totalVotes)?.toFixed(2) : '0',
      },
      abstain: {
        value: Number(abstain_count),
        percent: Number(abstain_count) ? (Number(abstain_count) * 100 / totalVotes)?.toFixed(2) : '0',
      },
    }
  }
  const { abstain, no, noWithVeto, yes } = getGovernanceData();

  const getVoteTimePercent = () => {
    if (!governance) {
      return {
        voteTimePercent: 0,
        voteTimeLeft: 0,
      };
    }

    const startDate = dayjs(governance.voting_start_time);
    const endDate = dayjs(governance.voting_end_time);
    const now = dayjs();
    const totalDays = endDate.diff(startDate, 'day');
    const passedDays = now.diff(startDate, 'day');
    const remainingPercent = ((totalDays - passedDays) / totalDays) * 100;

    if (passedDays < 0) {
      return {
        voteTimePercent: 100,
        voteTimeLeft: 0,
      };
    }
    return {
      voteTimePercent: 100 - remainingPercent,
      voteTimeLeft: Math.ceil(totalDays - passedDays),
    };
  }

  const { voteTimeLeft, voteTimePercent } = getVoteTimePercent();

  return (
    <YStack flex={1}>
      <div className='text-left'>
        <AppLink href='/governance' className="flex items-start gap-2 text-gray-400 hover:text-white transition-colors mb-4 text-sm"><ChevronLeft className="w-5 h-5"/>Back to Proposals</AppLink>
      </div>
      <div className='flex justify-between gap-5 w-full items-center flex-wrap sm:flex-nowrap'>
        <H2 className='!font-bold text-white !text-[32px] sm:!text-[42px] !leading-[1.2]'>
          {governance?.title}
        </H2>
        {getStatus(governance?.status || '')}
      </div>
      <div className="w-full relative mt-5">
        <Loading isLoading={isLoading} />
        <Card elevate size="$4" bordered className='p-5 w-full'>
          {getMessage()}
        </Card>
        <Card elevate size="$4" bordered className='p-5 w-full mt-5'>
          <H3>Results</H3>
          <div className='mt-5'>
            <div className='status-bar-wrapper'>
              <div className='status-bar-yes' style={{ width: `${turnout}%` }}></div>
            </div>
            <div className='flex justify-between gap-3 mt-2'>
              <div className='text-lumera-label'>
                <span className='text-lumera-green-light'>Turnout</span>: {turnout.toFixed(2)}%
              </div>
            </div>
          </div>
          <div className='mt-5'>
            <div className='text-base mb-3'>Threshold</div>
            <div className='status-bar-wrapper'>
              <div className='status-bar-yes' style={{ width: `${yesPercent}%` }}></div>
              <div className='status-bar-no' style={{ width: `${noPercent}%` }}></div>
            </div>
            <div className='flex justify-between gap-3 mt-2 status-bar-label-detail'>
              <div className='text-lumera-label'>
                <span className='text-lumera-green-light'>Yes</span>: {yesPercent.toFixed(2)}%
              </div>
              <div className='text-lumera-label'>
                <span className='text-lumera-red-light'>No</span>: {noPercent.toFixed(2)}%
              </div>
            </div>
          </div>
          <div className='mt-5'>
            <div className='text-base mb-3'>Voting Period</div>
            <div className='status-bar-wrapper'>
              <div className='status-bar-yes' style={{ width: `${voteTimePercent}%` }}></div>
            </div>
            {governance?.voting_end_time ? (
              <div className='flex justify-end gap-3 mt-2 status-bar-label-detail text-lumera-label text-sm'>
                {voteTimeLeft > 0 ?
                  <span>{voteTimeLeft} day(s)</span> :
                  <span>Ends on {dayjs(governance.voting_end_time).format('MMM DD, YYYY')} at {dayjs(governance.voting_end_time).format('hh:mm A')}</span>
                }
              </div>
            ) : null }
          </div>
          <div className="mt-5">
            {getControls()}
          </div>
        </Card>
        {governance ?
          <Card elevate size="$4" bordered className='p-5 w-full mt-5'>
            <H3>Timeline</H3>
            <div className='mt-3'>
              <div className="flex items-start justify-between flex-col sm:flex-row">
                <div>
                  <span className='w-2.5 h-2.5 rounded-full bg-amber-600 inline-block mr-2'></span> <span>Submited at: </span> <span>{getDate(governance?.submit_time)}</span>
                </div>
                <div className='pl-5 sm:pl-0'><PastTime pastDate={new Date(governance?.submit_time)} /></div>
              </div>
              <div className="flex items-start justify-between mt-3 flex-col sm:flex-row">
                <div>
                  <span className='w-2.5 h-2.5 rounded-full bg-green-800 inline-block mr-2'></span> <span>Deposited at: </span> <span>{getDate(governance?.status === 'PROPOSAL_STATUS_DEPOSIT_PERIOD' ? governance?.deposit_end_time : governance?.voting_start_time)}</span>
                </div>
                <div className='pl-5 sm:pl-0'><PastTime pastDate={new Date(governance?.status === 'PROPOSAL_STATUS_DEPOSIT_PERIOD' ? governance?.deposit_end_time : governance?.voting_start_time)} /></div>
              </div>
              <div className='mt-3'>
                <div className="flex items-start justify-between flex-col sm:flex-row">
                  <div>
                    <span className='w-2.5 h-2.5 rounded-full bg-green-600 inline-block mr-2'></span> <span>Voting start from </span> <span>{getDate(governance?.voting_start_time)}</span>
                    <div className='pl-5'>
                      <CountDown targetDate={new Date(governance?.voting_end_time)} />
                    </div>
                  </div>
                  <div className='pl-5 sm:pl-0'><PastTime pastDate={new Date(governance?.voting_start_time)} /></div>
                </div>
              </div>
              <div className='mt-3'>
                <div className="flex items-start justify-between flex-col sm:flex-row">
                  <div>
                    <span className='w-2.5 h-2.5 rounded-full bg-green-500 inline-block mr-2'></span> <span>Voting end</span> <span>{getDate(governance?.voting_end_time)}</span>
                    <div className='pl-5'>
                      <SizableText className='text-sm text-lumera-label'>Current Status: {getStatusText(governance?.status)}</SizableText>
                    </div>
                  </div>
                  <div className='pl-5 sm:pl-0'><PastTime pastDate={new Date(governance?.voting_end_time)} /></div>
                </div>
              </div>
              {governance?.messages?.length && governance.messages[0]['@type']?.endsWith('SoftwareUpgradeProposal') ?
                <div className='mt-3'>
                  <div className="flex items-start justify-between flex-col sm:flex-row">
                    <div>
                      <span className='w-2.5 h-2.5 rounded-full bg-yellow-600 inline-block mr-2'></span> <span>Upgrade Plan {Number(governance.messages[0]?.plan?.height || 0) > 0 ? '(EST)' : getDate(governance.messages[0].plan.time)}</span>
                      <div className='pl-5'>
                        <CountDown targetDate={new Date(governance?.voting_end_time)} />
                      </div>
                    </div>
                    <div className='pl-5 sm:pl-0'><PastTime pastDate={new Date(upgradeCountdown())} /></div>
                  </div>
                </div> : null
              }
            </div>
          </Card> : null
        }
        <Card elevate size="$4" bordered className='p-5 w-full mt-5'>
            <H3>Votes & Voters</H3>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 w-full mt-3">
              <div className="w-full">
                <div>
                  <ReactECharts option={getOption({
                      yes: yes.value ? Number(formatToken({ amount: `${yes.value}`, denom: DENOM, }, false).replaceAll(',', '')) : 0,
                      no: yes.value ? Number(formatToken({ amount: `${no.value}`, denom: DENOM, }, false).replaceAll(',', '')) : 0,
                      noWithVeto: yes.value ? Number(formatToken({ amount: `${noWithVeto.value}`, denom: DENOM, }, false).replaceAll(',', '')) : 0,
                      abstain: yes.value ? Number(formatToken({ amount: `${abstain.value}`, denom: DENOM, }, false).replaceAll(',', '')) : 0,
                  })} style={{ height: '240px', width: '100%' }} />
                </div>
                <div className="w-full mt-4 space-y-2">
                  <div className="flex justify-between items-center text-sm p-2 bg-gray-900/50 rounded-md">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[0] }}></div>
                      <span className="text-gray-300">Yes</span>
                    </div>
                    <span className="font-semibold text-white">
                      {formatToken({ amount: `${yes.value}`, denom: DENOM }, true, '0,0')} ({yes.percent}%)
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-sm p-2 bg-gray-900/50 rounded-md">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[1] }}></div>
                      <span className="text-gray-300">No</span>
                    </div>
                    <span className="font-semibold text-white">
                      {formatToken({ amount: `${no.value}`, denom: DENOM }, true, '0,0')} ({no.percent}%)
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-sm p-2 bg-gray-900/50 rounded-md">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[2] }}></div>
                      <span className="text-gray-300">No with Veto</span>
                    </div>
                    <span className="font-semibold text-white">
                      {formatToken({ amount: `${noWithVeto.value}`, denom: DENOM }, true, '0,0')} ({noWithVeto.percent}%)
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-sm p-2 bg-gray-900/50 rounded-md">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[3] }}></div>
                      <span className="text-gray-300">Abstain</span>
                    </div>
                    <span className="font-semibold text-white">
                      {formatToken({ amount: `${abstain.value}`, denom: DENOM }, true, '0,0')} ({abstain.percent}%)
                    </span>
                  </div>
                </div>
              </div>

              <div className='w-full relative'>
                <Loading isLoading={isVoteLoading} />
                <div className="space-y-2 lg:h-96 overflow-y-auto pr-2">
                  {votes.map((voter, index) => (
                    <div key={`${index}-${voter.proposal_id}-${voter.voter}`} className="flex justify-between items-center p-3 bg-gray-900/50 rounded-md">
                      <span className="font-mono text-sm text-gray-300 truncate">{formatAddress(voter.voter, 10, -10)}</span>
                      {VoterTypePill(voter)}
                    </div>
                  ))}
                </div>
                {Number(totalVotes) > 0 ?
                  <div className="flex justify-between items-center mt-4 flex-col sm:flex-row">
                    <div className='whitespace-nowrap'>Total pages: {totalVotes * VOTE_LIMIT}</div>
                    <div className='w-auto paginate-wrapper mt-3 sm:mt-0'>
                      <ReactPaginate
                        breakLabel="..."
                        nextLabel=">"
                        onPageChange={handlePageClick}
                        pageRangeDisplayed={2}
                        marginPagesDisplayed={1}
                        pageCount={totalVotes}
                        previousLabel="<"
                        renderOnZeroPageCount={null}
                        className='react-paginate'
                      />
                    </div>
                  </div> : null }
              </div>
            </div>
        </Card>
      </div>
      <VoteModal
        isOpen={vote.isVoteOpen}
        setOpen={vote.setVoteOpen}
        sender={vote.address}
        onOptionChange={vote.onOptionChange}
        onVoteClick={vote.onVoteClick}
        item={governance}
        isVoteLoading={vote.isVoteLoading}
        error={vote.error}
        voteAdvanced={vote.voteAdvanced}
        handleVoteAdvancedChange={vote.handleVoteAdvancedChange}
        transactionHash={vote.transactionHash}
        onCloseCongratulationsModal={vote.handleCloseCongratulationsModal}
      />
      <DepositModal
        isOpen={deposit.isOpen}
        sender={deposit.sender}
        isVoteLoading={deposit.isVoteLoading}
        error={deposit.error}
        voteAdvanced={deposit.voteAdvanced}
        showAdvanced={deposit.showAdvanced}
        availableAmount={deposit.availableAmount}
        setOpen={deposit.setOpen}
        onVoteClick={deposit.onVoteClick}
        handleVoteAdvancedChange={deposit.handleVoteAdvancedChange}
        handleAdvancedCheckedChange={deposit.handleAdvancedCheckedChange}
        transactionHash={deposit.transactionHash}
        onCloseCongratulationsModal={deposit.handleCloseCongratulationsModal}
      />
    </YStack>
  )
}
