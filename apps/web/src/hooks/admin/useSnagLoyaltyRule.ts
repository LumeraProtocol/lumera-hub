"use client";

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { toast } from 'react-toastify';
import dayjs from 'dayjs';

import * as instance from '@/utils/api';
import {
  CONDITION,
  CONDITION_EXTEND,
  FREQUENCE, LOYALTY_RULE_TYPE,
  UPLOAD_CASCADE,
  URL_CHECK,
} from '@/contants/snag';

type TData = {
  id: string;
  name: string;
}

type TMessage = {
  [key: string]: string;
}

const useSnagLoyaltyRule = () => {
  const params = useParams();
  const router = useRouter();
  const [isLoading, setLoading] = useState(false);
  const [actionType, setActionType] = useState('');
  const [loyaltyRuleForm, setLoyaltyRuleForm] = useState({
    name: '',
    description: '',
    type: LOYALTY_RULE_TYPE[0].value,
    frequency: FREQUENCE[0].value,
    startTime: `${new Date(dayjs().add(5, 'minute').valueOf())}`,
    endTime: `${new Date(dayjs().add(30, 'day').valueOf())}`,
    effectiveStartTime: '',
    effectiveEndTime: '',
    amount: '',
    metadata: {
      cta: {
        href: '',
        label: 'Claim',
      },
    },
    loyaltyCurrencyId: '',
    loyaltyRuleGroupId: '',
    claimType: 'manual',
    startRange: '1+',
  });
  const [configForm, setConfigForm] = useState({
    domain: '',
    urlCheck: '',
    network: '',
    condition: CONDITION[0].value,
    staked: {
      validator: '',
      amount: '0',
    },
    delegate: {
      validator: '',
    },
    balance: {
      amount: '0',
    },
    claim: {
      validator: '',
    },
    supernode: {
      days: '',
      validatorUrl: '',
      uptime: '99',
      condition: CONDITION[0].value,
    },
    sendTransactions: {
      transactions: '',
      type: '',
    },
    interactModules: {
      modules: '',
    },
    stakeLUME: {
      amount: '',
      days: '',
      condition: CONDITION[0].value,
    },
    decentralizationStake: {
      amount: '',
      rank: '',
      validatorUrl: '',
      condition: CONDITION_EXTEND[0].value,
    },
    firstUploadCascade: {
      size: '0',
      condition: CONDITION_EXTEND[0].value,
    },
    uploadedToCascade: {
      type: UPLOAD_CASCADE[0].value,
      fileCondition: CONDITION_EXTEND[0].value,
      files: '',
      typesCondition: CONDITION_EXTEND[0].value,
      types: '',
      sizeCondition: CONDITION_EXTEND[0].value,
      size: '',
      storeCondition: CONDITION_EXTEND[0].value,
      store: '',
      rankingCondition: CONDITION_EXTEND[0].value,
      ranking: '100',
    },
    uptime: {
      percent: '99.9',
      condition: CONDITION_EXTEND[0].value,
    },
    storageRequests: {
      requests: '0',
      condition: CONDITION_EXTEND[0].value,
    },
    referralLink: {
      maxRefer: '10',
    },
    stakeForFullSeason: {
      amount: '100',
    },
  });
  const [isCurrenciesLoading, setCurrenciesLoading] = useState(false);
  const [currencies, setCurrencies] = useState<TData[]>([]);
  const [isSectionsLoading, setSectionsLoading] = useState(false);
  const [sections, setSections] = useState<TData[]>([]);
  const [messages, setMessages] = useState<TMessage | null>(null);

  const getLoyaltyRuleDetails = async () => {
    if (!params.loyaltyRuleId) {
      return;
    }
    setLoading(true);
    try {
      await syncLoyaltyCurrencies();
      await syncLoyaltySections();
      const { data } = await instance.getExternal(`/api/snag/get-loyalty-rule?loyaltyRuleId=${params.loyaltyRuleId}`);
      const loyaltyRule = data?.loyaltyRule;
      if (loyaltyRule) {
        const config = JSON.parse(loyaltyRule.config);
        const metadata = JSON.parse(loyaltyRule.metadata);
        let startRange = '1+';
        if (metadata?.range?.length) {
          const range = metadata.range[0];
          startRange = `${range.startRange}+`;
        }
        const newLoyaltyRuleForm = {
          name: loyaltyRule.name,
          description: loyaltyRule.description,
          type: loyaltyRule.type,
          frequency: loyaltyRule.frequency,
          startTime: `${new Date(loyaltyRule.startTime)}`,
          endTime: `${new Date(loyaltyRule.endTime)}`,
          effectiveStartTime: '',
          effectiveEndTime: '',
          amount: loyaltyRule.amount,
          metadata: {
            cta: {
              href: metadata.cta.href || '',
              label: metadata.cta.label || 'Claim',
            },
          },
          loyaltyRuleGroupId: loyaltyRule.loyaltyRuleGroupId,
          loyaltyCurrencyId: loyaltyRule.loyaltyCurrencyId,
          claimType: loyaltyRule.claimType,
          startRange,
        }
        setLoyaltyRuleForm({ ...newLoyaltyRuleForm });
        if (config) {
          setActionType(config?.actionType)
          setConfigForm({
            domain: config.domain,
            network: config.network,
            condition: config.condition || CONDITION[0].value,
            urlCheck: config.urlCheck,
            staked: config.staked,
            delegate: config.delegate,
            balance: config.balance,
            claim: config.claim,
            supernode: config.supernode,
            sendTransactions: config.sendTransactions,
            interactModules: config.interactModules,
            stakeLUME: config.stakeLUME,
            decentralizationStake: config.decentralizationStake,
            firstUploadCascade: config.firstUploadCascade,
            uploadedToCascade: config.uploadedToCascade,
            uptime: config.uptime,
            storageRequests: config.storageRequests,
            referralLink: config.referralLink,
            stakeForFullSeason: config.stakeForFullSeason,
          });
        }
      }
    } catch (error) {
      console.error(error);
    }
    setLoading(false);
  }

  const syncLoyaltyCurrencies = async () => {
    try {
      await instance.getExternal('/api/snag/sync-loyalty-currencies');
    } catch (error) {
      console.error(error);
    }
  }

  const syncLoyaltySections = async () => {
    try {
      await instance.getExternal('/api/snag/sync-loyalty-section');
    } catch (error) {
      console.error(error);
    }
  }

  const initData = async () => {
    if (!params.loyaltyRuleId) {
      await syncLoyaltyCurrencies();
      await syncLoyaltySections();
    }
    getLoyaltyCurrencies();
    getLoyaltySections();
  }

  useEffect(() => {
    initData();
  }, []);

  useEffect(() => {
    getLoyaltyRuleDetails();
  }, [params]);

  const createLoyaltyRule = async () => {
    let isValid = true;
    setMessages(null);
    if (!loyaltyRuleForm.type) {
      setMessages(prev => ({
        ...prev,
        type: 'Type is required!',
      }));
      isValid = false;
    }
    if (!loyaltyRuleForm.name) {
      setMessages(prev => ({
        ...prev,
        name: 'Name is required!',
      }));
      isValid = false;
    }
    if (!loyaltyRuleForm.startTime) {
      setMessages(prev => ({
        ...prev,
        startTime: 'Start time is required!',
      }));
      isValid = false;
    }
    if (!loyaltyRuleForm.endTime) {
      setMessages(prev => ({
        ...prev,
        endTime: 'End time is required!',
      }));
      isValid = false;
    }
    if (!loyaltyRuleForm.amount) {
      setMessages(prev => ({
        ...prev,
        amount: 'Amount is required!',
      }));
      isValid = false;
    }
    if (!loyaltyRuleForm.loyaltyCurrencyId) {
      setMessages(prev => ({
        ...prev,
        loyaltyCurrencyId: 'Currency is required!',
      }));
      isValid = false;
    }
    if (!loyaltyRuleForm.loyaltyRuleGroupId) {
      setMessages(prev => ({
        ...prev,
        loyaltyRuleGroupId: 'Section is required!',
      }));
      isValid = false;
    }
    if (!loyaltyRuleForm.frequency) {
      setMessages(prev => ({
        ...prev,
        frequency: 'Frequency is required!',
      }));
      isValid = false;
    }
    if (!loyaltyRuleForm.metadata.cta.label) {
      setMessages(prev => ({
        ...prev,
        label: 'Button text is required!',
      }));
      isValid = false;
    }

    if (!actionType) {
      setMessages(prev => ({
        ...prev,
        actionType: 'Action type is required!',
      }));
      isValid = false;
    }
    if (!configForm.network) {
      setMessages(prev => ({
        ...prev,
        network: 'Network type is required!',
      }));
      isValid = false;
    }

    if (actionType) {
      if (actionType === 'connect') {
        if (!configForm.domain) {
          setMessages(prev => ({
            ...prev,
            connectVerifyURL: 'Verify URL is required.',
          }));
        }
      } else {
        if (!configForm.domain) {
          setMessages(prev => ({
            ...prev,
            verifyURL: 'Verify Domain is required.',
          }));
        }
        if (!configForm.urlCheck) {
          setMessages(prev => ({
            ...prev,
            urlCheck: 'URL Check is required.',
          }));
        }
      }
      switch (actionType) {
        case 'staked':
          if (!configForm.staked.validator) {
            setMessages(prev => ({
              ...prev,
              stakedValidator: 'Validator is required.',
            }));
          }
          if (Number(configForm.staked.amount) <= 0 || !configForm.condition) {
            setMessages(prev => ({
              ...prev,
              stakedAmount: 'Condition is required.',
            }));
          }
        break;
        case 'delegate':
          if (!configForm.delegate.validator) {
            setMessages(prev => ({
              ...prev,
              delegateValidator: 'Validator is required.',
            }));
          }
        break;
        case 'balance':
          if (Number(configForm.balance.amount) <= 0 || !configForm.condition) {
            setMessages(prev => ({
              ...prev,
              balanceAmount: 'Condition is required.',
            }));
          }
        break;
        case 'claim':
          if (!configForm.claim.validator) {
            setMessages(prev => ({
              ...prev,
              claim: 'From Address is required.',
            }));
          }
        break;
        case 'supernode':
          if (!configForm.supernode.days || Number(configForm.supernode.days) < 1 || !configForm.condition) {
            setMessages(prev => ({
              ...prev,
              supernode: 'Condition is required.',
            }));
          }
          if (!configForm.supernode.uptime || Number(configForm.supernode.uptime) < 1 || !configForm.condition) {
            setMessages(prev => ({
              ...prev,
              uptime: 'Uptime is required.',
            }));
          }
        break;
        case 'sendTransactions':
          if (!configForm.sendTransactions.transactions || Number(configForm.sendTransactions.transactions) < 1 || !configForm.condition) {
            setMessages(prev => ({
              ...prev,
              supernode: 'Condition is required.',
            }));
          }
          if (!configForm.sendTransactions.type) {
            setMessages(prev => ({
              ...prev,
              supernode: 'Type is required.',
            }));
          }
        break;
        case 'interactModules':
          if (!configForm.interactModules.modules || Number(configForm.interactModules.modules) < 1 || !configForm.condition) {
            setMessages(prev => ({
              ...prev,
              interactModules: 'Condition is required.',
            }));
          }
        case 'stakeLUME':
          if (!configForm.stakeLUME.amount || Number(configForm.stakeLUME.amount) < 1 || !configForm.condition) {
            setMessages(prev => ({
              ...prev,
              stakeLUMEAmount: 'Amount is required.',
            }));
          }
          if (!configForm.stakeLUME.amount || Number(configForm.stakeLUME.amount) < 1 || !configForm.condition) {
            setMessages(prev => ({
              ...prev,
              stakeLUMEDays: 'Days is required.',
            }));
          }
        break;
        case 'decentralizationStake':
          if (!configForm.decentralizationStake.amount || Number(configForm.decentralizationStake.amount) < 1 || !configForm.condition) {
            setMessages(prev => ({
              ...prev,
              decentralizationStakeAmount: 'Amount is required.',
            }));
          }
          if (!configForm.decentralizationStake.rank || Number(configForm.decentralizationStake.rank) < 1 || !configForm.condition) {
            setMessages(prev => ({
              ...prev,
              decentralizationStakeRank: 'Rank is required.',
            }));
          }
        break;
        case 'firstUploadCascade':
          if (!configForm.firstUploadCascade.size || Number(configForm.firstUploadCascade.size) < 1 || !configForm.condition) {
            setMessages(prev => ({
              ...prev,
              firstUploadCascadeSize: 'Size is required.',
            }));
          }
        break;
        case 'uptime':
          if (!configForm.uptime.percent || Number(configForm.uptime.percent) < 1 || !configForm.condition) {
            setMessages(prev => ({
              ...prev,
              uptimePercent: 'Uptime is required.',
            }));
          }
        break;
        case 'storageRequests':
          if (!configForm.storageRequests.requests || Number(configForm.storageRequests.requests) < 1 || !configForm.condition) {
            setMessages(prev => ({
              ...prev,
              storageRequests: 'Uptime is required.',
            }));
          }
        break;
        case 'uploadedToCascade':
          switch (configForm.uploadedToCascade.type) {
            case UPLOAD_CASCADE[0].value:
              if (!configForm.uploadedToCascade.files || Number(configForm.uploadedToCascade.files) < 1 || !configForm.condition) {
                setMessages(prev => ({
                  ...prev,
                  uploadedToCascadeFiles: 'Files is required.',
                }));
              }
              if (!configForm.uploadedToCascade.size || Number(configForm.uploadedToCascade.size) < 1 || !configForm.condition) {
                setMessages(prev => ({
                  ...prev,
                  uploadedToCascadeSize: 'Size is required.',
                }));
              }
            break;
            case UPLOAD_CASCADE[1].value:
              if (!configForm.uploadedToCascade.types || Number(configForm.uploadedToCascade.types) < 1 || !configForm.condition) {
                setMessages(prev => ({
                  ...prev,
                  uploadedToCascadeTypes: 'File Types is required.',
                }));
              }
            break;
            case UPLOAD_CASCADE[2].value:
              if (!configForm.uploadedToCascade.size || Number(configForm.uploadedToCascade.size) < 1 || !configForm.condition) {
                setMessages(prev => ({
                  ...prev,
                  uploadedToCascadeSize: 'Size is required.',
                }));
              }
            break;
            case UPLOAD_CASCADE[3].value:
            case UPLOAD_CASCADE[4].value:
              if (!configForm.uploadedToCascade.store || Number(configForm.uploadedToCascade.store) < 1 || !configForm.condition) {
                setMessages(prev => ({
                  ...prev,
                  uploadedToCascadeStore: 'Store is required.',
                }));
              }
            break;
            case UPLOAD_CASCADE[5].value:
              if (!configForm.uploadedToCascade.ranking || Number(configForm.uploadedToCascade.ranking) < 1 || !configForm.condition) {
                setMessages(prev => ({
                  ...prev,
                  uploadedToCascadeRanking: 'Ranking is required.',
                }));
              }
            break;

          }

        break;
        case 'referralLink':
          if (!configForm.referralLink.maxRefer || Number(configForm.referralLink.maxRefer) < 1 || !configForm.condition) {
            setMessages(prev => ({
              ...prev,
              maxRefer: 'Max refer is required.',
            }));
          }
        break;
        case 'stakeForFullSeason':
          if (!configForm.stakeForFullSeason.amount || Number(configForm.stakeForFullSeason.amount) < 1 || !configForm.condition) {
            setMessages(prev => ({
              ...prev,
              stakeForFullSeasonAmount: 'Amount is required.',
            }));
          }
        break;
      }
    }

    if (!isValid) {
      return;
    }
    setLoading(true);
    try {
      await instance.postExternal('/api/snag/create-loyalty-rule', {
        config: JSON.stringify({
          ...configForm,
          actionType,
        }),
        loyaltyRule: {
          name: loyaltyRuleForm.name,
          description: loyaltyRuleForm.description,
          endTime: dayjs(loyaltyRuleForm.endTime).second(0).millisecond(0).toISOString(),
          startTime: dayjs(loyaltyRuleForm.startTime).second(0).millisecond(0).toISOString(),
          rewardType: 'points',
          type: loyaltyRuleForm.type,
          frequency: loyaltyRuleForm.frequency,
          interval: loyaltyRuleForm.frequency === 'none' ? 'custom' : loyaltyRuleForm.frequency,
          amount: loyaltyRuleForm.amount,
          metadata: {
            cta: loyaltyRuleForm.metadata.cta,
            range: [{
              amount: Number(loyaltyRuleForm.amount),
              endRange: 9007199254740991,
              startRange: parseInt(loyaltyRuleForm.startRange),
            }],
          },
          claimType: loyaltyRuleForm.claimType,
          loyaltyCurrencyId: loyaltyRuleForm.loyaltyCurrencyId,
          loyaltyRuleGroupId: loyaltyRuleForm.loyaltyRuleGroupId,
          effectiveStartTime: dayjs(loyaltyRuleForm.startTime).second(0).millisecond(0).toISOString(),
          effectiveEndTime: dayjs(loyaltyRuleForm.endTime).second(0).millisecond(0).toISOString(),
        },
        actionType,
        sprintID: params.sprintID,
      });
      router.push(`/admin/campaigns/sprints/${params.sprintID}`);
      toast.success('Loyalty Rule saved!', {
        position: "bottom-right",
        theme: "dark",
      });

    } catch (error) {
      toast.error((error as Error)?.message ||  'An unknown error occurred.', {
        position: "bottom-right",
        theme: "dark",
      })
    }
    setLoading(false);
  }

  const updateLoyaltyRule = async () => {
    let isValid = true;
    setMessages(null);
    const loyaltyRuleId = params.loyaltyRuleId;
    if (!loyaltyRuleId) {
      setMessages(prev => ({
        ...prev,
        name: 'Loyalty Rule Id is required!',
      }));
      isValid = false;
    }
    if (!loyaltyRuleForm.type) {
      setMessages(prev => ({
        ...prev,
        type: 'Type is required!',
      }));
      isValid = false;
    }
    if (!loyaltyRuleForm.name) {
      setMessages(prev => ({
        ...prev,
        name: 'Name is required!',
      }));
      isValid = false;
    }
    if (!loyaltyRuleForm.startTime) {
      setMessages(prev => ({
        ...prev,
        startTime: 'Start time is required!',
      }));
      isValid = false;
    }
    if (!loyaltyRuleForm.endTime) {
      setMessages(prev => ({
        ...prev,
        endTime: 'End time is required!',
      }));
      isValid = false;
    }
    if (!loyaltyRuleForm.amount) {
      setMessages(prev => ({
        ...prev,
        amount: 'Amount is required!',
      }));
      isValid = false;
    }
    if (!loyaltyRuleForm.loyaltyCurrencyId) {
      setMessages(prev => ({
        ...prev,
        loyaltyCurrencyId: 'Currency is required!',
      }));
      isValid = false;
    }
    if (!loyaltyRuleForm.loyaltyRuleGroupId) {
      setMessages(prev => ({
        ...prev,
        loyaltyRuleGroupId: 'Section is required!',
      }));
      isValid = false;
    }
    if (!loyaltyRuleForm.frequency) {
      setMessages(prev => ({
        ...prev,
        frequency: 'Frequency is required!',
      }));
      isValid = false;
    }
    if (!loyaltyRuleForm.metadata.cta.label) {
      setMessages(prev => ({
        ...prev,
        label: 'Button text is required!',
      }));
      isValid = false;
    }

    if (!actionType) {
      setMessages(prev => ({
        ...prev,
        actionType: 'Action type is required!',
      }));
      isValid = false;
    }

    if (!configForm.network) {
      setMessages(prev => ({
        ...prev,
        network: 'Network type is required!',
      }));
      isValid = false;
    }

    if (actionType) {
      if (actionType === 'connect') {
        if (!configForm.domain) {
          setMessages(prev => ({
            ...prev,
            connectVerifyURL: 'Verify URL is required.',
          }));
        }
      } else {
        if (!configForm.domain) {
          setMessages(prev => ({
            ...prev,
            verifyURL: 'Verify Domain is required.',
          }));
        }
        if (!configForm.urlCheck) {
          setMessages(prev => ({
            ...prev,
            urlCheck: 'URL Check is required.',
          }));
        }
      }
      switch (actionType) {
        case 'staked':
          if (!configForm.staked.validator) {
            setMessages(prev => ({
              ...prev,
              stakedValidator: 'Validator is required.',
            }));
          }
          if (Number(configForm.staked.amount) <= 0 || !configForm.condition) {
            setMessages(prev => ({
              ...prev,
              stakedAmount: 'Condition is required.',
            }));
          }
        break;
        case 'delegate':
          if (!configForm.delegate.validator) {
            setMessages(prev => ({
              ...prev,
              delegateValidator: 'Validator is required.',
            }));
          }
        break;
        case 'balance':
          if (Number(configForm.balance.amount) <= 0 || !configForm.condition) {
            setMessages(prev => ({
              ...prev,
              balanceAmount: 'Condition is required.',
            }));
          }
        break;
        case 'claim':
          if (!configForm.claim.validator) {
            setMessages(prev => ({
              ...prev,
              bclaimValidator: 'From Address is required.',
            }));
          }
        break;
        case 'supernode':
          if (!configForm.supernode.days || Number(configForm.supernode.days) < 1 || !configForm.condition) {
            setMessages(prev => ({
              ...prev,
              supernode: 'Condition is required.',
            }));
          }
          if (!configForm.supernode.uptime || Number(configForm.supernode.uptime) < 1 || !configForm.condition) {
            setMessages(prev => ({
              ...prev,
              uptime: 'Uptime is required.',
            }));
          }
        break;
        case 'sendTransactions':
          if (!configForm.sendTransactions.transactions || Number(configForm.sendTransactions.transactions) < 1 || !configForm.condition) {
            setMessages(prev => ({
              ...prev,
              supernode: 'Condition is required.',
            }));
          }
          if (!configForm.sendTransactions.type) {
            setMessages(prev => ({
              ...prev,
              supernode: 'Type is required.',
            }));
          }
        break;
        case 'decentralizationStake':
          if (!configForm.decentralizationStake.amount || Number(configForm.decentralizationStake.amount) < 1 || !configForm.condition) {
            setMessages(prev => ({
              ...prev,
              decentralizationStakeAmount: 'Amount is required.',
            }));
          }
          if (!configForm.decentralizationStake.rank || Number(configForm.decentralizationStake.rank) < 1 || !configForm.condition) {
            setMessages(prev => ({
              ...prev,
              decentralizationStakeRank: 'Rank is required.',
            }));
          }
        break;
        case 'firstUploadCascade':
          if (!configForm.firstUploadCascade.size || Number(configForm.firstUploadCascade.size) < 1 || !configForm.condition) {
            setMessages(prev => ({
              ...prev,
              firstUploadCascadeSize: 'Size is required.',
            }));
          }
        break;
        case 'uptime':
          if (!configForm.uptime.percent || Number(configForm.uptime.percent) < 1 || !configForm.condition) {
            setMessages(prev => ({
              ...prev,
              uptimePercent: 'Uptime is required.',
            }));
          }
        break;
        case 'storageRequests':
          if (!configForm.storageRequests.requests || Number(configForm.storageRequests.requests) < 1 || !configForm.condition) {
            setMessages(prev => ({
              ...prev,
              storageRequests: 'Uptime is required.',
            }));
          }
        break;
        case 'uploadedToCascade':
          switch (configForm.uploadedToCascade.type) {
            case UPLOAD_CASCADE[0].value:
              if (!configForm.uploadedToCascade.files || Number(configForm.uploadedToCascade.files) < 1 || !configForm.condition) {
                setMessages(prev => ({
                  ...prev,
                  uploadedToCascadeFiles: 'Files is required.',
                }));
              }
              if (!configForm.uploadedToCascade.size || Number(configForm.uploadedToCascade.size) < 1 || !configForm.condition) {
                setMessages(prev => ({
                  ...prev,
                  uploadedToCascadeSize: 'Size is required.',
                }));
              }
            break;
            case UPLOAD_CASCADE[1].value:
              if (!configForm.uploadedToCascade.types || Number(configForm.uploadedToCascade.types) < 1 || !configForm.condition) {
                setMessages(prev => ({
                  ...prev,
                  uploadedToCascadeTypes: 'File Types is required.',
                }));
              }
            break;
            case UPLOAD_CASCADE[2].value:
              if (!configForm.uploadedToCascade.size || Number(configForm.uploadedToCascade.size) < 1 || !configForm.condition) {
                setMessages(prev => ({
                  ...prev,
                  uploadedToCascadeSize: 'File Types is required.',
                }));
              }
            break;
            case UPLOAD_CASCADE[3].value:
            case UPLOAD_CASCADE[4].value:
              if (!configForm.uploadedToCascade.store || Number(configForm.uploadedToCascade.store) < 1 || !configForm.condition) {
                setMessages(prev => ({
                  ...prev,
                  uploadedToCascadeStore: 'Store is required.',
                }));
              }
            break;
            case UPLOAD_CASCADE[5].value:
              if (!configForm.uploadedToCascade.ranking || Number(configForm.uploadedToCascade.ranking) < 1 || !configForm.condition) {
                setMessages(prev => ({
                  ...prev,
                  uploadedToCascadeRanking: 'Ranking is required.',
                }));
              }
            break;
          }

        break;
        case 'referralLink':
          if (!configForm.referralLink.maxRefer || Number(configForm.referralLink.maxRefer) < 1 || !configForm.condition) {
            setMessages(prev => ({
              ...prev,
              maxRefer: 'Max refer is required.',
            }));
          }
        break;
        case 'stakeForFullSeason':
          if (!configForm.stakeForFullSeason.amount || Number(configForm.stakeForFullSeason.amount) < 1 || !configForm.condition) {
            setMessages(prev => ({
              ...prev,
              stakeForFullSeasonAmount: 'Amount is required.',
            }));
          }
        break;
      }
    }

    if (!isValid) {
      return;
    }
    setLoading(true);
    try {
      const { data } = await instance.postExternal('/api/snag/update-loyalty-rule', {
        config: JSON.stringify({
          ...configForm,
          actionType,
        }),
        loyaltyRuleId,
        loyaltyRule: {
          name: loyaltyRuleForm.name,
          description: loyaltyRuleForm.description,
          endTime: dayjs(loyaltyRuleForm.endTime).second(0).millisecond(0).toISOString(),
          startTime: dayjs(loyaltyRuleForm.startTime).second(0).millisecond(0).toISOString(),
          rewardType: 'points',
          type: loyaltyRuleForm.type,
          frequency: loyaltyRuleForm.frequency,
          interval: loyaltyRuleForm.frequency === 'none' ? 'custom' : loyaltyRuleForm.frequency,
          amount: loyaltyRuleForm.amount.toString(),
          metadata: {
            cta: loyaltyRuleForm.metadata.cta,
            range: [{
              amount: Number(loyaltyRuleForm.amount),
              endRange: 9007199254740991,
              startRange: parseInt(loyaltyRuleForm.startRange),
            }],
          },
          claimType: loyaltyRuleForm.claimType,
          loyaltyCurrencyId: loyaltyRuleForm.loyaltyCurrencyId,
          loyaltyRuleGroupId: loyaltyRuleForm.loyaltyRuleGroupId,
          effectiveStartTime: dayjs(loyaltyRuleForm.startTime).second(0).millisecond(0).toISOString(),
          effectiveEndTime: dayjs(loyaltyRuleForm.endTime).second(0).millisecond(0).toISOString(),
        },
        actionType,
        sprintID: params.sprintID,
      });
      toast.success('Loyalty Rule saved!', {
        position: "bottom-right",
        theme: "dark",
      });
      if (data?.loyaltyRule) {
        try {
          const metadata = JSON.parse(data?.loyaltyRule.metadata);
          setLoyaltyRuleForm({
            ...loyaltyRuleForm,
            metadata,
          });
        } catch {
          // noop
        }
      }
    } catch (error) {
      toast.error((error as Error)?.message ||  'An unknown error occurred.', {
        position: "bottom-right",
        theme: "dark",
      })
    }
    setLoading(false);
  }

  const handleInputChange = (type: string, name: string, value: string) => {
    switch (type) {
      case 'staked':
        setConfigForm({
          ...configForm,
          staked: {
            ...configForm.staked,
            [name]: value,
          }
        });
        break;
      case 'delegate':
        setConfigForm({
          ...configForm,
          delegate: {
            validator: value,
          }
        });
        break;
      case 'balance':
        setConfigForm({
          ...configForm,
          balance: {
            amount: value,
          },
        });
        break;
      case 'supernode':
        setConfigForm({
          ...configForm,
          supernode: {
            ...configForm.supernode,
            [name]: value,
          },
        });
        break;
      case 'claim':
        setConfigForm({
          ...configForm,
          claim: {
            validator: value,
          },
        });
        break;
      case 'sendTransactions':
        setConfigForm({
          ...configForm,
          sendTransactions: {
            ...configForm.sendTransactions,
            [name]: value,
          },
        });
        break;
      case 'interactModules':
        setConfigForm({
          ...configForm,
          interactModules: {
            ...configForm.interactModules,
            [name]: value,
          },
        });
        break;
      case 'stakeLUME':
        setConfigForm({
          ...configForm,
          stakeLUME: {
            ...configForm.stakeLUME,
            [name]: value,
          },
        });
        break;
      case 'decentralizationStake':
        setConfigForm({
          ...configForm,
          decentralizationStake: {
            ...configForm.decentralizationStake,
            [name]: value,
          },
        });
        break;
      case 'firstUploadCascade':
        setConfigForm({
          ...configForm,
          firstUploadCascade: {
            ...configForm.firstUploadCascade,
            [name]: value,
          },
        });
        break;
      case 'uploadedToCascade':
        setConfigForm({
          ...configForm,
          uploadedToCascade: {
            ...configForm.uploadedToCascade,
            [name]: value,
          },
        });
        break;
      case 'uptime':
        setConfigForm({
          ...configForm,
          uptime: {
            ...configForm.uptime,
            [name]: value,
          },
        });
        break;
      case 'storageRequests':
        setConfigForm({
          ...configForm,
          storageRequests: {
            ...configForm.storageRequests,
            [name]: value,
          },
        });
        break;
      case 'referralLink':
        setConfigForm({
          ...configForm,
          referralLink: {
            ...configForm.referralLink,
            [name]: value,
          },
        });
        break;
      case 'stakeForFullSeason':
        setConfigForm({
          ...configForm,
          stakeForFullSeason: {
            ...configForm.stakeForFullSeason,
            [name]: value,
          },
        });
        break;
      case 'root':
        setConfigForm({
          ...configForm,
          [name]: value,
        });
        break;
    }

    if (name === 'network') {
      const selectedUrlCheck = URL_CHECK[value as keyof typeof URL_CHECK];
      if (selectedUrlCheck && actionType) {
        const currentUrlCheck = selectedUrlCheck.urlCheck;
        const url = currentUrlCheck[actionType as keyof typeof currentUrlCheck];
        setConfigForm(prev => ({
          ...prev,
          domain: selectedUrlCheck.domain,
          urlCheck: url,
        }));
      }

      if (actionType === 'supernode') {
        const selectedUrlCheck = URL_CHECK[value as keyof typeof URL_CHECK];
        if (selectedUrlCheck) {
          const currentUrlCheck = selectedUrlCheck.urlCheck;
          setConfigForm(prev => ({
            ...prev,
            supernode: {
              ...prev.supernode,
              validatorUrl: currentUrlCheck.supernodeValidator,
            }
          }));
        }
      }

      if (actionType === 'decentralizationStake') {
        const selectedUrlCheck = URL_CHECK[value as keyof typeof URL_CHECK];
        if (selectedUrlCheck) {
          const currentUrlCheck = selectedUrlCheck.urlCheck;
          setConfigForm(prev => ({
            ...prev,
            decentralizationStake: {
              ...prev.decentralizationStake,
              validatorUrl: currentUrlCheck.supernodeValidator,
            }
          }));
        }
      }
    }
  }

  const handleFormChange = (type: string, name: string, value: string) => {
    if (type === 'root') {
      setLoyaltyRuleForm({
        ...loyaltyRuleForm,
        [name]: value,
      });
    } else if (type === 'cta') {
      setLoyaltyRuleForm({
        ...loyaltyRuleForm,
        metadata: {
          cta: {
            ...loyaltyRuleForm.metadata.cta,
            [name]: value,
          },
        },

      });
    }
  }

  const handleActionTypeChange = (type: string) => {
    setActionType(type);
  }

  const getLoyaltyCurrencies = async () => {
    setCurrenciesLoading(true);
    try {
      const { data } = await instance.getExternal('/api/snag/get-loyalty-currencies');
      setCurrencies(data.currencies);
      if (data.currencies?.length && !params?.loyaltyRuleId) {
        setLoyaltyRuleForm({
          ...loyaltyRuleForm,
          loyaltyCurrencyId: data.currencies[0].id,
        });
      }
    } catch (error) {
      console.error(error);
    }
    setCurrenciesLoading(false);
  }

  const getLoyaltySections = async () => {
    setSectionsLoading(true);
    try {
      const { data } = await instance.getExternal('/api/snag/get-loyalty-sections');
      setSections(data.sections);
      if (data.sections?.length && !params?.loyaltyRuleId) {
        setLoyaltyRuleForm({
          ...loyaltyRuleForm,
          loyaltyRuleGroupId: data.sections[0].id,
        });
      }
    } catch (error) {
      console.error(error);
    }
    setSectionsLoading(false);
  }

  return {
    isLoading,
    actionType,
    loyaltyRuleForm,
    configForm,
    isCurrenciesLoading,
    currencies,
    messages,
    isSectionsLoading,
    sections,
    sprintID: params.sprintID,
    updateLoyaltyRule,
    handleFormChange,
    handleInputChange,
    createLoyaltyRule,
    handleActionTypeChange,
  }
}

export default useSnagLoyaltyRule;
