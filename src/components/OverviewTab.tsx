import React, { useState } from 'react';
import {
  Activity,
  ArrowDownRight,
  ArrowUpRight,
  BrainCircuit,
  Clock,
  Flame,
  Heart,
  Plus,
  Sparkles,
  Trash2,
  Wind,
  X,
} from 'lucide-react';
import {
  ActivitySession,
  BaselineStats,
  CalculatedDayMetrics,
  DayRawData,
  SportCategory,
  buildWorkoutFromInput,
  formatHm,
} from '../utils/physiologyMath';
import { CircularGauges, GaugeType } from './CircularGauges';

interface OverviewTabProps {
  dayData: DayRawData;
  metrics: CalculatedDayMetrics;
  baseline: BaselineStats;
  onAddActivity: (activity: ActivitySession) => void;
  onDeleteActivity: (activityId: string) => void;
  onNavigateTab: (tab: 'overview' | 'sleep' | 'strain' | 'journal') => void;
}

const SPORT_OPTIONS: SportCategory[] = [
  'Бег',
  'Силовая тренировка',
  'Велоспорт',
  'Функциональный кроссфит',
  'Плавание',
  'Бокс / ММА',
  'Йога / Восстановление',
];

export const OverviewTab: React.FC<OverviewTabProps> = ({
  dayData,
  metrics,
  baseline,
  onAddActivity,
  onDeleteActivity,
  onNavigateTab,
}) => {
  const [selectedGauge, setSelectedGauge] = useState<GaugeType | null>(null);
  const [isWorkoutModalOpen, setIsWorkoutModalOpen] = useState(false);

  // Add workout modal state
  const [sportType, setSportType] = useState<SportCategory>('Бег');
  const [durationMinutes, setDurationMinutes] = useState<number>(45);
  const [avgHr, setAvgHr] = useState<number>(154);
  const [startTime, setStartTime] = useState<string>('18:30');

  const previewWorkout = buildWorkoutFromInput(sportType, durationMinutes, avgHr, startTime);

  const handleCreateWorkout = (e: React.FormEvent) => {
    e.preventDefault();
    onAddActivity(previewWorkout);
    setIsWorkoutModalOpen(false);
  };

  // Biometric trend comparisons vs 30-day Baseline
  const hrvAboveBaseline = metrics.effectiveHrv >= baseline.hrv;
  const rhrOptimal = metrics.effectiveRhr <= baseline.rhr; // Lower RHR is greener
  const respOptimal = Math.abs(metrics.effectiveRespRate - baseline.respRate) <= 0.7;
  const spo2Optimal = metrics.effectiveSpo2 >= 96;

  return (
    <div className="space-y-4 pb-6">
      {/* 1. Three Main Circular Gauges */}
      <CircularGauges
        metrics={metrics}
        onSelectGauge={(gauge) => setSelectedGauge(gauge)}
      />

      <div className="text-center text-[11px] text-zinc-500">
        Нажмите на любое кольцо (Recovery, Strain, Sleep) для разбора формулы расчета
      </div>

      {/* 2. Key Biometrics 2x2 Grid (Health Monitor) */}
      <section className="bg-[#1C1C1E] border border-[#2C2C2E] rounded-2xl p-4">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h2 className="text-xs font-semibold uppercase tracking-wider text-zinc-300">
              Ключевые биометрики (Health Monitor)
            </h2>
            <p className="text-[11px] text-zinc-500 mt-0.5">
              Отклонение от вашей 30-дневной базовой нормы (Baseline)
            </p>
          </div>
          <span className="text-[11px] font-medium text-[#22C55E]">
            4/4 в калибровке
          </span>
        </div>

        <div className="grid grid-cols-2 gap-2.5">
          {/* Card 1: HRV */}
          <div className="bg-[#121212] border border-[#2C2C2E] rounded-xl p-3">
            <div className="flex items-center justify-between text-xs text-zinc-400">
              <span>ВСР (HRV)</span>
              <Activity className="w-3.5 h-3.5 text-zinc-500" />
            </div>
            <div className="mt-2 flex items-baseline justify-between">
              <div>
                <span className="font-mono-num text-2xl font-bold text-white">
                  {metrics.effectiveHrv}
                </span>
                <span className="text-xs text-zinc-400 ml-1">мс</span>
              </div>
              <div
                className={`flex items-center text-xs font-semibold tabular-nums ${
                  hrvAboveBaseline ? 'text-[#22C55E]' : 'text-[#EF4444]'
                }`}
              >
                {hrvAboveBaseline ? (
                  <ArrowUpRight className="w-4 h-4 mr-0.5" />
                ) : (
                  <ArrowDownRight className="w-4 h-4 mr-0.5" />
                )}
                {metrics.effectiveHrv - baseline.hrv >= 0
                  ? `+${metrics.effectiveHrv - baseline.hrv}`
                  : metrics.effectiveHrv - baseline.hrv}{' '}
                мс
              </div>
            </div>
            <div className="mt-1.5 text-[11px] text-zinc-500 font-mono-num">
              Норма 30д: {baseline.hrv} мс
            </div>
          </div>

          {/* Card 2: RHR */}
          <div className="bg-[#121212] border border-[#2C2C2E] rounded-xl p-3">
            <div className="flex items-center justify-between text-xs text-zinc-400">
              <span>Пульс покоя (RHR)</span>
              <Heart className="w-3.5 h-3.5 text-zinc-500" />
            </div>
            <div className="mt-2 flex items-baseline justify-between">
              <div>
                <span className="font-mono-num text-2xl font-bold text-white">
                  {metrics.effectiveRhr}
                </span>
                <span className="text-xs text-zinc-400 ml-1">уд/м</span>
              </div>
              <div
                className={`flex items-center text-xs font-semibold tabular-nums ${
                  rhrOptimal ? 'text-[#22C55E]' : 'text-[#EF4444]'
                }`}
              >
                {metrics.effectiveRhr <= baseline.rhr ? (
                  <ArrowDownRight className="w-4 h-4 mr-0.5" />
                ) : (
                  <ArrowUpRight className="w-4 h-4 mr-0.5" />
                )}
                {metrics.effectiveRhr - baseline.rhr > 0
                  ? `+${metrics.effectiveRhr - baseline.rhr}`
                  : metrics.effectiveRhr - baseline.rhr}{' '}
                уд
              </div>
            </div>
            <div className="mt-1.5 text-[11px] text-zinc-500 font-mono-num">
              Норма 30д: {baseline.rhr} уд/мин
            </div>
          </div>

          {/* Card 3: Respiratory Rate */}
          <div className="bg-[#121212] border border-[#2C2C2E] rounded-xl p-3">
            <div className="flex items-center justify-between text-xs text-zinc-400">
              <span>Дыхание (Resp)</span>
              <Wind className="w-3.5 h-3.5 text-zinc-500" />
            </div>
            <div className="mt-2 flex items-baseline justify-between">
              <div>
                <span className="font-mono-num text-2xl font-bold text-white">
                  {metrics.effectiveRespRate.toFixed(1)}
                </span>
                <span className="text-xs text-zinc-400 ml-1">вд/м</span>
              </div>
              <div
                className={`flex items-center text-xs font-semibold tabular-nums ${
                  respOptimal ? 'text-[#22C55E]' : 'text-[#EAB308]'
                }`}
              >
                {metrics.effectiveRespRate >= baseline.respRate ? (
                  <ArrowUpRight className="w-4 h-4 mr-0.5" />
                ) : (
                  <ArrowDownRight className="w-4 h-4 mr-0.5" />
                )}
                {(metrics.effectiveRespRate - baseline.respRate) >= 0
                  ? `+${(metrics.effectiveRespRate - baseline.respRate).toFixed(1)}`
                  : (metrics.effectiveRespRate - baseline.respRate).toFixed(1)}
              </div>
            </div>
            <div className="mt-1.5 text-[11px] text-zinc-500 font-mono-num">
              Норма 30д: {baseline.respRate} вд/мин
            </div>
          </div>

          {/* Card 4: SpO2 */}
          <div className="bg-[#121212] border border-[#2C2C2E] rounded-xl p-3">
            <div className="flex items-center justify-between text-xs text-zinc-400">
              <span>Кислород (SpO2)</span>
              <Sparkles className="w-3.5 h-3.5 text-zinc-500" />
            </div>
            <div className="mt-2 flex items-baseline justify-between">
              <div>
                <span className="font-mono-num text-2xl font-bold text-white">
                  {metrics.effectiveSpo2}%
                </span>
              </div>
              <div
                className={`flex items-center text-xs font-semibold tabular-nums ${
                  spo2Optimal ? 'text-[#22C55E]' : 'text-[#EF4444]'
                }`}
              >
                {metrics.effectiveSpo2 >= baseline.spo2 ? (
                  <ArrowUpRight className="w-4 h-4 mr-0.5" />
                ) : (
                  <ArrowDownRight className="w-4 h-4 mr-0.5" />
                )}
                {metrics.effectiveSpo2 === baseline.spo2
                  ? 'Норма'
                  : `${metrics.effectiveSpo2 - baseline.spo2}%`}
              </div>
            </div>
            <div className="mt-1.5 text-[11px] text-zinc-500 font-mono-num">
              Норма 30д: {baseline.spo2}%
            </div>
          </div>
        </div>
      </section>

      {/* 3. AI-Coach (Daily Insight) */}
      <section className="bg-[#1C1C1E] border border-[#2C2C2E] rounded-2xl p-4">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <BrainCircuit className="w-4 h-4 text-[#0EA5E9]" />
            <h2 className="text-xs font-semibold uppercase tracking-wider text-zinc-200">
              AI-Коуч • Daily Insight
            </h2>
          </div>
          <span
            className="text-xs font-semibold tabular-nums"
            style={{ color: metrics.recoveryColor }}
          >
            Цель Strain: {metrics.optimalStrainRange[0].toFixed(1)}–{metrics.optimalStrainRange[1].toFixed(1)}
          </span>
        </div>

        <h3 className="text-sm font-semibold text-white mb-1.5">
          {metrics.aiInsightHeadline}
        </h3>
        <p className="text-xs text-zinc-300 leading-relaxed">
          {metrics.aiInsightBody}
        </p>

        <div className="mt-3 pt-3 border-t border-[#2C2C2E] space-y-1.5">
          {metrics.aiInsightBullets.map((b, idx) => (
            <div key={idx} className="text-[11px] text-zinc-400 flex items-start gap-2">
              <span className="text-[#0EA5E9] font-bold">•</span>
              <span>{b}</span>
            </div>
          ))}
        </div>
      </section>

      {/* 4. Day Activities & "+ Добавить тренировку" */}
      <section className="bg-[#1C1C1E] border border-[#2C2C2E] rounded-2xl p-4">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h2 className="text-xs font-semibold uppercase tracking-wider text-zinc-300">
              Активности за день ({dayData.activities.length})
            </h2>
            <p className="text-[11px] text-zinc-500 mt-0.5">
              Нелинейное сложение нагрузки с фоновым метаболизмом
            </p>
          </div>
          <button
            type="button"
            onClick={() => setIsWorkoutModalOpen(true)}
            className="min-h-[38px] px-3 py-1.5 rounded-xl bg-[#0EA5E9] hover:bg-[#0284C7] text-white text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>Добавить тренировку</span>
          </button>
        </div>

        {dayData.activities.length === 0 ? (
          <div className="bg-[#121212] border border-[#2C2C2E] rounded-xl p-5 text-center">
            <p className="text-xs text-zinc-400 mb-3">
              Сегодня еще не зафиксировано тренировок. Текущий Day Strain ({metrics.dayStrain.toFixed(1)}) сформирован базовой дневной активностью.
            </p>
            <button
              type="button"
              onClick={() => setIsWorkoutModalOpen(true)}
              className="px-4 py-2 rounded-lg bg-[#2C2C2E] hover:bg-zinc-700 text-xs font-semibold text-white transition-colors cursor-pointer"
            >
              + Записать первую тренировку
            </button>
          </div>
        ) : (
          <div className="space-y-2.5">
            {dayData.activities.map((act) => (
              <div
                key={act.id}
                className="bg-[#121212] border border-[#2C2C2E] rounded-xl p-3 flex items-center justify-between gap-3"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-xl bg-[#0EA5E9]/15 border border-[#0EA5E9]/40 flex flex-col items-center justify-center shrink-0">
                    <span className="font-display text-sm font-bold text-[#0EA5E9] tabular-nums leading-none">
                      {act.strain.toFixed(1)}
                    </span>
                    <span className="text-[8px] uppercase text-zinc-400 mt-0.5">
                      Strain
                    </span>
                  </div>
                  <div className="min-w-0">
                    <div className="text-xs font-semibold text-white truncate">
                      {act.title}
                    </div>
                    <div className="text-[11px] text-zinc-400 flex items-center gap-1.5 mt-0.5 font-mono-num">
                      <span>{act.durationMinutes} мин</span>
                      <span>·</span>
                      <span>Ср. ЧСС {act.avgHr}</span>
                      <span>·</span>
                      <span>{act.calories} ккал</span>
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => onDeleteActivity(act.id)}
                  title="Удалить тренировку"
                  className="min-h-[36px] min-w-[36px] flex items-center justify-center rounded-lg text-zinc-500 hover:text-[#EF4444] hover:bg-zinc-800/60 transition-colors cursor-pointer shrink-0"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* MODAL 1: Gauge Breakdown Bottom Sheet / Overlay */}
      {selectedGauge && (
        <div
          className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4"
          onClick={() => setSelectedGauge(null)}
        >
          <div
            className="w-full max-w-md bg-[#1C1C1E] border-t sm:border border-[#2C2C2E] rounded-t-3xl sm:rounded-3xl p-5 space-y-4 animate-in slide-in-from-bottom duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-10 h-1.5 bg-zinc-700 rounded-full mx-auto sm:hidden" />

            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-white">
                {selectedGauge === 'recovery' && 'Детализация Recovery (Восстановление)'}
                {selectedGauge === 'strain' && 'Детализация Day Strain (Нагрузка 0–21)'}
                {selectedGauge === 'sleep' && 'Детализация Sleep Performance (Сон)'}
              </h3>
              <button
                type="button"
                onClick={() => setSelectedGauge(null)}
                className="w-8 h-8 rounded-full bg-zinc-800 flex items-center justify-center text-zinc-400 hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {selectedGauge === 'recovery' && (
              <div className="space-y-3 text-xs">
                <div className="p-3 rounded-xl bg-[#121212] border border-[#2C2C2E] flex items-center justify-between">
                  <div>
                    <div className="text-zinc-400">Итоговый балл готовности</div>
                    <div className="text-sm font-semibold text-white mt-0.5">
                      {metrics.recoveryStatusText}
                    </div>
                  </div>
                  <div
                    className="font-display text-3xl font-bold tabular-nums"
                    style={{ color: metrics.recoveryColor }}
                  >
                    {metrics.recoveryScore}%
                  </div>
                </div>

                <div className="space-y-2 bg-[#121212] border border-[#2C2C2E] rounded-xl p-3">
                  <div className="text-[11px] font-semibold text-zinc-400 uppercase">
                    Математическая модель (Взвешенная сумма):
                  </div>
                  <div className="flex items-center justify-between py-1 border-b border-zinc-800">
                    <span>1. ВСР / HRV (вес 50% • {metrics.effectiveHrv} мс vs 65 мс)</span>
                    <span className="font-mono-num font-semibold text-white">
                      {metrics.hrvComponentScore} / 100
                    </span>
                  </div>
                  <div className="flex items-center justify-between py-1 border-b border-zinc-800">
                    <span>2. Пульс покоя RHR (вес 30% • {metrics.effectiveRhr} vs 52 уд/м)</span>
                    <span className="font-mono-num font-semibold text-white">
                      {metrics.rhrComponentScore} / 100
                    </span>
                  </div>
                  <div className="flex items-center justify-between py-1">
                    <span>3. Выполнение сна (вес 20% • Sleep Perf)</span>
                    <span className="font-mono-num font-semibold text-white">
                      {metrics.sleepComponentScore} / 100
                    </span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setSelectedGauge(null);
                    onNavigateTab('sleep');
                  }}
                  className="w-full py-2.5 rounded-xl bg-[#22C55E] text-black font-semibold text-xs cursor-pointer"
                >
                  Перейти к глубокому анализу Восстановления и Сна
                </button>
              </div>
            )}

            {selectedGauge === 'strain' && (
              <div className="space-y-3 text-xs">
                <div className="p-3 rounded-xl bg-[#121212] border border-[#2C2C2E] flex items-center justify-between">
                  <div>
                    <div className="text-zinc-400">Нагрузка дня по шкале Борга (0–21)</div>
                    <div className="text-sm font-semibold text-white mt-0.5">
                      Цель сегодня: {metrics.optimalStrainRange[0].toFixed(1)} – {metrics.optimalStrainRange[1].toFixed(1)}
                    </div>
                  </div>
                  <div className="font-display text-3xl font-bold text-[#0EA5E9] tabular-nums">
                    {metrics.dayStrain.toFixed(1)}
                  </div>
                </div>

                <p className="text-zinc-400 leading-relaxed">
                  Логарифмическая шкала WHOOP: набрать первые 10 баллов легко за счет бытовой активности, но после 18.0 каждый десятый балл требует экспоненциальной работы в пульсовых Зонах 4–5.
                </p>

                <div className="bg-[#121212] border border-[#2C2C2E] rounded-xl p-3 flex items-center justify-between font-mono-num">
                  <span>Кардио-импульс (TRIMP): {metrics.cardioImpulseLoad} ед.</span>
                  <span>Расход: {metrics.totalCalories} ккал</span>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setSelectedGauge(null);
                    onNavigateTab('strain');
                  }}
                  className="w-full py-2.5 rounded-xl bg-[#0EA5E9] text-white font-semibold text-xs cursor-pointer"
                >
                  Открыть монитор пульса и Калькулятор Strain
                </button>
              </div>
            )}

            {selectedGauge === 'sleep' && (
              <div className="space-y-3 text-xs">
                <div className="p-3 rounded-xl bg-[#121212] border border-[#2C2C2E] flex items-center justify-between">
                  <div>
                    <div className="text-zinc-400">Выполнение потребности во сне</div>
                    <div className="text-sm font-semibold text-white mt-0.5">
                      Сон {formatHm(metrics.actualSleepHours)} из {formatHm(metrics.sleepNeedHours)}
                    </div>
                  </div>
                  <div className="font-display text-3xl font-bold text-[#38BDF8] tabular-nums">
                    {metrics.sleepPerformance}%
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 font-mono-num">
                  <div className="p-2.5 rounded-xl bg-[#121212] border border-[#2C2C2E]">
                    <div className="text-zinc-400 text-[11px]">Восстановительный сон</div>
                    <div className="text-sm font-bold text-white mt-0.5">
                      {formatHm(metrics.restorativeHours)} ({metrics.restorativePct}%)
                    </div>
                  </div>
                  <div className="p-2.5 rounded-xl bg-[#121212] border border-[#2C2C2E]">
                    <div className="text-zinc-400 text-[11px]">Долг сна (Sleep Debt)</div>
                    <div className="text-sm font-bold text-[#EAB308] mt-0.5">
                      {formatHm(metrics.sleepDebtHours)}
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setSelectedGauge(null);
                    onNavigateTab('sleep');
                  }}
                  className="w-full py-2.5 rounded-xl bg-[#6366F1] text-white font-semibold text-xs cursor-pointer"
                >
                  Открыть архитектуру фаз сна и Sleep Planner
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* MODAL 2: "+ Добавить тренировку" */}
      {isWorkoutModalOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4"
          onClick={() => setIsWorkoutModalOpen(false)}
        >
          <form
            onSubmit={handleCreateWorkout}
            className="w-full max-w-md bg-[#1C1C1E] border-t sm:border border-[#2C2C2E] rounded-t-3xl sm:rounded-3xl p-5 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-white">
                Добавить тренировку
              </h3>
              <button
                type="button"
                onClick={() => setIsWorkoutModalOpen(false)}
                className="w-8 h-8 rounded-full bg-zinc-800 flex items-center justify-center text-zinc-400 hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs text-zinc-400 mb-1">
                  Вид активности
                </label>
                <select
                  value={sportType}
                  onChange={(e) => setSportType(e.target.value as SportCategory)}
                  className="w-full bg-[#121212] border border-[#2C2C2E] rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-[#0EA5E9]"
                >
                  {SPORT_OPTIONS.map((sport) => (
                    <option key={sport} value={sport}>
                      {sport}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-zinc-400 mb-1">
                    Длительность: <strong className="text-white font-mono-num">{durationMinutes} мин</strong>
                  </label>
                  <input
                    type="range"
                    min={15}
                    max={150}
                    step={5}
                    value={durationMinutes}
                    onChange={(e) => setDurationMinutes(Number(e.target.value))}
                    className="w-full whoop-slider"
                  />
                </div>

                <div>
                  <label className="block text-xs text-zinc-400 mb-1">
                    Средний пульс: <strong className="text-white font-mono-num">{avgHr} уд/м</strong>
                  </label>
                  <input
                    type="range"
                    min={105}
                    max={185}
                    step={1}
                    value={avgHr}
                    onChange={(e) => setAvgHr(Number(e.target.value))}
                    className="w-full whoop-slider"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs text-zinc-400 mb-1">
                  Время начала сессии
                </label>
                <input
                  type="time"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  className="w-full bg-[#121212] border border-[#2C2C2E] rounded-xl px-3 py-2 text-xs text-white font-mono-num"
                />
              </div>

              {/* Live Strain Preview Box */}
              <div className="bg-[#121212] border border-[#2C2C2E] rounded-xl p-3 flex items-center justify-between">
                <div className="space-y-0.5">
                  <div className="text-[11px] text-zinc-400">Расчетная нагрузка тренировки</div>
                  <div className="text-xs text-zinc-300 font-mono-num flex items-center gap-2">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5 text-[#0EA5E9]" /> {durationMinutes} мин
                    </span>
                    <span>·</span>
                    <span className="flex items-center gap-1">
                      <Flame className="w-3.5 h-3.5 text-orange-400" /> {previewWorkout.calories} ккал
                    </span>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-[10px] uppercase text-zinc-400 block">Strain сессии</span>
                  <span className="font-display text-2xl font-bold text-[#0EA5E9] tabular-nums">
                    +{previewWorkout.strain.toFixed(1)}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 pt-1">
              <button
                type="button"
                onClick={() => setIsWorkoutModalOpen(false)}
                className="w-1/3 py-2.5 rounded-xl bg-zinc-800 text-xs font-semibold text-zinc-300 cursor-pointer"
              >
                Отмена
              </button>
              <button
                type="submit"
                className="w-2/3 py-2.5 rounded-xl bg-[#0EA5E9] hover:bg-[#0284C7] text-xs font-semibold text-white cursor-pointer"
              >
                Сохранить и пересчитать Strain
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
