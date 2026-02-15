import DateTimePicker from '@/components/DateTimePicker';
import useTracking from '@/hooks/admin/useTracking';
import useWalletConnect from '@/hooks/admin/useWalletConnect';
import useHubTracking from '@/hooks/admin/useHubTracking';

import CascadeChart from './CascadeChart';
import TransactionChart from './TransactionChart';
import {
  ActivationRateChart,
  FirstActionTimestampChart,
  AcquisitionSourceChart,
} from './WalletConnect';
import RetentionRate from './RetentionRate';
import StakingOverview from './StakingOverview';
import WalletOverview from './WalletOverview';
import CascadeOverview from './CascadeOverview';

export default function Tracking() {
  const { isLoading, trackings, isSummaryLoading, summary } = useTracking();
  const hubTracking = useHubTracking();
  const {
    walletConnectSummary,
    newWalletConnect,
    activatedWallets,
    acquisitionSources,
  } = useWalletConnect();

  return (
    <div>
      <div className='w-full flex justify-end'>
        <DateTimePicker />
      </div>
      <div className='w-full p-5'>
        <h2 className='text-2xl font-semibold'>On-chain Users</h2>
        <div className='flex gap-5 mt-6 max-w-full governance-card-wrapper relative'>
          <StakingOverview
            isLoading={isSummaryLoading}
            tracking={summary}
          />
          <WalletOverview
            isLoading={isSummaryLoading}
            tracking={summary}
            trackings={trackings}
          />
          <TransactionChart
            isLoading={isLoading}
            trackings={trackings}
          />
        </div>
      </div>
      <div className='w-full p-5'>
        <h2 className='text-2xl font-semibold'>Active User Hub</h2>
        <div className='flex gap-5 mt-6 governance-card-wrapper relative'>
          <StakingOverview
            isLoading={hubTracking.isSummaryLoading}
            tracking={hubTracking.summary}
          />
          <WalletOverview
            isLoading={hubTracking.isSummaryLoading}
            tracking={hubTracking.summary}
            trackings={hubTracking.trackings}
          />
          <TransactionChart
            isLoading={hubTracking.isLoading}
            trackings={hubTracking.trackings}
          />
        </div>
        <div className='flex gap-5 mt-5 governance-card-wrapper relative'>
          <CascadeOverview
            isLoading={isSummaryLoading}
            tracking={summary}
          />
          <CascadeChart
            isLoading={isLoading}
            trackings={trackings}
          />
        </div>
      </div>
      <div className='w-full p-5'>
        <h2 className='text-2xl font-semibold'>Activition Rate</h2>
        <div className='flex gap-5 mt-6 governance-card-wrapper relative'>
          <ActivationRateChart
            isLoading={isLoading}
            newWalletConnect={newWalletConnect}
            activatedWallets={activatedWallets}
          />
          <FirstActionTimestampChart
            isLoading={isLoading}
            items={walletConnectSummary}
          />
          <AcquisitionSourceChart
            isLoading={isLoading}
            acquisitionSources={acquisitionSources}
          />
        </div>
        <div className='mt-5 governance-card-wrapper relative'>
          <RetentionRate />
        </div>
      </div>
    </div>
  )
}
