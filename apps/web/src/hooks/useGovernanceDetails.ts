import { useState, useEffect } from "react";

import * as instance from '@/utils/api';
import { IProposal } from '@/hooks/useProposals';

type TSignatures = {
    block_id_flag: string;
    validator_address: string;
    timestamp: string;
    signature: string;
}

export interface IBlock {
    header: {
        version: {
            block: string;
            app: string;
        };
        chain_id: string;
        height: string;
        time: string;
        last_block_id: {
            hash: string;
            part_set_header: {
                total: number;
                hash: string;
            };
        };
        last_commit_hash: string;
        data_hash: string;
        validators_hash: string;
        next_validators_hash: string;
        consensus_hash: string;
        app_hash: string;
        last_results_hash: string;
        evidence_hash: string;
        proposer_address: string;
    };
    data: {
        txs: string[];
    };
    last_commit: {
        height: string;
        round: number;
        block_id: {
           hash: string;
           part_set_header: {
            total: number;
            hash: string;
           }
        };
        signatures: TSignatures[];
    }
}

type TVoteOption = {
    option: string;
    weight: string;
}

export interface IVote {
   proposal_id: string;
   voter: string;
   option: string;
   options: TVoteOption[];
}

export const VOTE_LIMIT = 20;

const useGovernanceDetails = (id: string) => {
    const [isLoading, setLoading] = useState(false);
    const [governance, setGovernance] = useState<IProposal | null>(null);
    const [error, setError] = useState('');
    const [pool, setPool] = useState({
        bonded_tokens: '0',
        not_bonded_tokens: '0',
    });
    const [latestBlock, setLatestBlock] = useState<IBlock | null>(null);
    const [votes, setVotes] = useState<IVote[]>([]);
    const [isVoteLoading, setVoteLoading] = useState(false);
    const [errorVote, setErrorVote] = useState('');
    const [totalVotes, setTotalVotes] = useState(0);

  const fetchVotes = async (offset = 0) => {
      setVoteLoading(true);
      setErrorVote('');
      try {
        const { data } = await instance.get(`/cosmos/gov/v1/proposals/${id}/votes?pagination.limit=${VOTE_LIMIT}&pagination.count_total=true&pagination.reverse=true&pagination.offset=${offset}`);
        setTotalVotes(Math.ceil(Number(data.pagination.total) / VOTE_LIMIT));
        setVotes(data.votes);
      } catch (error) {
          setErrorVote((error as Error)?.message ||  'An unknown error occurred.');
      }
      setVoteLoading(false);
    }

    const fetchGovernanceDetail = async (id: string) => {
        setLoading(true);
        setError('');
        try {
            const [resProposal, resPool, resLatestBlock, resTally] = await Promise.all([
              instance.get(`/cosmos/gov/v1/proposals/${id}`),
              instance.get('/cosmos/staking/v1beta1/pool'),
              instance.get('/cosmos/base/tendermint/v1beta1/blocks/latest'),
              instance.get(`/cosmos/gov/v1/proposals/${id}/tally`),
            ]);
            setGovernance({
              ...resProposal.data.proposal,
              final_tally_result: resTally.data.tally,
            })
            setPool(resPool.data.pool)
            setLatestBlock(resLatestBlock.data.block)
        } catch (error) {
           setError((error as Error)?.message ||  'An unknown error occurred.');
        }
        setLoading(false);
    }

    useEffect(() => {
        if (id) {
          fetchGovernanceDetail(id);
          fetchVotes();
        }
    }, [id]);

    const handlePageClick = ({ selected }: { selected: number }) => {
      const offset = selected * VOTE_LIMIT;
      fetchVotes(offset);
    }

    return {
      isLoading,
      governance,
      error,
      pool,
      latestBlock,
      votes,
      isVoteLoading,
      totalVotes,
      errorVote,
      fetchGovernanceDetail,
      handlePageClick,
    }
}

export default useGovernanceDetails;
