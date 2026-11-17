import React from 'react';
import {
  ClipboardCheck,
  Coffee,
  Droplets,
  FlameKindling,
  Pill,
  RotateCcw,
  Sliders,
  Utensils,
  Wine,
} from 'lucide-react';
import {
  CalculatedDayMetrics,
  DayRawData,
  JournalEntries,
  PresetScenarioId,
} from '../utils/physiologyMath';
import { PRESET_SCENARIOS } from '../data/initialBiometrics';

interface JournalSimulatorTabProps {
  dayData: DayRawData;
  metrics: CalculatedDayMetrics;
  onUpdateJournal: (newJournal: JournalEntries) => void;
  onApplyPreset: (presetId: PresetScenarioId) => void;
  onDirectSliderChange: (
    field: 'baseHrv' | 'baseRhr' | 'sleepHours',
    value: number
  ) => void;
  onResetAll: () => void;
}

export const JournalSimulatorTab: React.FC<JournalSimulatorTabProps> = ({
  dayData,
  metrics,
  onUpdateJournal,
  onApplyPreset,
  onDirectSliderChange,
  onResetAll,
}) => {
  const j = dayData.journal;

  const toggleHabit = (key: keyof Omit<JournalEntries, 'stressLevel'>) => {
    onUpdateJournal({
      ...j,
      [key]: !j[key],
    });
  };

  const setStress = (level: number) => {
    onUpdateJournal({
      ...j,
      stressLevel: level,
    });
  };

  const currentTotalSleepMin =
    dayData.sleepStages.lightMinutes +
    dayData.sleepStages.remMinutes +
    dayData.sleepStages.swsMinutes;
  const currentSleepHours = Number((currentTotalSleepMin / 60).toFixed(1));

  return (
    <div className="space-y-4 pb-6">
      {/* Live Physiological Feedback Header */}
      <div className="bg-[#1C1C1E] border border-[#2C2C2E] rounded-2xl p-3.5 flex items-center justify-between">
        <div>
          <div className="text-[10px] uppercase tracking-wider text-zinc-400">
            Отклик системы в реальном времени
          </div>
          <div className="text-xs font-medium text-zinc-200 mt-0.5 font-mono-num">
            HRV {metrics.effectiveHrv} мс · RHR {metrics.effectiveRhr} уд/м · Сон {metrics.sleepPerformance}%
          </div>
        </div>
        <div className="text-right">
          <span
            className="font-display text-2xl font-bold tabular-nums leading-none"
            style={{ color: metrics.recoveryColor }}
          >
            {metrics.recoveryScore}%
          </span>
          <span className="block text-[9px] uppercase text-zinc-400">
            Recovery
          </span>
        </div>
      </div>

      {/* 1. Preset Scenarios (Developer / Bio-Simulator Panel) */}
      <section className="bg-[#1C1C1E] border border-[#2C2C2E] rounded-2xl p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Sliders className="w-4 h-4 text-[#0EA5E9]" />
            <h2 className="text-xs font-semibold uppercase tracking-wider text-zinc-200">
              Тест-сценарии организма (Preset Scenarios)
            </h2>
          </div>
          <button
            type="button"
            onClick={onResetAll}
            className="px-2.5 py-1 rounded-lg bg-[#121212] border border-[#2C2C2E] hover:border-zinc-600 text-[11px] font-medium text-zinc-300 flex items-center gap-1 cursor-pointer"
          >
            <RotateCcw className="w-3 h-3" /> Сброс
          </button>
        </div>

        <div className="space-y-2.5">
          {PRESET_SCENARIOS.map((preset) => {
            const isActive = dayData.activePreset === preset.id;
            return (
              <button
                key={preset.id}
                type="button"
                onClick={() => onApplyPreset(preset.id)}
                className={`w-full text-left p-3 rounded-xl border transition-all cursor-pointer ${
                  isActive
                    ? 'bg-[#121212] border-[#0EA5E9]'
                    : 'bg-[#121212]/70 border-[#2C2C2E] hover:border-zinc-700'
                }`}
              >
                <div className="flex items-center justify-between gap-2 mb-1">
                  <span className="text-xs font-bold text-white">
                    {preset.title}
                  </span>
                  <span
                    className="text-[10px] font-mono-num font-bold uppercase"
                    style={{ color: preset.badgeColor }}
                  >
                    {preset.badgeText}
                  </span>
                </div>
                <p className="text-[11px] text-zinc-400 leading-snug">
                  {preset.subtitle}
                </p>
              </button>
            );
          })}
        </div>

        {/* Fine-Tuning Sliders for Direct Physiological Testing */}
        <div className="mt-4 pt-3.5 border-t border-[#2C2C2E] space-y-3">
          <div className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400">
            Ручная калибровка биомаркеров
          </div>

          <div className="grid grid-cols-3 gap-2.5">
            <div className="bg-[#121212] border border-[#2C2C2E] rounded-xl p-2.5">
              <label className="block text-[10px] text-zinc-400 mb-1">
                База ВСР: <strong className="text-white font-mono-num">{dayData.baseHrv} мс</strong>
              </label>
              <input
                type="range"
                min={25}
                max={115}
                value={dayData.baseHrv}
                onChange={(e) =>
                  onDirectSliderChange('baseHrv', Number(e.target.value))
                }
                className="w-full whoop-slider"
              />
            </div>

            <div className="bg-[#121212] border border-[#2C2C2E] rounded-xl p-2.5">
              <label className="block text-[10px] text-zinc-400 mb-1">
                Пульс RHR: <strong className="text-white font-mono-num">{dayData.baseRhr} уд</strong>
              </label>
              <input
                type="range"
                min={42}
                max={82}
                value={dayData.baseRhr}
                onChange={(e) =>
                  onDirectSliderChange('baseRhr', Number(e.target.value))
                }
                className="w-full whoop-slider"
              />
            </div>

            <div className="bg-[#121212] border border-[#2C2C2E] rounded-xl p-2.5">
              <label className="block text-[10px] text-zinc-400 mb-1">
                Сон: <strong className="text-white font-mono-num">{currentSleepHours} ч</strong>
              </label>
              <input
                type="range"
                min={3.5}
                max={9.5}
                step={0.5}
                value={currentSleepHours}
                onChange={(e) =>
                  onDirectSliderChange('sleepHours', Number(e.target.value))
                }
                className="w-full whoop-slider"
              />
            </div>
          </div>
        </div>
      </section>

      {/* 2. Morning Habit Journal (WHOOP Journal) */}
      <section className="bg-[#1C1C1E] border border-[#2C2C2E] rounded-2xl p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <ClipboardCheck className="w-4 h-4 text-[#22C55E]" />
            <div>
              <h2 className="text-xs font-semibold uppercase tracking-wider text-zinc-200">
                Утренний дневник привычек (WHOOP Journal)
              </h2>
              <p className="text-[11px] text-zinc-500 mt-0.5">
                Факторы вчерашнего дня мгновенно пересчитывают HRV, RHR и AI-Коуча
              </p>
            </div>
          </div>
        </div>

        <div className="space-y-2.5">
          {/* 1. Alcohol */}
          <div className="bg-[#121212] border border-[#2C2C2E] rounded-xl p-3 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-[#EF4444]/15 flex items-center justify-center text-[#EF4444] shrink-0">
                <Wine className="w-4 h-4" />
              </div>
              <div>
                <div className="text-xs font-semibold text-white">
                  Алкоголь вчера вечером
                </div>
                <div className="text-[11px] text-zinc-400">
                  Резко снижает ВСР (-22 мс) и Recovery, повышает RHR (+9 уд/м)
                </div>
              </div>
            </div>
            <div className="flex items-center gap-1 bg-[#1C1C1E] p-1 rounded-lg border border-[#2C2C2E] shrink-0">
              <button
                type="button"
                onClick={() => j.alcohol && toggleHabit('alcohol')}
                className={`px-2.5 py-1 rounded text-[11px] font-semibold cursor-pointer ${
                  !j.alcohol ? 'bg-zinc-700 text-white' : 'text-zinc-400'
                }`}
              >
                Нет
              </button>
              <button
                type="button"
                onClick={() => !j.alcohol && toggleHabit('alcohol')}
                className={`px-2.5 py-1 rounded text-[11px] font-semibold cursor-pointer ${
                  j.alcohol ? 'bg-[#EF4444] text-white' : 'text-zinc-400'
                }`}
              >
                Да
              </button>
            </div>
          </div>

          {/* 2. Caffeine after 14:00 */}
          <div className="bg-[#121212] border border-[#2C2C2E] rounded-xl p-3 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-[#EAB308]/15 flex items-center justify-center text-[#EAB308] shrink-0">
                <Coffee className="w-4 h-4" />
              </div>
              <div>
                <div className="text-xs font-semibold text-white">
                  Кофеин после 14:00
                </div>
                <div className="text-[11px] text-zinc-400">
                  Блокирует аденозиновые рецепторы, снижает глубокий сон (-22%)
                </div>
              </div>
            </div>
            <div className="flex items-center gap-1 bg-[#1C1C1E] p-1 rounded-lg border border-[#2C2C2E] shrink-0">
              <button
                type="button"
                onClick={() => j.lateCaffeine && toggleHabit('lateCaffeine')}
                className={`px-2.5 py-1 rounded text-[11px] font-semibold cursor-pointer ${
                  !j.lateCaffeine ? 'bg-zinc-700 text-white' : 'text-zinc-400'
                }`}
              >
                Нет
              </button>
              <button
                type="button"
                onClick={() => !j.lateCaffeine && toggleHabit('lateCaffeine')}
                className={`px-2.5 py-1 rounded text-[11px] font-semibold cursor-pointer ${
                  j.lateCaffeine ? 'bg-[#EAB308] text-black' : 'text-zinc-400'
                }`}
              >
                Да
              </button>
            </div>
          </div>

          {/* 3. Late Meal */}
          <div className="bg-[#121212] border border-[#2C2C2E] rounded-xl p-3 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-orange-500/15 flex items-center justify-center text-orange-400 shrink-0">
                <Utensils className="w-4 h-4" />
              </div>
              <div>
                <div className="text-xs font-semibold text-white">
                  Поздний прием пищи (за 2ч до сна)
                </div>
                <div className="text-[11px] text-zinc-400">
                  Пищеварительный термогенез повышает ночной пульс (+3 уд/м)
                </div>
              </div>
            </div>
            <div className="flex items-center gap-1 bg-[#1C1C1E] p-1 rounded-lg border border-[#2C2C2E] shrink-0">
              <button
                type="button"
                onClick={() => j.lateMeal && toggleHabit('lateMeal')}
                className={`px-2.5 py-1 rounded text-[11px] font-semibold cursor-pointer ${
                  !j.lateMeal ? 'bg-zinc-700 text-white' : 'text-zinc-400'
                }`}
              >
                Нет
              </button>
              <button
                type="button"
                onClick={() => !j.lateMeal && toggleHabit('lateMeal')}
                className={`px-2.5 py-1 rounded text-[11px] font-semibold cursor-pointer ${
                  j.lateMeal ? 'bg-orange-500 text-white' : 'text-zinc-400'
                }`}
              >
                Да
              </button>
            </div>
          </div>

          {/* 4. Magnesium / Supplements */}
          <div className="bg-[#121212] border border-[#2C2C2E] rounded-xl p-3 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-[#22C55E]/15 flex items-center justify-center text-[#22C55E] shrink-0">
                <Pill className="w-4 h-4" />
              </div>
              <div>
                <div className="text-xs font-semibold text-white">
                  Магний / Добавки перед сном
                </div>
                <div className="text-[11px] text-zinc-400">
                  Увеличивает глубокий сон (+15%) и ВСР (+6 мс)
                </div>
              </div>
            </div>
            <div className="flex items-center gap-1 bg-[#1C1C1E] p-1 rounded-lg border border-[#2C2C2E] shrink-0">
              <button
                type="button"
                onClick={() => j.magnesium && toggleHabit('magnesium')}
                className={`px-2.5 py-1 rounded text-[11px] font-semibold cursor-pointer ${
                  !j.magnesium ? 'bg-zinc-700 text-white' : 'text-zinc-400'
                }`}
              >
                Нет
              </button>
              <button
                type="button"
                onClick={() => !j.magnesium && toggleHabit('magnesium')}
                className={`px-2.5 py-1 rounded text-[11px] font-semibold cursor-pointer ${
                  j.magnesium ? 'bg-[#22C55E] text-black' : 'text-zinc-400'
                }`}
              >
                Да
              </button>
            </div>
          </div>

          {/* 5. Hydration */}
          <div className="bg-[#121212] border border-[#2C2C2E] rounded-xl p-3 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-[#0EA5E9]/15 flex items-center justify-center text-[#0EA5E9] shrink-0">
                <Droplets className="w-4 h-4" />
              </div>
              <div>
                <div className="text-xs font-semibold text-white">
                  Оптимальная гидратация (2.5+ л)
                </div>
                <div className="text-[11px] text-zinc-400">
                  Поддерживает объем плазмы крови и снижает ЧСС покоя
                </div>
              </div>
            </div>
            <div className="flex items-center gap-1 bg-[#1C1C1E] p-1 rounded-lg border border-[#2C2C2E] shrink-0">
              <button
                type="button"
                onClick={() => j.hydration && toggleHabit('hydration')}
                className={`px-2.5 py-1 rounded text-[11px] font-semibold cursor-pointer ${
                  !j.hydration ? 'bg-zinc-700 text-white' : 'text-zinc-400'
                }`}
              >
                Нет
              </button>
              <button
                type="button"
                onClick={() => !j.hydration && toggleHabit('hydration')}
                className={`px-2.5 py-1 rounded text-[11px] font-semibold cursor-pointer ${
                  j.hydration ? 'bg-[#0EA5E9] text-white' : 'text-zinc-400'
                }`}
              >
                Да
              </button>
            </div>
          </div>

          {/* 6. Stress Level (Scale 1-5) */}
          <div className="bg-[#121212] border border-[#2C2C2E] rounded-xl p-3 space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-lg bg-purple-500/15 flex items-center justify-center text-purple-400 shrink-0">
                  <FlameKindling className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs font-semibold text-white">
                    Уровень субъективного стресса (1–5)
                  </div>
                  <div className="text-[11px] text-zinc-400">
                    Прямое влияние кортизола на вегетативный баланс
                  </div>
                </div>
              </div>
              <span className="font-mono-num text-sm font-bold text-white">
                {j.stressLevel} / 5
              </span>
            </div>

            <div className="grid grid-cols-5 gap-1.5">
              {[1, 2, 3, 4, 5].map((lvl) => (
                <button
                  key={lvl}
                  type="button"
                  onClick={() => setStress(lvl)}
                  className={`py-2 rounded-lg text-xs font-mono-num font-bold transition-colors cursor-pointer ${
                    j.stressLevel === lvl
                      ? lvl <= 2
                        ? 'bg-[#22C55E] text-black'
                        : lvl === 3
                        ? 'bg-[#EAB308] text-black'
                        : 'bg-[#EF4444] text-white'
                      : 'bg-[#1C1C1E] border border-[#2C2C2E] text-zinc-400 hover:text-white'
                  }`}
                >
                  {lvl}
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};
