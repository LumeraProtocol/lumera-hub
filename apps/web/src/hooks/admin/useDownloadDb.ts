import { useState } from 'react';

import * as instance from '@/utils/api';
import { delay } from '@/utils/helpers';

const useDownloadDb = () => {
  const [isLoading, setLoading] = useState(false);
  const [isRemove, setRemove] = useState(false);
  const [canRemove, setCanRemove] = useState(false);

  const handleDownloadDb = async () => {
    setLoading(true);
    try {
      const { data } = await instance.getExternal("/api/admin/download-db");
      await delay(2000);
      // Trigger browser download
      const link = document.createElement("a");
      link.href = data.downloadUrl;
      link.download =
        data.fileName ||
        `backup-${new Date().toISOString().split("T")[0]}.sqlite`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setCanRemove(true);
    } catch (error) {
      console.error(error)
    }
    setLoading(false);
  }

  const handleRemoveDb = async () => {
    setRemove(true);
    try {
      await instance.getExternal("/api/admin/remove-db");
      setCanRemove(false);
    } catch (error) {
      console.error(error)
    }
    setRemove(false);
  }

  return {
    isLoading,
    isRemove,
    canRemove,
    handleDownloadDb,
    handleRemoveDb,
  }
}

export default useDownloadDb;
