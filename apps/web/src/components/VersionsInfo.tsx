'use client'

import useNodeInfo from '@/hooks/useNodeInfo';
import { EVM_CHAIN_ID, IS_EVM_NETWORK } from '@/contants/network';

const HUB_VERSION = process.env.NEXT_PUBLIC_HUB_VERSION || 'unknown';

export default function VersionsInfo() {
  const { nodeInfo } = useNodeInfo();

  const networkValue = nodeInfo?.network
    ? `${nodeInfo.network}${nodeInfo.appVersion ? `, ${nodeInfo.appVersion}` : ''}`
    : '—';

  const rows = [
    { label: 'Lumera Network', value: networkValue },
    ...(IS_EVM_NETWORK ? [{ label: 'EVM Chain ID', value: `${EVM_CHAIN_ID}` }] : []),
    { label: 'Lumera Hub', value: HUB_VERSION },
  ];

  return (
    <div className='w-full mt-8 pt-4 border-t border-gray-800 text-sm text-gray-500'>
      <ul className='flex flex-wrap gap-x-8 gap-y-1 justify-center'>
        {rows.map(({ label, value }) => (
          <li key={label}>
            <span>{label}: </span>
            <span className='text-gray-400'>{value}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
