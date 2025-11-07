import React, { useState, useEffect } from 'react';

interface PastTimeProps {
  pastDate: Date;
  className?: string;
}

const PastTime: React.FC<PastTimeProps> = ({ pastDate, className = '' }) => {
  const [relativeTime, setRelativeTime] = useState<string>('');

  useEffect(() => {
    const updateTime = () => {
      const now = new Date().getTime();
      const diff = now - pastDate.getTime();

      let result = '';
      if (diff < 0) {
        const days = Math.ceil(diff * -1 / (1000 * 60 * 60 * 24));
        if (days === 1) {
          result = 'in a day';
        } else {
          result = 'in the future';
        }
      } else {
        const days = Math.floor(diff / (1000 * 60 * 60 * 24));
        if (days > 0) {
          result = `${days} day${days > 1 ? 's' : ''} ago`;
        } else {
          const hours = Math.floor(diff / (1000 * 60 * 60));
          if (hours > 0) {
            result = `${hours} hour${hours > 1 ? 's' : ''} ago`;
          } else {
            const minutes = Math.floor(diff / (1000 * 60));
            if (minutes > 0) {
              result = `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
            } else {
              result = 'less than a minute ago';
            }
          }
        }
      }

      setRelativeTime(result);
    };

    updateTime(); // Initial calculation

    // Update every minute for accuracy
    const interval = setInterval(updateTime, 60000);

    return () => clearInterval(interval);
  }, [pastDate]);

  return <span className={className} title={pastDate.toLocaleDateString()}>{relativeTime}</span>;
};

export default PastTime;
