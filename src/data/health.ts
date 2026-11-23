import { Capacitor, registerPlugin } from '@capacitor/core';

export type Kind = 'heart' | 'resting' | 'sdnn' | 'rmssd' | 'oxygen' | 'respiratory' | 'sleep' | 'workout' | 'steps' | 'vo2' | 'lean' | 'temperature';
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
  steps: ['Шаги', 'шагов'],
  vo2: ['VO₂ max', 'мл/кг/мин'],
  lean: ['Безжировая масса', 'кг'],
  temperature: ['Температура запястья', '°C'],
  heart: ['Пульс', 'уд/мин'],
  resting: ['Пульс в покое', 'уд/мин'],
  sdnn: ['Вариабельность пульса · SDNN', 'мс'],
  rmssd: ['Вариабельность пульса · RMSSD', 'мс'],
  oxygen: ['Насыщение кислородом', '%'],
  respiratory: ['Частота дыхания', 'вдохов/мин'],
  sleep: ['Сон', 'мин'],
  workout: ['Тренировки', 'мин'],
};

export type Day = { values: Partial<Record<Kind, number>>; workouts: Reading[]; bpmMinutes?: Record<number, number>; phase?: string; strengthRpe?: Record<string,number>; nightPulse?: Record<number,number>; nightHrv?: number; sleepIntervals?: Reading[] };
export type History = Record<string, Day>;

export function heartMinutes(samples: Map<number, number>): Record<string, Record<number, number>> {
  const result: Record<string, Record<number, number>> = {};
  for (const [minute, bpm] of samples) {
    const previous = samples.get(minute - 1);
    if (previous === undefined) continue;
    const date = dateKey(minute * 60000);
    const histogram = result[date] ??= {};
    const bin = Math.round((bpm + previous) / 2);
    histogram[bin] = (histogram[bin] ?? 0) + 1;
  }
  return result;
}

export function nightPulseBins(intervals: Reading[], samples: Map<number, number>) {
  const bins: Record<string, Record<number,number>> = {};
  const counted = new Set<number>();
  for (const r of intervals) {
    if (r.kind !== 'sleep' || !r.end || ['awake','bed'].includes(r.label ?? '')) continue;
    const key = dateKey(r.dayAnchor ?? r.end);
    // Only fully observed minutes inside a sleep interval.
    for (let m = Math.ceil(r.start/60000); m < Math.floor(r.end/60000); m++) {
      const bpm = samples.get(m);
      if (bpm === undefined || counted.has(m)) continue;
      counted.add(m);
      const bin = Math.round(bpm);
      const night = bins[key] ??= {};
      night[bin] = (night[bin] ?? 0) + 1;
    }
  }
  return bins;
}

export function summarizeNights(intervals: Reading[], hrv: Reading[]): Record<string, number> {
  const sleep = intervals.filter(r => r.kind === 'sleep' && r.end && !['awake','bed'].includes(r.label ?? '')).sort((a,b)=>a.start-b.start);
  const samples = hrv.slice().sort((a,b)=>a.start-b.start);
  const totals: Record<string, [number,number]> = {};
  let pos = 0;
  for (const record of samples) {
    while (pos < sleep.length && sleep[pos].end! <= record.start) pos++;
    const stage = sleep[pos];
    if (!stage || stage.start > record.start || !record.value) continue;
    const wake = stage.dayAnchor ?? stage.end!;
    const weight = (stage.label === 'deep' ? 2 : 1) * (wake-record.start <= 2*3600000 ? 1.5 : 1);
    const sum = totals[dateKey(wake)] ??= [0,0];
    sum[0] += record.value * weight;
    sum[1] += weight;
  }
  return Object.fromEntries(Object.entries(totals).map(([key,[sum,weight]])=>[key,sum/weight]));
}

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

  const samples = new Map<number, number>();
  for (const r of readings) if (r.kind === 'heart' && r.value) samples.set(Math.floor(r.start / 60000), r.value);
  const minutes = heartMinutes(samples);
  const nights = nightPulseBins(readings,samples);
  const nightHrv = summarizeNights(readings,readings.filter(r=>r.kind==='rmssd' || r.kind==='sdnn'));
  return Object.fromEntries(Array.from(groups, ([key, group]) => {
    const values: Day['values'] = {};
    for (const kind of Object.keys(labels) as Kind[]) {
      const matches = group.filter(r => r.kind === kind && (kind !== 'sleep' || !['awake','bed'].includes(r.label ?? '')));
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
        if (measurements.length) values[kind] = measurements.reduce((a, b) => a + b, 0) / (kind === 'steps' ? 1 : measurements.length);
      }
    }
    const stages = group.filter(r => r.kind === 'sleep');
    return [key, { values, nightPulse:nights[key], nightHrv: nightHrv[key], bpmMinutes: minutes[key], sleepIntervals: stages.length ? stages : undefined, workouts: group.filter(r => r.kind === 'workout').sort((a, b) => a.start - b.start) }];
  }));
}
