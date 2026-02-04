import { useState, useEffect } from "react";
import { TextProposal } from "cosmjs-types/cosmos/gov/v1beta1/gov";
import { ParameterChangeProposal } from "cosmjs-types/cosmos/params/v1beta1/params";
import { CommunityPoolSpendProposal } from "cosmjs-types/cosmos/distribution/v1beta1/distribution";
import { SoftwareUpgradeProposal } from "cosmjs-types/cosmos/upgrade/v1beta1/upgrade";
import { coins } from "@cosmjs/stargate";

import * as instance from '@/utils/api';
import { DENOM } from '@/contants/network';
import { RATE_VALUE, GAS_RATIO, FEE_RATIO } from '@/contants';
import { IProposal } from '@/hooks/useProposals';
import useWalletConnect from '@/hooks/useWalletConnect';
import { extractValidNumber } from '@/utils/helpers';
import useTracking from '@/hooks/useTracking';
import { ActionType } from '@/types/ActionType';

const LIMIT = 20;

export const STEPS = ["Type", "Details", "Parameters", "Deposit", "Review"];
export const proposalTypes = [
  {
    value: 'text',
    label: 'Text Proposal',
  },
  {
    value: 'parameter',
    label: 'Parameter Change Proposal',
  },
  {
    value: 'community',
    label: 'Community Spend Proposal',
  },
  {
    value: 'software',
    label: 'Software Upgrade Proposal',
  },
  // {
  //   value: 'cascade',
  //   label: 'Cascade Policy Update Proposal',
  // },
  // {
  //   value: 'model',
  //   label: 'Model Access Proposal',
  // },
  // {
  //   value: 'reward',
  //   label: 'Reward Weight Adjustment Proposal',
  // },
  // {
  //   value: 'supernode',
  //   label: 'SuperNode Eligibility Proposal',
  // },
  // {
  //   value: 'commission',
  //   label: 'Validator Commission Cap Proposal',
  // },
  // {
  //   value: 'foundation',
  //   label: 'Foundation Delegation Policy Proposal',
  // },
];

export const GOVERNANCE_STATS = {
  depositRequired: 1000,
  expeditedDepositRequired: 5000,
};

const EXPEDITED_DEPOSIT_REQUIRED = GOVERNANCE_STATS.expeditedDepositRequired;

