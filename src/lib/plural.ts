export const plural = (n: number, one: string, few: string, many: string): string => {
  const abs = Math.abs(Math.trunc(n)) % 100;
  if (abs >= 11 && abs <= 14) return many;
  const last = abs % 10;
  if (last === 1) return one;
  if (last >= 2 && last <= 4) return few;
  return many;
};

export default plural;
