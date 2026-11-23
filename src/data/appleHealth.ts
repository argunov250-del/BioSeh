import type { History } from './health';

type ImportEvent = { percent: number } | { history: History } | { error: string };

export function importAppleHealth(file: File, progress: (percent: number) => void): Promise<History> {
  return new Promise((resolve, reject) => {
    const worker = new Worker(new URL('./appleHealth.worker.ts', import.meta.url), { type: 'module' });
    worker.onmessage = (event: MessageEvent<ImportEvent>) => {
      const data = event.data;
      if ('percent' in data) {
        progress(data.percent);
        return;
      }

      worker.terminate();
      if ('error' in data) reject(new Error(data.error));
      else resolve(data.history);
    };
    worker.onerror = () => {
      worker.terminate();
      reject(new Error('Не удалось запустить обработку архива Apple Health.'));
    };
    worker.postMessage(file);
  });
}
