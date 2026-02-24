import { useState, useEffect } from "react";

import * as instance from '@/utils/api';

const useSnag = () => {
  const [isLoading, setLoading] = useState(false);

  const testFunc = async () => {
    setLoading(true);
    try {
      const results = await instance.getExternal('/api/snag/users')
      console.log(results)
    } catch (error) {
      console.error(error);
    }
    setLoading(false);
  }

  useEffect(() => {
    console.log('process.env.NEXT_PUBLIC_SNAG_API_KEY', process.env.NEXT_PUBLIC_SNAG_API_KEY);
    testFunc();
  }, []);

  return {
    isLoading,
  }
}

export default useSnag;
