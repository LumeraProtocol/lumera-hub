import React, { useState, useEffect } from 'react';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import duration from 'dayjs/plugin/duration';

dayjs.extend(relativeTime);
dayjs.extend(duration);
dayjs.locale('vi');

interface PastTimeProps {
  pastDate: Date | string;
  className?: string;
}

const PastTime: React.FC<PastTimeProps> = ({ pastDate, className = '' }) => {
  const [display, setDisplay] = useState('');

  useEffect(() => {
    const target = dayjs(pastDate);
    const now = dayjs();

    const update = () => {
      const diffMs = now.diff(target);
      const diffDays = now.diff(target, 'day');

      if (diffMs < 0) {
        setDisplay('in the future');
        return;
      }

      if (diffDays < 30) {
        setDisplay(target.fromNow());
        return;
      }

      const diffMonths = now.diff(target, 'month');
      const diffYears = now.diff(target, 'year');

      let text = '';

      if (diffYears >= 10) {
        // ≥ 10 years → full date
        text = target.format('DD/MM/YYYY');
      } else if (diffYears >= 1) {
        // 1–9 years
        text = target.from(now, true) + ' ago';
      } else if (diffMonths >= 1) {
        text = target.from(now, true) + ' ago';
      } else {
        text = target.fromNow();
      }

      setDisplay(text);
    };

    update();
    const interval = setInterval(update, 60000);

    return () => clearInterval(interval);
  }, [pastDate]);

  const fullDate = dayjs(pastDate).format('DD/MM/YYYY HH:mm:ss');

  return (
    <span className={className} title={fullDate}>
      {display}
    </span>
  );
};

export default PastTime;
