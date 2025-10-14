import { useState, useEffect } from "react";

import * as instance from '@/utils/api';

const LIMIT = 20;

const useGovernances = () => {
    const [isLoading, setLoading] = useState(false);
    const [governances, setGovernances] = useState([]);
    const [msg, setMsg] = useState({
        type: '',
        message: '',
    });
    const [sumary, setSumary] = useState({
        totalProposals: 0,
        passed: 0,
        votingPeriod: 0,
        depositRequired: 0,
        rejected: 0,
        unspecified: 0,
        failed: 0,
    });

    const [currentTab, setCurrentTab] = useState('');

    const fetchSumary = async () => {
        try {
            const [resPassed, resDepositRequired, resVotingPeriod, resTotalProposals, resRejected, resUnspecified, resFailed] = await Promise.all([
                instance.get(`/cosmos/gov/v1/proposals?pagination.limit=1&pagination.count_total=true&proposal_status=PROPOSAL_STATUS_PASSED`),
                instance.get(`/cosmos/gov/v1/proposals?pagination.limit=1&pagination.count_total=true&proposal_status=PROPOSAL_STATUS_DEPOSIT_PERIOD`),
                instance.get(`/cosmos/gov/v1/proposals?pagination.limit=1&pagination.count_total=true&proposal_status=PROPOSAL_STATUS_VOTING_PERIOD`),
                instance.get(`/cosmos/gov/v1/proposals?pagination.limit=1&pagination.count_total=true`),
                instance.get(`/cosmos/gov/v1/proposals?pagination.limit=1&pagination.count_total=true&proposal_status=PROPOSAL_STATUS_REJECTED`),
                instance.get(`/cosmos/gov/v1/proposals?pagination.limit=1&pagination.count_total=true&proposal_status=PROPOSAL_STATUS_UNSPECIFIED`),
                instance.get(`/cosmos/gov/v1/proposals?pagination.limit=1&pagination.count_total=true&proposal_status=PROPOSAL_STATUS_FAILED`),
            ]);
            setSumary({
                totalProposals: Number(resPassed.data.pagination.total || 0),
                passed: Number(resTotalProposals.data.pagination.total || 0),
                votingPeriod: Number(resVotingPeriod.data.pagination.total || 0),
                depositRequired: Number(resDepositRequired.data.pagination.total || 0),
                rejected: Number(resRejected.data.pagination.total || 0),
                unspecified: Number(resUnspecified.data.pagination.total || 0),
                failed: Number(resFailed.data.pagination.total || 0),
            });
        } catch (error) {
            setMsg({
                type: 'gov-error',
                message: error instanceof Error ? error.message : 'An unknown error occurred.',
            });
        }
    }

    const fetchGovernances = async (status = '') => {
        setLoading(true);
        setMsg({
            type: '',
            message: '',
        });
        try {
            const { data } = await instance.get(`/cosmos/gov/v1/proposals?pagination.limit=${LIMIT}&pagination.count_total=true&pagination.reverse=true${status ? '&proposal_status=' + status : ''}`);
            setGovernances(data.proposals);
        } catch (error) {
            setMsg({
                type: 'gov-error',
                message: error instanceof Error ? error.message : 'An unknown error occurred.',
            });
        }
        setLoading(false);
    }

    useEffect(() => {
        fetchGovernances();
        fetchSumary();
    }, []);

    const handleTabChange = (status: string) => {
        fetchGovernances(status);
        setCurrentTab(status);
    }

    return {
        isLoading,
        governances,
        msg,
        sumary,
        currentTab,
        handleTabChange,
        fetchGovernances,
    }
}

export default useGovernances;