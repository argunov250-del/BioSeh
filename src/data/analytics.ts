import { dateKey, type Reading, type Day, type History, type Kind } from './health';

const MINUTE = 60000;
export function intervalMinutes(records: Reading[]) {
  let last = -Infinity;
  let duration = 0;
  for (const r of records.slice().sort((a,b) => a.start - b.start)) {
    if (!r.end || r.end <= r.start) continue;
    duration += Math.max(0, r.end - Math.max(last, r.start));
    last = Math.max(last, r.end);
  }
  return duration / MINUTE;
}

export function sleepStats(day?: Day) {
  const intervals = day?.sleepIntervals ?? [];
  const asleep = intervals.filter(r => r.end && !['awake','bed'].includes(r.label ?? ''));
  const first = asleep.length ? Math.min(...asleep.map(r => r.start)) : undefined;
  const last = asleep.length ? Math.max(...asleep.map(r => r.end!)) : undefined;
  const bed = intervalMinutes(intervals.filter(r => r.label === 'bed'));
  const sleep = day?.values.sleep;
  return { first, last, bed, efficiency: bed && sleep ? Math.min(100, 100 * sleep / bed) : undefined,
    stages: ['light','deep','rem','awake'].map(label => {
      const records = intervals.filter(r => r.label === label);
      return records.length ? intervalMinutes(records) : undefined;
    }) };
}

function clock(t: number) {
  const d = new Date(t);
  return d.getHours() * 60 + d.getMinutes();
}
function clockGap(a: number,b: number) {
  const diff = Math.abs(clock(a)-clock(b));
  return Math.min(diff,1440-diff);
}
export function regularity(day: Day, prior?: Day) {
  const a = sleepStats(day), b = sleepStats(prior);
  if (!a.first || !a.last || !b.first || !b.last) return undefined;
  return Math.max(0,100 - (clockGap(a.first,b.first)+clockGap(a.last,b.last))/3.6);
}

export function zoneLoad(day: Day | undefined, max: number, rest?: number) {
  if (!day?.bpmMinutes || !rest || max <= rest) return undefined;
  const zones = [0,0,0,0,0];
  for (const [bpm,minutes] of Object.entries(day.bpmMinutes)) {
    const fraction = (+bpm-rest)/(max-rest);
    if (fraction >= .5) zones[Math.min(4,Math.floor((fraction-.5)*10+1e-8))] += minutes;
  }
  const impulse = zones.reduce((sum,m,i) => sum + m * (i+1)**1.5,0);
  return { zones, strain: 21 * (1-Math.exp(-impulse/160)) };
}

