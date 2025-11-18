export const getWeekIdentifier = (date: Date) => {
  const target = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const day = target.getUTCDay() || 7;
  target.setUTCDate(target.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(target.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil((((target.valueOf() - yearStart.valueOf()) / 86400000) + 1) / 7);
  return `${target.getUTCFullYear()}-W${weekNo.toString().padStart(2, '0')}`;
};

export const getDateOfISOWeek = (week: number, year: number) => {
  const simple = new Date(Date.UTC(year, 0, 1 + (week - 1) * 7));
  const dow = simple.getUTCDay();
  const isoWeekStart = new Date(simple);
  if (dow <= 4) {
    isoWeekStart.setUTCDate(simple.getUTCDate() - simple.getUTCDay() + 1);
  } else {
    isoWeekStart.setUTCDate(simple.getUTCDate() + 8 - simple.getUTCDay());
  }
  return isoWeekStart;
};

export const getSegmentType = (date: Date): 'mid-week' | 'weekend' => {
  const day = date.getUTCDay();
  return day >= 1 && day <= 4 ? 'mid-week' : 'weekend';
};

export const getISOWeekRange = (date: Date) => {
  const weekId = getWeekIdentifier(date);
  const [year, weekNum] = weekId.split('-W').map(Number);
  const start = getDateOfISOWeek(weekNum, year);
  const end = new Date(start);
  end.setUTCDate(start.getUTCDate() + 7);
  return { start, end };
};
