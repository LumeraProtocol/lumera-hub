import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { useChain } from '@interchain-kit/react';

import { CHAIN_NAME, IS_EVM_NETWORK } from '@/contants/network';
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
import useWalletConnect from '@/hooks/useWalletConnect';
import { useDispatch } from '@/redux/hooks';
import { setModalOpen } from '@/redux/wallet.slice';

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
  const dispatch = useDispatch();
  const { openView: openCosmosView } = useChain(CHAIN_NAME);
  const { address, bech32Address, isEvm } = useWalletConnect();
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
    let cancelled = false;

    const loadAccount = async () => {
      setAccountLoading(true);
      try {
        const nextAccount = await fetchBaseAccount(queryAddress);
        if (!cancelled) setAccount(nextAccount);
      } catch (e) {
        console.error('API Error:', e);
        if (!cancelled) setAccount(null);
      } finally {
        if (!cancelled) setAccountLoading(false);
      }
    };

    const loadAccountInfo = async () => {
      setAccountInfoLoading(true);
      try {
        const nextAccountInfo = await fetchAccountInfo(queryAddress);
        if (!cancelled) setAccountInfo(nextAccountInfo);
      } catch (e) {
        console.error('API Error:', e);
        if (!cancelled) setAccountInfo(EMPTY_ACCOUNT_INFO);
      } finally {
        if (!cancelled) setAccountInfoLoading(false);
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
            if (cancelled) return;
            setValidators(items);
            setValidatorsLoading(false);
          },
          sentTransactions: (items) => {
            if (cancelled) return;
            setTransactions(items);
            setTransactionsLoading(false);
          },
          receivedTransactions: (items) => {
            if (cancelled) return;
            setRecentReceived(items);
            setRecentReceivedLoading(false);
          },
          cascadeHistory: (items) => {
            if (cancelled) return;
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
      cancelled = true;
    };
  }, [queryAddress]);

  useEffect(() => {
    let cancelled = false;
    fetchConnectedStaking(connectedQueryAddress)
      .then((staking) => {
        if (!cancelled) setConnectedStaking(staking);
      })
      .catch((e) => console.error('API Error:', e));
    return () => {
      cancelled = true;
    };
  }, [connectedQueryAddress]);

  const openView = () => {
    if (IS_EVM_NETWORK) {
      dispatch(setModalOpen({ status: true }));
      return;
    }
    openCosmosView();
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
