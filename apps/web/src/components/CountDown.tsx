import React, { useState, useEffect } from 'react';
import { getCountdownTimeLeft } from '@/utils/countdown';

interface CountdownProps {
  targetDate: Date;
  title?: string;
  className?: string;
}

const CountDown: React.FC<CountdownProps> = ({ targetDate, className = '' }) => {
  const targetTime = targetDate.getTime();
  // Keep the server and first client render deterministic; update after hydration.
  const [timeLeft, setTimeLeft] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 });

  useEffect(() => {
    const updateTimeLeft = () => setTimeLeft(getCountdownTimeLeft(new Date(targetTime)));
    updateTimeLeft();
    const timer = setInterval(() => {
      updateTimeLeft();
    }, 1000);

    return () => clearInterval(timer);
  }, [targetTime]);

  return (
    <span className={`text-sm text-lumera-label ${className}`}>
        {timeLeft.days > 0 ? <><span className='text-green-500'>{timeLeft.days}</span> days </> : null}
        {timeLeft.hours > 0 ? <><span className='text-green-500'>{timeLeft.hours}</span> hours </> : null}
        <span className='text-green-500'>{timeLeft.minutes}</span> minutes <span className='text-green-500'>{timeLeft.seconds}</span> seconds
    </span>
  )
};

export default CountDown;
