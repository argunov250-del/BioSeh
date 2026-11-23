import { Capacitor, registerPlugin } from '@capacitor/core';

export type Kind = 'heart' | 'resting' | 'sdnn' | 'rmssd' | 'oxygen' | 'respiratory' | 'sleep' | 'workout';
export interface Reading {
  kind: Kind;
  start: number;
  end?: number;
  value?: number;
  dayAnchor?: number;
  label?: string;
}

export const nativeHealth = Capacitor.getPlatform() === 'android';
export const healthConnect = registerPlugin<{
  read(): Promise<{ readings: Reading[]; granted: number; total: number }>;
}>('BioSehHealth');

export const dateKey = (time: number) => new Date(time).toLocaleDateString('sv-SE');
export const labels: Record<Kind, [string, string]> = {
  heart: ['Пульс', 'уд/мин'],
  resting: ['Пульс в покое', 'уд/мин'],
  sdnn: ['Вариабельность пульса · SDNN', 'мс'],
  rmssd: ['Вариабельность пульса · RMSSD', 'мс'],
  oxygen: ['Насыщение кислородом', '%'],
  respiratory: ['Частота дыхания', 'вдохов/мин'],
  sleep: ['Сон', 'мин'],
  workout: ['Тренировки', 'мин'],
};

export type Day = { values: Partial<Record<Kind, number>>; workouts: Reading[] };
export type History = Record<string, Day>;

export function summarize(readings: Reading[]): History {
  const groups = new Map<string, Reading[]>();
  const seen = new Set<string>();
  for (const reading of readings) {
    const id = JSON.stringify([reading.kind, reading.start, reading.end, reading.dayAnchor, reading.value, reading.label]);
    if (seen.has(id)) continue;
    seen.add(id);
    const key = dateKey(reading.kind === 'sleep' ? reading.dayAnchor ?? reading.end ?? reading.start : reading.start);
    const group = groups.get(key) ?? [];
    group.push(reading);
    groups.set(key, group);
  }

  return Object.fromEntries(Array.from(groups, ([key, group]) => {
    const values: Day['values'] = {};
    for (const kind of Object.keys(labels) as Kind[]) {
      const matches = group.filter(r => r.kind === kind);
      if (kind === 'sleep' || kind === 'workout') {
        let end = -Infinity;
        let duration = 0;
        for (const interval of matches.sort((a, b) => a.start - b.start)) {
          if (interval.end === undefined || interval.end <= interval.start) continue;
          duration += Math.max(0, interval.end - Math.max(end, interval.start));
          end = Math.max(end, interval.end);
        }
        if (duration > 0) values[kind] = duration / 60000;
      } else {
        const measurements = matches.flatMap(r => r.value === undefined ? [] : [r.value]);
        if (measurements.length) values[kind] = measurements.reduce((a, b) => a + b, 0) / measurements.length;
      }
    }
    return [key, { values, workouts: group.filter(r => r.kind === 'workout').sort((a, b) => a.start - b.start) }];
  }));
}
