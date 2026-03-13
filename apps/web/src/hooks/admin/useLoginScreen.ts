import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

import * as instance from '@/utils/api';

const useLoginScreen = () => {
  const router = useRouter();
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

  useEffect(() => {
    const adminLogined = sessionStorage.getItem('adminUser');
    if (adminLogined) {
      setLogged(true);
    }
  }, []);

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
