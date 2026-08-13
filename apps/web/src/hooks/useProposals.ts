import { useEffect, useState } from 'react';
import axios from 'axios';
import dayjs from 'dayjs';
import {
  MsgVote,
} from 'cosmjs-types/cosmos/gov/v1/tx';

import { REST_AI_URL, DENOM } from '@/contants/network';
import { Coin } from '@/hooks/useAccountInfo'
import useWalletConnect from '@/hooks/useWalletConnect';
import { GAS_LIMIT, FEE_VALUE, GAS_RATIO, FEE_RATIO } from '@/contants';
import { assertGovernanceTransactionsAvailable } from '@/utils/cosmos-transactions';
import { GovernanceVote } from '@/utils/governance-votes';

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

interface UseDepositOptions {
  customMemo?: string;
  callback?: () => void;
}

const useProposals = (options: UseDepositOptions = {}) => {
  const { address, canSignCosmosTransactions, getClient } = useWalletConnect();
  const [proposalsInfo, setProposalsInfo] = useState<IProposal[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [voteOption, setVoteOption] = useState(VOTE_OPTIONS[0].value);
  const [isVoteLoading, setVoteLoading] = useState(false);
  const [errorVote, setErrorVote] = useState<string | null>(null);
  const [voteAdvanced, setAdvanced] = useState({
    fees: FEE_VALUE,
    gas: GAS_LIMIT,
    memo: 'Lumera Hub',
    broadcastMode: broadcastModeOptions[0].value,
  });
  const [isVoteOpen, setVoteOpen] = useState(false);
  const [transactionHash, setTransactionHash] = useState('');
  const [userVotes, setUserVotes] = useState<Record<string, GovernanceVote>>({});

  const refreshUserVote = async (proposalId: string) => {
    if (!address) {
      return;
    }

    try {
      const { data } = await axios.get(
        `${REST_AI_URL}/cosmos/gov/v1/proposals/${proposalId}/votes/${address}`,
      );
      setUserVotes((current) => ({
        ...current,
        [proposalId]: data.vote,
      }));
    } catch (queryError) {
      if (axios.isAxiosError(queryError) && queryError.response?.status === 404) {
        setUserVotes((current) => {
          const next = { ...current };
          delete next[proposalId];
          return next;
        });
      }
    }
  };

  const fetchData = async () => {
    setLoading(true);
    setError(null);

    try {
      const { data } = await axios.get(`${REST_AI_URL}/cosmos/gov/v1/proposals?proposal_status=PROPOSAL_STATUS_VOTING_PERIOD`);
      setProposalsInfo(data.proposals.sort((a: IProposal, b: IProposal) => dayjs(b.submit_time).valueOf() - dayjs(a.submit_time).valueOf()));
    } catch (e) {
      if (e instanceof Error) {
        setError(e);
      } else {
        setError(new Error('An unknown error occurred.'));
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
      fetchData();
  }, []);

  useEffect(() => {
    let cancelled = false;

    if (!address) {
      setUserVotes({});
      return;
    }

    const fetchUserVotes = async () => {
      const voteEntries = await Promise.all(proposalsInfo.map(async (proposal) => {
        try {
          const { data } = await axios.get(
            `${REST_AI_URL}/cosmos/gov/v1/proposals/${proposal.id}/votes/${address}`,
          );
          return [proposal.id, data.vote] as const;
        } catch {
          return null;
        }
      }));

      if (!cancelled) {
        setUserVotes(Object.fromEntries(voteEntries.filter((entry) => entry !== null)));
      }
    };

    fetchUserVotes();

    return () => {
      cancelled = true;
    };
  }, [address, proposalsInfo]);

  useEffect(() => {
    if (options?.customMemo) {
      setAdvanced({
        ...voteAdvanced,
        memo: options?.customMemo,
      });
    }
  }, [options?.customMemo]);

  useEffect(() => {
    if (!isVoteOpen) {
      setVoteOpen(false);
      setVoteLoading(false);
      setLoading(false);
      setAdvanced({
        fees: FEE_VALUE,
        gas: GAS_LIMIT,
        memo: options?.customMemo || 'Lumera Hub',
        broadcastMode: broadcastModeOptions[0].value,
      })
    }
  }, [isVoteOpen])

  const handleOptionChange = (val: string) => {
      setVoteOption(val);
  }

  const handleVote = async (item: IProposal | null) => {
    if (!item) {
        return null;
    }
    setErrorVote(null);
    try {
      assertGovernanceTransactionsAvailable(canSignCosmosTransactions);
      setVoteLoading(true);
      const client = await getClient();
      const msg = {
        typeUrl: '/cosmos.gov.v1.MsgVote',
        value: MsgVote.fromPartial({
          proposalId: BigInt(item.id),
          voter: address,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          option: voteOption as any,
        }),
      };
      let gasLimit = voteAdvanced.gas
      if (voteAdvanced.gas === GAS_LIMIT) {
        const gasEstimate = await client.simulate(address, [msg], voteAdvanced.memo);
        gasLimit = `${Math.ceil(gasEstimate * GAS_RATIO)}`;
      }
      let estimatedFee = voteAdvanced.fees;
      if (voteAdvanced.fees === FEE_VALUE) {
        estimatedFee = `${Math.ceil(Number(gasLimit) * FEE_RATIO)}`;// 0.028 ulume/gas
      }
      const fee = {
        amount: [{ denom: DENOM, amount: estimatedFee } as Coin],
        gas: gasLimit,
      };
      const result = await client.signAndBroadcast(address, [msg], fee, voteAdvanced.memo);
      if (result?.transactionHash) {
        setTransactionHash(result?.transactionHash);
        await refreshUserVote(item.id);
        // setVoteOpen(false);
        fetchData();
        if (options?.callback) {
          options.callback();
        }
      }
    } catch (error) {
      setErrorVote(error instanceof Error ? error?.message : 'An unknown error occurred.')
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
  }

  const handleCloseCongratulationsModal = () => {
    setTransactionHash('');
    setVoteOpen(false);
    setErrorVote(null);
  }

  return {
    proposalsInfo,
    loading,
    error,
    errorVote,
    isVoteLoading,
    voteAdvanced,
    isVoteOpen,
    transactionHash,
    userVotes,
    handleCloseCongratulationsModal,
    setVoteOpen,
    handleResetError,
    handleVoteAdvancedChange,
    handleOptionChange,
    handleVote,
  }
}

export default useProposals;
