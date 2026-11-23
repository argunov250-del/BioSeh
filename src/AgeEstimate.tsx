import { useState } from 'react';

type Factor = [string, number | undefined, string];

export function profileAge(factors: Factor[], age: number, sex: string, weight: number, days: number) {
  if (days < 21 || !Number.isInteger(age) || age < 18 || age > 100 ||
      !['m','f'].includes(sex) || weight <= 0 || !Number.isFinite(weight)) return;
  const v = factors.map(([,value]) => value);
  if (v.length !== 9 || v.some(n => n === undefined || !Number.isFinite(n))) return;
  const [consistency,sleep,steps,low,high,strength,vo2,rest,lean] = v as number[];
  if (lean > weight || lean <= 0) return;
  const male = sex === 'm';
  // Interpolate between the two group profiles from WHOOP Healthspan Table 2.
  // Each domain gets one vote; correlated inputs within it share that vote.
  const position = (x: number, low: number, high: number) => Math.max(0,Math.min(1,(x-low)/(high-low)));
  const sleepDomain = (position(consistency,65,male?67:68) + position(sleep,381,male?420:438))/2;
  const movement = (position(steps,male?5200:5000,male?10900:11500) +
    position(7*low,male?69:46,male?141:124) + position(7*strength,0,male?46:56))/3;
  // Table 2 provides no population reference for high-zone time. Report it as coverage only.
  if (high < 0) return;
  const fitness = (position(vo2,male?42.4:30.2,male?46.8:40) + position(rest,male?67:72,male?58:63))/2;
  const composition = position(100*lean/weight,male?73.9:62.2,male?81:73);
  const progress = (sleepDomain + movement + fitness + composition)/4;
  const populationOffset = male?6:7.5;
  return age + populationOffset + (-1.6-populationOffset)*progress;
}

export function AgeEstimate({factors,days}: {factors: Factor[];days:number}) {
  const [age,setAge] = useState('');
  const [sex,setSex] = useState('');
  const [weight,setWeight] = useState('');
  const estimate = profileAge(factors,Number(age),sex,Number(weight),days);
  return <details className="health-age"><summary>Возраст в годах · экспериментальная модель</summary>
    <label>Возраст на выбранную дату <input type="number" min="18" max="100" value={age} onChange={e=>setAge(e.target.value)}/></label>
    <label>Референсная группа <select value={sex} onChange={e=>setSex(e.target.value)}>
      <option value="">Выбери группу</option><option value="m">Мужчины</option><option value="f">Женщины</option></select></label>
    <label>Масса тела, кг <input type="number" min="1" step="0.1" value={weight} onChange={e=>setWeight(e.target.value)}/></label>
    <p>{estimate===undefined ? 'Для оценки нужны профиль, минимум 21 день истории и девять доступных показателей.' :
      'Сценарный возраст: '+estimate.toLocaleString('ru',{maximumFractionDigits:1})+' лет.'}</p>
    <p>Приближение по двум групповым профилям 30-летних из таблицы 2 WHOOP. Для других возрастов поправка переносится без возрастной калибровки. Сон, активность, кардиоформа и состав тела получают по одному общему весу. Для зон 4–5 у популяционной группы нет значения сравнения. Клиническая точность этой интерполяции не проверена.</p>
  </details>;
}
