import {
  DayKey,
  DayRawData,
  PresetScenarioId,
  SleepTimelineBlock,
  WeeklyTrendPoint,
} from '../utils/physiologyMath';

export const INITIAL_DAYS_DATA: Record<DayKey, DayRawData> = {
  today: {
    key: 'today',
    title: 'Сегодня',
    dateFormatted: 'Пн, 16 ноя',
    baseHrv: 78,
    baseRhr: 49,
    baseRespRate: 14.3,
    baseSpo2: 98,
    sleepStages: {
      awakeMinutes: 34,
      lightMinutes: 235,
      remMinutes: 118,
      swsMinutes: 105,
    },
    sleepDebtHours: 0.4,
    yesterdayStrain: 14.2,
    wakeTime: '06:45',
    activePreset: 'custom',
    journal: {
      alcohol: false,
      lateCaffeine: false,
      lateMeal: false,
      magnesium: true,
      stressLevel: 2,
      hydration: true,
    },
    activities: [
      {
        id: 'act-today-1',
        title: 'Интервальный бег',
        sportType: 'Бег',
        startTime: '08:15',
        durationMinutes: 45,
        avgHr: 158,
        maxHr: 181,
        calories: 560,
        strain: 13.4,
        zones: {
          zone1Minutes: 4,
          zone2Minutes: 9,
          zone3Minutes: 14,
          zone4Minutes: 13,
          zone5Minutes: 5,
        },
      },
      {
        id: 'act-today-2',
        title: 'Силовая тренировка',
        sportType: 'Силовая тренировка',
        startTime: '17:40',
        durationMinutes: 60,
        avgHr: 136,
        maxHr: 164,
        calories: 485,
        strain: 11.2,
        zones: {
          zone1Minutes: 14,
          zone2Minutes: 22,
          zone3Minutes: 16,
          zone4Minutes: 8,
          zone5Minutes: 0,
        },
      },
    ],
  },

  yesterday: {
    key: 'yesterday',
    title: 'Вчера',
    dateFormatted: 'Вс, 15 ноя',
    baseHrv: 61,
    baseRhr: 54,
    baseRespRate: 14.7,
    baseSpo2: 97,
    sleepStages: {
      awakeMinutes: 42,
      lightMinutes: 220,
      remMinutes: 95,
      swsMinutes: 86,
    },
    sleepDebtHours: 0.8,
    yesterdayStrain: 16.8,
    wakeTime: '07:15',
    activePreset: 'custom',
    journal: {
      alcohol: false,
      lateCaffeine: true,
      lateMeal: false,
      magnesium: false,
      stressLevel: 3,
      hydration: true,
    },
    activities: [
      {
        id: 'act-yest-1',
        title: 'Шоссейный велозаезд',
        sportType: 'Велоспорт',
        startTime: '10:30',
        durationMinutes: 75,
        avgHr: 149,
        maxHr: 175,
        calories: 820,
        strain: 14.2,
        zones: {
          zone1Minutes: 8,
          zone2Minutes: 20,
          zone3Minutes: 28,
          zone4Minutes: 15,
          zone5Minutes: 4,
        },
      },
    ],
  },

  twoDaysAgo: {
    key: 'twoDaysAgo',
    title: '2 дня назад',
    dateFormatted: 'Сб, 14 ноя',
    baseHrv: 36,
    baseRhr: 63,
    baseRespRate: 15.9,
    baseSpo2: 95,
    sleepStages: {
      awakeMinutes: 58,
      lightMinutes: 185,
      remMinutes: 54,
      swsMinutes: 52,
    },
    sleepDebtHours: 1.6,
    yesterdayStrain: 15.4,
    wakeTime: '08:00',
    activePreset: 'custom',
    journal: {
      alcohol: true,
      lateCaffeine: true,
      lateMeal: true,
      magnesium: false,
      stressLevel: 4,
      hydration: false,
    },
    activities: [
      {
        id: 'act-2d-1',
        title: 'Йога и МФР раскатка',
        sportType: 'Йога / Восстановление',
        startTime: '13:00',
        durationMinutes: 35,
        avgHr: 104,
        maxHr: 121,
        calories: 180,
        strain: 5.4,
        zones: {
          zone1Minutes: 25,
          zone2Minutes: 10,
          zone3Minutes: 0,
          zone4Minutes: 0,
          zone5Minutes: 0,
        },
      },
    ],
  },
};

