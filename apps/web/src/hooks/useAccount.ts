import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';

import {
  getConnectedAccountQueryAddress,
  resolveAccountRouteAddress,
} from '@/utils/account';
import {
  fetchAccountInfo,
  fetchBaseAccount,
  type AccountInfoData,
  type BaseAccount,
} from '@/hooks/useAccountInfo';
import {
  EMPTY_CONNECTED_STAKING,
  fetchAccountActivity,
  fetchConnectedStaking,
  type CascadeFile,
  type ConnectedStaking,
} from '@/utils/account-activity';
import type { ITransaction } from '@/hooks/useTransaction';
import type { IValidator } from '@/types/validator';
import useLatestRequest from '@/hooks/useLatestRequest';
import useWalletConnect from '@/hooks/useWalletConnect';

const EMPTY_ACCOUNT_INFO: AccountInfoData = {
  balances: [],
  delegations: [],
  rewards: [],
  rewardTotal: [],
  unbonding: [],
};

/**
 * Data for the `/account/[address]` page, composed from the tested account data
 * layer: `resolveAccountRouteAddress` + `fetchBaseAccount` + `fetchAccountInfo`
 * for the account itself, `fetchAccountActivity` for validators, transaction
 * history and Cascade files, and `fetchConnectedStaking` for the connected
 * wallet's staking state.
 */
const useAccount = () => {
  const params = useParams();
  const { address, bech32Address, isEvm, openConnectView } = useWalletConnect();
  const queryAddress = resolveAccountRouteAddress(params?.address);
  const connectedQueryAddress = getConnectedAccountQueryAddress({
    address,
    bech32Address,
    isEvm,
  });

  const [isAccountLoading, setAccountLoading] = useState(false);
  const [account, setAccount] = useState<BaseAccount | null>(null);
  const [isAccountInfoLoading, setAccountInfoLoading] = useState(false);
  const [accountInfo, setAccountInfo] = useState<AccountInfoData>(EMPTY_ACCOUNT_INFO);
  const [isValidatorsLoading, setValidatorsLoading] = useState(false);
  const [validators, setValidators] = useState<IValidator[]>([]);
  const [isTransactionsLoading, setTransactionsLoading] = useState(false);
  const [transactions, setTransactions] = useState<ITransaction[]>([]);
  const [isRecentReceivedLoading, setRecentReceivedLoading] = useState(false);
  const [recentReceived, setRecentReceived] = useState<ITransaction[]>([]);
  const [isCascadeFilesLoading, setCascadeFilesLoading] = useState(false);
  const [cascades, setCascades] = useState<CascadeFile[]>([]);
  const [connectedStaking, setConnectedStaking] = useState<ConnectedStaking>(
    EMPTY_CONNECTED_STAKING,
  );
  const [delegationsTab, setDelegationsTab] = useState('delegations');
  const accountRequest = useLatestRequest();
  const stakingRequest = useLatestRequest();

  useEffect(() => {
    if (!queryAddress) {
      setAccountLoading(false);
      setAccountInfoLoading(false);
      setValidatorsLoading(false);
      setTransactionsLoading(false);
      setRecentReceivedLoading(false);
      setCascadeFilesLoading(false);
      setAccount(null);
      setAccountInfo(EMPTY_ACCOUNT_INFO);
      setValidators([]);
      setTransactions([]);
      setRecentReceived([]);
      setCascades([]);
      return;
    }
    const requestId = accountRequest.begin();
    const isCurrent = () => accountRequest.isCurrent(requestId);

    const loadAccount = async () => {
      setAccountLoading(true);
      try {
        const nextAccount = await fetchBaseAccount(queryAddress);
        if (isCurrent()) setAccount(nextAccount);
      } catch (e) {
        console.error('API Error:', e);
        if (isCurrent()) setAccount(null);
      } finally {
        if (isCurrent()) setAccountLoading(false);
      }
    };

    const loadAccountInfo = async () => {
      setAccountInfoLoading(true);
      try {
        const nextAccountInfo = await fetchAccountInfo(queryAddress);
        if (isCurrent()) setAccountInfo(nextAccountInfo);
      } catch (e) {
        console.error('API Error:', e);
        if (isCurrent()) setAccountInfo(EMPTY_ACCOUNT_INFO);
      } finally {
        if (isCurrent()) setAccountInfoLoading(false);
      }
    };

    // Each activity section clears its own spinner as its source settles, so a
    // slow Cascade lookup cannot hold back the transaction tables.
    const loadActivity = async () => {
      setValidatorsLoading(true);
      setTransactionsLoading(true);
      setRecentReceivedLoading(true);
      setCascadeFilesLoading(true);
      await fetchAccountActivity(queryAddress, {
        onSlice: {
          validators: (items) => {
            if (!isCurrent()) return;
            setValidators(items);
            setValidatorsLoading(false);
          },
          sentTransactions: (items) => {
            if (!isCurrent()) return;
            setTransactions(items);
            setTransactionsLoading(false);
          },
          receivedTransactions: (items) => {
            if (!isCurrent()) return;
            setRecentReceived(items);
            setRecentReceivedLoading(false);
          },
          cascadeHistory: (items) => {
            if (!isCurrent()) return;
            setCascades(items);
            setCascadeFilesLoading(false);
          },
        },
      });
    };

    loadAccount();
    loadAccountInfo();
    loadActivity();
    return () => {
      accountRequest.invalidate();
    };
  }, [accountRequest, queryAddress]);

  useEffect(() => {
    const requestId = stakingRequest.begin();
    fetchConnectedStaking(connectedQueryAddress)
      .then((staking) => {
        if (stakingRequest.isCurrent(requestId)) setConnectedStaking(staking);
      })
      .catch((e) => console.error('API Error:', e));
    return () => {
      stakingRequest.invalidate();
    };
  }, [connectedQueryAddress, stakingRequest]);

  // Zero-arg on purpose: openConnectView takes an optional wallet name, so
  // re-exporting it directly would let `onClick={openView}` pass a React
  // event into redux as the preferred wallet with no type error.
  const openView = () => {
    openConnectView();
  };

  const handleDelegationsTabChange = (val: string) => {
    setDelegationsTab(val);
  }

  return {
    isAccountLoading,
    isDelegationsLoading: isAccountInfoLoading,
    delegations: accountInfo.delegations,
    account,
    validators,
    address: params?.address,
    isRewardsLoading: isAccountInfoLoading,
    rewards: accountInfo.rewards,
    isUnbondingDelegationsLoading: isAccountInfoLoading,
    unbondingDelegations: accountInfo.unbonding,
    isTransactionsLoading,
    transactions,
    isRecentReceivedLoading,
    recentReceived,
    isBalancesLoading: isAccountInfoLoading,
    balances: accountInfo.balances,
    delegationsTab,
    isCascadeFilesLoading,
    cascades,
    isValidatorsLoading,
    myStacking: connectedStaking.validatorAddresses,
    myStakingBalance: connectedStaking.stakedBalances,
    myBalance: connectedStaking.availableBalance,
    myAddress: address,
    openView,
    handleDelegationsTabChange,
  }
}

export default useAccount;
