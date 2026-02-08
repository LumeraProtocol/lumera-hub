import DateTimePicker from '@/components/DateTimePicker';

import Action from './Action';
import UsersChart from './UsersChart';
import CascadeChart from './CascadeChart';
import ActivitiesChart from './ActivitiesChart';
import Sumary from './Sumary';

export default function Tracking() {
  return (
    <div>
      <div className='w-full flex justify-end'>
        <DateTimePicker />
      </div>
      <div className='grid grid-cols-3 gap-3 mt-5'>
        <ActivitiesChart />
        <CascadeChart />
        <UsersChart />
      </div>
      <div className="mt-5">
        <Sumary />
      </div>
      <div className="mt-5">
        <Action />
      </div>
    </div>
  )
}