export interface ScenarioPresetConfig {
  id: PresetScenarioId;
  title: string;
  subtitle: string;
  badgeText: string;
  badgeColor: string;
  applyToDay: (current: DayRawData) => DayRawData;
}

export const PRESET_SCENARIOS: ScenarioPresetConfig[] = [
  {
    id: 'peak',
    title: 'Сценарий 1: «Пиковая форма»',
    subtitle: 'HRV 88 мс • RHR 47 уд/мин • Сон 98% → Recovery ~94% (Зеленая зона)',
    badgeText: 'GREEN • PEAK',
    badgeColor: '#22C55E',
    applyToDay: (current) => ({
      ...current,
      activePreset: 'peak',
      baseHrv: 88,
      baseRhr: 47,
      baseRespRate: 14.1,
      baseSpo2: 99,
      sleepDebtHours: 0.0,
      yesterdayStrain: 11.4,
      sleepStages: {
        awakeMinutes: 24,
        lightMinutes: 230,
        remMinutes: 132,
        swsMinutes: 118, // ~8.0h actual sleep -> ~98% Sleep Performance
      },
      journal: {
        alcohol: false,
        lateCaffeine: false,
        lateMeal: false,
        magnesium: true,
        stressLevel: 1,
        hydration: true,
      },
      activities: [
        {
          id: 'preset-peak-1',
          title: 'Скоростной бег (Темповик)',
          sportType: 'Бег',
          startTime: '09:00',
          durationMinutes: 50,
          avgHr: 162,
          maxHr: 185,
          calories: 640,
          strain: 14.8,
          zones: {
            zone1Minutes: 4,
            zone2Minutes: 8,
            zone3Minutes: 15,
            zone4Minutes: 16,
            zone5Minutes: 7,
          },
        },
      ],
    }),
  },
  {
    id: 'post_workout',
    title: 'Сценарий 2: «После тяжелой тренировки»',
    subtitle: 'Strain 18.6 • HRV 58 мс • RHR 55 уд/мин → Recovery ~52% (Желтая зона)',
    badgeText: 'YELLOW • STRAINED',
    badgeColor: '#EAB308',
    applyToDay: (current) => ({
      ...current,
      activePreset: 'post_workout',
      baseHrv: 58,
      baseRhr: 55,
      baseRespRate: 15.0,
      baseSpo2: 97,
      sleepDebtHours: 0.9,
      yesterdayStrain: 18.6,
      sleepStages: {
        awakeMinutes: 38,
        lightMinutes: 215,
        remMinutes: 94,
        swsMinutes: 88,
      },
      journal: {
        alcohol: false,
        lateCaffeine: true,
        lateMeal: false,
        magnesium: true,
        stressLevel: 3,
        hydration: true,
      },
      activities: [
        {
          id: 'preset-hard-1',
          title: 'Тяжелый CrossFit WOD + Выносливость',
          sportType: 'Функциональный кроссфит',
          startTime: '11:00',
          durationMinutes: 85,
          avgHr: 168,
          maxHr: 189,
          calories: 1120,
          strain: 18.1,
          zones: {
            zone1Minutes: 5,
            zone2Minutes: 10,
            zone3Minutes: 20,
            zone4Minutes: 30,
            zone5Minutes: 20,
          },
        },
      ],
    }),
  },
  {
    id: 'party_sick',
    title: 'Сценарий 3: «Вечеринка / Недосып / Болезнь»',
    subtitle: 'Алкоголь: Да • Сон 4.5 ч • HRV 31 мс • RHR 68 → Recovery ~14% (Красная зона)',
    badgeText: 'RED • CRITICAL',
    badgeColor: '#EF4444',
    applyToDay: (current) => ({
      ...current,
      activePreset: 'party_sick',
      baseHrv: 31,
      baseRhr: 68,
      baseRespRate: 16.8,
      baseSpo2: 94,
      sleepDebtHours: 2.8,
      yesterdayStrain: 15.2,
      sleepStages: {
        awakeMinutes: 64,
        lightMinutes: 170,
        remMinutes: 52,
        swsMinutes: 48, // 270 min = 4.5 hours actual sleep
      },
      journal: {
        alcohol: true,
        lateCaffeine: true,
        lateMeal: true,
        magnesium: false,
        stressLevel: 5,
        hydration: false,
      },
      activities: [],
    }),
  },
];

