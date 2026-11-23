import { BlobReader, ZipReader } from '@zip.js/zip.js';
import { SaxesParser } from 'saxes';
import { dateKey, heartMinutes, nightPulseBins, summarizeNights, summarize, type History, type Kind, type Reading } from './health';
import { historyStart } from './history';

const quantityTypes: Record<string, [Kind, string]> = {
  HKQuantityTypeIdentifierStepCount: ['steps', 'count'],
  HKQuantityTypeIdentifierVO2Max: ['vo2', 'mL/min·kg'],
  HKQuantityTypeIdentifierLeanBodyMass: ['lean', 'kg'],
  HKQuantityTypeIdentifierAppleSleepingWristTemperature: ['temperature', 'degC'],
  HKQuantityTypeIdentifierHeartRate: ['heart', 'count/min'],
  HKQuantityTypeIdentifierRestingHeartRate: ['resting', 'count/min'],
  HKQuantityTypeIdentifierHeartRateVariabilitySDNN: ['sdnn', 'ms'],
  HKQuantityTypeIdentifierOxygenSaturation: ['oxygen', '%'],
  HKQuantityTypeIdentifierRespiratoryRate: ['respiratory', 'count/min'],
};

const parseDate = (value: string | undefined) =>
  Date.parse((value ?? '').replace(' ', 'T').replace(/ ([+-]\d{2})(\d{2})$/, '$1:$2'));

