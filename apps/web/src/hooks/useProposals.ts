import { useEffect, useState } from 'react';
import axios from 'axios';

import { REST_AI_URL } from '@/contants/network';
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
    const [proposalsInfo, setProposalsInfo] = useState<IProposal[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<Error | null>(null);

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            setError(null);

            try {
                const { data } = await axios.get(`${REST_AI_URL}/cosmos/gov/v1/proposals?proposal_status=PROPOSAL_STATUS_UNSPECIFIED`);
                setProposalsInfo(data.proposals)
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
    }, [])

    return {
        proposalsInfo,
        loading,
        error,
    }
}

export default useProposals;