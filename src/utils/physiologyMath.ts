export type RecoveryZone = 'green' | 'yellow' | 'red';

export type SleepStageType = 'awake' | 'light' | 'rem' | 'sws';

export type DayKey = 'today' | 'yesterday' | 'twoDaysAgo';

export type PresetScenarioId = 'custom' | 'peak' | 'post_workout' | 'party_sick';

export interface BaselineStats {
  hrv: number;           // 65 ms
  rhr: number;           // 52 bpm
  respRate: number;      // 14.5 rpm
  spo2: number;          // 98 %
  sleepNeedHours: number; // 8.0 hours
  maxHr: number;         // 190 bpm
}

export const DEFAULT_BASELINE: BaselineStats = {
  hrv: 65,
  rhr: 52,
  respRate: 14.5,
  spo2: 98,
  sleepNeedHours: 8.0,
  maxHr: 190,
};

export interface HeartRateZoneBreakdown {
  zone1Minutes: number; // 50–60% HRmax (95–114 bpm)
  zone2Minutes: number; // 60–70% HRmax (114–133 bpm)
  zone3Minutes: number; // 70–80% HRmax (133–152 bpm)
  zone4Minutes: number; // 80–90% HRmax (152–171 bpm)
  zone5Minutes: number; // 90–100% HRmax (171–190 bpm)
}

export type SportCategory =
  | 'Бег'
  | 'Силовая тренировка'
  | 'Велоспорт'
  | 'Функциональный кроссфит'
  | 'Плавание'
  | 'Бокс / ММА'
  | 'Йога / Восстановление';

export interface ActivitySession {
  id: string;
  title: string;
  sportType: SportCategory;
  startTime: string;
  durationMinutes: number;
  avgHr: number;
  maxHr: number;
  calories: number;
  strain: number;
  zones: HeartRateZoneBreakdown;
}

export interface SleepStageDurations {
  awakeMinutes: number;
  lightMinutes: number;
  remMinutes: number;
  swsMinutes: number; // Deep / Slow Wave Sleep
}

export interface SleepTimelineBlock {
  timeLabel: string;
  stage: SleepStageType;
  level: number; // 4: Awake, 3: REM, 2: Light, 1: Deep (SWS)
  durationMin: number;
  hr: number;
}

export interface JournalEntries {
  alcohol: boolean;          // Алкоголь (Да/Нет — при "Да" резко снижает HRV и Recovery, повышает RHR)
  lateCaffeine: boolean;     // Кофеин после 14:00 (Да/Нет — снижает долю глубокого сна)
  lateMeal: boolean;         // Поздний прием пищи (Да/Нет)
  magnesium: boolean;        // Магний / Добавки перед сном (Да/Нет — улучшает качество сна)
  stressLevel: number;       // Уровень стресса (шкала 1–5)
  hydration: boolean;        // Гидратация (Да/Нет)
}

export interface DayRawData {
  key: DayKey;
  title: string;          // "Сегодня", "Вчера", "2 дня назад"
  dateFormatted: string;  // "Пн, 16 ноя"
  baseHrv: number;        // ms before journal modifiers
  baseRhr: number;        // bpm before journal modifiers
  baseRespRate: number;   // rpm
  baseSpo2: number;       // %
  sleepStages: SleepStageDurations;
  sleepDebtHours: number; // Accumulated sleep debt in hours
  yesterdayStrain: number;
  wakeTime: string;       // e.g., "06:45"
  activities: ActivitySession[];
  journal: JournalEntries;
  activePreset: PresetScenarioId;
}

export interface WeeklyTrendPoint {
  dayShort: string;
  dateLabel: string;
  hrv: number;
  rhr: number;
  recovery: number;
  strain: number;
  sleepPerf: number;
}

export interface CalculatedDayMetrics {
  // Effective physiological biomarkers (after Journal & Simulator modifiers)
  effectiveHrv: number;
  effectiveRhr: number;
  effectiveRespRate: number;
  effectiveSpo2: number;
  effectiveSleepStages: SleepStageDurations;

