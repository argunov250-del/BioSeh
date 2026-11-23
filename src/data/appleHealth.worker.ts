import { readAppleArchive } from './appleHealthArchive';

self.onmessage = async (event: MessageEvent<File>) => {
  try {
    const history = await readAppleArchive(event.data, percent => self.postMessage({ percent }));
    self.postMessage({ history });
  } catch (error) {
    self.postMessage({ error: error instanceof Error ? error.message : 'Не удалось распаковать архив Apple Health.' });
  }
};
