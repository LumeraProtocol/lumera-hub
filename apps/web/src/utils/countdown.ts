export interface CountdownTimeLeft {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
}

const EMPTY_COUNTDOWN: CountdownTimeLeft = {
  days: 0,
  hours: 0,
  minutes: 0,
  seconds: 0,
};

export const getCountdownTimeLeft = (
  targetDate: Date,
  now = Date.now(),
): CountdownTimeLeft => {
  const distance = targetDate.getTime() - now;
  if (!Number.isFinite(distance) || distance <= 0) {
    return EMPTY_COUNTDOWN;
  }

  return {
    days: Math.floor(distance / (1000 * 60 * 60 * 24)),
    hours: Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
    minutes: Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60)),
    seconds: Math.floor((distance % (1000 * 60)) / 1000),
  };
};
