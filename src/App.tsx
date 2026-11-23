import { useState } from 'react';
import { Activity, ArrowUpRight, BarChart3, Database, Moon, RefreshCw, Upload } from 'lucide-react';
import { importAppleHealth } from './data/appleHealth';
import { dateKey, healthConnect, labels, nativeHealth, summarize, type History, type Kind } from './data/health';
import { ANDROID_HISTORY_KEY, APPLE_HISTORY_KEY, HISTORY_MONTHS, historyStart, loadHistory, mergeHistory, retainHistory } from './data/history';
import './dashboard.css';

type Source = 'apple' | 'android';
type Screen = 'night' | 'trends' | 'sources';

const sourceNames = { apple: 'Apple Health', android: 'Health Connect' };
const nav = [
  { id: 'night', label: 'Ночь', icon: Moon },
  { id: 'trends', label: 'Тренды', icon: BarChart3 },
  { id: 'sources', label: 'Данные', icon: Database },
] as const;

const number = new Intl.NumberFormat('ru', { maximumFractionDigits: 1 });
const time = new Intl.DateTimeFormat('ru', { hour: '2-digit', minute: '2-digit' });
const longDate = new Intl.DateTimeFormat('ru', { day: 'numeric', month: 'long', year: 'numeric' });
const shortDate = new Intl.DateTimeFormat('ru', { day: 'numeric', month: 'short' });
const weekday = new Intl.DateTimeFormat('ru', { weekday: 'short' });
const pickerDate = new Intl.DateTimeFormat('ru', { day: '2-digit', month: '2-digit', year: '2-digit' });
const parseDate = (date: string) => new Date(date + 'T12:00:00');
const duration = (minutes: number) => {
  const rounded = Math.round(minutes);
  const hours = Math.floor(rounded / 60);
  return hours ? hours + ' ч ' + (rounded % 60) + ' мин' : rounded + ' мин';
};

function WeekChart({ history, date, kind, onDate }: {
  history: History; date: string; kind: Kind; onDate: (date: string) => void;
}) {
  const days = Array.from({ length: 7 }, (_, index) => {
    const day = parseDate(date);
    day.setDate(day.getDate() + index - 6);
    const key = dateKey(day.getTime());
    return { day, key, value: history[key]?.values[kind] };
  });
  const max = Math.max(1, ...days.map(({ value }) => value ?? 0));
  return (
    <div className="health-week" aria-label="Семь дней до выбранной даты">
      {days.map(({ day, key, value }, index) => {
        const display = value === undefined ? 'нет записи' : kind === 'sleep' || kind === 'workout'
          ? duration(value) : number.format(value) + ' ' + labels[kind][1];
        return (
          <button type="button" key={key} disabled={!history[key]} aria-current={key === date ? 'date' : undefined}
            aria-label={shortDate.format(day) + ', ' + display} title={shortDate.format(day) + ', ' + display}
            onClick={() => onDate(key)} className="health-week-day">
            <span className="health-bar-track">
              {value === undefined ? <span className="health-bar-empty" /> :
                <span className="health-bar-fill" style={{ height: Math.max(5, value / max * 100) + '%', animationDelay: index * 35 + 'ms' }} />}
            </span>
            <span>{weekday.format(day)}</span>
          </button>
        );
      })}
    </div>
  );
}

function MonthChart({ history, kind, months }: { history: History; kind: Kind; months: number }) {
  const today = new Date();
  const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
  const cutoff = dateKey(historyStart(today, months).getTime());
  const buckets = new Map<string, number[]>();
  for (const [date, day] of Object.entries(history)) {
    const value = day.values[kind];
    if (date < cutoff || value === undefined) continue;
    const month = date.slice(0, 7);
    const values = buckets.get(month) ?? [];
    values.push(value);
    buckets.set(month, values);
  }
  const monthsShown = Array.from({ length: months + 1 }, (_, index) => {
    const month = new Date(firstDay.getFullYear(), firstDay.getMonth() - months + index, 1);
    const values = buckets.get(dateKey(month.getTime()).slice(0, 7));
    return { month, value: values?.length ? values.reduce((a, b) => a + b, 0) / values.length : undefined };
  });
  const max = Math.max(1, ...monthsShown.map(({ value }) => value ?? 0));
  return (
    <div className="health-months" style={{ gridTemplateColumns: 'repeat(' + monthsShown.length + ', minmax(0, 1fr))' }}>
      {monthsShown.map(({ month, value }, index) => {
        const short = new Intl.DateTimeFormat('ru', { month: 'short' }).format(month).replace('.', '');
        const full = new Intl.DateTimeFormat('ru', { month: 'long', year: 'numeric' }).format(month);
        const title = full + ', ' + (value === undefined ? 'нет записей' :
          kind === 'sleep' || kind === 'workout' ? duration(value) : number.format(value) + ' ' + labels[kind][1]);
        return (
          <div className="health-week-day" key={full} role="img" aria-label={title} title={title}>
            <span className="health-bar-track">
              {value === undefined ? <span className="health-bar-empty" /> :
                <span className="health-bar-fill" style={{ height: Math.max(5, value / max * 100) + '%' }} />}
            </span>
            <span aria-hidden="true">{index % 3 === 0 ? short : ' '}</span>
          </div>
        );
      })}
    </div>
  );
}