/**
 * Generate realistic nocturnal sleep hypnogram blocks based on sleep stage durations
 */
export function buildSleepHypnogram(
  awakeMin: number,
  lightMin: number,
  remMin: number,
  swsMin: number,
  rhr: number
): SleepTimelineBlock[] {
  const totalMin = awakeMin + lightMin + remMin + swsMin;
  const scale = totalMin / 450; // normalize relative to ~7.5h structure

  return [
    { timeLabel: '23:00', stage: 'awake', level: 4, durationMin: Math.round(12 * scale), hr: rhr + 12 },
    { timeLabel: '23:20', stage: 'light', level: 2, durationMin: Math.round(35 * scale), hr: rhr + 4 },
    { timeLabel: '00:00', stage: 'sws', level: 1, durationMin: Math.round(swsMin * 0.48), hr: rhr - 2 },
    { timeLabel: '01:05', stage: 'light', level: 2, durationMin: Math.round(lightMin * 0.25), hr: rhr + 2 },
    { timeLabel: '01:55', stage: 'rem', level: 3, durationMin: Math.round(remMin * 0.28), hr: rhr + 6 },
    { timeLabel: '02:30', stage: 'awake', level: 4, durationMin: Math.round(awakeMin * 0.35), hr: rhr + 14 },
    { timeLabel: '02:45', stage: 'light', level: 2, durationMin: Math.round(lightMin * 0.30), hr: rhr + 1 },
    { timeLabel: '03:40', stage: 'sws', level: 1, durationMin: Math.round(swsMin * 0.52), hr: rhr - 3 },
    { timeLabel: '04:35', stage: 'rem', level: 3, durationMin: Math.round(remMin * 0.38), hr: rhr + 5 },
    { timeLabel: '05:25', stage: 'light', level: 2, durationMin: Math.round(lightMin * 0.30), hr: rhr + 1 },
    { timeLabel: '06:10', stage: 'rem', level: 3, durationMin: Math.round(remMin * 0.34), hr: rhr + 4 },
    { timeLabel: '06:40', stage: 'awake', level: 4, durationMin: Math.round(awakeMin * 0.30), hr: rhr + 10 },
  ];
}

/**
 * Build 7-day trend array where the last 3 days dynamically reflect the user's state
 */
export function buildSevenDayTrend(
  todayMetrics: { hrv: number; rhr: number; recovery: number; strain: number; sleepPerf: number },
  yesterdayMetrics: { hrv: number; rhr: number; recovery: number; strain: number; sleepPerf: number },
  twoDaysAgoMetrics: { hrv: number; rhr: number; recovery: number; strain: number; sleepPerf: number }
): WeeklyTrendPoint[] {
  return [
    { dayShort: 'Вт', dateLabel: '10.11', hrv: 64, rhr: 53, recovery: 68, strain: 12.8, sleepPerf: 86 },
    { dayShort: 'Ср', dateLabel: '11.11', hrv: 71, rhr: 50, recovery: 79, strain: 15.6, sleepPerf: 91 },
    { dayShort: 'Чт', dateLabel: '12.11', hrv: 59, rhr: 54, recovery: 56, strain: 11.4, sleepPerf: 82 },
    { dayShort: 'Пт', dateLabel: '13.11', hrv: 68, rhr: 51, recovery: 74, strain: 16.1, sleepPerf: 89 },
    {
      dayShort: 'Сб',
      dateLabel: '14.11',
      hrv: twoDaysAgoMetrics.hrv,
      rhr: twoDaysAgoMetrics.rhr,
      recovery: twoDaysAgoMetrics.recovery,
      strain: twoDaysAgoMetrics.strain,
      sleepPerf: twoDaysAgoMetrics.sleepPerf,
    },
    {
      dayShort: 'Вс',
      dateLabel: '15.11',
      hrv: yesterdayMetrics.hrv,
      rhr: yesterdayMetrics.rhr,
      recovery: yesterdayMetrics.recovery,
      strain: yesterdayMetrics.strain,
      sleepPerf: yesterdayMetrics.sleepPerf,
    },
    {
      dayShort: 'Пн',
      dateLabel: 'Сегодня',
      hrv: todayMetrics.hrv,
      rhr: todayMetrics.rhr,
      recovery: todayMetrics.recovery,
      strain: todayMetrics.strain,
      sleepPerf: todayMetrics.sleepPerf,
    },
  ];
}
