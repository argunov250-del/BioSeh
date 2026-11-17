import React, { useEffect, useState } from 'react';
import {
  Activity,
  Flame,
  Gauge,
  Heart,
  Pause,
  Play,
  Zap,
} from 'lucide-react';
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import {
  BaselineStats,
  CalculatedDayMetrics,
} from '../utils/physiologyMath';

interface StrainHeartRateTabProps {
  metrics: CalculatedDayMetrics;
  baseline: BaselineStats;
  onAddZoneMinutes: (zoneIndex: 1 | 2 | 3 | 4 | 5, minutes: number) => void;
}

interface LiveHrSample {
  time: string;
  bpm: number;
}

function getZoneFromBpm(bpm: number, maxHr = 190): {
  zone: number;
  name: string;
  color: string;
  pctRange: string;
} {
  const ratio = bpm / maxHr;
  if (ratio >= 0.9) {
    return { zone: 5, name: 'Зона 5 • Анаэробный пик (VO2 Max)', color: '#EF4444', pctRange: '90–100%' };
  }
  if (ratio >= 0.8) {
    return { zone: 4, name: 'Зона 4 • ПАНО (Порог)', color: '#F97316', pctRange: '80–90%' };
  }
  if (ratio >= 0.7) {
    return { zone: 3, name: 'Зона 3 • Аэробная мощность', color: '#22C55E', pctRange: '70–80%' };
  }
  if (ratio >= 0.6) {
    return { zone: 2, name: 'Зона 2 • Жиросжигание / База', color: '#0EA5E9', pctRange: '60–70%' };
  }
  return { zone: 1, name: 'Зона 1 • Разминка / Покой', color: '#6366F1', pctRange: '50–60%' };
}

