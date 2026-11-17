import React, { useState } from 'react';
import {
  AlarmClock,
  BedDouble,
  Moon,
  Sparkles,
  TrendingUp,
} from 'lucide-react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import {
  BaselineStats,
  CalculatedDayMetrics,
  SleepStageType,
  WeeklyTrendPoint,
  formatHm,
  formatMinutesRus,
  getRecoveryHex,
} from '../utils/physiologyMath';
import { buildSleepHypnogram } from '../data/initialBiometrics';

interface SleepRecoveryTabProps {
  metrics: CalculatedDayMetrics;
  baseline: BaselineStats;
  weeklyTrend: WeeklyTrendPoint[];
  onWakeTimeChange: (newWakeTime: string) => void;
}

const STAGE_META: Record<
  SleepStageType,
  { name: string; sub: string; color: string; desc: string }
> = {
  awake: {
    name: 'Бодрствование (Awake)',
    sub: 'Микропробуждения в постели',
    color: '#EF4444',
    desc: 'Кратковременные пробуждения между циклами сна — нормальная часть ночной архитектуры.',
  },
  rem: {
    name: 'Быстрый сон (REM)',
    sub: 'Когнитивное восстановление ЦНС',
    color: '#38BDF8',
    desc: 'Фаза консолидации памяти, моторного обучения и восстановления центральной нервной системы.',
  },
  light: {
    name: 'Легкий сон (Light)',
    sub: 'Базовая переходная стадия',
    color: '#6366F1',
    desc: 'Поддерживает базовый метаболический отдых и связывает глубокие фазы сна.',
  },
  sws: {
    name: 'Глубокий сон (Deep / SWS)',
    sub: 'Мышечный и гормональный синтез',
    color: '#8B5CF6',
    desc: 'Медленноволновой сон: пик выработки соматотропина, регенерация мышечных волокон и связок.',
  },
};

