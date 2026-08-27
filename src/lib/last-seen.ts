export const lastSeenText = (seconds: number | null | undefined): string => {
  if (seconds === null || seconds === undefined) return 'давно не заходил';
  if (seconds < 120) return 'в сети';
  const min = Math.floor(seconds / 60);
  if (min < 60) return `был ${min} мин назад`;
  const hours = Math.floor(min / 60);
  if (hours < 24) return `был ${hours} ч назад`;
  const days = Math.floor(hours / 24);
  if (days === 1) return 'был вчера';
  if (days < 7) return `был ${days} дн назад`;
  const weeks = Math.floor(days / 7);
  if (weeks < 5) return `был ${weeks} нед назад`;
  return 'давно не заходил';
};

export default lastSeenText;