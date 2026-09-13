export function calculateMonthlyEndDate(startDate: string | null) {
  if (!startDate) return null;
  const [year, month, day] = startDate.split("-").map(Number);
  if (!year || !month || !day) return null;

  const targetMonthIndex = month;
  const targetYear = year + Math.floor(targetMonthIndex / 12);
  const targetMonth = targetMonthIndex % 12;
  const lastDay = new Date(Date.UTC(targetYear, targetMonth + 1, 0)).getUTCDate();
  const result = new Date(Date.UTC(targetYear, targetMonth, Math.min(day, lastDay)));
  return result.toISOString().slice(0, 10);
}
