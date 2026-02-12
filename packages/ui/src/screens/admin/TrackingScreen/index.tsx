import DateTimePicker from '@/components/DateTimePicker';
import useTracking from '@/hooks/admin/useTracking';

import Activities from './Activities';
import UsersChart from './UsersChart';
import CascadeChart from './CascadeChart';
import TransactionChart from './TransactionChart';
import Sumary from './Sumary';
import ActivationRate from './ActivationRate';

export default function Tracking() {
  const { isLoading, trackings, isSummaryLoading, summary } = useTracking();
  return (
    <div>
      <div className='w-full flex justify-end'>
        <DateTimePicker />
      </div>
      <div className="mt-5">
        <Sumary
          isLoading={isSummaryLoading}
          tracking={summary}
        />
      </div>
      <div className="mt-5">
        <ActivationRate
          isLoading={isSummaryLoading}
          trackings={trackings}
        />
      </div>
      <div className='grid grid-cols-3 gap-5 mt-5'>
        <TransactionChart
          isLoading={isLoading}
          trackings={trackings}
        />
        <CascadeChart
          isLoading={isLoading}
          trackings={trackings}
        />
        <UsersChart
          isLoading={isLoading}
          trackings={trackings}
        />
      </div>
      <div className="mt-5">
        <Activities />
      </div>
    </div>
  )
}
