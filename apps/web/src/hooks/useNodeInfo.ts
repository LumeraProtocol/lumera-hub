import { useEffect, useState } from 'react';

import * as instance from '@/utils/api';
import { parseNodeInfo, NodeVersionInfo } from '@/utils/node-info';

const useNodeInfo = () => {
  const [nodeInfo, setNodeInfo] = useState<NodeVersionInfo | null>(null);

  useEffect(() => {
    let cancelled = false;
    const fetchData = async () => {
      try {
        const { data } = await instance.get('/cosmos/base/tendermint/v1beta1/node_info');
        if (!cancelled) {
          setNodeInfo(parseNodeInfo(data));
        }
      } catch {
        if (!cancelled) {
          setNodeInfo(null);
        }
      }
    };
    fetchData();
    return () => {
      cancelled = true;
    };
  }, []);

  return { nodeInfo };
};

export default useNodeInfo;
