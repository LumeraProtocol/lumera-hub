import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';

import * as instance from '@/utils/api';
import { SnagLoyalty } from '@/entities/SnagLoyalty';

export const ITEM_PER_PAGE = 20;

export const ACTION_TYPE = [
  {
    value: '',
    label: 'N/A',
  },
  {
    value: 'staked',
    label: 'Staked',
  },
  {
    value: 'delegate',
    label: 'Delegate tokens',
  },
  {
    value: 'redelegated',
    label: 'Redelegated',
  },
  {
    value: 'haveLumera',
    label: 'Have Lumera',
  },
  {
    value: 'supernode',
    label: 'Supernode',
  },
];

const useSnag = () => {
  const params = useParams();
  const [isLoading, setLoading] = useState(false);
  const [isConfigLoading, setConfigLoading] = useState(false);
  const [isSyncthing, setSyncthing] = useState(false);
  const [loyaltyRules, setLoyaltyRules] = useState<SnagLoyalty[]>([]);
  const [totalPages, setTotalPages] = useState(0);
  const [open, setOpen] = useState(false);
  const [selectedLoyalty, setSelectedLoyalty] = useState<SnagLoyalty | null>(null);
  const [actionType, setActionType] = useState('staked');
  const [configForm, setConfigForm] = useState({
    validator: '',
    amount: '0',
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
    setSyncthing(true);
    try {
      await instance.getExternal(`/api/snag/sync-loyalty-rules?sprintID=${params.sprintID}`);
      fetchLoyaltyRules();
    } catch (error) {
      console.error(error);
    }
    setSyncthing(false);
  }

  const deleteLoyaltyRules = async () => {
    setSyncthing(true);
    try {
      await instance.removeExternal("/api/snag/remove-loyalty-rules", {});
      fetchLoyaltyRules();
    } catch (error) {
      console.error(error);
    }
    setSyncthing(false);
  }

  useEffect(() => {
    fetchLoyaltyRules();
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
      validator: '',
      amount: '0',
    });
    setMessage({
      type: '',
      content: '',
    });
    setOpen(true);
    if (item?.config) {
      const config = JSON.parse(item.config);
      switch (config.actionType) {
        case ACTION_TYPE[1].value:
          setConfigForm({
            amount: config?.amount || '0',
            validator: config?.validator || '',
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
    switch (actionType) {
      case ACTION_TYPE[0].value:
        if (!configForm.validator) {
          setMessage({
            type: 'error',
            content: 'Validator is required.',
          });
          return;
        }
        if (Number(configForm.amount) <= 0) {
          setMessage({
            type: 'error',
            content: 'Amount is required.',
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

  const handleInputChange = (name: string, value: string) => {
    setConfigForm({
      ...configForm,
      [name]: value,
    });
  }

  return {
    open,
    isLoading,
    loyaltyRules,
    isSyncthing,
    totalPages,
    selectedLoyalty,
    actionType,
    configForm,
    isConfigLoading,
    message,
    deleteLoyaltyRules,
    handleInputChange,
    handleActionTypeChange,
    syncLoyaltyRules,
    handlePageClick,
    handleCloseModal,
    handleSelectedLoyalty,
    handleSaveConfig,
  }
}

export default useSnag;
