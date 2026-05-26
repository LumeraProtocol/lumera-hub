import { useState, useEffect } from "react";
import { useChain } from '@interchain-kit/react';
import {
  fromHex,
  fromUtf8,
} from '@cosmjs/encoding';

import { CHAIN_NAME } from '@/contants/network';

const useRefer = () => {
  const { status } = useChain(CHAIN_NAME);
  const [showModal, setShowModal] = useState(false);
  const [referAddress, setReferAddress] = useState('');

  const handleShowModal = () => {
    const urlParams = new URLSearchParams(window.location.search);
    const referralCode = urlParams.get('referral_code');
    if (referralCode) {
      if (status !== 'Connected') {
        setShowModal(true);
        setReferAddress(fromUtf8(fromHex(referralCode)));
      }
      sessionStorage.setItem('referral_code', referralCode);
    }
  }

  useEffect(() => {
    if (window?.location?.search) {
      handleShowModal();
    }
  }, [window.location.search]);

  const handleToogleModal = () => {
    setShowModal(prev => !prev);
  }

  const handleConnectWalletButtonClick = () => {
    setShowModal(false);
  }

  return {
    showModal,
    referAddress,
    handleToogleModal,
    handleConnectWalletButtonClick,
  }
}

export default useRefer;
