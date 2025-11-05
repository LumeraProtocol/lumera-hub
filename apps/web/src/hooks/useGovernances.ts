import { useState, useEffect } from "react";

import * as instance from '@/utils/api';
import { DENOM } from '@/contants/network';
import { IProposal } from '@/hooks/useProposals';

const LIMIT = 20;

const useGovernances = () => {
    const [isLoading, setLoading] = useState(false);
    const [governances, setGovernances] = useState<IProposal[]>([]);
    const [msg, setMsg] = useState({
        type: '',
        message: '',
    });
    const [isSumaryLoading, setSumaryLoading] = useState(false);
    const [sumary, setSumary] = useState({
        totalProposals: 0,
        passed: 0,
        votingPeriod: 0,
        depositRequired: 0,
        rejected: 0,
        unspecified: 0,
        failed: 0,
        votingPeriodParam: '0',
        depositRequiredParam: {
            denom: DENOM,
            amount: '0'
        },
    });
    const [currentTab, setCurrentTab] = useState('');
    const [totalVotes, setTotalVotes] = useState(0);
    const [nextKey, setNextKey] = useState('');

    const fetchSumary = async () => {
        setMsg({
            type: '',
            message: '',
        })
        setSumaryLoading(true);
        try {
          const [
            resPassed,
            resDepositRequired,
            resVotingPeriod,
            resTotalProposals,
            resRejected,
            // resUnspecified,
            resFailed,
            resParams,
          ] = await Promise.all([
            instance.get(`/cosmos/gov/v1/proposals?pagination.limit=1&pagination.count_total=true&proposal_status=PROPOSAL_STATUS_PASSED`),
            instance.get(`/cosmos/gov/v1/proposals?pagination.limit=1&pagination.count_total=true&proposal_status=PROPOSAL_STATUS_DEPOSIT_PERIOD`),
            instance.get(`/cosmos/gov/v1/proposals?pagination.limit=1&pagination.count_total=true&proposal_status=PROPOSAL_STATUS_VOTING_PERIOD`),
            instance.get(`/cosmos/gov/v1/proposals?pagination.limit=1&pagination.count_total=true`),
            instance.get(`/cosmos/gov/v1/proposals?pagination.limit=1&pagination.count_total=true&proposal_status=PROPOSAL_STATUS_REJECTED`),
            // instance.get(`/cosmos/gov/v1/proposals?pagination.limit=1&pagination.count_total=true&proposal_status=PROPOSAL_STATUS_UNSPECIFIED`),
            instance.get(`/cosmos/gov/v1/proposals?pagination.limit=1&pagination.count_total=true&proposal_status=PROPOSAL_STATUS_FAILED`),
            instance.get(`/cosmos/gov/v1/params/voting`),
          ]);

          setSumary({
            totalProposals: Number(resTotalProposals.data.pagination.total || 0),
            passed: Number(resPassed.data.pagination.total || 0),
            votingPeriod: Number(resVotingPeriod.data.pagination.total || 0),
            depositRequired: Number(resDepositRequired.data.pagination.total || 0),
            rejected: Number(resRejected.data.pagination.total || 0),
            unspecified: Number(resTotalProposals.data.pagination.total || 0),
            // unspecified: Number(resUnspecified.data.pagination.total || 0),
            failed: Number(resFailed.data.pagination.total || 0),
            depositRequiredParam: {
                denom: resParams.data.params.min_deposit[0].denom,
                amount: resParams.data.params.min_deposit[0].amount,
            },
            votingPeriodParam: resParams.data.params.voting_period,
          });
        } catch (error) {
          setMsg({
              type: 'gov-error',
              message: error instanceof Error ? error.message : 'An unknown error occurred.',
          });
        }
        setSumaryLoading(false);
    }

    const fetchGovernances = async (status = '', key = '') => {
        setLoading(true);
        setMsg({
            type: '',
            message: '',
        });
        try {
          let nextKey = '';
          if (key) {
              nextKey = `&pagination.key=${key}`;
          }
          const { data } = await instance.get(`/cosmos/gov/v1/proposals?pagination.limit=${LIMIT}&pagination.count_total=true&pagination.reverse=true${status ? '&proposal_status=' + status : ''}${nextKey}`);
          const results: IProposal[] = [];
          for (const gov of data.proposals) {
            let item: IProposal = gov;
            if (gov.status === 'PROPOSAL_STATUS_VOTING_PERIOD') {
              try {
                const res = await instance.get(`/cosmos/gov/v1/proposals/${gov.id}/tally`);
                if (res?.data?.tally) {
                  item = {
                    ...item,
                    final_tally_result: res.data.tally,
                  };
                }
              } catch (error) {
                console.error(error);
              }
            }
            results.push(item);
          }
          setGovernances(prev => [...new Set([...prev, ...results.filter(item2 => !prev.some(item1 => item1.id === item2.id))])]);
          setNextKey(data.pagination.next_key);
          setTotalVotes(Number(data.pagination.total));
        } catch (error) {
          setMsg({
              type: 'gov-error',
              message: error instanceof Error ? error.message : 'An unknown error occurred.',
          });
        }
        setLoading(false);
    }

    useEffect(() => {
      setGovernances([]);
      fetchGovernances();
      fetchSumary();
    }, []);

    const handleTabChange = (status: string) => {
      setGovernances([]);
      fetchGovernances(status);
      setCurrentTab(status);
    }

     const handlePageClick = () => {
      fetchGovernances(currentTab, nextKey);
    }

    return {
      isLoading,
      governances,
      msg,
      sumary,
      currentTab,
      isSumaryLoading,
      totalVotes,
      nextKey,
      handlePageClick,
      handleTabChange,
      fetchGovernances,
    }
}

export default useGovernances;
