package com.bioseh.app;

import android.annotation.TargetApi;
import android.health.connect.HealthConnectException;
import android.health.connect.HealthConnectManager;
import android.health.connect.ReadRecordsRequestUsingFilters;
import android.health.connect.ReadRecordsResponse;
import android.health.connect.TimeInstantRangeFilter;
import android.health.connect.datatypes.*;
import android.health.connect.datatypes.Record;
import android.os.Build;
import android.os.OutcomeReceiver;
import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.PermissionState;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.annotation.Permission;
import com.getcapacitor.annotation.PermissionCallback;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.Arrays;

@CapacitorPlugin(name = "BioSehHealth", permissions = {
    @Permission(alias = "heart", strings = {"android.permission.health.READ_HEART_RATE"}),
    @Permission(alias = "resting", strings = {"android.permission.health.READ_RESTING_HEART_RATE"}),
    @Permission(alias = "rmssd", strings = {"android.permission.health.READ_HEART_RATE_VARIABILITY"}),
    @Permission(alias = "respiratory", strings = {"android.permission.health.READ_RESPIRATORY_RATE"}),
    @Permission(alias = "oxygen", strings = {"android.permission.health.READ_OXYGEN_SATURATION"}),
    @Permission(alias = "sleep", strings = {"android.permission.health.READ_SLEEP"}),
    @Permission(alias = "workout", strings = {"android.permission.health.READ_EXERCISE"})
})
public class BioSehHealthPlugin extends Plugin {
    private static final String[] ALIASES = {"heart", "resting", "rmssd", "respiratory", "oxygen", "sleep", "workout"};

    @PluginMethod
    public void read(PluginCall call) {
        if (Build.VERSION.SDK_INT < 34) {
            call.reject("Для подключения Health Connect в BioSeh нужен Android 14 или новее.");
            return;
        }
        if (getContext().getSystemService(HealthConnectManager.class) == null) {
            call.reject("Health Connect недоступен на этом устройстве.");
            return;
        }

        String[] missing = Arrays.stream(ALIASES)
            .filter(alias -> getPermissionState(alias) == PermissionState.PROMPT ||
                             getPermissionState(alias) == PermissionState.PROMPT_WITH_RATIONALE)
            .toArray(String[]::new);
        if (missing.length > 0) requestPermissionForAliases(missing, call, "afterPermissionRequest");
        else afterPermissionRequest(call);
    }

    @PermissionCallback
    private void afterPermissionRequest(PluginCall call) {
        if (Build.VERSION.SDK_INT >= 34) new Reader(call).nextType();
    }

    @TargetApi(34)
    private final class Reader {
        private final PluginCall call;
        private final HealthConnectManager manager = getContext().getSystemService(HealthConnectManager.class);
        private final JSArray readings = new JSArray();
        private final Instant now = Instant.now();
        private final TimeInstantRangeFilter range = new TimeInstantRangeFilter.Builder()
            .setStartTime(now.minus(30, ChronoUnit.DAYS)).setEndTime(now).build();
        private int typeIndex;
        private int granted;

        Reader(PluginCall call) {
            this.call = call;
        }

        void nextType() {
            while (typeIndex < ALIASES.length && getPermissionState(ALIASES[typeIndex]) != PermissionState.GRANTED) {
                typeIndex++;
            }
            if (typeIndex == ALIASES.length) {
                JSObject result = new JSObject();
                result.put("readings", readings);
                result.put("granted", granted);
                result.put("total", ALIASES.length);
                call.resolve(result);
                return;
            }
            granted++;
            switch (ALIASES[typeIndex]) {
                case "heart": readPage(HeartRateRecord.class, -1); break;
                case "resting": readPage(RestingHeartRateRecord.class, -1); break;
                case "rmssd": readPage(HeartRateVariabilityRmssdRecord.class, -1); break;
                case "respiratory": readPage(RespiratoryRateRecord.class, -1); break;
                case "oxygen": readPage(OxygenSaturationRecord.class, -1); break;
                case "sleep": readPage(SleepSessionRecord.class, -1); break;
                case "workout": readPage(ExerciseSessionRecord.class, -1); break;
            }
        }

