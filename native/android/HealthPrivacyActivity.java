package com.bioseh.app;

import android.app.Activity;
import android.os.Bundle;
import android.widget.ScrollView;
import android.widget.TextView;

public class HealthPrivacyActivity extends Activity {
    @Override public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setTitle("Данные здоровья в BioSeh");
        TextView text = new TextView(this);
        int padding = Math.round(24 * getResources().getDisplayMetrics().density);
        text.setPadding(padding, padding, padding, padding);
        text.setTextSize(16);
        text.setText("BioSeh считывает пульс, пульс в покое, вариабельность пульса, кислород, дыхание, сон и тренировки для отображения дневной сводки.\n\n"
            + "BioSeh запрашивает доступ только на чтение. Данные обрабатываются на устройстве. BioSeh хранит дневные сводки и тренировки из каждого источника до 18 месяцев.\n\n"
            + "Доступ можно отозвать в настройках Health Connect. Локальную историю каждого источника можно удалить на экране «Данные» в BioSeh.");
        ScrollView container = new ScrollView(this);
        container.setFitsSystemWindows(true);
        container.addView(text);
        setContentView(container);
    }
}
