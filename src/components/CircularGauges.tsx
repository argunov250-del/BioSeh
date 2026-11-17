import React from 'react';
import { CalculatedDayMetrics } from '../utils/physiologyMath';

export type GaugeType = 'recovery' | 'strain' | 'sleep';

interface CircularGaugesProps {
  metrics: CalculatedDayMetrics;
  onSelectGauge: (gauge: GaugeType) => void;
}

export const CircularGauges: React.FC<CircularGaugesProps> = ({
  metrics,
  onSelectGauge,
}) => {
  const size = 104;
  const strokeWidth = 8.5;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;

  // 1. Recovery progress (0 - 100%)
  const recoveryPct = Math.max(0, Math.min(100, metrics.recoveryScore));
  const recoveryOffset = circumference - (recoveryPct / 100) * circumference;

  // 2. Strain progress (0.0 - 21.0) + Target bracket arc
  const strainPct = Math.max(0, Math.min(100, (metrics.dayStrain / 21.0) * 100));
  const strainOffset = circumference - (strainPct / 100) * circumference;

  // 3. Sleep Performance progress (0 - 100%)
  const sleepPct = Math.max(0, Math.min(100, metrics.sleepPerformance));
  const sleepOffset = circumference - (sleepPct / 100) * circumference;

  return (
    <div className="grid grid-cols-3 gap-2.5">
      {/* 1. RECOVERY GAUGE */}
      <button
        type="button"
        onClick={() => onSelectGauge('recovery')}
        className="group bg-[#1C1C1E] border border-[#2C2C2E] hover:border-[#3F3F46] rounded-2xl p-3 flex flex-col items-center justify-between transition-all active:scale-[0.98] cursor-pointer text-center"
      >
        <div className="text-[10px] font-semibold tracking-wider text-zinc-400 uppercase mb-1">
          Recovery
        </div>

        <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
          <svg width={size} height={size} className="-rotate-90 transform">
            <circle
              cx={size / 2}
              cy={size / 2}
              r={radius}
              fill="transparent"
              stroke="#2C2C2E"
              strokeWidth={strokeWidth}
            />
            <circle
              cx={size / 2}
              cy={size / 2}
              r={radius}
              fill="transparent"
              stroke={metrics.recoveryColor}
              strokeWidth={strokeWidth}
              strokeDasharray={circumference}
              strokeDashoffset={recoveryOffset}
              strokeLinecap="round"
              style={{
                transition: 'stroke-dashoffset 650ms cubic-bezier(0.16, 1, 0.3, 1), stroke 400ms ease',
              }}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span
              className="font-display text-2xl font-bold tracking-tight tabular-nums leading-none"
              style={{ color: metrics.recoveryColor }}
            >
              {metrics.recoveryScore}%
            </span>
            <span className="text-[10px] text-zinc-400 mt-1 font-medium">
              ВСР {metrics.effectiveHrv} мс
            </span>
          </div>
        </div>

        <div className="mt-2 text-[11px] font-medium text-zinc-300 group-hover:text-white transition-colors truncate w-full">
          {metrics.recoveryZone === 'green'
            ? 'Пиковая готовность'
            : metrics.recoveryZone === 'yellow'
            ? 'Норма (Баланс)'
            : 'Нужен отдых'}
        </div>
      </button>

      {/* 2. STRAIN GAUGE */}
      <button
        type="button"
        onClick={() => onSelectGauge('strain')}
        className="group bg-[#1C1C1E] border border-[#2C2C2E] hover:border-[#3F3F46] rounded-2xl p-3 flex flex-col items-center justify-between transition-all active:scale-[0.98] cursor-pointer text-center"
      >
        <div className="text-[10px] font-semibold tracking-wider text-zinc-400 uppercase mb-1">
          Strain
        </div>

        <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
          <svg width={size} height={size} className="-rotate-90 transform">
            <circle
              cx={size / 2}
              cy={size / 2}
              r={radius}
              fill="transparent"
              stroke="#2C2C2E"
              strokeWidth={strokeWidth}
            />
            <circle
              cx={size / 2}
              cy={size / 2}
              r={radius}
              fill="transparent"
              stroke="#0EA5E9"
              strokeWidth={strokeWidth}
              strokeDasharray={circumference}
              strokeDashoffset={strainOffset}
              strokeLinecap="round"
              style={{
                transition: 'stroke-dashoffset 650ms cubic-bezier(0.16, 1, 0.3, 1)',
              }}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="font-display text-2xl font-bold tracking-tight text-[#0EA5E9] tabular-nums leading-none">
              {metrics.dayStrain.toFixed(1)}
            </span>
            <span className="text-[9px] text-zinc-400 mt-1 font-mono-num">
              Цель {metrics.optimalStrainRange[0].toFixed(1)}–{metrics.optimalStrainRange[1].toFixed(1)}
            </span>
          </div>
        </div>

        <div className="mt-2 text-[11px] font-medium text-zinc-300 group-hover:text-white transition-colors truncate w-full">
          {metrics.totalCalories} ккал
        </div>
      </button>

      {/* 3. SLEEP GAUGE */}
      <button
        type="button"
        onClick={() => onSelectGauge('sleep')}
        className="group bg-[#1C1C1E] border border-[#2C2C2E] hover:border-[#3F3F46] rounded-2xl p-3 flex flex-col items-center justify-between transition-all active:scale-[0.98] cursor-pointer text-center"
      >
        <div className="text-[10px] font-semibold tracking-wider text-zinc-400 uppercase mb-1">
          Sleep
        </div>

        <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
          <svg width={size} height={size} className="-rotate-90 transform">
            <circle
              cx={size / 2}
              cy={size / 2}
              r={radius}
              fill="transparent"
              stroke="#2C2C2E"
              strokeWidth={strokeWidth}
            />
            <circle
              cx={size / 2}
              cy={size / 2}
              r={radius}
              fill="transparent"
              stroke="#6366F1"
              strokeWidth={strokeWidth}
              strokeDasharray={circumference}
              strokeDashoffset={sleepOffset}
              strokeLinecap="round"
              style={{
                transition: 'stroke-dashoffset 650ms cubic-bezier(0.16, 1, 0.3, 1)',
              }}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="font-display text-2xl font-bold tracking-tight text-[#38BDF8] tabular-nums leading-none">
              {metrics.sleepPerformance}%
            </span>
            <span className="text-[10px] text-zinc-400 mt-1 font-mono-num">
              {metrics.actualSleepHours.toFixed(1)}ч / {metrics.sleepNeedHours.toFixed(1)}ч
            </span>
          </div>
        </div>

        <div className="mt-2 text-[11px] font-medium text-zinc-300 group-hover:text-white transition-colors truncate w-full">
          КПД сна {metrics.sleepEfficiencyPct}%
        </div>
      </button>
    </div>
  );
};