const useGovernances = () => {
  const { trackQualifyingAction } = useTracking();
  const { address, getClient } = useWalletConnect();
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
  const [step, setStep] = useState(1);
  const [selectedModal, setSelectedModal] = useState('');
  const [proposal, setProposal] = useState({
    type: proposalTypes[0].value,
    title: '',
    description: '',
    isExpedited: false,
    recipient: '',
    amount: '',
    module: '',
    key: '',
    newValue: '',
    upgradeVersion: '',
    policyCID: '',
    modelName: '',
    newWeight: '',
    nodeAddress: '',
    newCommission: '',
    delegationAddress: '',
    initialDeposit: '0',
  });
  const [isCreateProposalLoading, setCreateProposalLoading] = useState(false);
  const [transactionHash, setTransactionHash] = useState('');
  const [requiredDeposit, setRequiredDeposit] = useState(GOVERNANCE_STATS.depositRequired);

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
        resFailed,
        resParams,
      ] = await Promise.all([
        instance.get(`/cosmos/gov/v1/proposals?pagination.limit=1&pagination.count_total=true&proposal_status=PROPOSAL_STATUS_PASSED`),
        instance.get(`/cosmos/gov/v1/proposals?pagination.limit=1&pagination.count_total=true&proposal_status=PROPOSAL_STATUS_DEPOSIT_PERIOD`),
        instance.get(`/cosmos/gov/v1/proposals?pagination.limit=1&pagination.count_total=true&proposal_status=PROPOSAL_STATUS_VOTING_PERIOD`),
        instance.get(`/cosmos/gov/v1/proposals?pagination.limit=1&pagination.count_total=true`),
        instance.get(`/cosmos/gov/v1/proposals?pagination.limit=1&pagination.count_total=true&proposal_status=PROPOSAL_STATUS_REJECTED`),
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
        message: (error as Error)?.message ||  'An unknown error occurred.',
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
        message: (error as Error)?.message ||  'An unknown error occurred.',
      });
    }
    setLoading(false);
  }

  const fetchData = () => {
    fetchGovernances();
    fetchSumary();
  }

  useEffect(() => {
    setGovernances([]);
    fetchData();
  }, []);

  useEffect(() => {
    setRequiredDeposit(proposal.isExpedited ? EXPEDITED_DEPOSIT_REQUIRED : GOVERNANCE_STATS.depositRequired);
  }, [proposal.isExpedited])

  const handleTabChange = (status: string) => {
    setGovernances([]);
    fetchGovernances(status);
    setCurrentTab(status);
  }

  const handlePageClick = () => {
    fetchGovernances(currentTab, nextKey);
  }

  const resetData = () => {
    setMsg({
      type: '',
      message: '',
    });
    setProposal({
      type: proposalTypes[0].value,
      title: '',
      description: '',
      isExpedited: false,
      recipient: '',
      amount: '',
      module: '',
      key: '',
      newValue: '',
      upgradeVersion: '',
      policyCID: '',
      modelName: '',
      newWeight: '',
      nodeAddress: '',
      newCommission: '',
      delegationAddress: '',
      initialDeposit: '0',
    });
    setTransactionHash('');
    setStep(1);
    setCurrentTab('');
    setRequiredDeposit(GOVERNANCE_STATS.depositRequired);
  }

  const handleOpenCreateProposalModal = () => {
    resetData();
    setSelectedModal('create');

  }

  const handleCloseCreateProposalModal = () => {
    fetchData();
    resetData();
    setSelectedModal('');
  }

  const handleNextSteps = () => {
    setMsg({
      type: '',
      message: '',
    });
    const currentStep = step;
    let isValid = true;
    if (currentStep === 2) {
      if (!proposal.title) {
        setMsg({
          type: 'title',
          message: 'Please enter title.',
        });
        return;
      }
      if (!proposal.description) {
        setMsg({
          type: 'description',
          message: 'Please enter title.',
        });
        return;
      }
    }
    if (currentStep === 3) {
      switch (proposal.type) {
        case proposalTypes[1].value: // Parameter Change Proposal
          if (!proposal.module) {
            setMsg({
              type: 'module',
              message: 'Please enter module.',
            });
            isValid = false;
          }
          if (!proposal.key) {
            setMsg({
              type: 'key',
              message: 'Please enter key.',
            });
            isValid = false;
          }
          if (!proposal.newValue) {
            setMsg({
              type: 'newValue',
              message: 'Please enter new value.',
            });
            isValid = false;
          }
          break;
        case proposalTypes[2].value: // Community Spend Proposal
          if (!proposal.recipient) {
            setMsg({
              type: 'recipient',
              message: 'Please enter recipient.',
            });
            isValid = false;
          }
          if (!proposal.amount) {
            setMsg({
              type: 'amount',
              message: 'Please enter amount.',
            });
            isValid = false;
          }
          break;
        case proposalTypes[3].value: // Software Upgrade Proposal
          if (!proposal.upgradeVersion) {
            setMsg({
              type: 'upgradeVersion',
              message: 'Please enter upgrade version.',
            });
            isValid = false;
          }
          break;
      }
    }
    if (currentStep === 4) {
      if (Number(proposal.initialDeposit) <= 0) {
        setMsg({
          type: 'initialDeposit',
          message: 'Please enter deposit amount.',
        });
        return;
      }
      if (Number(proposal.initialDeposit) < Number(requiredDeposit)) {
        setMsg({
          type: 'initialDeposit',
          message: `The deposit amount must not be less than ${requiredDeposit}.`,
        });
        return;
      }
    }
    if (!isValid) {
      return
    }
    setStep(s => s + 1);
  }

  const handleInputChange = (name: string, value: string, type = 'text', checked = false) => {
    setProposal(p => ({ ...p, [name]: type === 'checkbox' ? checked : name === 'initialDeposit' ? extractValidNumber(value) : value }));
  }

  const handleBackClick = () => {
    setStep(s => s - 1);
  }

  const getBlock = async () => {
    try {
      const bufferBlocks = 20000;
      const client = await getClient();
      const latestBlock = await client.getBlock();
      return latestBlock?.header?.height + bufferBlocks;
    } catch (error) {
      console.error(error);
      throw new Error((error as Error)?.message ||  'An unknown error occurred.');
    }
  }

  const handleCreateProposalClick = async () => {
    setMsg({
      type: '',
      message: '',
    });
    setCreateProposalLoading(true);
    try {
      if (!proposal.title) {
        setMsg({
          type: 'error',
          message: 'Please enter title.',
        });
        return;
      }
      if (!proposal.description) {
        setMsg({
          type: 'error',
          message: 'Please enter description.',
        });
        return;
      }

      let content = {};
      let encodedValue: Uint8Array<ArrayBufferLike>;
      switch (proposal.type) {
        case proposalTypes[0].value: // Text Proposal
          encodedValue = TextProposal.encode(TextProposal.fromPartial({ title: proposal.title, description: proposal.description })).finish();
          content = {
            typeUrl: '/cosmos.gov.v1beta1.TextProposal',
            value: encodedValue,
          };
          break;
        case proposalTypes[1].value: // Parameter Change Proposal
          if (!proposal.module) {
            setMsg({
              type: 'error',
              message: 'Please enter module.',
            });
            return;
          }
          if (!proposal.key) {
            setMsg({
              type: 'error',
              message: 'Please enter key.',
            });
            return;
          }
          if (!proposal.newValue) {
            setMsg({
              type: 'error',
              message: 'Please enter new value.',
            });
            return;
          }
          encodedValue = ParameterChangeProposal.encode(ParameterChangeProposal.fromPartial({
            title: proposal.title,
            description: proposal.description,
            changes:  [{
              subspace: proposal.module,
              key: proposal.key,
              value: JSON.stringify(proposal.newValue),
            }],
          })).finish();
          content = {
            typeUrl: '/cosmos.params.v1beta1.ParameterChangeProposal',
            value: encodedValue,
          };
          break;
        case proposalTypes[2].value: // Community Spend Proposal
          if (!proposal.recipient) {
            setMsg({
              type: 'error',
              message: 'Please enter recipient.',
            });
            return;
          }
          if (!proposal.amount) {
            setMsg({
              type: 'error',
              message: 'Please enter amount.',
            });
            return;
          }
          encodedValue = CommunityPoolSpendProposal.encode(CommunityPoolSpendProposal.fromPartial({
            title: proposal.title,
            description: proposal.description,
            amount: coins(`${Number(proposal.amount) * RATE_VALUE}`, DENOM),
            recipient: proposal.recipient,
          })).finish();
          content = {
            typeUrl: '/cosmos.distribution.v1beta1.CommunityPoolSpendProposal',
            value: encodedValue,
          };
          break;
        case proposalTypes[3].value: // Software Upgrade Proposal
          if (!proposal.upgradeVersion) {
            setMsg({
              type: 'error',
              message: 'Please enter upgrade version.',
            });
            return;
          }
          let blockHeight;
          try {
            blockHeight = await getBlock();
          } catch (error) {
            setMsg({
              type: 'error',
              message: `Failed to retrieve block height for software upgrade proposal: ${(error as Error)?.message ||  'An unknown error occurred.'}`,
            });
            return;
          }
          encodedValue = SoftwareUpgradeProposal.encode(SoftwareUpgradeProposal.fromPartial({
            title: proposal.title,
            description: proposal.description,
            plan:  {
              name: proposal.upgradeVersion,
              time: undefined,
              height: BigInt(blockHeight),
              info: proposal.description,
              upgradedClientState: undefined,
            },
          })).finish();
          content = {
            typeUrl: '/cosmos.upgrade.v1beta1.SoftwareUpgradeProposal',
            value: encodedValue,
          };
          break;
      }
      const client = await getClient();
      const msg = {
        typeUrl: '/cosmos.gov.v1beta1.MsgSubmitProposal',
        value: {
          content,
          initialDeposit: [{
            denom: DENOM,
            amount:`${Number(proposal.initialDeposit) * RATE_VALUE}`,
          }],
          proposer: address,
        },
      };
      const memo = 'Create Proposal';
      const gasEstimate = await client.simulate(address, [msg], memo);
      const gasLimit = `${Math.ceil(gasEstimate * GAS_RATIO)}`;
      const fixedFeeAmount = `${Math.ceil(Number(gasLimit) * FEE_RATIO)}`;// 0.028 ulume/gas
      const fee = {
        amount: coins(fixedFeeAmount.toString(), 'ulume'), // Gas fee estimate
        gas: gasLimit,
      };

      const result = await client.signAndBroadcast(address, [msg], fee, memo);
      if (result?.transactionHash) {
        setMsg({
          type: 'success',
          message: 'Create Proposal Successfully',
        });
        setTransactionHash(result.transactionHash);
        fetchData();
        trackQualifyingAction({
          actionType: ActionType.CREATE_PROPOSAL,
          walletAdress: address,
          txHash: result.transactionHash,
        });
      } else {
        setMsg({
          type: 'error',
          message: result.rawLog || '',
        });
      }
    } catch(error) {
      setMsg({
        type: 'error',
        message: (error as Error)?.message ||  'An unknown error occurred.',
      });
      console.error('error', error);
    }
    setCreateProposalLoading(false);
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
    step,
    selectedModal,
    proposal,
    isCreateProposalLoading,
    transactionHash,
    requiredDeposit,
    fetchData,
    handleCreateProposalClick,
    handleBackClick,
    handleInputChange,
    handleOpenCreateProposalModal,
    handleCloseCreateProposalModal,
    handleNextSteps,
    handlePageClick,
    handleTabChange,
    fetchGovernances,
  }
}

export default useGovernances;
