// app/admin/user/page.tsx
'use client'

import { useEffect } from "react";

import { useDispatch } from '@/redux/hooks';
import { setCurrentPath, setViewTitle } from '@/redux/app.slice';
import useUser from '@/hooks/admin/useUser';
import { UserScreen } from '@lumera-hub/ui/src/screens/admin/UserScreen';

export default function UserManagement() {
  const dispatch = useDispatch();
  const {
    isLoading,
    users,
    currentPage,
    totalPages,
    keyword,
    pageSize,
    handlePageClick,
    handleSearchChange,
  } = useUser();

  useEffect(() => {
    document.title = 'User Admin - Lumera Hub';
    dispatch(setCurrentPath({
      currentPath: '/admin/user',
    }));
    dispatch(setViewTitle({
      viewTitle: 'Users',
    }));
  }, []);

  return (
    <div>
      <UserScreen
        isLoading={isLoading}
        users={users}
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
