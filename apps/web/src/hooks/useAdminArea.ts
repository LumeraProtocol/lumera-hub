'use client';

import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';

const useAdminArea = () => {
  const pathname = usePathname();
  const [isAdminPage, setAdminPage] = useState(false);

  useEffect(() => {
    setAdminPage(pathname?.includes('/admin'));
  }, []);

  return {
    isAdminPage,
  }
}

export default useAdminArea;
