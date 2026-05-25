import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';

import * as instance from '@/utils/api';
import { SnagLoyalty } from '@/entities/SnagLoyalty';

export const ITEM_PER_PAGE = 20;

const useSnag = () => {
  const params = useParams();
  const [isLoading, setLoading] = useState(false);
  const [isConfigLoading, setConfigLoading] = useState(false);
  const [isSyncing, setSyncing] = useState(false);
  const [isCurrencySyncing, setCurrencySyncing] = useState(false);
  const [isSectionSyncing, setSectionSyncing] = useState(false);
  const [isDeleting, setDeleting] = useState(false);
  const [loyaltyRules, setLoyaltyRules] = useState<SnagLoyalty[]>([]);
  const [totalPages, setTotalPages] = useState(0);
  const [open, setOpen] = useState(false);
  const [selectedLoyalty, setSelectedLoyalty] = useState<SnagLoyalty | null>(null);
  const [actionType, setActionType] = useState('');
  const [configForm, setConfigForm] = useState({
    domain: '',
    urlCheck: '',
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
  });
  const [message, setMessage] = useState({
    type: '',
    content: '',
  });
  const [selectedPage, setSelectedPage] = useState(1);

  const fetchLoyaltyRules = async (page = 1) => {
    setLoading(true);
    try {
      const { data } = await instance.getExternal(`/api/snag/get-loyalty-rules?page=${page}&limit=${ITEM_PER_PAGE}&sprintID=${params.sprintID}`);
      setTotalPages(Math.ceil(data.totalItems / ITEM_PER_PAGE));
      setLoyaltyRules(data.loyaltyRules);
    } catch (error) {
      console.error(error);
    }
    setLoading(false);
  }

  const syncLoyaltyRules = async () => {
    setSyncing(true);
    try {
      await instance.getExternal(`/api/snag/sync-loyalty-rules?sprintID=${params.sprintID}`);
      fetchLoyaltyRules();
    } catch (error) {
      console.error(error);
    }
    setSyncing(false);
  }

  const syncLoyaltyCurrencies = async () => {
    setCurrencySyncing(true);
    try {
      await instance.getExternal('/api/snag/sync-loyalty-currencies');
    } catch (error) {
      console.error(error);
    }
    setCurrencySyncing(false);
  }

  const syncLoyaltySections = async () => {
    setSectionSyncing(true);
    try {
      await instance.getExternal('/api/snag/sync-loyalty-section');
    } catch (error) {
      console.error(error);
    }
    setSectionSyncing(false);
  }

  const deleteLoyaltyRules = async () => {
    if (!window.confirm("All loyalty progress and configurations will be removed. You will need to re-sync and re-configure all quests")) {
      return;
    }
    setSyncing(true);
    try {
      await instance.removeExternal("/api/snag/remove-loyalty-rules", {});
      fetchLoyaltyRules();
    } catch (error) {
      console.error(error);
    }
    setSyncing(false);
  }

  const deleteLoyaltyRule = async (id: string) => {
    if (!window.confirm("This loyalty progress and configurations will be removed. You will need to re-sync and re-configure this quests")) {
      return;
    }
    setDeleting(true);
    try {
      await instance.removeExternal("/api/snag/remove-loyalty-rule", {
        id,
      });
      fetchLoyaltyRules();
    } catch (error) {
      console.error(error);
    }
    setDeleting(false);
  }

  const initData = async () => {
    setLoading(true);
    await syncLoyaltyCurrencies();
    await syncLoyaltySections();
    await fetchLoyaltyRules();
  }

  useEffect(() => {
    initData();
  }, []);

  const handlePageClick = ({ selected }: { selected: number }) => {
    fetchLoyaltyRules(selected + 1);
    setSelectedPage(selected + 1);
  }

  const handleCloseModal = () => {
    setOpen(false);
    fetchLoyaltyRules(selectedPage);
  }

  const handleSelectedLoyalty = (item: SnagLoyalty | null) => {
    setSelectedLoyalty(item);
    setConfigForm({
      domain: '',
      urlCheck: '',
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
    });
    setMessage({
      type: '',
      content: '',
    });
    setOpen(true);
    if (item?.config) {
      const config = JSON.parse(item.config);
      setActionType(config.actionType);
      switch (config.actionType) {
        case 'staked':
          setConfigForm({
            domain: config?.domain || '',
            urlCheck: config?.urlCheck || '',
            staked: {
              validator: config?.staked?.validator || '',
              amount: config?.staked?.amount || '0',
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
          });
          break;
        case 'delegate':
          setConfigForm({
            domain: config?.domain || '',
            urlCheck: config?.urlCheck || '',
            staked: {
              validator: '',
              amount: '0',
            },
            delegate: {
              validator: config?.delegate?.validator || '',
            },
            balance: {
              amount: '0',
            },
            claim: {
              validator: '',
            },
          });
          break;
        case 'redelegated':
          setConfigForm({
            domain: config?.domain || '',
            urlCheck: config?.urlCheck || '',
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
          });
          break;
        case 'balance':
          setConfigForm({
            domain: config?.domain || '',
            urlCheck: config?.urlCheck || '',
            staked: {
              validator: '',
              amount: '0',
            },
            delegate: {
              validator: '',
            },
            balance: {
              amount: config.balance.amount || '0',
            },
            claim: {
              validator: '',
            },
          });
          break;
        case 'connect':
          setConfigForm({
            domain: config?.domain || '',
            urlCheck: '',
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
          });
          break;
        case 'claim':
          setConfigForm({
            domain: config?.domain || '',
            urlCheck: config?.urlCheck || '',
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
              validator: config.claim.validator,
            },
          });
          break;
        default:
          break;
      }
    }
  }

  const handleActionTypeChange = (type: string) => {
    setActionType(type);
  }

  const generateUrlCheck = () => {
    if (!selectedLoyalty || !selectedLoyalty?.config) {
      return '';
    }
    const config = configForm;
    const path = `${config.domain}snag/${selectedLoyalty.id}`;
    let prefix = '';
    switch (actionType) {
      case 'staked':
        prefix = '/stake';
        break;
      case 'delegate':
        prefix = '/delegate';
        break;
      case 'redelegated':
        prefix = '/redelegate';
        break;
      case 'balance':
        prefix = '/balance';
        break;
      case 'claim':
        prefix = '/claim';
        break;
      case 'supernode':
        prefix = '/supernode';
        break;
      case 'sendTransactions':
        prefix = '/send-transactions';
        break;
    }
    if (actionType === 'connect') {
      return config.domain;
    }
    return `${path}${prefix}`;
  }

  const handleSaveConfig = async () => {
    setMessage({
      type: '',
      content: '',
    });
    if (!selectedLoyalty?.id) {
      setMessage({
        type: 'error',
        content: 'Loyalty Rule is required.',
      });
      return;
    }
    if (!actionType) {
      setMessage({
        type: 'error',
        content: 'Action type is required.',
      });
      return;
    }
    if (actionType === 'connect') {
      if (!configForm.domain) {
        setMessage({
          type: 'error',
          content: 'Verify URL is required.',
        });
        return;
      }
    } else {
      if (!configForm.domain) {
        setMessage({
          type: 'error',
          content: 'Verify Domain is required.',
        });
        return;
      }
      if (!configForm.urlCheck) {
        setMessage({
          type: 'error',
          content: 'URL Check is required.',
        });
        return;
      }
    }
    switch (actionType) {
      case 'staked':
        if (!configForm.staked.validator) {
          setMessage({
            type: 'error',
            content: 'Validator is required.',
          });
          return;
        }
        if (Number(configForm.staked.amount) <= 0) {
          setMessage({
            type: 'error',
            content: 'Amount is required.',
          });
          return;
        }
      break;
      case 'delegate':
        if (!configForm.delegate.validator) {
          setMessage({
            type: 'error',
            content: 'Validator is required.',
          });
          return;
        }
      break;
      case 'balance':
        if (Number(configForm.balance.amount) <= 0) {
          setMessage({
            type: 'error',
            content: 'Amount is required.',
          });
          return;
        }
      break;
      case 'claim':
        if (!configForm.claim.validator) {
          setMessage({
            type: 'error',
            content: 'From Address is required.',
          });
          return;
        }
      case 'sendTransactions':
        if (!configForm.claim.validator) {
          setMessage({
            type: 'error',
            content: 'From Address is required.',
          });
          return;
        }
      break;
    }
    setConfigLoading(true);
    try {
      await instance.postExternal('/api/snag/save-loyalty-rule-config', {
        id: selectedLoyalty?.id,
        config: JSON.stringify({
          ...configForm,
          actionType,
        }),
        loyalty: selectedLoyalty,
        href: generateUrlCheck(),
      });
      setMessage({
        type: 'success',
        content: "Data saved successfully.",
      });
    } catch (error) {
      setMessage({
        type: 'error',
        content: (error as Error).message,
      });
    }
    setConfigLoading(false);
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
      case 'claim':
        setConfigForm({
          ...configForm,
          claim: {
            validator: value,
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
  }

  return {
    open,
    isLoading,
    loyaltyRules,
    isSyncing,
    totalPages,
    selectedLoyalty,
    actionType,
    configForm,
    isConfigLoading,
    message,
    isCurrencySyncing,
    isSectionSyncing,
    isDeleting,
    sprintID: params.sprintID,
    syncLoyaltySections,
    syncLoyaltyCurrencies,
    deleteLoyaltyRules,
    handleInputChange,
    handleActionTypeChange,
    syncLoyaltyRules,
    handlePageClick,
    handleCloseModal,
    handleSelectedLoyalty,
    handleSaveConfig,
    deleteLoyaltyRule,
  }
}

export default useSnag;
