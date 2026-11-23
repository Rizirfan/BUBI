package expo.modules.screenmirror

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.Service
import android.content.Context
import android.content.Intent
import android.content.pm.ServiceInfo
import android.os.Build
import android.os.IBinder

/**
 * Foreground service required by Android 14+ while a MediaProjection session is
 * active. It only keeps a persistent notification visible; the capture itself
 * is owned by ScreenMirrorModule.
 */
class ScreenMirrorService : Service() {

  override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
    createChannel()

    val builder = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
      Notification.Builder(this, CHANNEL_ID)
    } else {
      buildLegacyNotificationBuilder()
    }

    val notification = builder
      .setContentTitle("BUBI · screen mirroring")
      .setContentText("This device screen is being shared on the local network")
      .setSmallIcon(android.R.drawable.ic_menu_view)
      .setOngoing(true)
      .build()

    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.UPSIDE_DOWN_CAKE) {
      startForeground(
        NOTIFICATION_ID,
        notification,
        ServiceInfo.FOREGROUND_SERVICE_TYPE_MEDIA_PROJECTION
      )
    } else {
      startForeground(NOTIFICATION_ID, notification)
    }

    return START_NOT_STICKY
  }

  override fun onBind(intent: Intent?): IBinder? = null

  @Suppress("DEPRECATION")
  private fun buildLegacyNotificationBuilder(): Notification.Builder = Notification.Builder(this)

  private fun createChannel() {
    if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return
    val manager = getSystemService(Context.NOTIFICATION_SERVICE) as? NotificationManager ?: return
    if (manager.getNotificationChannel(CHANNEL_ID) != null) return

    val channel = NotificationChannel(
      CHANNEL_ID,
      "Developer screen mirroring",
      NotificationManager.IMPORTANCE_LOW
    )
    channel.description = "Active while the developer screen mirror is streaming"
    manager.createNotificationChannel(channel)
  }

  companion object {
    private const val CHANNEL_ID = "bubi_screen_mirror"
    private const val NOTIFICATION_ID = 9022
  }
}
