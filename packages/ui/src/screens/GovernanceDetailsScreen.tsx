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
import numeral from 'numeral';
import ReactPaginate from 'react-paginate';
import { ChevronLeft } from 'lucide-react';

import Loading from '@/components/Loading';
import DepositModal from '@/components/DepositModal';
import CountDown from '@/components/CountDown';
import PastTime from '@/components/PastTime';
import AppLink from '@/components/AppLink';
import { IProposal } from '@/hooks/useProposals';
import { IBlock, IVote } from '@/hooks/useGovernanceDetails';
import { formatAddress } from '@/utils/format';
import { VoteModal } from './HomeScreen';

import 'react-paginate/theme/basic/react-paginate.css';

interface IGovernanceDetailsScreen {
    isLoading: boolean;
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
    };
    block: IBlock | null;
    votes: IVote[];
    totalVotes: number;
    handlePageClick: ({ selected }: { selected: number }) => void;
}

export const GovernanceDetailsScreen = ({
    isLoading,
    governance,
    pool,
    deposit,
    vote,
    block,
    votes,
    totalVotes,
    handlePageClick,
}: IGovernanceDetailsScreen) => {
    const getMessage = () => {
        if (!governance?.messages?.length) {
            return null;
        }
        const item = governance.messages[0];
        return (
            <div>
                <H3 className='text-lumera-label'>Description</H3>
                <div className='w-full'>
                    {governance.summary}
                </div>
                <div className='grid grid-cols-1 md:grid-cols-2 gap-3 w-full'>
                    <div className='mt-3 flex justify-between gap-5 w-full sub-card p-3 rounded-md'>
                        <div className='flex flex-col w-full'>
                            <Text>@type</Text>
                            <SizableText className='text-sm text-lumera-label truncate !whitespace-nowrap'>{item['@type']}</SizableText>
                        </div>
                    </div>
                    <div className='mt-3 flex justify-between gap-5 w-full sub-card p-3 rounded-md'>
                        <div className='flex flex-col w-full'>
                            <Text>Authority</Text>
                            <SizableText className='text-sm text-lumera-label truncate !whitespace-nowrap'>{item.authority}</SizableText>
                        </div>
                    </div>
                </div>
                <div className='mt-3 flex justify-between gap-5 w-full sub-card p-3 rounded-md'>
                    <div className='flex flex-col w-full'>
                        <Text>Plan</Text>
                        {item?.plan ?
                            <div className='grid grid-cols-1 md:grid-cols-3 w-full'>
                                {Object.entries(item.plan).map(([key, value]) => (
                                    <SizableText className='text-sm text-lumera-label' key={key}>
                                        <strong className='capitalize text-gray-300'>{key}:</strong> {value || ''}
                                    </SizableText>
                                ))}
                            </div> : <div className='text-base mt-3'>No data</div>
                        }
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
                noWithVetoPercent: 0, 
                abstainPercent: 0, 
                turnout: 0,
            }
        }
        const item = governance.final_tally_result;
        const total = Number(item.abstain_count) + Number(item.no_count) + Number(item.no_with_veto_count) + Number(item.yes_count);
        const bonded = pool?.bonded_tokens || '1';
        return {
            yesPercent: item.yes_count ? Number(item.yes_count) * 100 / total : 0,
            noPercent: item.yes_count ? Number(item.no_count) * 100 / total : 0,
            noWithVetoPercent: item.yes_count ? Number(item.no_with_veto_count) * 100 / total : 0,
            abstainPercent: item.yes_count ? Number(item.abstain_count) * 100 / total : 0,
            turnout: Number(total) / Number(bonded) * 100,
        }
    }

    const handleDepositClick = (id: string) => {
        deposit.setProposalId(id);
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
            <div className='btn-blue flex justify-end gap-3'>
                {governance.status === 'PROPOSAL_STATUS_VOTING_PERIOD' ?
                <Button onPress={handleVotePress}>Vote</Button> : null
                }
                <Button onPress={() => handleDepositClick(governance.id)}>Deposit</Button>
            </div>
            </div>
        );
    }

    const getDate = (date: string) => {
        if (!date) {
            return null;
        }

        return dayjs(date).format("YYYY-MM-DD HH:mm")
    }

    const { yesPercent, noPercent, noWithVetoPercent, abstainPercent, turnout } = getPoolPercent();

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

    return (
        <YStack flex={1}>
            <div className='text-left'>
                <AppLink href='/governance' className="flex items-start gap-2 text-gray-400 hover:text-white transition-colors mb-4"><ChevronLeft className="w-5 h-5"/>Back to Proposals</AppLink>
            </div>
            <div className='flex justify-between gap-5 w-full items-center flex-wrap sm:flex-nowrap'>
                <H2 className='!font-bold text-white text-[32px] leading-none'>{governance?.title}</H2>
                {getStatus(governance?.status || '')}
            </div>
            <div className="w-full relative mt-5">
                <Loading isLoading={isLoading} />
                <Card elevate size="$4" bordered className='p-5 w-full'>
                    {getMessage()}
                </Card>
                <Card elevate size="$4" bordered className='p-5 w-full mt-5'>
                    <H3>Tally</H3>
                    <div className='mt-5'>
                        <div className='status-bar-wrapper'>
                            <div className='status-bar-yes' style={{ width: `${turnout}%` }}></div>
                        </div>
                        <div className='flex justify-between gap-3 mt-2'>
                            <div className='text-lumera-label'><span className='text-lumera-green-light'>Turnout</span>: {turnout.toFixed(2)}%</div>
                        </div>
                    </div>
                    <div className='mt-5'>
                        <div className='status-bar-wrapper'>
                            <div className='status-bar-yes' style={{ width: `${yesPercent}%` }}></div>
                            <div className='status-bar-no' style={{ width: `${noPercent}%` }}></div>
                            <div className='status-bar-no-with-veto' style={{ width: `${noWithVetoPercent}%` }}></div>
                            <div className='status-bar-abstain' style={{ width: `${abstainPercent}%` }}></div>
                        </div>
                        <div className='flex justify-between gap-3 mt-2 status-bar-label-detail'>
                            <div className='text-lumera-label'><span className='text-lumera-green-light'>Yes</span>: {yesPercent.toFixed(2)}%</div>
                            <div className='text-lumera-label'><span className='text-lumera-red-light'>No</span>: {noPercent.toFixed(2)}%</div>
                            <div className='text-lumera-label'><span className='text-lumera-red-light'>No With Veto</span>: {noWithVetoPercent.toFixed(2)}%</div>
                            <div className='text-lumera-label'><span className='text-lumera-sub-label'>Abstain</span>: {abstainPercent.toFixed(2)}%</div>
                        </div>
                    </div>
                    <div className="mt-5">
                        {getControls()}
                    </div>
                </Card>
                {governance ?
                    <Card elevate size="$4" bordered className='p-5 w-full mt-5'>
                        <H3>Timeline</H3>
                        <div>
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
                    <H3>Votes</H3>
                    <div className='overflow-x-auto'>
                        <div className='w-full min-w-[968px]'>
                            <table className="table w-full table-zebra">
                                <tbody>
                                    {votes.map((item, index) => (
                                        <tr key={index}>
                                            <td className="py-2 text-sm">{formatAddress(item.voter)}</td>
                                            {item.option ?
                                                <td
                                                    v-if="item.option"
                                                    className={`py-2 text-sm ${item.option === 'VOTE_OPTION_YES' ? 'text-yes' : ''} ${item.option === 'VOTE_OPTION_ABSTAIN' ? 'text-gray-400' : ''}`}
                                                >
                                                    { String(item.option).replace('VOTE_OPTION_', '') }
                                                </td> : null
                                            }
                                            {item.options ?
                                                <td
                                                    v-if="item.options"
                                                    className="py-2 text-sm"
                                                >
                                                    {item.options.map(x => `${x.option.replace('VOTE_OPTION_', '')}:${numeral(x.weight).format('0.[00]%')}`).join(', ') }
                                                </td> : null 
                                            }
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                    {totalVotes > 1 ?
                        <div className="paginate-wrapper pt-3">
                            <ReactPaginate
                                breakLabel="..."
                                nextLabel=">"
                                onPageChange={handlePageClick}
                                pageRangeDisplayed={3}
                                pageCount={totalVotes}
                                previousLabel="<"
                                renderOnZeroPageCount={null}
                                className='react-paginate'
                            />
                        </div> : null
                    }
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
            />
        </YStack>
    )
}