        private <T extends Record> void readPage(Class<T> type, long pageToken) {
            ReadRecordsRequestUsingFilters.Builder<T> builder =
                new ReadRecordsRequestUsingFilters.Builder<>(type).setTimeRangeFilter(range).setPageSize(500);
            if (pageToken != -1) builder.setPageToken(pageToken);
            try {
                manager.readRecords(builder.build(), getContext().getMainExecutor(), new OutcomeReceiver<ReadRecordsResponse<T>, HealthConnectException>() {
                    @Override public void onResult(ReadRecordsResponse<T> response) {
                        for (T record : response.getRecords()) append(record);
                        long nextPage = response.getNextPageToken();
                        if (nextPage != -1) readPage(type, nextPage);
                        else {
                            typeIndex++;
                            nextType();
                        }
                    }

                    @Override public void onError(HealthConnectException error) {
                        call.reject("Не удалось прочитать записи Health Connect. Проверьте разрешения и повторите попытку.");
                    }
                });
            } catch (RuntimeException error) {
                call.reject("Не удалось прочитать записи Health Connect. Проверьте разрешения и повторите попытку.");
            }
        }

        private void append(Record record) {
            if (record instanceof HeartRateRecord heart) {
                for (HeartRateRecord.HeartRateSample sample : heart.getSamples()) {
                    measurement("heart", sample.getTime(), sample.getBeatsPerMinute());
                }
            } else if (record instanceof RestingHeartRateRecord resting) {
                measurement("resting", resting.getTime(), resting.getBeatsPerMinute());
            } else if (record instanceof HeartRateVariabilityRmssdRecord hrv) {
                measurement("rmssd", hrv.getTime(), hrv.getHeartRateVariabilityMillis());
            } else if (record instanceof RespiratoryRateRecord respiratory) {
                measurement("respiratory", respiratory.getTime(), respiratory.getRate());
            } else if (record instanceof OxygenSaturationRecord oxygen) {
                measurement("oxygen", oxygen.getTime(), oxygen.getPercentage().getValue());
            } else if (record instanceof ExerciseSessionRecord exercise) {
                interval("workout", exercise.getStartTime(), exercise.getEndTime(), exercise.getTitle());
            } else if (record instanceof SleepSessionRecord sleep) {
                if (sleep.getStages().isEmpty()) {
                    interval("sleep", sleep.getStartTime(), sleep.getEndTime(), null);
                } else {
                    for (SleepSessionRecord.Stage stage : sleep.getStages()) {
                        switch (stage.getType()) {
                            case SleepSessionRecord.StageType.STAGE_TYPE_SLEEPING:
                            case SleepSessionRecord.StageType.STAGE_TYPE_SLEEPING_LIGHT:
                            case SleepSessionRecord.StageType.STAGE_TYPE_SLEEPING_DEEP:
                            case SleepSessionRecord.StageType.STAGE_TYPE_SLEEPING_REM:
                                interval("sleep", stage.getStartTime(), stage.getEndTime(), null, sleep.getEndTime());
                                break;
                        }
                    }
                }
            }
        }

        private void measurement(String kind, Instant at, double value) {
            if (!Double.isFinite(value) || value <= 0) return;
            JSObject reading = new JSObject();
            reading.put("kind", kind);
            reading.put("start", at.toEpochMilli());
            reading.put("value", value);
            readings.put(reading);
        }

        private void interval(String kind, Instant start, Instant end, String title) {
            interval(kind, start, end, title, end);
        }

        private void interval(String kind, Instant start, Instant end, String title, Instant dayAnchor) {
            JSObject reading = new JSObject();
            reading.put("kind", kind);
            reading.put("start", start.toEpochMilli());
            reading.put("end", end.toEpochMilli());
            reading.put("dayAnchor", dayAnchor.toEpochMilli());
            reading.put("label", title);
            readings.put(reading);
        }
    }
}