  // Recovery (0 - 100%)
  recoveryScore: number;
  recoveryZone: RecoveryZone;
  recoveryColor: string;
  recoveryStatusText: string;
  hrvComponentScore: number;   // 0-100 (weighted 50%)
  rhrComponentScore: number;   // 0-100 (weighted 30%)
  sleepComponentScore: number; // 0-100 (weighted 20%)

  // Strain (0.0 - 21.0)
  dayStrain: number;
  optimalStrainRange: [number, number];
  optimalStrainTarget: number;
  totalZones: HeartRateZoneBreakdown;
  totalActiveMinutes: number;
  totalCalories: number;
  cardioImpulseLoad: number;

  // Sleep Metrics
  sleepPerformance: number;    // 0-100%
  actualSleepHours: number;
  timeInBedHours: number;
  sleepNeedHours: number;      // 8.0 + strain supplement + sleep debt
  sleepDebtHours: number;
  sleepEfficiencyPct: number;
  restorativeHours: number;    // REM + Deep SWS
  restorativePct: number;
  recommendedBedtime: string;  // e.g., "22:15"
  targetWakeTime: string;      // e.g., "06:45"

  // Strain Coach Calculator (minutes needed in Zone 3 or Zone 4 to hit Optimal Target)
  minutesNeededZone3: number;
  minutesNeededZone4: number;

  // AI Coach Daily Insight in Russian
  aiInsightHeadline: string;
  aiInsightBody: string;
  aiInsightBullets: string[];
}

export function getRecoveryZone(score: number): RecoveryZone {
  if (score >= 67) return 'green';
  if (score >= 34) return 'yellow';
  return 'red';
}

export function getRecoveryHex(score: number): string {
  if (score >= 67) return '#22C55E';
  if (score >= 34) return '#EAB308';
  return '#EF4444';
}

export function getRecoveryLabel(score: number): string {
  if (score >= 67) return 'Готов к пиковым нагрузкам';
  if (score >= 34) return 'Поддерживающий режим';
  return 'Требуется восстановление';
}

/**
 * Apply Morning Journal Habit Modifiers to raw biomarkers & sleep architecture
 */
export function applyJournalModifiers(raw: DayRawData): {
  hrv: number;
  rhr: number;
  respRate: number;
  spo2: number;
  sleepStages: SleepStageDurations;
} {
  // If user directly triggered one of the 3 exact preset scenarios, we keep the base values exact
  // and only apply additional deltas if they toggle journal habits differently from the preset's baseline.
  let hrv = raw.baseHrv;
  let rhr = raw.baseRhr;
  let respRate = raw.baseRespRate;
  let spo2 = raw.baseSpo2;
  let { awakeMinutes, lightMinutes, remMinutes, swsMinutes } = raw.sleepStages;

  const j = raw.journal;

  // If custom mode, journal switches directly transform physiological state
  if (raw.activePreset === 'custom') {
    if (j.alcohol) {
      hrv -= 22;
      rhr += 9;
      respRate += 1.1;
      spo2 -= 1;
      remMinutes = Math.max(25, Math.round(remMinutes * 0.68));
      awakeMinutes += 24;
    }
    if (j.lateCaffeine) {
      swsMinutes = Math.max(30, Math.round(swsMinutes * 0.78));
      awakeMinutes += 12;
      hrv -= 4;
    }
    if (j.lateMeal) {
      rhr += 3;
      hrv -= 5;
      awakeMinutes += 10;
    }
    if (j.magnesium) {
      swsMinutes = Math.round(swsMinutes * 1.15);
      remMinutes = Math.round(remMinutes * 1.08);
      hrv += 6;
      rhr -= 1;
    }
    if (j.hydration) {
      hrv += 3;
      rhr -= 1;
    } else {
      hrv -= 4;
      rhr += 2;
    }

    // Stress scale 1-5 (3 is neutral)
    const stressDelta = j.stressLevel - 3;
    hrv -= stressDelta * 4;
    rhr += stressDelta * 1.5;
    respRate += stressDelta * 0.25;
  }

  return {
    hrv: Math.max(15, Math.min(140, Math.round(hrv))),
    rhr: Math.max(38, Math.min(95, Math.round(rhr))),
    respRate: Number(Math.max(11.5, Math.min(21.0, respRate)).toFixed(1)),
    spo2: Math.max(91, Math.min(100, Math.round(spo2))),
    sleepStages: {
      awakeMinutes: Math.max(10, awakeMinutes),
      lightMinutes: Math.max(60, lightMinutes),
      remMinutes: Math.max(20, remMinutes),
      swsMinutes: Math.max(20, swsMinutes),
    },
  };
}

