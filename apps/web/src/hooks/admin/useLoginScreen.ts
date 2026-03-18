import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useChain } from '@interchain-kit/react';

import * as instance from '@/utils/api';
import { CHAIN_NAME } from '@/contants/network';
import { useDispatch } from '@/redux/hooks';
import { setAddress, setConnected } from '@/redux/wallet.slice';

const useLoginScreen = () => {
  const router = useRouter();
  const dispatch = useDispatch();
  const { address, disconnect } = useChain(CHAIN_NAME);
  const [isLoading, setLoading] = useState(false);
  const [message, setMessage] = useState({
    type: '',
    content: '',
  });
  const [fornContent, setFornContent] = useState({
    email: '',
    password: '',
  });
  const [isLogged, setLogged] = useState(false);

  const handleLogin = async () => {
    setMessage({
      type: '',
      content: '',
    });
    if (!fornContent.email) {
      setMessage({
        type: 'email',
        content: 'Email is required.',
      });
      return;
    }
    if (!fornContent.password) {
      setMessage({
        type: 'password',
        content: 'Password is required.',
      });
      return;
    }

    setLoading(true);
    try {
      const { data } = await instance.postExternal('/api/admin/login', {
        email: fornContent.email,
        password: fornContent.password,
      });
      if (!data.success) {
        setMessage({
          type: 'error',
          content: data.message,
        });
      } else {
        setLogged(true);
        localStorage.setItem('adminUser', data.token);
      }
      router.push('/admin');
    } catch (error) {
      console.error(error);
      setMessage({
        type: 'error',
        content: 'Username or password is incorrect.',
      });
    }
    setLoading(false);
  }

  const handleLoginByWalletAddress = async () => {
    setMessage({
      type: '',
      content: '',
    });
    setLoading(true);
    try {
      const { data } = await instance.postExternal('/api/admin/login-by-address', {
        address,
      });
      if (!data.success) {
        setMessage({
          type: 'wallet-error',
          content: data.message,
        });
      } else {
        setLogged(true);
        localStorage.setItem('adminUser', data.token);
      }
      router.push('/admin');
    } catch (error) {
      console.error(error);
      disconnect();
      dispatch(setAddress({
        address: '',
      }));
      dispatch(setConnected({
        status: false,
      }));
      setMessage({
        type: 'wallet-error',
        content: 'Wallet address is incorrect.',
      });
    }
    setLoading(false);
  }

  useEffect(() => {
    const adminLogined = localStorage.getItem('adminUser');
    if (adminLogined) {
      setLogged(true);
    }
  }, []);

  useEffect(() => {
    if (address && !isLogged) {
      handleLoginByWalletAddress()
    }
  }, [address, isLogged]);

  const handleInputChange = (name: string, value: string) => {
    setFornContent({
      ...fornContent,
      [name]: value,
    })
  }

  return {
    isLoading,
    isLogged,
    message,
    fornContent,
    handleLogin,
    handleInputChange,
  }
}

export default useLoginScreen;