export async function readAppleArchive(file: File, progress: (percent: number) => void): Promise<History> {
  const now = new Date();
  const cutoff = historyStart(now).getTime();
  const today = dateKey(now.getTime());
  const hrvSamples: Reading[] = [];
  const samples = new Map<number, number>();
  const intervals: Reading[] = [];
  const totals = new Map<string, Map<Kind, { sum: number; count: number }>>();
  // Bound duplicate detection independently of export size. Exact nearby samples may be repeated.
  const recent = new Set<string>();
  const recentLimit = 8192;
  let rootSeen = false;
  let depth = 0;
  let validEarlierRecords = false;

  const parser = new SaxesParser();
  parser.on('doctype', declaration => {
    if (/<!ENTITY\b/i.test(declaration)) throw new Error('Объявления XML-сущностей не поддерживаются.');
  });
  parser.on('opentag', ({ name, attributes }) => {
    depth += 1;
    if (depth === 1) {
      if (name !== 'HealthData') throw new Error('В export.xml не найден корневой элемент HealthData.');
      rootSeen = true;
      return;
    }
    if (depth !== 2 || (name !== 'Record' && name !== 'Workout')) return;

    const isSleep = attributes.type === 'HKCategoryTypeIdentifierSleepAnalysis'
      && /Asleep|Awake|InBed/.test(attributes.value ?? '');
    const metric = Object.hasOwn(quantityTypes, attributes.type) ? quantityTypes[attributes.type] : undefined;
    if (name !== 'Workout' && !isSleep && !metric) return;

    const start = parseDate(attributes.startDate);
    const end = isSleep || name === 'Workout' ? parseDate(attributes.endDate) : NaN;
    const anchor = isSleep ? end : start;
    if (!Number.isFinite(start) || !Number.isFinite(anchor)) return;
    if (anchor < cutoff) {
      validEarlierRecords = true;
      return;
    }
    const date = dateKey(anchor);
    if (date > today) return;

    if (isSleep || name === 'Workout') {
      if (end <= start || !Number.isFinite(end)) return;
      const label = name === 'Workout' ? attributes.workoutActivityType?.replace(/^HKWorkoutActivityType/, '') : (({
        HKCategoryValueSleepAnalysisAsleepDeep: 'deep', HKCategoryValueSleepAnalysisAsleepCore: 'light',
        HKCategoryValueSleepAnalysisAsleepREM: 'rem', HKCategoryValueSleepAnalysisAwake: 'awake',
        HKCategoryValueSleepAnalysisInBed: 'bed',
      } as Record<string,string>)[attributes.value] ?? 'asleep');
      intervals.push({ kind: isSleep ? 'sleep' : 'workout', start, end, label });
      return;
    }
    if (!metric || (attributes.unit !== metric[1] && !(metric[0] === 'vo2' && ['mL/kg/min','ml/kg/min'].includes(attributes.unit))) || !attributes.value?.trim()) return;
    const number = Number(attributes.value);
    const [kind] = metric;
    if (!Number.isFinite(number) || number <= 0 || (kind === 'oxygen' && number > 1)) return;
    const identity = kind + ':' + start + ':' + number;
    if (recent.has(identity)) return;
    if (kind === 'sdnn') hrvSamples.push({kind,start,value:number});
    if (kind === 'heart') samples.set(Math.floor(start / 60000), number);
    recent.add(identity);
    if (recent.size > recentLimit) recent.delete(recent.values().next().value!);

    let day = totals.get(date);
    if (!day) totals.set(date, day = new Map());
    let total = day.get(kind);
    if (!total) day.set(kind, total = { sum: 0, count: 0 });
    total.count++;
    total.sum += kind === 'oxygen' ? number * 100 : number;
  });
  parser.on('closetag', () => { depth -= 1; });
  parser.on('error', () => { throw new Error('Файл export.xml повреждён или имеет неверный формат.'); });

  const zip = new ZipReader(new BlobReader(file), { useWebWorkers: false });
  try {
    const entry = (await zip.getEntries()).find(item =>
      !item.directory && (item.filename === 'export.xml' || item.filename === 'apple_health_export/export.xml'));
    if (!entry || entry.directory) throw new Error('В ZIP-архиве не найден файл export.xml.');
    if (entry.encrypted) throw new Error('Импорт защищённых паролем архивов не поддерживается.');

    const decoder = new TextDecoder('utf-8', { fatal: true });
    let bytes = 0;
    let lastPercent = -1;
    const sink = new WritableStream<Uint8Array>({
      write(chunk) {
        bytes += chunk.byteLength;
        if (bytes > entry.uncompressedSize) throw new Error('Некорректный размер export.xml.');
        parser.write(decoder.decode(chunk, { stream: true }));
        const percent = Math.min(100, Math.floor(bytes * 100 / Math.max(1, entry.uncompressedSize)));
        if (percent !== lastPercent) {
          lastPercent = percent;
          progress(percent);
        }
      },
    });
    await entry.getData(sink, { checkSignature: true });
    parser.write(decoder.decode()).close();
    if (!rootSeen || bytes !== entry.uncompressedSize) throw new Error('Файл export.xml неполный.');
  } finally {
    await zip.close();
  }

  // Group adjacent sleep stages under the wake date, including nights crossing midnight.
  const stages = intervals.filter(r=>r.kind==='sleep').sort((a,b)=>b.end!-a.end!);
  let wake = 0, earliest = Infinity;
  for (const stage of stages) {
    if (earliest-stage.end! > 90*60000) wake = stage.end!;
    stage.dayAnchor = wake;
    earliest = Math.min(earliest,stage.start);
  }
  const history = summarize(intervals);
  for (const [date,bins] of Object.entries(nightPulseBins(stages,samples))) {
    if (history[date]) history[date].nightPulse = bins;
  }
  for (const [date,value] of Object.entries(summarizeNights(stages,hrvSamples))) {
    if (history[date]) history[date].nightHrv = value;
  }
  const minutes = heartMinutes(samples);
  for (const [date, totalsByKind] of totals) {
    const day = history[date] ??= { values: {}, workouts: [] };
    if (minutes[date]) day.bpmMinutes = minutes[date];
    for (const [kind, { sum, count }] of totalsByKind) day.values[kind] = kind === 'steps' ? sum : sum / count;
  }
  if (!Object.keys(history).length && !validEarlierRecords) {
    throw new Error('В архиве нет поддерживаемых записей здоровья.');
  }
  return history;
}
