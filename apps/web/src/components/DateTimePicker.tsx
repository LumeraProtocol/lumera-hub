import { useState } from "react";
import DatePicker from "react-datepicker";
import dayjs from 'dayjs';

import { useSelector, useDispatch } from '@/redux/hooks';
import * as admin from '@/redux/admin.slice';

import "react-datepicker/dist/react-datepicker.css";

const DateTimePicker = () => {
  const adminState = useSelector((state) => state.admin);
  const dispatch = useDispatch();
  const [startDate, setStartDate] = useState<Date | null>(adminState.startDate ? new Date(adminState.startDate) : new Date(dayjs().subtract(30, 'day').valueOf()));
  const [endDate, setEndDate] = useState<Date | null>(adminState.endDate ? new Date(adminState.endDate) : new Date());

  const onChange = (dates: [Date | null, Date | null]) => {
    const [start, end] = dates;
    setStartDate(start);
    setEndDate(end);
    if (end) {
      dispatch(admin.setDate({
        startDate: `${start}`,
        endDate: `${end}`,
      }));
    }
  };

  return (
    <div className="inline-block datepicker-wrapper relative z-[1000]">
      <DatePicker
        selected={startDate}
        onChange={onChange}
        startDate={startDate}
        endDate={endDate}
        selectsRange
        className="border border-gray-700 rounded-lg px-4 py-2"
      />
    </div>
  );
};

export default DateTimePicker;
