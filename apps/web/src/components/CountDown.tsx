import React, { useState, useEffect } from 'react';

interface CountdownProps {
  targetDate: Date;
  title?: string;
  className?: string;
}

interface TimeLeft {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
}

const CountDown: React.FC<CountdownProps> = ({ targetDate, className = '' }) => {
  const [timeLeft, setTimeLeft] = useState<TimeLeft>({ days: 0, hours: 0, minutes: 0, seconds: 0 });

  useEffect(() => {
    const timer = setInterval(() => {
      const now = new Date().getTime();
      const distance = targetDate.getTime() - now;

      if (distance < 0) {
        setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0 });
        return;
      }

      setTimeLeft({
        days: Math.floor(distance / (1000 * 60 * 60 * 24)),
        hours: Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
        minutes: Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60)),
        seconds: Math.floor((distance % (1000 * 60)) / 1000),
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [targetDate]);

  return (
    <span className={`text-sm text-lumera-label ${className}`}>
        <span className='text-green-500'>{timeLeft.days}</span> days <span className='text-green-500'>{timeLeft.hours}</span> hours <span className='text-green-500'>{timeLeft.minutes}</span> minutes <span className='text-green-500'>{timeLeft.seconds}</span> seconds
    </span>
  )
};

export default CountDown;