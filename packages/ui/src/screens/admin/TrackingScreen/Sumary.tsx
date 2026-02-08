import { Card } from 'tamagui';

import SectionTitle from '@/components/SectionTitle';
import { AppLoading } from '@/components/Loading';
import useWallet from '@/hooks/admin/useWallet';
import useStaking from '@/hooks/admin/useStaking';
import useCascade from '@/hooks/admin/useCascade';
import { DENOM } from '@/contants/network';
import { formatNumber, formatTokenDisplay } from '@/utils/format';

export default function Sumary() {
  const wallet = useWallet();
  const stacking = useStaking();
  const cascade = useCascade();

  return (
    <div className='grid grid-cols-3 gap-3'>
      <Card elevate size="$4" bordered className='w-full !items-start'>
        <div className='p-5 w-full'>
          <SectionTitle className="mb-5">Cascade</SectionTitle>
          {cascade.isLoading ?
            <div className='min-h-[240px] relative w-full'>
              <AppLoading
                isLoading
                className="w-10 h-10 !border-2"
                iconWidth={20}
                iconHeight={20}
                containerClassName='absolute top-1/2 left-1/2 -translate-1/2 w-10 h-10 z-50'
              />
            </div> :
            <div className='text-sm'>
              <div className='grid grid-cols-1 gap-x-4 gap-y-2'>
                <span><span>Total LUME</span>: <span className='font-bold'>
                  {formatTokenDisplay({
                    amount: cascade.cascade.total_price.toString(),
                    denom: DENOM,
                  }, true)}
                </span></span>
              </div>
              <div className='grid grid-cols-1 gap-x-4 gap-y-2 mt-2'>
                <span><span>Total Fee</span>: <span className='font-bold'>
                  {formatTokenDisplay({
                    amount: cascade.cascade.total_fee.toString(),
                    denom: DENOM,
                  })}</span></span>
              </div>
              <div className='mt-2'>
                <div>
                  <span>Upload</span>: <span className='font-bold'>
                    {formatNumber(cascade.cascade.upload, { decimalsLength: 0 })} files
                  </span>
                </div>
              </div>
              <ul className='grid grid-cols-2 gap-x-4 gap-y-2 mt-2'>
                <li>
                  <span>Images</span>: <span className='font-bold'>
                    {formatNumber(cascade.cascade.image, { decimalsLength: 0 })} files
                  </span>
                </li>
                <li>
                  <span>Videos</span>: <span className='font-bold'>
                    {formatNumber(cascade.cascade.video, { decimalsLength: 0 })} files
                  </span>
                </li>
                <li>
                  <span>Programs</span>: <span className='font-bold'>
                    {formatNumber(cascade.cascade.program, { decimalsLength: 0 })} files
                  </span>
                </li>
                <li>
                  <span>Archives</span>: <span className='font-bold'>
                    {formatNumber(cascade.cascade.archive, { decimalsLength: 0 })} files
                  </span>
                </li>
                <li>
                  <span>Docs</span>: <span className='font-bold'>
                    {formatNumber(cascade.cascade.document, { decimalsLength: 0 })} files
                  </span>
                </li>
                <li>
                  <span>Other</span>: <span className='font-bold'>
                    {formatNumber(cascade.cascade.other, { decimalsLength: 0 })} files
                  </span>
                </li>
              </ul>
            </div>
          }
        </div>
      </Card>
      <Card elevate size="$4" bordered className='w-full !items-start'>
        <div className='p-5 w-full'>
          <SectionTitle className="mb-5">Staking</SectionTitle>
          {stacking.isLoading ?
            <div className='min-h-[240px] relative w-full'>
              <AppLoading
                isLoading
                className="w-10 h-10 !border-2"
                iconWidth={20}
                iconHeight={20}
                containerClassName='absolute top-1/2 left-1/2 -translate-1/2 w-10 h-10 z-50'
              />
            </div> :
            <div className='text-sm'>
              <div>
                <span>Delegate</span>: <span className='font-bold'>
                  {formatNumber(stacking.staking.delegate, { decimalsLength: 0 })}
                </span>
              </div>
              <div className='mt-1'>
                <span>Redelegate</span>: <span className='font-bold'>
                  {formatNumber(stacking.staking.redelegate, { decimalsLength: 0 })}
                </span>
              </div>
              <div className='mt-1'>
                <span>Unstaking</span>: <span className='font-bold'>
                  {formatNumber(stacking.staking.unstaking, { decimalsLength: 0 })}
                </span>
              </div>
            </div>
          }
        </div>
      </Card>
      <Card elevate size="$4" bordered className='w-full !items-start'>
        <div className='p-5 w-full'>
          <SectionTitle className="mb-5">Wallet</SectionTitle>
           {wallet.isLoading ?
            <div className='min-h-[240px] relative w-full'>
              <AppLoading
                isLoading
                className="w-10 h-10 !border-2"
                iconWidth={20}
                iconHeight={20}
                containerClassName='absolute top-1/2 left-1/2 -translate-1/2 w-10 h-10 z-50'
              />
            </div> :
            <div className='text-sm'>
              <div>
                <span>Total</span>: <span className='font-bold'>
                  {formatNumber(wallet.wallets.total, { decimalsLength: 0 })}
                </span>
              </div>
              <div className='mt-1'>
                <span>New</span>: <span className='font-bold'>
                  {formatNumber(wallet.wallets.new, { decimalsLength: 0 })}
                </span>
              </div>
            </div>
          }
        </div>
      </Card>
    </div>
  );
}