export const StrainHeartRateTab: React.FC<StrainHeartRateTabProps> = ({
  metrics,
  baseline,
  onAddZoneMinutes,
}) => {
  const [isLiveRunning, setIsLiveRunning] = useState<boolean>(true);
  const [simIntensity, setSimIntensity] = useState<'rest' | 'zone2' | 'zone3' | 'zone4' | 'peak'>('zone3');
  const [currentBpm, setCurrentBpm] = useState<number>(144);
  const [liveHistory, setLiveHistory] = useState<LiveHrSample[]>(() => {
    const now = Date.now();
    return Array.from({ length: 24 }, (_, idx) => {
      const t = new Date(now - (23 - idx) * 1000);
      const timeStr = t.toLocaleTimeString('ru-RU', { minute: '2-digit', second: '2-digit' });
      return {
        time: timeStr,
        bpm: 138 + Math.round(Math.sin(idx * 0.5) * 6),
      };
    });
  });

  const targetAnchorBpm =
    simIntensity === 'rest'
      ? metrics.effectiveRhr + 12
      : simIntensity === 'zone2'
      ? 124
      : simIntensity === 'zone3'
      ? 145
      : simIntensity === 'zone4'
      ? 164
      : 181;

  const stepSample = () => {
    setCurrentBpm((prev) => {
      const drift = (targetAnchorBpm - prev) * 0.35;
      const jitter = (Math.random() - 0.48) * 4.2;
      const next = Math.max(48, Math.min(194, Math.round(prev + drift + jitter)));

      const timeStr = new Date().toLocaleTimeString('ru-RU', {
        minute: '2-digit',
        second: '2-digit',
      });

      setLiveHistory((hist) => [...hist.slice(-23), { time: timeStr, bpm: next }]);
      return next;
    });
  };

  useEffect(() => {
    if (!isLiveRunning) return;
    const timer = setInterval(stepSample, 1000);
    return () => clearInterval(timer);
  }, [isLiveRunning, simIntensity, targetAnchorBpm]);

  const currentZoneInfo = getZoneFromBpm(currentBpm, baseline.maxHr);

  const z = metrics.totalZones;
  const totalZoneMin = Math.max(
    1,
    z.zone1Minutes + z.zone2Minutes + z.zone3Minutes + z.zone4Minutes + z.zone5Minutes
  );

  const zoneRows = [
    {
      idx: 5 as const,
      label: 'Зона 5 (90–100% HRmax)',
      bpmRange: '171–190 уд/м',
      minutes: z.zone5Minutes,
      kcal: Math.round(z.zone5Minutes * 18.6),
      color: '#EF4444',
    },
    {
      idx: 4 as const,
      label: 'Зона 4 (80–90% HRmax)',
      bpmRange: '152–171 уд/м',
      minutes: z.zone4Minutes,
      kcal: Math.round(z.zone4Minutes * 14.8),
      color: '#F97316',
    },
    {
      idx: 3 as const,
      label: 'Зона 3 (70–80% HRmax)',
      bpmRange: '133–152 уд/м',
      minutes: z.zone3Minutes,
      kcal: Math.round(z.zone3Minutes * 11.4),
      color: '#22C55E',
    },
    {
      idx: 2 as const,
      label: 'Зона 2 (60–70% HRmax)',
      bpmRange: '114–133 уд/м',
      minutes: z.zone2Minutes,
      kcal: Math.round(z.zone2Minutes * 8.2),
      color: '#0EA5E9',
    },
    {
      idx: 1 as const,
      label: 'Зона 1 (50–60% HRmax)',
      bpmRange: '95–114 уд/м',
      minutes: z.zone1Minutes,
      kcal: Math.round(z.zone1Minutes * 5.5),
      color: '#6366F1',
    },
  ];

  const isTargetReached = metrics.dayStrain >= metrics.optimalStrainRange[0];

  return (
    <div className="space-y-4 pb-6">
      {/* 1. Live Heart Rate Monitor */}
      <section className="bg-[#1C1C1E] border border-[#2C2C2E] rounded-2xl p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Heart className="w-4 h-4 text-[#EF4444]" />
            <h2 className="text-xs font-semibold uppercase tracking-wider text-zinc-200">
              Живой монитор пульса (Live HR)
            </h2>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setIsLiveRunning(!isLiveRunning)}
              className="px-2.5 py-1 rounded-lg bg-[#121212] border border-[#2C2C2E] text-[11px] font-medium text-zinc-200 hover:border-zinc-600 flex items-center gap-1 cursor-pointer"
            >
              {isLiveRunning ? (
                <>
                  <Pause className="w-3 h-3 text-[#EAB308]" /> Пауза
                </>
              ) : (
                <>
                  <Play className="w-3 h-3 text-[#22C55E]" /> Пуск
                </>
              )}
            </button>
            <button
              type="button"
              onClick={stepSample}
              className="px-2.5 py-1 rounded-lg bg-[#121212] border border-[#2C2C2E] text-[11px] font-medium text-zinc-300 hover:border-zinc-600 cursor-pointer"
            >
              +1 сек
            </button>
          </div>
        </div>

        {/* Current BPM & Active Zone Readout */}
        <div className="bg-[#121212] border border-[#2C2C2E] rounded-xl p-3 mb-3 flex items-center justify-between">
          <div>
            <div className="text-[11px] text-zinc-400">Текущая пульсовая зона</div>
            <div
              className="text-xs font-bold mt-0.5"
              style={{ color: currentZoneInfo.color }}
            >
              {currentZoneInfo.name}
            </div>
            <div className="text-[11px] text-zinc-500 font-mono-num mt-0.5">
              {Math.round((currentBpm / baseline.maxHr) * 100)}% от HRmax ({baseline.maxHr} уд/м)
            </div>
          </div>

          <div className="text-right">
            <div className="font-display text-4xl font-bold text-white tabular-nums leading-none">
              {currentBpm}
            </div>
            <span className="text-[10px] uppercase tracking-wider text-zinc-400">
              уд/мин (BPM)
            </span>
          </div>
        </div>

        {/* Intensity Simulation Mode Selector */}
        <div className="grid grid-cols-5 gap-1 mb-3">
          {[
            { id: 'rest', label: 'Покой' },
            { id: 'zone2', label: 'Зона 2' },
            { id: 'zone3', label: 'Зона 3' },
            { id: 'zone4', label: 'Зона 4' },
            { id: 'peak', label: 'Пик Z5' },
          ].map((mode) => (
            <button
              key={mode.id}
              type="button"
              onClick={() => setSimIntensity(mode.id as typeof simIntensity)}
              className={`py-1.5 rounded-lg text-[11px] font-semibold transition-colors cursor-pointer ${
                simIntensity === mode.id
                  ? 'bg-[#0EA5E9] text-white'
                  : 'bg-[#121212] text-zinc-400 border border-[#2C2C2E] hover:text-white'
              }`}
            >
              {mode.label}
            </button>
          ))}
        </div>

        {/* Real-time Area Chart */}
        <div className="h-36 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={liveHistory} margin={{ top: 5, right: 6, left: -26, bottom: 0 }}>
              <defs>
                <linearGradient id="hrLiveGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={currentZoneInfo.color} stopOpacity={0.45} />
                  <stop offset="95%" stopColor={currentZoneInfo.color} stopOpacity={0.0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#2C2C2E" vertical={false} />
              <XAxis
                dataKey="time"
                tick={{ fill: '#71717A', fontSize: 9 }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                domain={[50, 195]}
                tick={{ fill: '#71717A', fontSize: 10 }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#121212',
                  border: '1px solid #2C2C2E',
                  borderRadius: '8px',
                  fontSize: '11px',
                }}
                formatter={(val) => [`${val ?? 0} уд/мин`, 'Пульс']}
              />
              <Area
                type="monotone"
                dataKey="bpm"
                stroke={currentZoneInfo.color}
                strokeWidth={2.5}
                fill="url(#hrLiveGrad)"
                isAnimationActive={false}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </section>

      {/* 2. Strain Coach (Workout Calculator) */}
      <section className="bg-[#1C1C1E] border border-[#2C2C2E] rounded-2xl p-4">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Gauge className="w-4 h-4 text-[#0EA5E9]" />
            <h2 className="text-xs font-semibold uppercase tracking-wider text-zinc-200">
              Калькулятор тренировки (Strain Coach)
            </h2>
          </div>
          <span className="font-mono-num text-xs font-bold text-[#0EA5E9]">
            {metrics.dayStrain.toFixed(1)} / {metrics.optimalStrainTarget.toFixed(1)}
          </span>
        </div>

        {/* Logarithmic Strain Progress Bar with Target Range */}
        <div className="space-y-1.5 mb-3">
          <div className="relative h-3 w-full bg-[#121212] rounded-full overflow-hidden border border-[#2C2C2E]">
            {/* Optimal target bracket highlight */}
            <div
              className="absolute top-0 bottom-0 bg-white/15 border-x border-white/40"
              style={{
                left: `${(metrics.optimalStrainRange[0] / 21) * 100}%`,
                width: `${
                  ((metrics.optimalStrainRange[1] - metrics.optimalStrainRange[0]) / 21) * 100
                }%`,
              }}
              title="Оптимальный диапазон Strain"
            />
            <div
              className="h-full bg-[#0EA5E9] rounded-full transition-all duration-500"
              style={{ width: `${Math.min(100, (metrics.dayStrain / 21) * 100)}%` }}
            />
          </div>
          <div className="flex justify-between text-[10px] text-zinc-500 font-mono-num">
            <span>0.0</span>
            <span>Легкая (10.0)</span>
            <span className="text-zinc-300">
              Цель: {metrics.optimalStrainRange[0].toFixed(1)}–{metrics.optimalStrainRange[1].toFixed(1)}
            </span>
            <span>Макс 21.0</span>
          </div>
        </div>

        {isTargetReached ? (
          <div className="bg-[#121212] border border-[#22C55E]/40 rounded-xl p-3 text-xs text-zinc-200">
            <strong className="text-[#22C55E] block mb-0.5">
              Целевой коридор Strain достигнут ({metrics.dayStrain.toFixed(1)})
            </strong>
            Вы выполнили оптимальный объем кардионагрузки для текущего уровня восстановления ({metrics.recoveryScore}%). Дальнейшая работа в Зонах 4–5 переведет день в статус сверхразвивающей нагрузки (Overreaching).
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-2.5">
            <div className="bg-[#121212] border border-[#2C2C2E] rounded-xl p-3 flex flex-col justify-between">
              <div>
                <div className="text-[11px] text-zinc-400">Через аэробную Зону 3</div>
                <div className="font-mono-num text-xl font-bold text-[#22C55E] mt-1">
                  +{metrics.minutesNeededZone3} мин
                </div>
                <div className="text-[10px] text-zinc-500 mt-0.5">
                  Пульс 133–152 уд/мин
                </div>
              </div>
              <button
                type="button"
                onClick={() => onAddZoneMinutes(3, 10)}
                className="mt-2.5 w-full py-1.5 rounded-lg bg-[#22C55E]/15 hover:bg-[#22C55E]/25 border border-[#22C55E]/40 text-[#22C55E] text-[11px] font-semibold transition-colors cursor-pointer"
              >
                +10 мин в Зону 3
              </button>
            </div>

            <div className="bg-[#121212] border border-[#2C2C2E] rounded-xl p-3 flex flex-col justify-between">
              <div>
                <div className="text-[11px] text-zinc-400">Через пороговую Зону 4</div>
                <div className="font-mono-num text-xl font-bold text-[#F97316] mt-1">
                  +{metrics.minutesNeededZone4} мин
                </div>
                <div className="text-[10px] text-zinc-500 mt-0.5">
                  Пульс 152–171 уд/мин
                </div>
              </div>
              <button
                type="button"
                onClick={() => onAddZoneMinutes(4, 10)}
                className="mt-2.5 w-full py-1.5 rounded-lg bg-[#F97316]/15 hover:bg-[#F97316]/25 border border-[#F97316]/40 text-[#F97316] text-[11px] font-semibold transition-colors cursor-pointer"
              >
                +10 мин в Зону 4
              </button>
            </div>
          </div>
        )}
      </section>

      {/* 3. Heart Rate Zones Breakdown (Zones 1-5) */}
      <section className="bg-[#1C1C1E] border border-[#2C2C2E] rounded-2xl p-4">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h2 className="text-xs font-semibold uppercase tracking-wider text-zinc-200">
              Распределение по пульсовым зонам
            </h2>
            <p className="text-[11px] text-zinc-500 mt-0.5">
              Всего в зонах: {metrics.totalActiveMinutes} мин • Импульс {metrics.cardioImpulseLoad} ед.
            </p>
          </div>
          <div className="flex items-center gap-1 text-xs font-mono-num text-orange-400">
            <Flame className="w-3.5 h-3.5" />
            <span>{metrics.totalCalories} ккал</span>
          </div>
        </div>

        <div className="space-y-3">
          {zoneRows.map((row) => {
            const pct = Math.round((row.minutes / totalZoneMin) * 100);
            return (
              <div
                key={row.idx}
                className="bg-[#121212] border border-[#2C2C2E] rounded-xl p-2.5"
              >
                <div className="flex items-center justify-between text-xs mb-1">
                  <div className="flex items-center gap-2">
                    <span
                      className="w-2.5 h-2.5 rounded-sm shrink-0"
                      style={{ backgroundColor: row.color }}
                    />
                    <span className="font-semibold text-white">{row.label}</span>
                  </div>
                  <div className="font-mono-num text-xs text-zinc-300">
                    <strong>{row.minutes} мин</strong> ({pct}%) • {row.kcal} ккал
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <div className="h-2 flex-1 bg-zinc-800 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{
                        width: `${Math.min(100, pct)}%`,
                        backgroundColor: row.color,
                      }}
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => onAddZoneMinutes(row.idx, 5)}
                    className="px-2 py-0.5 rounded bg-zinc-800 hover:bg-zinc-700 text-[10px] font-mono-num text-zinc-200 cursor-pointer shrink-0"
                  >
                    +5м
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
};