/**
 * 1. RECOVERY SCORE ENGINE (0% - 100%)
 * Weighted sum:
 * - 50% — HRV deviation from Baseline (65 ms)
 * - 30% — RHR deviation from Baseline (52 bpm)
 * - 20% — Sleep Performance (%)
 */
export function computeRecoveryScore(
  hrv: number,
  rhr: number,
  sleepPerformance: number,
  baseline: BaselineStats = DEFAULT_BASELINE
): {
  recoveryScore: number;
  hrvComponentScore: number;
  rhrComponentScore: number;
  sleepComponentScore: number;
} {
  // HRV Component (0 - 100):
  // At baseline (65 ms) -> ~70 pts. At 88 ms -> ~96 pts. At 31 ms -> ~12 pts.
  const hrvDiff = hrv - baseline.hrv;
  const hrvRaw = 70 + (hrvDiff >= 0 ? Math.pow(hrvDiff, 0.85) * 2.15 : -Math.pow(Math.abs(hrvDiff), 0.92) * 1.85);
  const hrvComponentScore = Math.max(0, Math.min(100, Math.round(hrvRaw)));

  // RHR Component (0 - 100):
  // Lower RHR than 52 bpm is better. At 52 bpm -> 70 pts. At 47 bpm -> 92 pts. At 68 bpm -> 8 pts.
  const rhrDiff = baseline.rhr - rhr; // positive when today's RHR is lower than baseline
  const rhrRaw = 70 + (rhrDiff >= 0 ? rhrDiff * 4.4 : rhrDiff * 3.9);
  const rhrComponentScore = Math.max(0, Math.min(100, Math.round(rhrRaw)));

  // Sleep Performance Component (0 - 100):
  const sleepComponentScore = Math.max(0, Math.min(100, Math.round(sleepPerformance)));

  // Exact 50% / 30% / 20% weighting
  const weightedRecovery =
    0.5 * hrvComponentScore +
    0.3 * rhrComponentScore +
    0.2 * sleepComponentScore;

  const recoveryScore = Math.max(1, Math.min(99, Math.round(weightedRecovery)));

  return {
    recoveryScore,
    hrvComponentScore,
    rhrComponentScore,
    sleepComponentScore,
  };
}

/**
 * 2. LOGARITHMIC DAY STRAIN ENGINE (0.0 - 21.0)
 * Based on time spent in 5 HR zones + basal metabolic daytime activity.
 * Getting the first 10 points is easy; past 18 is exponentially hard.
 */
export function calculateStrainFromImpulse(impulse: number): number {
  if (impulse <= 0) return 0;
  // Calibrated logarithmic curve:
  // Basal day load (~32 impulse) -> ~4.2 Strain
  // Moderate workout (~180 impulse) -> ~11.5 Strain
  // Hard endurance session (~360 impulse) -> ~15.4 Strain
  // Brutal CrossFit / Marathon (~720 impulse) -> ~18.6+ Strain
  const raw = 21 * (1 - Math.exp(-0.0068 * Math.pow(impulse, 0.88)));
  return Math.min(20.9, Math.max(0, Number(raw.toFixed(1))));
}

export function computeImpulseFromZones(
  zones: HeartRateZoneBreakdown,
  includeBasalLoad = true
): number {
  const zoneImpulse =
    zones.zone1Minutes * 1.1 +
    zones.zone2Minutes * 2.4 +
    zones.zone3Minutes * 5.0 +
    zones.zone4Minutes * 9.8 +
    zones.zone5Minutes * 18.5;

  const basalLoad = includeBasalLoad ? 32 : 0;
  return zoneImpulse + basalLoad;
}

