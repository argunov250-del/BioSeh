import { summarize, type Kind, type Reading } from './health';

const MAX_XML = 128 * 1024 * 1024;

async function readExport(file: File): Promise<string> {
  const tailStart = Math.max(0, file.size - 65557);
  const tail = new DataView(await file.slice(tailStart).arrayBuffer());
  let end = tail.byteLength - 22;
  for (; end >= 0; end--) {
    if (tail.getUint32(end, true) === 0x06054b50 && end + 22 + tail.getUint16(end + 20, true) === tail.byteLength) break;
  }
  if (end < 0 || tail.getUint16(end + 4, true) || tail.getUint16(end + 6, true)) {
    throw new Error('Выберите ZIP-архив экспорта Apple Health.');
  }
  const count = tail.getUint16(end + 10, true);
  const size = tail.getUint32(end + 12, true);
  const offset = tail.getUint32(end + 16, true);
  if (count === 65535 || size > 16 * 1024 * 1024 || offset + size > tailStart + end) {
    throw new Error('Формат ZIP-архива не поддерживается.');
  }

  const directory = new DataView(await file.slice(offset, offset + size).arrayBuffer());
  const decoder = new TextDecoder('utf-8', { fatal: true });
  let pos = 0;
  for (let index = 0; index < count; index++) {
    if (pos + 46 > size || directory.getUint32(pos, true) !== 0x02014b50) break;
    const nameLength = directory.getUint16(pos + 28, true);
    const next = pos + 46 + nameLength + directory.getUint16(pos + 30, true) + directory.getUint16(pos + 32, true);
    if (next > size) break;
    const name = new TextDecoder().decode(new Uint8Array(directory.buffer, pos + 46, nameLength));
    if (name === 'export.xml' || name === 'apple_health_export/export.xml') {
      const flags = directory.getUint16(pos + 8, true);
      const method = directory.getUint16(pos + 10, true);
      const compressedSize = directory.getUint32(pos + 20, true);
      const xmlSize = directory.getUint32(pos + 24, true);
      const localOffset = directory.getUint32(pos + 42, true);
      if (xmlSize > MAX_XML || compressedSize > MAX_XML) throw new Error('Размер export.xml превышает 128 МБ.');
      if ((flags & 1) || (method !== 0 && method !== 8) || localOffset + 30 > offset) break;
      const local = new DataView(await file.slice(localOffset, localOffset + 30).arrayBuffer());
      if (local.getUint32(0, true) !== 0x04034b50) break;
      const start = localOffset + 30 + local.getUint16(26, true) + local.getUint16(28, true);
      if (start + compressedSize > offset) break;

      const stream = file.slice(start, start + compressedSize).stream();
      const reader = (method === 8 ? stream.pipeThrough(new DecompressionStream('deflate-raw')) : stream).getReader();
      const chunks: string[] = [];
      let length = 0;
      try {
        while (true) {
          const { value, done } = await reader.read();
          if (done) break;
          length += value.byteLength;
          if (length > xmlSize) throw new Error('Некорректный размер export.xml.');
          chunks.push(decoder.decode(value, { stream: true }));
        }
        if (length !== xmlSize) throw new Error('Архив повреждён.');
        chunks.push(decoder.decode());
        return chunks.join('');
      } finally {
        await reader.cancel();
      }
    }
    pos = next;
  }
  throw new Error('В архиве не найден доступный файл export.xml.');
}

const types = new Map<string, [Kind, string]>(([
  ['HeartRate', ['heart', 'count/min']],
  ['RestingHeartRate', ['resting', 'count/min']],
  ['HeartRateVariabilitySDNN', ['sdnn', 'ms']],
  ['OxygenSaturation', ['oxygen', '%']],
  ['RespiratoryRate', ['respiratory', 'count/min']],
] satisfies [string, [Kind, string]][]).map(([type, details]) => ['HKQuantityTypeIdentifier' + type, details]));

const appleDate = (value: string | null) =>
  Date.parse((value ?? '').replace(' ', 'T').replace(/ ([+-]\d{2})(\d{2})$/, '$1:$2'));

export function parseAppleExport(xml: string) {
  // Apple's export includes an inline DTD. The browser parser must never receive entity declarations.
  if (/<!ENTITY\b/i.test(xml)) throw new Error('Объявления XML-сущностей не поддерживаются.');
  const document = new DOMParser().parseFromString(xml.replace(/<!DOCTYPE\s+HealthData\s*\[[\s\S]*?\]>|<!DOCTYPE[^>]*>/i, ''), 'application/xml');
  if (document.documentElement.tagName !== 'HealthData' || document.querySelector('parsererror')) {
    throw new Error('Файл export.xml повреждён или не является экспортом Apple Health.');
  }
  const readings: Reading[] = [];
  for (const node of document.documentElement.children) {
    if (node.tagName !== 'Record' && node.tagName !== 'Workout') continue;
    const start = appleDate(node.getAttribute('startDate'));
    if (!Number.isFinite(start)) continue;
    const end = appleDate(node.getAttribute('endDate'));
    if (node.tagName === 'Workout') {
      const label = node.getAttribute('workoutActivityType')?.replace(/^HKWorkoutActivityType/, '');
      if (end > start) readings.push({ kind: 'workout', start, end, label });
      continue;
    }

    const type = node.getAttribute('type') ?? '';
    const raw = node.getAttribute('value');
    if (type === 'HKCategoryTypeIdentifierSleepAnalysis') {
      if (end > start && raw?.startsWith('HKCategoryValueSleepAnalysisAsleep')) readings.push({ kind: 'sleep', start, end });
      continue;
    }

    const metric = types.get(type);
    if (!metric || !raw?.trim() || node.getAttribute('unit') !== metric[1]) continue;
    const value = Number(raw);
    if (Number.isFinite(value) && value > 0) {
      readings.push({ kind: metric[0], start, value: metric[0] === 'oxygen' ? value * 100 : value });
    }
  }
  if (!readings.length) throw new Error('В архиве нет поддерживаемых записей здоровья.');
  return summarize(readings);
}

export async function importAppleHealth(file: File) {
  return parseAppleExport(await readExport(file));
}
