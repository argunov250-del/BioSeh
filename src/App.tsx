/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useMemo, useState } from 'react';
import {
  Activity,
  BatteryCharging,
  BluetoothConnected,
  Calendar,
  ClipboardList,
  LayoutDashboard,
  Moon,
  SlidersHorizontal,
} from 'lucide-react';
import {
  ActivitySession,
  DEFAULT_BASELINE,
  DayKey,
  DayRawData,
  JournalEntries,
  PresetScenarioId,
  calculateDayStrain,
  evaluateDayData,
} from './utils/physiologyMath';
import {
  INITIAL_DAYS_DATA,
  PRESET_SCENARIOS,
  buildSevenDayTrend,
} from './data/initialBiometrics';
import { OverviewTab } from './components/OverviewTab';
import { SleepRecoveryTab } from './components/SleepRecoveryTab';
import { StrainHeartRateTab } from './components/StrainHeartRateTab';
import { JournalSimulatorTab } from './components/JournalSimulatorTab';

type ActiveTab = 'overview' | 'sleep' | 'strain' | 'journal';

const STORAGE_KEY = 'biosync_apex_whoop_state_v1';

export default function App() {
  const [daysState, setDaysState] = useState<Record<DayKey, DayRawData>>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && parsed.today && parsed.yesterday && parsed.twoDaysAgo) {
          return parsed;
        }
      }
    } catch {
      // Fallback to initial data
    }
    return INITIAL_DAYS_DATA;
  });

  const [selectedDay, setSelectedDay] = useState<DayKey>('today');
  const [activeTab, setActiveTab] = useState<ActiveTab>('overview');

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(daysState));
    } catch {
      // Ignore storage quota errors
    }
  }, [daysState]);

  const currentDayData = daysState[selectedDay];

  // Evaluate all 3 days for accurate 7-day trend synchronization
  const evaluatedToday = useMemo(
    () => evaluateDayData(daysState.today, DEFAULT_BASELINE),
    [daysState.today]
  );
  const evaluatedYesterday = useMemo(
    () => evaluateDayData(daysState.yesterday, DEFAULT_BASELINE),
    [daysState.yesterday]
  );
  const evaluatedTwoDaysAgo = useMemo(
    () => evaluateDayData(daysState.twoDaysAgo, DEFAULT_BASELINE),
    [daysState.twoDaysAgo]
  );

  const currentMetrics =
    selectedDay === 'today'
      ? evaluatedToday
      : selectedDay === 'yesterday'
      ? evaluatedYesterday
      : evaluatedTwoDaysAgo;

  const weeklyTrend = useMemo(
    () =>
      buildSevenDayTrend(
        {
          hrv: evaluatedToday.effectiveHrv,
          rhr: evaluatedToday.effectiveRhr,
          recovery: evaluatedToday.recoveryScore,
          strain: evaluatedToday.dayStrain,
          sleepPerf: evaluatedToday.sleepPerformance,
        },
        {
          hrv: evaluatedYesterday.effectiveHrv,
          rhr: evaluatedYesterday.effectiveRhr,
          recovery: evaluatedYesterday.recoveryScore,
          strain: evaluatedYesterday.dayStrain,
          sleepPerf: evaluatedYesterday.sleepPerformance,
        },
        {
          hrv: evaluatedTwoDaysAgo.effectiveHrv,
          rhr: evaluatedTwoDaysAgo.effectiveRhr,
          recovery: evaluatedTwoDaysAgo.recoveryScore,
          strain: evaluatedTwoDaysAgo.dayStrain,
          sleepPerf: evaluatedTwoDaysAgo.sleepPerformance,
        }
      ),
    [evaluatedToday, evaluatedYesterday, evaluatedTwoDaysAgo]
  );

  // Handlers for mutating active day state
  const handleAddActivity = (newActivity: ActivitySession) => {
    setDaysState((prev) => ({
      ...prev,
      [selectedDay]: {
        ...prev[selectedDay],
        activities: [newActivity, ...prev[selectedDay].activities],
      },
    }));
  };

  const handleDeleteActivity = (activityId: string) => {
    setDaysState((prev) => ({
      ...prev,
      [selectedDay]: {
        ...prev[selectedDay],
        activities: prev[selectedDay].activities.filter((a) => a.id !== activityId),
      },
    }));
  };

  const handleAddZoneMinutes = (
    zoneIndex: 1 | 2 | 3 | 4 | 5,
    minutes: number
  ) => {
    setDaysState((prev) => {
      const day = prev[selectedDay];
      const existingLiveIdx = day.activities.findIndex(
        (a) => a.id === 'live-zone-session'
      );

      if (existingLiveIdx >= 0) {
        const updatedActivities = [...day.activities];
        const target = { ...updatedActivities[existingLiveIdx] };
        const updatedZones = { ...target.zones };
        const zoneKey = `zone${zoneIndex}Minutes` as keyof typeof updatedZones;
        updatedZones[zoneKey] += minutes;

        const { strain, calories } = calculateDayStrain(updatedZones, false);
        target.zones = updatedZones;
        target.durationMinutes += minutes;
        target.strain = strain;
        target.calories = calories;
        updatedActivities[existingLiveIdx] = target;

        return {
          ...prev,
          [selectedDay]: {
            ...day,
            activities: updatedActivities,
          },
        };
      } else {
        const initialZones = {
          zone1Minutes: zoneIndex === 1 ? minutes : 0,
          zone2Minutes: zoneIndex === 2 ? minutes : 0,
          zone3Minutes: zoneIndex === 3 ? minutes : 0,
          zone4Minutes: zoneIndex === 4 ? minutes : 0,
          zone5Minutes: zoneIndex === 5 ? minutes : 0,
        };
        const { strain, calories } = calculateDayStrain(initialZones, false);
        const liveSession: ActivitySession = {
          id: 'live-zone-session',
          title: 'Кардио-сессия (Strain Coach)',
          sportType: 'Функциональный кроссфит',
          startTime: 'Сейчас',
          durationMinutes: minutes,
          avgHr: zoneIndex >= 4 ? 164 : 145,
          maxHr: 178,
          calories,
          strain,
          zones: initialZones,
        };
        return {
          ...prev,
          [selectedDay]: {
            ...day,
            activities: [liveSession, ...day.activities],
          },
        };
      }
    });
  };

  const handleWakeTimeChange = (newWakeTime: string) => {
    setDaysState((prev) => ({
      ...prev,
      [selectedDay]: {
        ...prev[selectedDay],
        wakeTime: newWakeTime,
      },
    }));
  };

  const handleUpdateJournal = (newJournal: JournalEntries) => {
    setDaysState((prev) => ({
      ...prev,
      [selectedDay]: {
        ...prev[selectedDay],
        activePreset: 'custom',
        journal: newJournal,
      },
    }));
  };

  const handleApplyPreset = (presetId: PresetScenarioId) => {
    const presetConfig = PRESET_SCENARIOS.find((p) => p.id === presetId);
    if (!presetConfig) return;

    setDaysState((prev) => ({
      ...prev,
      [selectedDay]: presetConfig.applyToDay(prev[selectedDay]),
    }));
  };

  const handleDirectSliderChange = (
    field: 'baseHrv' | 'baseRhr' | 'sleepHours',
    value: number
  ) => {
    setDaysState((prev) => {
      const current = prev[selectedDay];
      if (field === 'sleepHours') {
        const totalMin = Math.round(value * 60);
        return {
          ...prev,
          [selectedDay]: {
            ...current,
            activePreset: 'custom',
            sleepStages: {
              awakeMinutes: 30,
              lightMinutes: Math.round(totalMin * 0.52),
              remMinutes: Math.round(totalMin * 0.25),
              swsMinutes: Math.round(totalMin * 0.23),
            },
          },
        };
      }

      return {
        ...prev,
        [selectedDay]: {
          ...current,
          activePreset: 'custom',
          [field]: value,
        },
      };
    });
  };

  const handleResetAll = () => {
    localStorage.removeItem(STORAGE_KEY);
    setDaysState(INITIAL_DAYS_DATA);
  };

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-[#F4F4F6] flex flex-col items-center">
      {/* Centered Mobile-First Shell (max-w-md) */}
      <div className="w-full max-w-md min-h-screen bg-[#0A0A0A] sm:border-x sm:border-[#2C2C2E] flex flex-col justify-between relative pb-20">
        {/* Sticky Top Header Bar */}
        <header className="sticky top-0 z-30 bg-[#0A0A0A]/90 backdrop-blur-md border-b border-[#2C2C2E] px-4 py-3 space-y-2.5">
          {/* Top Row: Brand Title + Strap Sync Status */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="font-display text-lg font-bold tracking-wider text-white uppercase">
                BIO-SYNC
              </span>
              <span className="text-[10px] font-mono-num uppercase tracking-widest text-[#0EA5E9]">
                APEX 4.0
              </span>
            </div>

            <div className="flex items-center gap-2 text-[11px] text-zinc-300 font-mono-num">
              <BluetoothConnected className="w-3.5 h-3.5 text-[#22C55E]" />
              <span>Синхронизировано</span>
              <span>·</span>
              <span className="flex items-center gap-1 text-[#22C55E] font-semibold">
                <BatteryCharging className="w-4 h-4" />
                84%
              </span>
            </div>
          </div>

          {/* Day Switcher ("Сегодня", "Вчера", "2 дня назад") + Quick Sim Shortcut */}
          <div className="flex items-center justify-between gap-1.5">
            <div className="grid grid-cols-3 gap-1 flex-1 bg-[#121212] p-1 rounded-xl border border-[#2C2C2E]">
              {(['today', 'yesterday', 'twoDaysAgo'] as DayKey[]).map((dKey) => {
                const dObj = daysState[dKey];
                const isSelected = selectedDay === dKey;
                return (
                  <button
                    key={dKey}
                    type="button"
                    onClick={() => setSelectedDay(dKey)}
                    className={`py-1.5 px-2 rounded-lg text-[11px] font-semibold transition-all cursor-pointer truncate ${
                      isSelected
                        ? 'bg-[#2C2C2E] text-white shadow-sm'
                        : 'text-zinc-400 hover:text-zinc-200'
                    }`}
                  >
                    {dObj.title}
                  </button>
                );
              })}
            </div>

            <button
              type="button"
              onClick={() => setActiveTab('journal')}
              title="Открыть био-симулятор состояний"
              className={`px-2.5 py-2 rounded-xl border text-[11px] font-semibold flex items-center gap-1 cursor-pointer shrink-0 transition-colors ${
                activeTab === 'journal'
                  ? 'bg-[#0EA5E9] border-[#0EA5E9] text-white'
                  : 'bg-[#121212] border-[#2C2C2E] text-zinc-300 hover:border-zinc-600'
              }`}
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
              <span>Симулятор</span>
            </button>
          </div>

          {/* Sub-bar with active date & recovery summary */}
          <div className="flex items-center justify-between text-[11px] text-zinc-400 pt-0.5">
            <span className="flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-zinc-500" />
              <span>
                {currentDayData.title} ({currentDayData.dateFormatted})
              </span>
            </span>
            <span className="font-mono-num">
              Recovery{' '}
              <strong style={{ color: currentMetrics.recoveryColor }}>
                {currentMetrics.recoveryScore}%
              </strong>{' '}
              · Strain{' '}
              <strong className="text-[#0EA5E9]">
                {currentMetrics.dayStrain.toFixed(1)}
              </strong>
            </span>
          </div>
        </header>

        {/* Main Viewport Content */}
        <main className="flex-1 px-3.5 pt-3.5">
          {activeTab === 'overview' && (
            <OverviewTab
              dayData={currentDayData}
              metrics={currentMetrics}
              baseline={DEFAULT_BASELINE}
              onAddActivity={handleAddActivity}
              onDeleteActivity={handleDeleteActivity}
              onNavigateTab={(t) => setActiveTab(t)}
            />
          )}

          {activeTab === 'sleep' && (
            <SleepRecoveryTab
              metrics={currentMetrics}
              baseline={DEFAULT_BASELINE}
              weeklyTrend={weeklyTrend}
              onWakeTimeChange={handleWakeTimeChange}
            />
          )}

          {activeTab === 'strain' && (
            <StrainHeartRateTab
              metrics={currentMetrics}
              baseline={DEFAULT_BASELINE}
              onAddZoneMinutes={handleAddZoneMinutes}
            />
          )}

          {activeTab === 'journal' && (
            <JournalSimulatorTab
              dayData={currentDayData}
              metrics={currentMetrics}
              onUpdateJournal={handleUpdateJournal}
              onApplyPreset={handleApplyPreset}
              onDirectSliderChange={handleDirectSliderChange}
              onResetAll={handleResetAll}
            />
          )}
        </main>

        {/* Fixed Bottom Navigation Bar (4 Tabs, Centered max-w-md) */}
        <nav className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-md z-40 bg-[#121212]/95 backdrop-blur-md border-t border-[#2C2C2E] px-2 py-1.5">
          <div className="grid grid-cols-4 gap-1">
            <button
              type="button"
              onClick={() => setActiveTab('overview')}
              className={`min-h-[48px] rounded-xl flex flex-col items-center justify-center transition-colors cursor-pointer ${
                activeTab === 'overview'
                  ? 'text-white bg-[#1C1C1E]'
                  : 'text-zinc-500 hover:text-zinc-300'
              }`}
            >
              <LayoutDashboard
                className={`w-5 h-5 ${
                  activeTab === 'overview' ? 'text-[#22C55E]' : ''
                }`}
              />
              <span className="text-[10px] font-semibold mt-1">Обзор</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('sleep')}
              className={`min-h-[48px] rounded-xl flex flex-col items-center justify-center transition-colors cursor-pointer ${
                activeTab === 'sleep'
                  ? 'text-white bg-[#1C1C1E]'
                  : 'text-zinc-500 hover:text-zinc-300'
              }`}
            >
              <Moon
                className={`w-5 h-5 ${
                  activeTab === 'sleep' ? 'text-[#38BDF8]' : ''
                }`}
              />
              <span className="text-[10px] font-semibold mt-1">Сон</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('strain')}
              className={`min-h-[48px] rounded-xl flex flex-col items-center justify-center transition-colors cursor-pointer ${
                activeTab === 'strain'
                  ? 'text-white bg-[#1C1C1E]'
                  : 'text-zinc-500 hover:text-zinc-300'
              }`}
            >
              <Activity
                className={`w-5 h-5 ${
                  activeTab === 'strain' ? 'text-[#0EA5E9]' : ''
                }`}
              />
              <span className="text-[10px] font-semibold mt-1">Нагрузка</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('journal')}
              className={`min-h-[48px] rounded-xl flex flex-col items-center justify-center transition-colors cursor-pointer ${
                activeTab === 'journal'
                  ? 'text-white bg-[#1C1C1E]'
                  : 'text-zinc-500 hover:text-zinc-300'
              }`}
            >
              <ClipboardList
                className={`w-5 h-5 ${
                  activeTab === 'journal' ? 'text-[#EAB308]' : ''
                }`}
              />
              <span className="text-[10px] font-semibold mt-1">
                Дневник и Сим
              </span>
            </button>
          </div>
        </nav>
      </div>
    </div>
  );
}
