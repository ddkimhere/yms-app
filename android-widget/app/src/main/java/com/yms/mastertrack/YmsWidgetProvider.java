package com.yms.mastertrack;

import android.app.PendingIntent;
import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.Context;
import android.content.Intent;
import android.widget.RemoteViews;

public class YmsWidgetProvider extends AppWidgetProvider {
    @Override
    public void onUpdate(Context context, AppWidgetManager appWidgetManager, int[] appWidgetIds) {
        for (int appWidgetId : appWidgetIds) {
            RemoteViews views = new RemoteViews(context.getPackageName(), R.layout.yms_widget);
            views.setOnClickPendingIntent(R.id.widgetRoot, openPage(context, "login.html", 10));
            views.setOnClickPendingIntent(R.id.widgetHomework, openPage(context, "homework.html", 11));
            views.setOnClickPendingIntent(R.id.widgetNotices, openPage(context, "notices.html", 12));
            views.setOnClickPendingIntent(R.id.widgetCounseling, openPage(context, "counseling.html", 13));
            appWidgetManager.updateAppWidget(appWidgetId, views);
        }
    }

    private PendingIntent openPage(Context context, String path, int requestCode) {
        Intent intent = new Intent(context, MainActivity.class);
        intent.putExtra(MainActivity.EXTRA_PATH, path);
        intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP | Intent.FLAG_ACTIVITY_SINGLE_TOP);
        return PendingIntent.getActivity(
                context,
                requestCode,
                intent,
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
        );
    }
}
