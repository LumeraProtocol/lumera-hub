import { useEffect, useState } from 'react';
import axios from 'axios';
import { useChain } from '@interchain-kit/react'
import dayjs from 'dayjs';

import { CHAIN_NAME, REST_AI_URL } from '@/contants/network';
import { Coin } from '@/hooks/useAccountInfo'

type TMessage = {
    '@type': string;
    authority: string;
    plan: {
        name: string;
        time: string;
        height: string;
        info: string;
        upgraded_client_state: string | null;
    };
}

export const VOTE_OPTIONS = [
  {
    value: '1',
    label: 'Yes'
  },
  {
    value: '3',
    label: 'No'
  },
  {
    value: '4',
    label: 'No With Veto'
  },
  {
    value: '2',
    label: 'Abstain'
  },
]

export const broadcastModeOptions = [
  { name: 'Sync', value: 'BROADCAST_MODE_SYNC' },
  { name: 'Async', value: 'BROADCAST_MODE_ASYNC' },
  { name: 'BROADCAST_MODE_BLOCK', value: 'Block' },
];

export interface IProposal {
    id: string;
    messages: TMessage[];
    status: string;
    final_tally_result: {
        yes_count: string;
        abstain_count: string;
        no_count: string;
        no_with_veto_count: string;
    }
    submit_time: string;
    deposit_end_time: string;
    total_deposit: Coin[];
    voting_start_time: string;
    voting_end_time: string;
    metadata: string;
    title: string;
    summary: string;
    proposer: string;
    expedited: boolean;
    failed_reason: string;
}

const useProposals = () => {
    const { address } = useChain(CHAIN_NAME)
    const [proposalsInfo, setProposalsInfo] = useState<IProposal[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<Error | null>(null);
    const [voteOption, setVoteOption] = useState(VOTE_OPTIONS[0].value);
    const [isVoteLoading, setVoteLoading] = useState(false);
    const [errorVote, setErrorVote] = useState<string | null>(null);
    const [voteAdvanced, setAdvanced] = useState({
        fees: '2000',
        gas: '200000',
        memo: 'ping.pub',
        broadcastMode: broadcastModeOptions[0].value,
    });

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            setError(null);

            try {
                const { data } = await axios.get(`${REST_AI_URL}/cosmos/gov/v1/proposals?proposal_status=PROPOSAL_STATUS_UNSPECIFIED`);
                setProposalsInfo(data.proposals.sort((a: IProposal, b: IProposal) => dayjs(b.submit_time).valueOf() - dayjs(a.submit_time).valueOf()));
            } catch (e) {
                console.error('API Error:', e);
                if (e instanceof Error) {
                setError(e);
                } else {
                setError(new Error('An unknown error occurred.'));
                }
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, []);

    const handleOptionChange = (val: string) => {
        setVoteOption(val);
    }

    const handleVote = async (item: IProposal | null) => {
        if (!item) {
            return null;
        }
        setVoteLoading(true);
        setErrorVote(null);
        try {
            const option = {
                option: voteOption,
                proposal_id: item.id,
                voter: address,
                metadata: JSON.stringify({
                    fee: voteAdvanced.fees,
                    gas: voteAdvanced.gas,
                    memo: voteAdvanced.memo,
                    mode: voteAdvanced.broadcastMode,
                }),
            }
            await axios.post(`${REST_AI_URL}/cosmos.gov.v1beta1.Msg/Vote`, option);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } catch (e: any) {
            setErrorVote(e?.response?.data?.message || 'An unknown error occurred.')
            console.error('API Error:', e);
        } finally {
            setVoteLoading(false);
        }
    }

    const handleVoteAdvancedChange = (name: string, value: string) => {
        setAdvanced({
            ...voteAdvanced,
            [name]: value,
        })
    }

    const handleResetError = () => {
        setErrorVote(null);
        setErrorVote(null);
    }

    return {
        proposalsInfo,
        loading,
        error,
        errorVote,
        isVoteLoading,
        voteAdvanced,
        handleResetError,
        handleVoteAdvancedChange,
        handleOptionChange,
        handleVote,
    }
}

export default useProposals;