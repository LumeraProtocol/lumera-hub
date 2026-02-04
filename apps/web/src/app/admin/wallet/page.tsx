// app/admin/wallet/page.tsx
'use client'

import { useEffect } from "react";

import { useDispatch } from '@/redux/hooks';
import useWallet from '@/hooks/admin/useWallet';
import { setCurrentPath, setViewTitle } from '@/redux/app.slice';
import { WalletScreen } from '@lumera-hub/ui/src/screens/admin/WalletScreen';

export default function AdminWallet() {
  const dispatch = useDispatch();
  const {
    isLoading,
    wallets,
    currentPage,
    totalPages,
    keyword,
    pageSize,
    handlePageClick,
    handleSearchChange,
  } = useWallet();

  useEffect(() => {
    document.title = 'Wallet Admin - Lumera Hub';
    dispatch(setCurrentPath({
      currentPath: '/admin//wallet',
    }));
    dispatch(setViewTitle({
      viewTitle: 'Wallet',
    }));
  }, []);

  return (
    <div>
      <WalletScreen
        isLoading={isLoading}
        wallets={wallets}
        currentPage={currentPage}
        totalPages={totalPages}
        keyword={keyword}
        pageSize={pageSize}
        handlePageClick={handlePageClick}
        handleSearchChange={handleSearchChange}
      />
    </div>
  );
}
