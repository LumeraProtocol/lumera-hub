import { useState, useEffect } from 'react';
import { toast } from 'react-toastify';

import * as instance from '@/utils/api';
import { isValidEmail } from '@/utils/helpers';
import { USER_RULE, USER_TYPE, USER_STATUS } from '@/contants';
import { TFromMessage } from '@/types';

export interface IUser {
  id: number;
  email: string;
  fullName: string;
  isActive: number;
  rule: string;
  createdAt: string;
  updatedAt: string;
}

export const ITEM_PER_PAGE = 20;

const useUser = () => {
  const [isLoading, setLoading] = useState(false);
  const [users, setUsers] = useState<IUser[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [keyword, setKeyword] = useState('');
  const [selectedModal, setSelectedModal] = useState('');
  const [userForm, setUserForm] = useState({
    id: undefined,
    type: USER_TYPE[0].value,
    email: '',
    password: '',
    fullName: '',
    walletAddress: '',
    rule: USER_RULE[0].value,
    status: USER_STATUS[0].value,
  });
  const [isUserLoading, setUserLoading] = useState(false);
  const [messages, setMessages] = useState<TFromMessage | null>(null);
  const fetchUsers = async (page = 1, val = '') => {
    setLoading(true);
    try {
      const param = val ? `&search=${val}` : '';
      const { data } = await instance.getExternal(`/api/admin/users?page=${page}&limit=${ITEM_PER_PAGE}${param}`);
      setUsers(data.items);
      setTotalPages(data.pagination?.totalPages);
    } catch (error) {
      console.error(error)
    }
    setLoading(false);
    setUserForm({
      id: undefined,
      type: USER_TYPE[0].value,
      email: '',
      password: '',
      fullName: '',
      walletAddress: '',
      rule: USER_RULE[0].value,
      status: USER_STATUS[0].value,
    });
  }

  useEffect(() => {
    fetchUsers();
  }, []);

  const handlePageClick = ({ selected }: { selected: number }) => {
    setCurrentPage(selected + 1);
    fetchUsers(selected + 1);
  }

  const handleSearchChange = (value: string) => {
    setKeyword(value);
    fetchUsers(1, value);
  }

  const handleOpenAddUserModal = () => {
    setSelectedModal('add');
  }

  const handleCloseAddUserModal = () => {
    setSelectedModal('');
  }

  const handleInputChange = (name: string, value: string) => {
    setUserForm((prev) => {
      return {
      ...prev,
      [name]: value,
    }
    })
  }

  const handleAddUser = async () => {
    setUserLoading(true);
    try {
      let isValid = true;
      if (!userForm.fullName) {
        setMessages(prev => ({
          ...prev,
          fullName: 'Full Name is required.',
        }));
        isValid = false;
      }
      if (!userForm.rule) {
        setMessages(prev => ({
          ...prev,
          rule: 'Rule is required.',
        }));
        isValid = false;
      }
      if (!userForm.status) {
        setMessages(prev => ({
          ...prev,
          status: 'Status is required.',
        }));
        isValid = false;
      }
      if (userForm.type === USER_TYPE[0].value) {
        if (!userForm.email) {
          setMessages(prev => ({
            ...prev,
            email: 'Email is required.',
          }));
          isValid = false;
        } else if (!isValidEmail(userForm.email)) {
          setMessages(prev => ({
            ...prev,
            email: 'Email is invalid.',
          }));
          isValid = false;
        }
        if (!userForm.password) {
          setMessages(prev => ({
            ...prev,
            password: 'Password is required.',
          }));
          isValid = false;
        }
      } else if (!userForm.walletAddress) {
        setMessages(prev => ({
          ...prev,
          walletAddress: 'Wallet Address is required.',
        }));
        isValid = false;
      }
      if (isValid) {
        console.log('userForm add-user', userForm)
        await instance.postExternal('/api/admin/add-user', {
          ...userForm,
        });
        setSelectedModal('');
        setUserForm({
          id: undefined,
          type: USER_TYPE[0].value,
          email: '',
          password: '',
          fullName: '',
          walletAddress: '',
          rule: USER_RULE[0].value,
          status: USER_STATUS[0].value,
        });
        fetchUsers();
        toast.success('User saved!', {
          position: "bottom-right",
          theme: "dark",
        });
      }
    } catch (error) {
      console.error(error);
      toast.error((error as Error)?.message ||  'An unknown error occurred.', {
        position: "bottom-right",
        theme: "dark",
      });
    }
    setUserLoading(false);
  }

  return {
    isLoading,
    users,
    currentPage,
    totalPages,
    keyword,
    pageSize: ITEM_PER_PAGE,
    selectedModal,
    userForm,
    isUserLoading,
    messages,
    handleInputChange,
    handleOpenAddUserModal,
    handlePageClick,
    handleSearchChange,
    handleCloseAddUserModal,
    handleAddUser,
  }
}

export default useUser;
