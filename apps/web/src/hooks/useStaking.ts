import { useEffect, useState } from 'react';

import * as instance from '@/utils/api';

const useStaking = () => {
    const [isLoading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [validators, setValidators] = useState([]);
    const [totalValidators, setTotalValidators] = useState('0');
    const [currentTab, setCurrentTab] = useState('active');
    const [params, setParams] = useState({
        bond_denom: "ulume",
        historical_entries: 0,
        max_entries: 0,
        max_validators: 0,
        min_commission_rate: '0',
        unbonding_time: '0',
    });
    const [slashingParams, setSlashingParams] = useState({
        signed_blocks_window: "0",
        min_signed_per_window: "0",
        downtime_jail_duration: "0s",
        slash_fraction_double_sign: "0",
        slash_fraction_downtime: "0"
    });
    const [signingInfos, setSigningInfos] = useState([]);

     const fetchValidator = async () => {
        setLoading(true);
        try {
            const { data } = await instance.get('/cosmos/staking/v1beta1/validators?pagination.limit=500&status=BOND_STATUS_UNBONDING&pagination.count_total=true');
            setValidators(data.validators);
            setTotalValidators(data.pagination.total);
        } catch (error) {
            setError(error instanceof Error ? error.message : 'An unknown error occurred.');
        }
        setLoading(false);
    }

     const fetchParams = async () => {
        setLoading(true);
        try {
            const [stakingParamsRes, slashingParamsRes, signingInfosRes] = await Promise.all([
                instance.get('/cosmos/staking/v1beta1/params'),
                instance.get('/cosmos/slashing/v1beta1/params'),
                instance.get('/cosmos/slashing/v1beta1/signing_infos?pagination.limit=300'),
            ]);
            setParams(stakingParamsRes.data.params);
            setSlashingParams(slashingParamsRes.data.params);
            setSigningInfos(signingInfosRes.data.info);
        } catch (error) {
            console.error(error instanceof Error ? error.message : 'An unknown error occurred.');
        }
        setLoading(false);
    }
    useEffect(() => {
        fetchValidator();
        fetchParams();
    }, []);

    const handleTabChange = (tab: string) => {
        setCurrentTab(tab);
    }

    return {
        isLoading,
        error,
        validators,
        totalValidators,
        currentTab,
        params,
        slashingParams,
        signingInfos,
        handleTabChange,
    }
}

export default useStaking;
