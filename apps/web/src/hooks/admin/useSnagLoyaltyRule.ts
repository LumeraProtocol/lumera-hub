import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { toast } from 'react-toastify';
import dayjs from 'dayjs';

import * as instance from '@/utils/api';

export const LOYALTY_RULE_TYPE = [
  {
    value: 'external_rule',
    label: 'External rule',
  }
];

export const FREQUENCE = [
  {
    value: 'once',
    label: 'One time',
  },
  {
    value: 'hourly',
    label: 'Hourly',
  },
  {
    value: 'daily',
    label: 'Daily',
  },
  {
    value: 'weekly',
    label: 'Weekly',
  },
  {
    value: 'monthly',
    label: 'Monthly',
  },
];

export const NETWORK = [
  {
    value: '',
    label: 'N/A',
  },
  {
    value: 'mainnet',
    label: 'Mainnet',
  },
  {
    value: 'testnet',
    label: 'Testnet',
  },
];

export const TRANSACTION_TYPE = [
  {
    value: '',
    label: 'N/A',
  },
  {
    value: 'weekly',
    label: 'Weekly',
  },
  {
    value: 'lifetime ',
    label: 'Lifetime ',
  },
];

export const CONDITION = [
  {
    value: '>=',
    label: '>=',
  },
  {
    value: '>',
    label: '>',
  },
  {
    value: '<=',
    label: '<=',
  },
  {
    value: '<',
    label: '<',
  },
  {
    value: '=',
    label: '=',
  },
];

const URL_CHECK = {
  mainnet: {
    domain: 'https://hub.lumera.io/',
    urlCheck: {
      staked: 'https://lcd.lumera.io/cosmos/tx/v1beta1/txs/',
      delegate: 'https://lcd.lumera.io/cosmos/tx/v1beta1/txs/',
      redelegated: 'https://lcd.lumera.io/cosmos/tx/v1beta1/txs/',
      balance: 'https://lcd.lumera.io/cosmos/bank/v1beta1/balances/',
      supernode: 'https://snscope.lumera.io/v1/supernodes/metrics?status=any&minFailedProbeCounter=0&limit=200',
      supernodeValidator: 'https://lcd.lumera.io/cosmos/staking/v1beta1/validators?pagination.limit=1000',
      claim: 'https://lcd.lumera.io/cosmos/tx/v1beta1/txs/',
      send: 'https://lcd.lumera.io/cosmos/tx/v1beta1/txs/',
      sendTransactions: 'https://lcd.testnet.lumera.io/cosmos/tx/v1beta1/txs?query=message.sender=%27{walletAddress}%27&pagination.limit=20&pagination.offset=0&order_by=ORDER_BY_DESC',
    }
  },
  testnet: {
    domain: 'https://hub.lumera.io/',
    urlCheck: {
      staked: 'https://lcd.testnet.lumera.io/cosmos/tx/v1beta1/txs/',
      delegate: 'https://lcd.testnet.lumera.io/cosmos/tx/v1beta1/txs/',
      redelegated: 'https://lcd.testnet.lumera.io/cosmos/tx/v1beta1/txs/',
      balance: 'https://lcd.testnet.lumera.io/cosmos/bank/v1beta1/balances/',
      supernode: 'https://snscope.testnet.lumera.io/v1/supernodes/metrics?status=any&minFailedProbeCounter=0&limit=200',
      supernodeValidator: 'https://lcd.testnet.lumera.io/cosmos/staking/v1beta1/validators?pagination.limit=1000',
      claim: 'https://lcd.testnet.lumera.io/cosmos/tx/v1beta1/txs/',
      send: 'https://lcd.testnet.lumera.io/cosmos/tx/v1beta1/txs/',
      sendTransactions: 'https://lcd.lumera.io/cosmos/tx/v1beta1/txs?query=message.sender=%27{walletAddress}%27&pagination.limit=20&pagination.offset=0&order_by=ORDER_BY_DESC',
    }
  }
}

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
    },
    sendTransactions: {
      transactions: '',
      type: '',
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
        setActionType(config.actionType)
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
        });
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
          interval: loyaltyRuleForm.frequency,
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
          interval: loyaltyRuleForm.frequency,
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
