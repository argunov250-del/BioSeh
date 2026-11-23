import { dateKey, type History } from './health';

export const HISTORY_MONTHS = 18;
export const APPLE_HISTORY_KEY = 'bioseh.apple.daily.v1';
export const ANDROID_HISTORY_KEY = 'bioseh.android.daily.v1';

export function historyStart(now = new Date(), months = HISTORY_MONTHS): Date {
  const cutoff = new Date(now);
  cutoff.setHours(0, 0, 0, 0);
  cutoff.setDate(1);
  cutoff.setMonth(cutoff.getMonth() - months);
  const lastDay = new Date(cutoff.getFullYear(), cutoff.getMonth() + 1, 0).getDate();
  cutoff.setDate(Math.min(now.getDate(), lastDay));

  return cutoff;
}

export function retainHistory(history: History, now = new Date()): History {
  const firstDate = dateKey(historyStart(now).getTime());
  const lastDate = dateKey(now.getTime());
  return Object.fromEntries(Object.entries(history).filter(([key]) => key >= firstDate && key <= lastDate));
}

export function mergeHistory(previous: History, incoming: History): History {
  const merged = { ...previous };
  for (const [date, day] of Object.entries(incoming)) {
    const before = merged[date];
    merged[date] = {
      phase: before?.phase, strengthRpe: before?.strengthRpe,
      nightPulse: day.nightPulse ?? before?.nightPulse,
      nightHrv: day.nightHrv ?? before?.nightHrv,
      bpmMinutes: day.bpmMinutes ?? before?.bpmMinutes,
      sleepIntervals: day.sleepIntervals ?? before?.sleepIntervals,
      values: { ...before?.values, ...day.values },
      workouts: day.values.workout === undefined ? before?.workouts ?? [] : day.workouts,
    };
  }
  return retainHistory(merged);
}

export function loadHistory(key: string): History {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return {};
    const history = retainHistory(JSON.parse(raw) ?? {});
    const trimmed = JSON.stringify(history);
    if (trimmed !== raw) {
      try {
        localStorage.setItem(key, trimmed);
      } catch {
        // Keep the usable snapshot if the browser denies writes.
      }
    }
    return history;
  } catch {
    return {};
  }
}