function Metric({ kind, value }: { kind: Kind; value?: number }) {
  const [label, unit] = labels[kind];
  return (
    <div className="health-metric">
      <dt>{label}</dt>
      <dd>{value === undefined ? '—' : number.format(value)}{value !== undefined && <small>{unit}</small>}</dd>
    </div>
  );
}

export default function App() {
  const [apple, setApple] = useState(() => loadHistory(APPLE_HISTORY_KEY));
  const [android, setAndroid] = useState(() => loadHistory(ANDROID_HISTORY_KEY));
  const [source, setSource] = useState<Source>(() => nativeHealth && (Object.keys(android).length || !Object.keys(apple).length) ? 'android' : 'apple');
  const [screen, setScreen] = useState<Screen>('night');
  const [selectedDate, setSelectedDate] = useState('');
  const [period, setPeriod] = useState<'week' | '12' | '18'>('week');
  const [trendKind, setTrendKind] = useState<Kind>('sleep');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const history = retainHistory(source === 'apple' ? apple : android);
  const dates = Object.keys(history).sort().reverse();
  const date = history[selectedDate] ? selectedDate : dates[0] ?? dateKey(Date.now());
  const weekEnd = dates[0] ?? dateKey(Date.now());
  const day = history[date];
  const sleep = day?.values.sleep;
  const hrv = source === 'apple' ? 'sdnn' : 'rmssd';

  function selectSource(next: Source) {
    setSource(next);
    setSelectedDate('');
  }

  function saveHistory(key: string, snapshot: History, status: string) {
    try {
      localStorage.setItem(key, JSON.stringify(snapshot));
      setMessage(status);
    } catch {
      setMessage('Новые записи доступны в текущем сеансе. Сохранить их на устройстве не удалось.');
    }
  }

  async function importZip(file: File) {
    setBusy(true);
    setMessage('Читаем архив Apple Health…');
    try {
      const imported = retainHistory(await importAppleHealth(file, percent =>
        setMessage('Читаем Apple Health… ' + percent + '%')));
      if (!Object.keys(imported).length) {
        setMessage('В архиве нет записей за последние 18 месяцев.');
        return;
      }
      const snapshot = mergeHistory(apple, imported);
      setApple(snapshot);
      selectSource('apple');
      saveHistory(APPLE_HISTORY_KEY, snapshot, 'Сохранено дней Apple Health: ' + Object.keys(snapshot).length + '.');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Не удалось читать архив Apple Health.');
    } finally {
      setBusy(false);
    }
  }

  async function connect() {
    setBusy(true);
    setMessage('Читаем записи Health Connect…');
    selectSource('android');
    try {
      const { readings, granted, total } = await healthConnect.read();
      if (!granted) {
        setMessage('Разрешите чтение в настройках Health Connect. На экране доступна сохранённая история.');
      } else if (!readings.length) {
        setMessage('За последние 30 дней новых данных для загрузки нет.');
      } else {
        const snapshot = mergeHistory(android, summarize(readings));
        setAndroid(snapshot);
        saveHistory(ANDROID_HISTORY_KEY, snapshot, 'Сводка обновлена. Доступно типов записей: ' + granted + ' из ' + total + '.');
      }
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Не удалось прочитать Health Connect.');
    } finally {
      setBusy(false);
    }
  }

  function clearHistory(target: Source) {
    try {
      localStorage.removeItem(target === 'apple' ? APPLE_HISTORY_KEY : ANDROID_HISTORY_KEY);
      if (target === 'apple') setApple({});
      else setAndroid({});
      setSelectedDate('');
      setMessage('Локальная история ' + sourceNames[target] + ' удалена.');
    } catch {
      setMessage('Не удалось удалить сохранённую историю.');
    }
  }

  const trendOptions: Kind[] = ['sleep', 'heart', 'resting', hrv, 'oxygen', 'respiratory', 'workout'];
  const selectedKind = trendOptions.includes(trendKind) ? trendKind : hrv;

  return (
    <div className="health-shell" data-screen={screen}>
      <div className="health-waves" aria-hidden="true"><i /><i /></div>
      <main className="health-main">
        <header className="health-header">
          <b><span className="health-logo"><Activity size={19} /></span> BioSeh</b>
          <button type="button" className="health-source-pill" onClick={() => setScreen('sources')}>
            {sourceNames[source]} <ArrowUpRight size={14} />
          </button>
        </header>

        <div className="health-screen" key={screen}>
          {screen !== 'sources' && (
            <div className="health-title">
              <div>
                <p>{screen === 'night' ? longDate.format(parseDate(date)) : 'История показателей'}</p>
                <h1>{screen === 'night' ? 'Сон и восстановление' : 'Тренды'}</h1>
              </div>
              {dates.length > 1 && (
                <select aria-label="Дата сводки" value={date} onChange={event => setSelectedDate(event.target.value)}>
                  {dates.map(key => <option value={key} key={key}>{pickerDate.format(parseDate(key))}</option>)}
                </select>
              )}
            </div>
          )}

          {screen === 'night' && (
            <>
              <section className="health-card health-hero">
                <span className="health-caption"><Moon size={17} /> Сон за ночь</span>
                <strong>{sleep === undefined ? '—' : duration(sleep)}</strong>
                {sleep === undefined && <p>За выбранную ночь нет записи сна.</p>}
              </section>
              <section className="health-card">
                <div className="health-card-head"><h2>Сон за неделю</h2><span>{shortDate.format(parseDate(weekEnd))}</span></div>
                <WeekChart history={history} date={weekEnd} kind="sleep" onDate={setSelectedDate} />
              </section>
              <section className="health-card">
                <div className="health-card-head"><h2>Показатели восстановления</h2></div>
                <dl className="health-metrics">
                  <Metric kind="resting" value={day?.values.resting} />
                  <Metric kind={hrv} value={day?.values[hrv]} />
                  <Metric kind="respiratory" value={day?.values.respiratory} />
                  <Metric kind="oxygen" value={day?.values.oxygen} />
                </dl>
              </section>
              {!dates.length && <button type="button" className="health-primary" onClick={() => setScreen('sources')}>Подключить источник</button>}
            </>
          )}

          {screen === 'trends' && (
            <>
              <section className="health-card">
                <div className="health-card-head">
                  <h2>{period === 'week' ? 'Дневной график' : 'Средние по месяцам'}</h2>
                  <select aria-label="Показатель графика" value={selectedKind} onChange={event => setTrendKind(event.target.value as Kind)}>
                    {trendOptions.map(kind => <option value={kind} key={kind}>{labels[kind][0]}</option>)}
                  </select>
                </div>
                <div className="health-period" aria-label="Период графика">
                  {([['week', '7 дней'], ['12', '12 мес.'], ['18', '18 мес.']] as const).map(([id, label]) => (
                    <button type="button" key={id} aria-pressed={period === id} onClick={() => setPeriod(id)}>{label}</button>
                  ))}
                </div>
                {period === 'week' ? <WeekChart key={selectedKind} history={history} date={date} kind={selectedKind} onDate={setSelectedDate} /> :
                  <MonthChart key={period + selectedKind} history={history} kind={selectedKind} months={Number(period)} />}
              </section>
              <section className="health-card">
                <div className="health-card-head"><h2>Тренировки за день</h2></div>
                {day?.workouts.length ? <ul className="health-workouts">
                  {day.workouts.map((workout, index) => <li key={index}><b>{workout.label || 'Тренировка'}</b><span>{time.format(workout.start)} · {duration(((workout.end ?? workout.start) - workout.start) / 60000)}</span></li>)}
                </ul> : <p>За выбранный день нет записей.</p>}
              </section>
            </>
          )}

          {screen === 'sources' && (
            <>
              <div className="health-title"><div><p>Локальная история</p><h1>Источники данных</h1></div></div>
              <section className="health-card health-source-card">
                <h2>Показать данные из</h2>
                <select aria-label="Источник данных" value={source} disabled={busy} onChange={event => selectSource(event.target.value as Source)}>
                  <option value="apple">Apple Health</option>
                  {nativeHealth && <option value="android">Health Connect</option>}
                </select>
                {nativeHealth && <button type="button" disabled={busy} className="health-primary" onClick={() => void connect()}><RefreshCw size={17} /> Обновить Health Connect</button>}
                <label className="health-upload">
                  <span><Upload size={17} /> Импорт ZIP из Apple Health</span>
                  <input type="file" accept=".zip,application/zip,application/x-zip-compressed" disabled={busy} onChange={event => {
                    const file = event.currentTarget.files?.[0];
                    event.currentTarget.value = '';
                    if (file) void importZip(file);
                  }} />
                </label>
                {message && <p role="status">{message}</p>}
              </section>
              <section className="health-card health-source-card">
                <h2>Хранение</h2>
                <p>BioSeh хранит дневные сводки и тренировки на устройстве {HISTORY_MONTHS} месяцев. История каждого источника хранится отдельно.</p>
                {!!dates.length && <button className="health-clear" type="button" disabled={busy} onClick={() => {
                  if (window.confirm('Удалить локальную историю ' + sourceNames[source] + '?')) clearHistory(source);
                }}>Удалить историю {sourceNames[source]}</button>}
              </section>
            </>
          )}
        </div>
      </main>

      <nav className="health-nav" aria-label="Разделы BioSeh">
        {nav.map(({ id, label, icon: Icon }) => <button key={id} type="button" aria-current={screen === id ? 'page' : undefined}
          onClick={() => setScreen(id)}><Icon size={20} strokeWidth={1.7} /><span>{label}</span></button>)}
      </nav>
    </div>
  );
}