export function calculateDayStrain(
  zones: HeartRateZoneBreakdown,
  includeBasalLoad = true
): { strain: number; impulse: number; calories: number } {
  const impulse = computeImpulseFromZones(zones, includeBasalLoad);
  const strain = calculateStrainFromImpulse(impulse);

  // Active + Basal kilocalories estimation
  const activeCalories = Math.round(
    zones.zone1Minutes * 5.5 +
    zones.zone2Minutes * 8.2 +
    zones.zone3Minutes * 11.4 +
    zones.zone4Minutes * 14.8 +
    zones.zone5Minutes * 18.6
  );
  const basalCalories = includeBasalLoad ? 1680 : 0;

  return {
    strain,
    impulse: Math.round(impulse),
    calories: basalCalories + activeCalories,
  };
}

/**
 * Estimate HR zone distribution & workout Strain when user logs a workout
 * given Sport Type, Duration (minutes), and Average HR (bpm)
 */
export function buildWorkoutFromInput(
  sportType: SportCategory,
  durationMinutes: number,
  avgHr: number,
  startTime = '17:30',
  maxHr = DEFAULT_BASELINE.maxHr
): ActivitySession {
  const hrPct = avgHr / maxHr;
  let z1 = 0, z2 = 0, z3 = 0, z4 = 0, z5 = 0;

  if (hrPct < 0.62) {
    z1 = Math.round(durationMinutes * 0.7);
    z2 = durationMinutes - z1;
  } else if (hrPct < 0.72) {
    z1 = Math.round(durationMinutes * 0.15);
    z2 = Math.round(durationMinutes * 0.60);
    z3 = durationMinutes - z1 - z2;
  } else if (hrPct < 0.81) {
    z1 = Math.round(durationMinutes * 0.08);
    z2 = Math.round(durationMinutes * 0.22);
    z3 = Math.round(durationMinutes * 0.48);
    z4 = durationMinutes - z1 - z2 - z3;
  } else if (hrPct < 0.89) {
    z2 = Math.round(durationMinutes * 0.12);
    z3 = Math.round(durationMinutes * 0.28);
    z4 = Math.round(durationMinutes * 0.45);
    z5 = durationMinutes - z2 - z3 - z4;
  } else {
    z3 = Math.round(durationMinutes * 0.15);
    z4 = Math.round(durationMinutes * 0.40);
    z5 = durationMinutes - z3 - z4;
  }

  const zones: HeartRateZoneBreakdown = {
    zone1Minutes: z1,
    zone2Minutes: z2,
    zone3Minutes: z3,
    zone4Minutes: z4,
    zone5Minutes: z5,
  };

  const { strain, calories } = calculateDayStrain(zones, false);
  const estMaxHr = Math.min(202, Math.round(avgHr * 1.14));

  return {
    id: `act-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    title: sportType,
    sportType,
    startTime,
    durationMinutes,
    avgHr,
    maxHr: estMaxHr,
    calories,
    strain,
    zones,
  };
}

/**
 * 3. OPTIMAL STRAIN TARGET & STRAIN COACH CALCULATOR
 */
export function computeOptimalStrainRange(recoveryScore: number): {
  range: [number, number];
  target: number;
} {
  if (recoveryScore >= 80) {
    return { range: [14.0, 17.5], target: 15.8 };
  }
  if (recoveryScore >= 67) {
    return { range: [13.0, 16.2], target: 14.6 };
  }
  if (recoveryScore >= 50) {
    return { range: [10.0, 13.5], target: 11.8 };
  }
  if (recoveryScore >= 34) {
    return { range: [7.5, 11.0], target: 9.2 };
  }
  return { range: [0.0, 5.0], target: 4.0 };
}

/**
 * Calculate how many additional minutes in Zone 3 or Zone 4 are needed to reach optimalStrainTarget
 */
export function calculateRemainingZoneMinutes(
  currentImpulse: number,
  targetStrain: number
): { minutesZone3: number; minutesZone4: number } {
  // Invert Strain = 21 * (1 - exp(-0.0068 * Impulse^0.88))
  const clampedTarget = Math.min(20.4, Math.max(1, targetStrain));
  const ratio = 1 - clampedTarget / 21;
  const requiredImpulse = Math.pow(-Math.log(ratio) / 0.0068, 1 / 0.88);

  const deficitImpulse = Math.max(0, requiredImpulse - currentImpulse);
  // Zone 3 weight = 5.0 impulse/min; Zone 4 weight = 9.8 impulse/min
  const minutesZone3 = Math.ceil(deficitImpulse / 5.0);
  const minutesZone4 = Math.ceil(deficitImpulse / 9.8);

  return { minutesZone3, minutesZone4 };
}

/**
 * 4. SLEEP PERFORMANCE & SLEEP PLANNER (Bedtime recommendation)
 */
export function computeSleepDetails(
  stages: SleepStageDurations,
  yesterdayStrain: number,
  sleepDebtHours: number,
  wakeTime: string,
  baselineNeedHours = DEFAULT_BASELINE.sleepNeedHours
) {
  const actualSleepMinutes = stages.lightMinutes + stages.remMinutes + stages.swsMinutes;
  const timeInBedMinutes = actualSleepMinutes + stages.awakeMinutes;

  const actualSleepHours = Number((actualSleepMinutes / 60).toFixed(2));
  const timeInBedHours = Number((timeInBedMinutes / 60).toFixed(2));

  // Extra sleep required from Strain (up to ~0.75h for high strain)
  const strainExtraHours = yesterdayStrain > 10 ? (yesterdayStrain - 10) * 0.06 : 0;
  const sleepNeedHours = Number(
    (baselineNeedHours + strainExtraHours + sleepDebtHours * 0.5).toFixed(2)
  );

  const sleepPerformance = Math.max(
    15,
    Math.min(100, Math.round((actualSleepHours / Math.max(6.5, sleepNeedHours)) * 100))
  );

  const sleepEfficiencyPct =
    timeInBedMinutes > 0 ? Math.round((actualSleepMinutes / timeInBedMinutes) * 100) : 0;

  const restorativeMinutes = stages.remMinutes + stages.swsMinutes;
  const restorativeHours = Number((restorativeMinutes / 60).toFixed(2));
  const restorativePct =
    actualSleepMinutes > 0 ? Math.round((restorativeMinutes / actualSleepMinutes) * 100) : 0;

  // Dynamic Sleep Debt based on shortfall from 8.0h baseline
  const tonightShortfall = Math.max(0, Number((sleepNeedHours - actualSleepHours).toFixed(2)));
  const totalSleepDebtHours = Number(Math.max(0, (sleepDebtHours * 0.5 + tonightShortfall)).toFixed(1));

  // Calculate recommended bedtime to achieve 100% of tonight's sleep need before wakeTime (e.g. "06:45")
  const [wakeH, wakeM] = wakeTime.split(':').map(Number);
  const wakeTotalMinutes = wakeH * 60 + wakeM;
  // Account for ~90% sleep efficiency in bed
  const neededMinutesInBed = Math.round(( (baselineNeedHours + totalSleepDebtHours * 0.6) * 60 ) / 0.92);
  let bedtimeMinutes = (wakeTotalMinutes - neededMinutesInBed + 1440) % 1440;
  // Round to nearest 5 mins
  bedtimeMinutes = Math.round(bedtimeMinutes / 5) * 5;
  const bedH = Math.floor(bedtimeMinutes / 60).toString().padStart(2, '0');
  const bedM = (bedtimeMinutes % 60).toString().padStart(2, '0');
  const recommendedBedtime = `${bedH}:${bedM}`;

  return {
    sleepPerformance,
    actualSleepHours,
    timeInBedHours,
    sleepNeedHours,
    sleepDebtHours: totalSleepDebtHours,
    sleepEfficiencyPct,
    restorativeHours,
    restorativePct,
    recommendedBedtime,
    targetWakeTime: wakeTime,
  };
}

/**
 * 5. ALGORITHMIC AI COACH (Daily Insight in Russian)
 */
export function generateAiCoachInsight(
  recoveryScore: number,
  hrv: number,
  rhr: number,
  dayStrain: number,
  optimalRange: [number, number],
  sleepPerformance: number,
  journal: JournalEntries,
  baseline: BaselineStats = DEFAULT_BASELINE
): {
  headline: string;
  body: string;
  bullets: string[];
} {
  const hrvDeltaPct = Math.round(((hrv - baseline.hrv) / baseline.hrv) * 100);
  const rhrDelta = rhr - baseline.rhr;
  const bullets: string[] = [];

  if (journal.alcohol) {
    bullets.push('Алкоголь вызвал подавление парасимпатической системы: резкое падение ВСР и учащение ЧСС покоя.');
  }
  if (journal.lateCaffeine) {
    bullets.push('Кофеин после 14:00 сократил продолжительность медленноволнового глубокого сна (Deep / SWS).');
  }
  if (journal.magnesium) {
    bullets.push('Прием магния перед сном поддержал архитектуру восстановительных фаз (REM + Deep).');
  }
  if (journal.stressLevel >= 4) {
    bullets.push(`Высокий субъективный стресс (${journal.stressLevel}/5) коррелирует с повышенным симпатическим тонусом.`);
  }
  if (bullets.length === 0) {
    bullets.push(
      `ВСР ${hrv} мс (${hrvDeltaPct >= 0 ? `+${hrvDeltaPct}%` : `${hrvDeltaPct}%`} к 30-дневной норме), ЧСС покоя ${rhr} уд/мин.`
    );
  }

  if (recoveryScore >= 67) {
    return {
      headline: `Зеленая зона (${recoveryScore}%): ЦНС готова к пиковым нагрузкам`,
      body: `Ваша вариабельность сердечного ритма (${hrv} мс) на ${Math.max(0, hrvDeltaPct)}% выше базовой линии (${baseline.hrv} мс), а пульс покоя снизился до ${rhr} уд/мин. Эффективность сна составила ${sleepPerformance}%. Сегодня оптимальный день для интервальной работы в Зонах 4–5 или тяжелой силовой сессии. Целевой коридор Strain: ${optimalRange[0].toFixed(1)}–${optimalRange[1].toFixed(1)}.`,
      bullets,
    };
  }

  if (recoveryScore >= 34) {
    return {
      headline: `Желтая зона (${recoveryScore}%): Режим поддержания формы`,
      body: `Организм находится в фазе компенсации после накопленной нагрузки (вчерашний Strain или умеренный дефицит сна). ВСР составляет ${hrv} мс при базовой норме ${baseline.hrv} мс, пульс покоя ${rhr} уд/мин. Рекомендуется аэробная работа в Зонах 2–3 без предельного закисления. Оптимальный Strain на сегодня: ${optimalRange[0].toFixed(1)}–${optimalRange[1].toFixed(1)}.`,
      bullets,
    };
  }

  return {
    headline: `Красная зона (${recoveryScore}%): Острый дефицит восстановления`,
    body: `Зафиксировано выраженное угнетение парасимпатического тонуса: ВСР упала до ${hrv} мс (${hrvDeltaPct}% от нормы), а ЧСС покоя повышена на +${Math.max(1, rhrDelta)} уд/мин (${rhr} уд/мин). Высокоинтенсивная тренировка сегодня приведет к перетренированности. Ограничьте дневной Strain диапазоном ${optimalRange[0].toFixed(1)}–${optimalRange[1].toFixed(1)} (прогулка, МФР, дыхательные практики и ранний отбой).`,
    bullets,
  };
}

/**
 * Master Evaluation Function for any DayRawData
 */
export function evaluateDayData(
  raw: DayRawData,
  baseline: BaselineStats = DEFAULT_BASELINE
): CalculatedDayMetrics {
  const modified = applyJournalModifiers(raw);

  const sleep = computeSleepDetails(
    modified.sleepStages,
    raw.yesterdayStrain,
    raw.sleepDebtHours,
    raw.wakeTime,
    baseline.sleepNeedHours
  );

  const recovery = computeRecoveryScore(
    modified.hrv,
    modified.rhr,
    sleep.sleepPerformance,
    baseline
  );

  // Sum all activity zones for the day
  const totalZones: HeartRateZoneBreakdown = raw.activities.reduce(
    (acc, act) => ({
      zone1Minutes: acc.zone1Minutes + act.zones.zone1Minutes,
      zone2Minutes: acc.zone2Minutes + act.zones.zone2Minutes,
      zone3Minutes: acc.zone3Minutes + act.zones.zone3Minutes,
      zone4Minutes: acc.zone4Minutes + act.zones.zone4Minutes,
      zone5Minutes: acc.zone5Minutes + act.zones.zone5Minutes,
    }),
    { zone1Minutes: 0, zone2Minutes: 0, zone3Minutes: 0, zone4Minutes: 0, zone5Minutes: 0 }
  );

  const totalActiveMinutes =
    totalZones.zone1Minutes +
    totalZones.zone2Minutes +
    totalZones.zone3Minutes +
    totalZones.zone4Minutes +
    totalZones.zone5Minutes;

  const strainResult = calculateDayStrain(totalZones, true);
  const optimal = computeOptimalStrainRange(recovery.recoveryScore);
  const remaining = calculateRemainingZoneMinutes(strainResult.impulse, optimal.target);

  const aiInsight = generateAiCoachInsight(
    recovery.recoveryScore,
    modified.hrv,
    modified.rhr,
    strainResult.strain,
    optimal.range,
    sleep.sleepPerformance,
    raw.journal,
    baseline
  );

  return {
    effectiveHrv: modified.hrv,
    effectiveRhr: modified.rhr,
    effectiveRespRate: modified.respRate,
    effectiveSpo2: modified.spo2,
    effectiveSleepStages: modified.sleepStages,

    recoveryScore: recovery.recoveryScore,
    recoveryZone: getRecoveryZone(recovery.recoveryScore),
    recoveryColor: getRecoveryHex(recovery.recoveryScore),
    recoveryStatusText: getRecoveryLabel(recovery.recoveryScore),
    hrvComponentScore: recovery.hrvComponentScore,
    rhrComponentScore: recovery.rhrComponentScore,
    sleepComponentScore: recovery.sleepComponentScore,

    dayStrain: strainResult.strain,
    optimalStrainRange: optimal.range,
    optimalStrainTarget: optimal.target,
    totalZones,
    totalActiveMinutes,
    totalCalories: strainResult.calories,
    cardioImpulseLoad: strainResult.impulse,

    sleepPerformance: sleep.sleepPerformance,
    actualSleepHours: sleep.actualSleepHours,
    timeInBedHours: sleep.timeInBedHours,
    sleepNeedHours: sleep.sleepNeedHours,
    sleepDebtHours: sleep.sleepDebtHours,
    sleepEfficiencyPct: sleep.sleepEfficiencyPct,
    restorativeHours: sleep.restorativeHours,
    restorativePct: sleep.restorativePct,
    recommendedBedtime: sleep.recommendedBedtime,
    targetWakeTime: sleep.targetWakeTime,

    minutesNeededZone3: remaining.minutesZone3,
    minutesNeededZone4: remaining.minutesZone4,

    aiInsightHeadline: aiInsight.headline,
    aiInsightBody: aiInsight.body,
    aiInsightBullets: aiInsight.bullets,
  };
}

export function formatHm(hoursDecimal: number): string {
  const totalMinutes = Math.round(hoursDecimal * 60);
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  return `${h}ч ${m.toString().padStart(2, '0')}м`;
}

export function formatMinutesRus(mins: number): string {
  const h = Math.floor(mins / 60);
  const m = Math.round(mins % 60);
  if (h === 0) return `${m} мин`;
  return `${h}ч ${m.toString().padStart(2, '0')}м`;
}