const avg = (arr: number[]) => arr.length ? arr.reduce((a,b)=>a+b,0)/arr.length : undefined;
export function median(arr: number[]) {
  const s = [...arr].sort((a,b)=>a-b);
  return s.length ? (s[Math.floor((s.length-1)/2)] + s[Math.floor(s.length/2)])/2 : undefined;
}
const clamp = (x: number) => Math.max(0,Math.min(100,x));
export function analyze(history: History, date: string, hrv: 'sdnn'|'rmssd', max: number) {
  const day = history[date];
  const end = new Date(date+'T12:00:00');
  const offset = (days: number) => { const d = new Date(end); d.setDate(d.getDate()-days); return dateKey(d.getTime()); };
  const prior = Object.entries(history).filter(([key]) => key < date && key >= offset(28)).map(([,d]) => d);
  const matched = day?.phase ? Object.entries(history).filter(([key,d]) =>
    key < date && key >= offset(90) && d.phase === day.phase).map(([,d])=>d) : [];
  const values = (days: Day[],kind: Kind) => days.flatMap(d => d.values[kind] ?? []);
  const baseline = (kind: Kind) => median(values(prior,kind));
  const rest = baseline('resting') ?? day?.values.resting;
  const load = zoneLoad(day,max,rest);
  const night = sleepStats(day);
  const prev = history[offset(1)];
  const regular = day && regularity(day,prev);
  const typicalSleep = baseline('sleep') ?? 480;
  const recent = [1,2,3].flatMap(n => history[offset(n)]?.values.sleep ?? []);
  const debt = avg(recent.map(m => Math.max(0,typicalSleep-m))) ?? 0;
  const need = typicalSleep + Math.min(90,debt/2 + (zoneLoad(prev,max,rest)?.strain ?? 0)*2);
  const sufficiency = day?.values.sleep ? clamp(100*day.values.sleep/need) : undefined;
  const components: {label:string; score:number}[] = [];
  function relative(kind: Kind, direction: number, minSpread: number) {
    const useNight = kind === hrv && day?.nightHrv !== undefined;
    const metricValues = (days: Day[]) => useNight ? days.flatMap(d=>d.nightHrv ?? []) : values(days,kind);
    const phaseValues = metricValues(matched);
    const readings = phaseValues.length >= 5 ? phaseValues : metricValues(prior);
    const base = median(readings), current = useNight ? day?.nightHrv : day?.values[kind];
    if (readings.length < 5 || base === undefined || current === undefined) return;
    const spread = Math.max(minSpread,1.4826 * median(readings.map(v=>Math.abs(v-base)))!);
    const delta = (current-base)/spread;
    components.push({label:kind,score:clamp(70+15*(direction===0 ? -Math.abs(delta) : direction*delta))});
  }
  relative(hrv,1,5); relative('resting',-1,2); relative('respiratory',0,0.5);
  relative('oxygen',1,1); relative('temperature',0,0.2);
  const baselineBins = new Map<number,number>();
  for (const d of prior) for (const [bpm,n] of Object.entries(d.nightPulse ?? {})) {
    baselineBins.set(+bpm,(baselineBins.get(+bpm) ?? 0)+n);
  }
  const sampleCount = [...baselineBins.values()].reduce((x,y)=>x+y,0);
  let threshold: number | undefined, accumulated = 0;
  if (prior.filter(d=>d.nightPulse).length >= 5 && sampleCount >= 150) {
    for (const [bpm,n] of [...baselineBins].sort((a,b)=>a[0]-b[0])) {
      accumulated += n;
      if (accumulated >= sampleCount*.9) { threshold = bpm; break; }
    }
  }
  const observed = Object.entries(day?.nightPulse ?? {});
  const observedMinutes = observed.reduce((sum,[,n])=>sum+n,0);
  const stress = threshold !== undefined && observedMinutes >= 30 ?
    100*observed.reduce((sum,[bpm,n])=>sum+(+bpm>threshold! ? n : 0),0)/observedMinutes : undefined;
  const sleepScore = avg([sufficiency,regular,night.efficiency,stress===undefined ? undefined : 100-stress].filter((x): x is number=>x!==undefined));
  if (sleepScore !== undefined) components.push({label:'sleep',score:sleepScore});
  const recovery = components.some(c=>c.label===hrv) && components.some(c=>c.label==='resting') && sleepScore !== undefined
    ? Math.round(avg(components.map(c=>c.score))!) : undefined;
  const start = new Date(end); start.setDate(1); start.setMonth(start.getMonth()-6);
  start.setDate(Math.min(end.getDate(),new Date(start.getFullYear(),start.getMonth()+1,0).getDate()));
  const days = Object.entries(history).filter(([key])=>key>=dateKey(start.getTime()) && key<=date);
  const data = days.map(([,d])=>d);
  const zones = data.flatMap(d=>zoneLoad(d,max,d.values.resting ?? rest)?.zones ? [zoneLoad(d,max,d.values.resting ?? rest)!.zones] : []);
  const consistency = days.flatMap(([key,d])=>{
    const yesterday = new Date(key+'T12:00:00'); yesterday.setDate(yesterday.getDate()-1);
    return regularity(d,history[dateKey(yesterday.getTime())]) ?? [];
  });
  const strength = data.flatMap(d=>{
    const sessions = d.workouts.filter(w=>/strength|weightlifting|силов/i.test(w.label ?? ''));
    return d.workouts.length || d.values.steps !== undefined ? [intervalMinutes(sessions)] : [];
  });
  const factors: [string,number|undefined,string][] = [
    ['Регулярность сна',avg(consistency),'%'],['Сон',avg(values(data,'sleep')),'мин/день'],
    ['Шаги',avg(values(data,'steps')),'шагов/день'],['Зоны 1–3',avg(zones.map(z=>z[0]+z[1]+z[2])),'мин/день'],
    ['Зоны 4–5',avg(zones.map(z=>z[3]+z[4])),'мин/день'],['Силовые',avg(strength),'мин/день записей'],
    ['VO₂ max',avg(values(data,'vo2')),'мл/кг/мин'],['Пульс в покое',avg(values(data,'resting')),'уд/мин'],
    ['Безжировая масса',avg(values(data,'lean')),'кг']];
  return {stress, observedMinutes, matchedDays:matched.length, load, night, regular, need, sleepScore, recovery, components, factors, days:data.length};
}
