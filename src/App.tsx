import { useState } from 'react';
import { importAppleHealth } from './data/appleHealth';
import { healthConnect, labels, nativeHealth, summarize, type History, type Kind } from './data/health';

type Source = 'apple' | 'android';
const storageKey = 'bioseh.apple.daily.v1';
const number = new Intl.NumberFormat('ru', { maximumFractionDigits: 1 });
const time = new Intl.DateTimeFormat('ru', { hour: '2-digit', minute: '2-digit' });

function savedAppleHistory(): History {
  try {
    return JSON.parse(localStorage.getItem(storageKey) ?? '{}') ?? {};
  } catch {
    return {};
  }
}

export default function App() {
  const [apple, setApple] = useState(savedAppleHistory);
  const [android, setAndroid] = useState<History>({});
  const [source, setSource] = useState<Source>(() =>
    nativeHealth && !Object.keys(apple).length ? 'android' : 'apple');
  const [selectedDate, setSelectedDate] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const history = source === 'apple' ? apple : android;
  const dates = Object.keys(history).sort().reverse();
  const date = dates.includes(selectedDate) ? selectedDate : dates[0];
  const day = date ? history[date] : undefined;

  async function importZip(file: File) {
    setBusy(true);
    setMessage('Читаем архив Apple Health…');
    try {
      const imported = await importAppleHealth(file);
      setApple(imported);
      setSource('apple');
      setSelectedDate('');
      try {
        localStorage.setItem(storageKey, JSON.stringify(imported));
        setMessage(`Импортировано дней: ${Object.keys(imported).length}.`);
      } catch {
        setMessage('Данные доступны до закрытия приложения. На устройстве не удалось сохранить импорт.');
      }
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Не удалось импортировать архив.');
    } finally {
      setBusy(false);
    }
  }

  async function connect() {
    setBusy(true);
    setMessage('Читаем записи Health Connect…');
    // Remove the previous snapshot before checking whether permissions have changed.
    setAndroid({});
    setSource('android');
    setSelectedDate('');
    try {
      const { readings, granted, total } = await healthConnect.read();
      setAndroid(summarize(readings));
      if (!granted) setMessage('Разрешите чтение в настройках Health Connect и повторите попытку.');
      else if (!readings.length) setMessage('За последние 30 дней доступных записей нет.');
      else setMessage(`Данные обновлены. Разрешено типов записей: ${granted} из ${total}.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Не удалось прочитать Health Connect.');
    } finally {
      setBusy(false);
    }
  }

  function removeAppleHistory() {
    try {
      localStorage.removeItem(storageKey);
      setApple({});
      setMessage('Импорт Apple Health удалён с устройства.');
    } catch {
      setMessage('Не удалось удалить сохранённые данные.');
    }
  }

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-zinc-100">
      <main className="mx-auto max-w-md space-y-5 px-4 py-6">
        <header>
          <h1 className="font-display text-2xl font-bold">BioSeh</h1>
          <p className="text-sm text-zinc-400">Показатели здоровья</p>
        </header>

        <section className="space-y-3 rounded-2xl border border-zinc-800 bg-zinc-900 p-4">
          <h2 className="font-semibold">Источники данных</h2>
          <div className="grid gap-2">
            {nativeHealth && (
              <button type="button" disabled={busy} onClick={() => void connect()}
                className="rounded-xl bg-sky-400 px-3 py-2 font-semibold text-zinc-950 disabled:opacity-50">
                Подключить или обновить Health Connect
              </button>
            )}
            <label className="grid gap-1 text-sm">
              Импортировать ZIP из Apple Health
              <input type="file" accept=".zip,application/zip,application/x-zip-compressed" disabled={busy}
                className="w-full text-sm text-zinc-400 file:mr-2 file:rounded-lg file:border-0 file:bg-zinc-700 file:px-3 file:py-2 file:text-white"
                onChange={event => {
                  const file = event.currentTarget.files?.[0];
                  event.currentTarget.value = '';
                  if (file) void importZip(file);
                }}
              />
            </label>
          </div>
          {message && <p role="status" className="text-sm text-zinc-300">{message}</p>}
        </section>

        <section className="space-y-4">
          <div className="flex flex-wrap items-end gap-3">
            <label className="grid gap-1 text-sm">
              Источник
              <select value={source} disabled={busy} className="rounded-lg bg-zinc-800 p-2"
                onChange={event => { setSource(event.target.value as Source); setSelectedDate(''); setMessage(''); }}>
                <option value="apple">Apple Health</option>
                {nativeHealth && <option value="android">Health Connect</option>}
              </select>
            </label>
            {!!dates.length && (
              <label className="grid gap-1 text-sm">
                Дата
                <select value={date} onChange={event => setSelectedDate(event.target.value)}
                  className="rounded-lg bg-zinc-800 p-2">
                  {dates.map(key => <option key={key}>{key}</option>)}
                </select>
              </label>
            )}
          </div>

          {!day ? (
            <p className="rounded-2xl border border-zinc-800 p-4 text-sm text-zinc-400">
              {source === 'apple' ? 'Выберите ZIP-архив, чтобы увидеть данные Apple Health.' : 'Подключите Health Connect, чтобы загрузить данные.'}
            </p>
          ) : (
            <>
              <dl className="grid grid-cols-2 gap-2">
                {(Object.keys(labels) as Kind[]).map(kind => {
                  const value = day.values[kind];
                  return value === undefined ? null : (
                    <div key={kind} className="rounded-xl border border-zinc-800 bg-zinc-900 p-3">
                      <dt className="text-sm text-zinc-400">{labels[kind][0]}</dt>
                      <dd className="text-lg font-semibold">{number.format(value)} <span className="text-xs">{labels[kind][1]}</span></dd>
                    </div>
                  );
                })}
              </dl>
              {!!day.workouts.length && (
                <ul className="divide-y divide-zinc-800 rounded-xl border border-zinc-800 px-3">
                  {day.workouts.map((workout, index) => (
                    <li key={index} className="flex justify-between gap-2 py-3 text-sm">
                      <span>{workout.label || 'Тренировка'}</span>
                      <span className="text-zinc-400">{time.format(workout.start)} · {number.format(((workout.end ?? workout.start) - workout.start) / 60000)} мин</span>
                    </li>
                  ))}
                </ul>
              )}
            </>
          )}
          {source === 'apple' && !!dates.length && (
            <button disabled={busy} type="button" onClick={removeAppleHistory} className="text-sm text-zinc-400 underline">
              Удалить импорт Apple Health
            </button>
          )}
        </section>
      </main>
    </div>
  );
}
