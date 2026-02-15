import { useState } from "react";
import DatePicker from "react-datepicker";
import dayjs from 'dayjs';
import { Popover } from 'tamagui';

import { useSelector, useDispatch } from '@/redux/hooks';
import * as admin from '@/redux/admin.slice';

import "react-datepicker/dist/react-datepicker.css";

const DateTimePicker = () => {
  const adminState = useSelector((state) => state.admin);
  const dispatch = useDispatch();
  const [startDate, setStartDate] = useState<Date | null>(adminState.startDate ? new Date(adminState.startDate) : new Date(dayjs().subtract(30, 'day').valueOf()));
  const [endDate, setEndDate] = useState<Date | null>(adminState.endDate ? new Date(adminState.endDate) : new Date());
  const [selectedPredefined, setSelectedPredefined] = useState('');

  const onChange = (dates: [Date | null, Date | null]) => {
    const [start, end] = dates;
    setStartDate(start);
    setEndDate(end);
    setSelectedPredefined('');
  };

  const handleApply = () => {
    dispatch(admin.setDate({
      startDate: `${startDate}`,
      endDate: `${endDate}`,
    }));
  }

  const handleQuickSelect = (type: string) => {
    const end = new Date();
    let start = new Date();
    if (type === '30') {
      start = new Date(dayjs().subtract(30, 'day').valueOf());
      setSelectedPredefined('30');
    } else if (type === '7') {
      start = new Date(dayjs().subtract(7, 'day').valueOf());
      setSelectedPredefined('7');
    } else if (type === '60') {
      start = new Date(dayjs().subtract(60, 'day').valueOf());
      setSelectedPredefined('60');
    } else if (type === '90') {
      start = new Date(dayjs().subtract(90, 'day').valueOf());
      setSelectedPredefined('90');
    }
    setStartDate(start);
    setEndDate(end);
    dispatch(admin.setDate({
      startDate: `${start}`,
      endDate: `${end}`,
    }));
  }

  return (
    <div className="inline-block relative z-10">
      <Popover
        size="$5"
        allowFlip
        stayInFrame
        offset={15}
      >
        <Popover.Trigger asChild>
          <button type="button" className="border border-gray-700 px-4 py-2 rounded-md text-sm cursor-pointer">
            {dayjs(startDate).format("MM/DD/YYYY")} - {dayjs(endDate).format("MM/DD/YYYY")}
          </button>
        </Popover.Trigger>

        <Popover.Content
          borderWidth={1}
          borderColor="$borderColor"
          enterStyle={{ y: -10, opacity: 0 }}
          exitStyle={{ y: -10, opacity: 0 }}
          boxShadow="0px 4px 8px rgba(0,0,0,0.1), 0px 12px 32px rgba(0,0,0,0.08)"
          className="!border !border-gray-700 !bg-lumera-popover !p-2"
        >
          <Popover.Arrow borderWidth={1} backgroundColor="#1a212e" borderColor="#364153" />

          <div>
            <div className="datepicker-wrapper">
              <DatePicker
                selected={startDate}
                onChange={onChange}
                startDate={startDate}
                endDate={endDate}
                selectsRange
                className="border border-gray-700 rounded-lg px-4 py-2"
                inline
                maxDate={new Date()}
              />
            </div>
            <div className="mt-1 text-sm text-lumera-label pl-2 ">Predefined dates</div>
            <ul className="mt-1 text-sm">
              <li>
                <Popover.Close asChild>
                  <button
                    type="button"
                    className={`w-full py-1 px-2 hover:text-lumera-green cursor-pointer text-left ${selectedPredefined === '7' ? 'text-lumera-green' : 'text-lumera-teal'}`}
                    onClick={() => handleQuickSelect('7')}
                  >
                    Last 7 days
                  </button>
                </Popover.Close>
              </li>
              <li>
                <Popover.Close asChild>
                  <button
                    type="button"
                    className={`w-full py-1 px-2 hover:text-lumera-green cursor-pointer text-left ${selectedPredefined === '30' ? 'text-lumera-green' : 'text-lumera-teal'}`}
                    onClick={() => handleQuickSelect('30')}
                  >
                    Last 30 days
                  </button>
                </Popover.Close>
              </li>
              <li>
                <Popover.Close asChild>
                  <button
                    type="button"
                    className={`w-full py-1 px-2 hover:text-lumera-green cursor-pointer text-left ${selectedPredefined === '60' ? 'text-lumera-green' : 'text-lumera-teal'}`}
                    onClick={() => handleQuickSelect('60')}
                  >
                    Last 60 days
                  </button>
                </Popover.Close>
              </li>
              <li>
                <Popover.Close asChild>
                  <button
                    type="button"
                    className={`w-full py-1 px-2 hover:text-lumera-green cursor-pointer text-left ${selectedPredefined === '90' ? 'text-lumera-green' : 'text-lumera-teal'}`}
                    onClick={() => handleQuickSelect('90')}
                  >
                    Last 90 days
                  </button>
                </Popover.Close>
              </li>
            </ul>
            <div className="mt-2 flex justify-end pb-2">
              <Popover.Close asChild>
                <button
                  onClick={handleApply}
                  className="bg-lumera-teal hover:bg-lumera-green text-white text-sm font-medium px-5 py-2 rounded-lg transition-colors flex items-center cursor-pointer"
                >
                  Apply
                </button>
              </Popover.Close>
            </div>
          </div>
        </Popover.Content>
      </Popover>
    </div>
  );
};

export default DateTimePicker;