export const SleepRecoveryTab: React.FC<SleepRecoveryTabProps> = ({
  metrics,
  baseline,
  weeklyTrend,
  onWakeTimeChange,
}) => {
  const [selectedStage, setSelectedStage] = useState<SleepStageType | null>(null);
  const [trendMode, setTrendMode] = useState<'recovery' | 'hrv'>('recovery');

  const stages = metrics.effectiveSleepStages;
  const totalInBedMin =
    stages.awakeMinutes +
    stages.lightMinutes +
    stages.remMinutes +
    stages.swsMinutes;

  const stageRows: {
    key: SleepStageType;
    minutes: number;
    pct: number;
  }[] = [
    {
      key: 'awake',
      minutes: stages.awakeMinutes,
      pct: Math.round((stages.awakeMinutes / Math.max(1, totalInBedMin)) * 100),
    },
    {
      key: 'rem',
      minutes: stages.remMinutes,
      pct: Math.round((stages.remMinutes / Math.max(1, totalInBedMin)) * 100),
    },
    {
      key: 'light',
      minutes: stages.lightMinutes,
      pct: Math.round((stages.lightMinutes / Math.max(1, totalInBedMin)) * 100),
    },
    {
      key: 'sws',
      minutes: stages.swsMinutes,
      pct: Math.round((stages.swsMinutes / Math.max(1, totalInBedMin)) * 100),
    },
  ];

  const hypnogram = buildSleepHypnogram(
    stages.awakeMinutes,
    stages.lightMinutes,
    stages.remMinutes,
    stages.swsMinutes,
    metrics.effectiveRhr
  );

  return (
    <div className="space-y-4 pb-6">
      {/* 1. Time in Bed vs Actual Sleep vs Needed */}
      <section className="bg-[#1C1C1E] border border-[#2C2C2E] rounded-2xl p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Moon className="w-4 h-4 text-[#38BDF8]" />
            <h2 className="text-xs font-semibold uppercase tracking-wider text-zinc-200">
              Детализация сна (Sleep Performance)
            </h2>
          </div>
          <span className="font-display text-xl font-bold text-[#38BDF8] tabular-nums">
            {metrics.sleepPerformance}%
          </span>
        </div>

        <div className="grid grid-cols-3 gap-2 mb-3">
          <div className="bg-[#121212] border border-[#2C2C2E] rounded-xl p-2.5">
            <div className="text-[10px] text-zinc-400">Фактический сон</div>
            <div className="font-mono-num text-sm font-bold text-white mt-1">
              {formatHm(metrics.actualSleepHours)}
            </div>
            <div className="text-[10px] text-[#38BDF8] mt-0.5">
              КПД {metrics.sleepEfficiencyPct}%
            </div>
          </div>

          <div className="bg-[#121212] border border-[#2C2C2E] rounded-xl p-2.5">
            <div className="text-[10px] text-zinc-400">Время в постели</div>
            <div className="font-mono-num text-sm font-bold text-white mt-1">
              {formatHm(metrics.timeInBedHours)}
            </div>
            <div className="text-[10px] text-zinc-500 mt-0.5">
              Time in Bed
            </div>
          </div>

          <div className="bg-[#121212] border border-[#2C2C2E] rounded-xl p-2.5">
            <div className="text-[10px] text-zinc-400">Потребность</div>
            <div className="font-mono-num text-sm font-bold text-white mt-1">
              {formatHm(metrics.sleepNeedHours)}
            </div>
            <div className="text-[10px] text-zinc-500 mt-0.5">
              База 8ч + Strain
            </div>
          </div>
        </div>

        {/* Comparison Bar: Sleep vs Sleep Need */}
        <div className="space-y-1.5">
          <div className="flex justify-between text-[11px] text-zinc-400">
            <span>Прогресс закрытия потребности во сне</span>
            <span className="font-mono-num text-white">
              {metrics.actualSleepHours.toFixed(1)} ч / {metrics.sleepNeedHours.toFixed(1)} ч
            </span>
          </div>
          <div className="h-2.5 w-full bg-[#121212] rounded-full overflow-hidden border border-[#2C2C2E]">
            <div
              className="h-full bg-gradient-to-r from-[#6366F1] to-[#38BDF8] rounded-full transition-all duration-500"
              style={{ width: `${Math.min(100, metrics.sleepPerformance)}%` }}
            />
          </div>
        </div>
      </section>

      {/* 2. Interactive Sleep Stages & Hypnogram */}
      <section className="bg-[#1C1C1E] border border-[#2C2C2E] rounded-2xl p-4">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h2 className="text-xs font-semibold uppercase tracking-wider text-zinc-200">
              Стадии сна (Awake • REM • Light • Deep SWS)
            </h2>
            <p className="text-[11px] text-zinc-500 mt-0.5">
              Нажмите на стадию для просмотра физиологической роли
            </p>
          </div>
          <span className="text-[11px] font-mono-num text-[#38BDF8]">
            Восст. {metrics.restorativePct}%
          </span>
        </div>

        {/* Visual Hypnogram Timeline Bar */}
        <div className="bg-[#121212] border border-[#2C2C2E] rounded-xl p-3 mb-3">
          <div className="text-[10px] text-zinc-500 uppercase tracking-wider mb-2 flex justify-between">
            <span>23:00 (Отбой)</span>
            <span>Ночная гипнограмма циклов</span>
            <span>{metrics.targetWakeTime} (Подъем)</span>
          </div>
          <div className="flex items-end gap-1 h-16">
            {hypnogram.map((blk, i) => {
              const meta = STAGE_META[blk.stage];
              const heightPct =
                blk.stage === 'awake'
                  ? '95%'
                  : blk.stage === 'rem'
                  ? '72%'
                  : blk.stage === 'light'
                  ? '50%'
                  : '32%';
              const isSelected = selectedStage === blk.stage;
              return (
                <button
                  key={i}
                  type="button"
                  onClick={() =>
                    setSelectedStage(selectedStage === blk.stage ? null : blk.stage)
                  }
                  title={`${blk.timeLabel} • ${meta.name} (${blk.durationMin} мин)`}
                  className={`flex-1 rounded-t-md transition-opacity cursor-pointer ${
                    selectedStage && !isSelected ? 'opacity-35' : 'opacity-100'
                  }`}
                  style={{
                    height: heightPct,
                    backgroundColor: meta.color,
                  }}
                />
              );
            })}
          </div>
        </div>

        {/* 4 Stage Interactive Bars */}
        <div className="space-y-2">
          {stageRows.map((row) => {
            const meta = STAGE_META[row.key];
            const isSelected = selectedStage === row.key;
            return (
              <button
                key={row.key}
                type="button"
                onClick={() =>
                  setSelectedStage(isSelected ? null : row.key)
                }
                className={`w-full text-left p-2.5 rounded-xl border transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-[#121212] border-zinc-500'
                    : 'bg-[#121212]/70 border-[#2C2C2E] hover:border-zinc-700'
                }`}
              >
                <div className="flex items-center justify-between text-xs mb-1.5">
                  <div className="flex items-center gap-2">
                    <span
                      className="w-2.5 h-2.5 rounded-sm shrink-0"
                      style={{ backgroundColor: meta.color }}
                    />
                    <span className="font-semibold text-white">{meta.name}</span>
                  </div>
                  <div className="font-mono-num text-xs text-zinc-300">
                    <strong>{formatMinutesRus(row.minutes)}</strong> ({row.pct}%)
                  </div>
                </div>

                <div className="h-1.5 w-full bg-zinc-800 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{
                      width: `${Math.min(100, row.pct * 1.6)}%`,
                      backgroundColor: meta.color,
                    }}
                  />
                </div>

                {isSelected && (
                  <p className="mt-2 text-[11px] text-zinc-400 leading-relaxed">
                    {meta.desc}
                  </p>
                )}
              </button>
            );
          })}
        </div>
      </section>

      {/* 3. Sleep Debt & Sleep Planner */}
      <section className="bg-[#1C1C1E] border border-[#2C2C2E] rounded-2xl p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <AlarmClock className="w-4 h-4 text-[#6366F1]" />
            <h2 className="text-xs font-semibold uppercase tracking-wider text-zinc-200">
              Планировщик сна (Sleep Planner)
            </h2>
          </div>
          <span className="text-xs font-mono-num text-[#EAB308]">
            Долг сна: {formatHm(metrics.sleepDebtHours)}
          </span>
        </div>

        <div className="bg-[#121212] border border-[#2C2C2E] rounded-xl p-3.5 space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-[11px] text-zinc-400">Рекомендуемый отбой сегодня</div>
              <div className="font-display text-2xl font-bold text-[#38BDF8] tabular-nums">
                {metrics.recommendedBedtime}
              </div>
            </div>

            <div className="text-right">
              <label className="block text-[11px] text-zinc-400 mb-1">
                Желаемый подъем завтра
              </label>
              <input
                type="time"
                value={metrics.targetWakeTime}
                onChange={(e) => onWakeTimeChange(e.target.value)}
                className="bg-[#1C1C1E] border border-[#2C2C2E] rounded-lg px-2.5 py-1 text-xs font-mono-num text-white focus:outline-none focus:border-[#38BDF8]"
              />
            </div>
          </div>

          <div className="pt-2.5 border-t border-[#2C2C2E] flex items-start gap-2 text-xs text-zinc-300">
            <BedDouble className="w-4 h-4 text-[#38BDF8] shrink-0 mt-0.5" />
            <span>
              Ложитесь в <strong className="text-white font-mono-num">{metrics.recommendedBedtime}</strong>, чтобы проснуться в{' '}
              <strong className="text-white font-mono-num">{metrics.targetWakeTime}</strong> на 100% восстановленным (с учетом базовой нормы 8.0 ч и накопленного долга сна {formatHm(metrics.sleepDebtHours)}).
            </span>
          </div>
        </div>
      </section>

      {/* 4. 7-Day Trend Chart (Recovery & HRV) */}
      <section className="bg-[#1C1C1E] border border-[#2C2C2E] rounded-2xl p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-[#22C55E]" />
            <h2 className="text-xs font-semibold uppercase tracking-wider text-zinc-200">
              Динамика за 7 дней
            </h2>
          </div>

          <div className="flex items-center gap-1 bg-[#121212] p-1 rounded-lg border border-[#2C2C2E]">
            <button
              type="button"
              onClick={() => setTrendMode('recovery')}
              className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition-colors cursor-pointer ${
                trendMode === 'recovery'
                  ? 'bg-[#2C2C2E] text-white'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              Recovery %
            </button>
            <button
              type="button"
              onClick={() => setTrendMode('hrv')}
              className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition-colors cursor-pointer ${
                trendMode === 'hrv'
                  ? 'bg-[#2C2C2E] text-white'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              HRV (мс)
            </button>
          </div>
        </div>

        <div className="h-48 w-full">
          <ResponsiveContainer width="100%" height="100%">
            {trendMode === 'recovery' ? (
              <BarChart data={weeklyTrend} margin={{ top: 10, right: 6, left: -24, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#2C2C2E" vertical={false} />
                <XAxis
                  dataKey="dayShort"
                  tick={{ fill: '#A1A1AA', fontSize: 11 }}
                  axisLine={{ stroke: '#2C2C2E' }}
                  tickLine={false}
                />
                <YAxis
                  domain={[0, 100]}
                  tick={{ fill: '#71717A', fontSize: 10 }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip
                  cursor={{ fill: 'rgba(255,255,255,0.04)' }}
                  contentStyle={{
                    backgroundColor: '#121212',
                    border: '1px solid #2C2C2E',
                    borderRadius: '10px',
                    fontSize: '12px',
                    color: '#fff',
                  }}
                  formatter={(value) => [`${value ?? 0}%`, 'Recovery']}
                />
                <Bar dataKey="recovery" radius={[6, 6, 0, 0]}>
                  {weeklyTrend.map((entry, idx) => (
                    <Cell key={idx} fill={getRecoveryHex(entry.recovery)} />
                  ))}
                </Bar>
              </BarChart>
            ) : (
              <LineChart data={weeklyTrend} margin={{ top: 10, right: 10, left: -24, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#2C2C2E" vertical={false} />
                <XAxis
                  dataKey="dayShort"
                  tick={{ fill: '#A1A1AA', fontSize: 11 }}
                  axisLine={{ stroke: '#2C2C2E' }}
                  tickLine={false}
                />
                <YAxis
                  domain={[20, 110]}
                  tick={{ fill: '#71717A', fontSize: 10 }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#121212',
                    border: '1px solid #2C2C2E',
                    borderRadius: '10px',
                    fontSize: '12px',
                    color: '#fff',
                  }}
                  formatter={(value) => [`${value ?? 0} мс`, 'ВСР (HRV)']}
                />
                <ReferenceLine
                  y={baseline.hrv}
                  stroke="#71717A"
                  strokeDasharray="4 4"
                  label={{
                    value: `Baseline ${baseline.hrv} мс`,
                    fill: '#A1A1AA',
                    fontSize: 10,
                    position: 'insideTopRight',
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="hrv"
                  stroke="#38BDF8"
                  strokeWidth={2.5}
                  dot={{ r: 4, fill: '#38BDF8', strokeWidth: 0 }}
                  activeDot={{ r: 6, fill: '#fff' }}
                />
              </LineChart>
            )}
          </ResponsiveContainer>
        </div>

        <div className="mt-2 flex items-center justify-between text-[11px] text-zinc-500">
          <span className="flex items-center gap-1">
            <Sparkles className="w-3.5 h-3.5 text-[#38BDF8]" />
            30-дневный Baseline ВСР: {baseline.hrv} мс • ЧСС покоя: {baseline.rhr} уд/мин
          </span>
        </div>
      </section>
    </div>
  );
};
