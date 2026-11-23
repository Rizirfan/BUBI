package expo.modules.screenmirror

import android.app.Activity
import android.content.Context
import android.content.Intent
import android.graphics.Bitmap
import android.graphics.PixelFormat
import android.hardware.display.DisplayManager
import android.hardware.display.VirtualDisplay
import android.media.ImageReader
import android.media.projection.MediaProjection
import android.media.projection.MediaProjectionManager
import android.os.Build
import android.os.Handler
import android.os.HandlerThread
import android.util.DisplayMetrics
import android.view.WindowManager
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import java.io.BufferedOutputStream
import java.io.BufferedReader
import java.io.ByteArrayOutputStream
import java.io.IOException
import java.io.InputStreamReader
import java.net.Inet4Address
import java.net.InetAddress
import java.net.NetworkInterface
import java.net.ServerSocket
import java.net.Socket
import java.net.SocketException
import java.nio.ByteOrder
import java.util.concurrent.CopyOnWriteArrayList
import java.util.concurrent.Executors
import java.util.concurrent.atomic.AtomicInteger

/**
 * Developer-only screen mirror.
 *
 * Captures the Android display through MediaProjection, encodes each frame as
 * JPEG and serves an MJPEG stream on the LAN. A second device only needs a
 * browser pointed at http://<phone-ip>:<port>/ — no companion app required.
 *
 * This is intentionally not available in Expo Go: it is a local native module
 * and needs a development build (or an EAS build).
 */
class ScreenMirrorModule : Module() {

  @Volatile
  private var streaming = false
  @Volatile
  private var lastFrameTime = 0L
  @Volatile
  private var lastFps = 0

  private var projection: MediaProjection? = null
  private var projectionCallback: MediaProjection.Callback? = null
  private var virtualDisplay: VirtualDisplay? = null
  private var imageReader: ImageReader? = null
  private var captureThread: HandlerThread? = null
  private var captureHandler: Handler? = null
  private var statsRunnable: Runnable? = null

  private var serverSocket: ServerSocket? = null
  private var acceptThread: Thread? = null
  private val clients = CopyOnWriteArrayList<BufferedOutputStream>()
  private val clientExecutor = Executors.newCachedThreadPool { runnable ->
    Thread(runnable).apply { isDaemon = true }
  }

  private val frameCounter = AtomicInteger(0)
  private var totalFrames = 0
  private var captureWidth = 0
  private var captureHeight = 0
  private var jpegQuality = DEFAULT_QUALITY
  private var frameIntervalMs = 100L
  private var currentPort = DEFAULT_PORT

  override fun definition() = ModuleDefinition {
    Name("ScreenMirror")
    Events(EVENT_STATUS)

    AsyncFunction("isAvailableAsync") {
      Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP
    }

    AsyncFunction("getLocalIpAddress") {
      getLocalIpAddress()
    }

    AsyncFunction("startMirroring") { port: Int, quality: Int, fps: Int ->
      startMirroring(port, quality, fps)
    }

    AsyncFunction("stopMirroring") {
      releaseResources("stopped", "Mirroring stopped")
    }

    OnActivityResult { _, payload ->
      if (payload.requestCode != REQUEST_CODE) return@OnActivityResult

      if (payload.resultCode != Activity.RESULT_OK || payload.data == null) {
        releaseResources("error", "Screen capture permission was denied")
        return@OnActivityResult
      }

      try {
        beginCapture(payload.data!!)
      } catch (error: Exception) {
        releaseResources("error", error.message ?: "Could not start screen capture")
      }
    }

    OnDestroy {
      releaseResources("stopped", null)
    }
  }

  private fun startMirroring(port: Int, quality: Int, fps: Int) {
    if (streaming) {
      throw IllegalStateException("A mirror session is already running")
    }
    if (Build.VERSION.SDK_INT < Build.VERSION_CODES.LOLLIPOP) {
      throw IllegalStateException("Screen mirroring requires Android 5.0 or newer")
    }

    currentPort = port.coerceIn(MIN_PORT, MAX_PORT)
    jpegQuality = quality.coerceIn(20, 95)
    frameIntervalMs = 1000L / fps.coerceIn(1, MAX_FPS).toLong()

    val context = appContext.reactContext
      ?: throw IllegalStateException("Android context is unavailable")
    val activity = appContext.currentActivity
      ?: throw IllegalStateException("Open the screen mirror screen in the foreground first")

    emit("starting", mapOf("port" to currentPort))

    // Android 14+ requires a foreground service of type mediaProjection.
    val serviceIntent = Intent(context, ScreenMirrorService::class.java)
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
      context.startForegroundService(serviceIntent)
    } else {
      context.startService(serviceIntent)
    }

    val manager = activity.getSystemService(Context.MEDIA_PROJECTION_SERVICE) as MediaProjectionManager
    emit("awaiting-permission", mapOf("port" to currentPort))
    activity.startActivityForResult(manager.createScreenCaptureIntent(), REQUEST_CODE)
  }

  private fun beginCapture(permissionIntent: Intent) {
    val context = appContext.reactContext
      ?: throw IllegalStateException("Android context is unavailable")
    val windowManager = context.getSystemService(Context.WINDOW_SERVICE) as WindowManager

    val screenSize = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
      val bounds = windowManager.currentWindowMetrics.bounds
      Pair(bounds.width(), bounds.height())
    } else {
      @Suppress("DEPRECATION")
      val metrics = DisplayMetrics().also { windowManager.defaultDisplay.getRealMetrics(it) }
      Pair(metrics.widthPixels, metrics.heightPixels)
    }

    // Cap the resolution so the MJPEG stream stays usable over typical Wi-Fi.
    val scale = minOf(1f, MAX_DIMENSION.toFloat() / maxOf(screenSize.first, screenSize.second))
    captureWidth = maxOf(2, (screenSize.first * scale).toInt())
    captureHeight = maxOf(2, (screenSize.second * scale).toInt())
    val density = context.resources.displayMetrics.densityDpi

    serverSocket = ServerSocket(currentPort, 8, InetAddress.getByName("0.0.0.0"))
    streaming = true
    acceptThread = Thread { acceptClients() }.apply {
      isDaemon = true
      start()
    }

    val reader = ImageReader.newInstance(captureWidth, captureHeight, PixelFormat.RGBA_8888, 2)
    imageReader = reader

    captureThread = HandlerThread("ScreenMirrorCapture").apply { start() }
    val handler = Handler(captureThread!!.looper)
    captureHandler = handler

    val manager = context.getSystemService(Context.MEDIA_PROJECTION_SERVICE) as MediaProjectionManager
    val newProjection = manager.getMediaProjection(Activity.RESULT_OK, permissionIntent)
    projection = newProjection

    val callback = object : MediaProjection.Callback() {
      override fun onStop() {
        releaseResources("stopped", "Screen capture was stopped by the system")
      }
    }
    projectionCallback = callback
    newProjection.registerCallback(callback, handler)

    reader.setOnImageAvailableListener({ availableReader -> captureFrame(availableReader) }, handler)

    virtualDisplay = newProjection.createVirtualDisplay(
      "BubiScreenMirror",
      captureWidth,
      captureHeight,
      density,
      DisplayManager.VIRTUAL_DISPLAY_FLAG_AUTO_MIRROR,
      reader.surface,
      null,
      handler
    )

    totalFrames = 0
    frameCounter.set(0)
    lastFrameTime = 0L
    lastFps = 0

    val ip = getLocalIpAddress()
    emit(
      "streaming",
      mapOf(
        "url" to "http://$ip:$currentPort",
        "ip" to ip,
        "port" to currentPort,
        "width" to captureWidth,
        "height" to captureHeight,
        "clients" to 0
      )
    )

    startStatsReporter(handler)
  }

  private fun captureFrame(reader: ImageReader) {
    val image = try {
      reader.acquireLatestImage()
    } catch (ignored: IllegalStateException) {
      null
    } ?: return

    try {
      val now = System.currentTimeMillis()
      if (now - lastFrameTime < frameIntervalMs) return
      lastFrameTime = now

      val plane = image.planes[0]
      val pixelStride = plane.pixelStride
      val rowStride = plane.rowStride
      val buffer = plane.buffer
      val bitmap = Bitmap.createBitmap(captureWidth, captureHeight, Bitmap.Config.ARGB_8888)

      if (pixelStride == 4 && rowStride == captureWidth * 4) {
        buffer.rewind()
        bitmap.copyPixelsFromBuffer(buffer)
      } else {
        val pixels = IntArray(captureWidth * captureHeight)
        val row = IntArray(rowStride / pixelStride)
        val intBuffer = buffer.slice().order(ByteOrder.nativeOrder()).asIntBuffer()
        for (y in 0 until captureHeight) {
          intBuffer.position(y * rowStride / pixelStride)
          intBuffer.get(row, 0, captureWidth)
          System.arraycopy(row, 0, pixels, y * captureWidth, captureWidth)
        }
        bitmap.setPixels(pixels, 0, captureWidth, 0, 0, captureWidth, captureHeight)
      }

      val output = ByteArrayOutputStream()
      bitmap.compress(Bitmap.CompressFormat.JPEG, jpegQuality, output)
      bitmap.recycle()
      val jpeg = output.toByteArray()

      frameCounter.incrementAndGet()
      totalFrames += 1

      val header = (
        "--frame\r\nContent-Type: image/jpeg\r\nContent-Length: " +
          jpeg.size + "\r\n\r\n"
        ).toByteArray()

      for (client in clients) {
        try {
          client.write(header)
          client.write(jpeg)
          client.write(CRLF)
          client.flush()
        } catch (ignored: IOException) {
          clients.remove(client)
        }
      }
    } catch (ignored: Exception) {
      // A dropped frame must never tear down the whole session.
    } finally {
      image.close()
    }
  }

  private fun startStatsReporter(handler: Handler) {
    val reporter = object : Runnable {
      override fun run() {
        if (!streaming) return
        lastFps = frameCounter.getAndSet(0)
        emitStats()
        handler.postDelayed(this, STATS_INTERVAL_MS)
      }
    }
    statsRunnable = reporter
    handler.postDelayed(reporter, STATS_INTERVAL_MS)
  }

  private fun acceptClients() {
    val socket = serverSocket ?: return
    while (streaming && !socket.isClosed) {
      try {
        val client = socket.accept()
        clientExecutor.execute { serveClient(client) }
      } catch (ignored: SocketException) {
        break
      } catch (ignored: IOException) {
        // Transient accept failure; keep listening until the socket is closed.
      }
    }
  }

  private fun serveClient(socket: Socket) {
    var output: BufferedOutputStream? = null
    try {
      socket.soTimeout = 5000
      val reader = BufferedReader(InputStreamReader(socket.getInputStream()))
      val requestLine = reader.readLine() ?: return
      val path = requestLine.split(' ').getOrNull(1) ?: "/"
      socket.soTimeout = 0

      output = BufferedOutputStream(socket.getOutputStream())
      if (path.startsWith("/stream")) {
        output.write(STREAM_HEADERS)
        output.flush()
        clients.add(output)
        emitStats()
        while (streaming && clients.contains(output)) {
          Thread.sleep(500)
        }
      } else {
        val body = VIEWER_HTML.toByteArray()
        val headers = (
          "HTTP/1.1 200 OK\r\nContent-Type: text/html; charset=utf-8\r\n" +
            "Content-Length: " + body.size + "\r\nCache-Control: no-store\r\n" +
            "Connection: close\r\n\r\n"
          ).toByteArray()
        output.write(headers)
        output.write(body)
        output.flush()
      }
    } catch (ignored: Exception) {
      // Client disconnected or the session was stopped.
    } finally {
      output?.let { stream ->
        clients.remove(stream)
        emitStats()
        try {
          stream.close()
        } catch (ignored: Exception) {
        }
      }
      try {
        socket.close()
      } catch (ignored: Exception) {
      }
    }
  }

  private fun releaseResources(nextState: String = "stopped", message: String? = null) {
    val hadSession = streaming || projection != null || serverSocket != null
    streaming = false

    if (hadSession) {
      clients.forEach { stream ->
        try {
          stream.close()
        } catch (ignored: Exception) {
        }
      }
      clients.clear()

      try {
        serverSocket?.close()
      } catch (ignored: IOException) {
      }
      serverSocket = null
      acceptThread?.interrupt()
      acceptThread = null

      statsRunnable?.let { captureHandler?.removeCallbacks(it) }
      statsRunnable = null
      captureHandler?.removeCallbacksAndMessages(null)
      imageReader?.setOnImageAvailableListener(null, null)
      try {
        imageReader?.close()
      } catch (ignored: Exception) {
      }
      imageReader = null

      try {
        virtualDisplay?.release()
      } catch (ignored: Exception) {
      }
      virtualDisplay = null

      projectionCallback?.let { callback ->
        try {
          projection?.unregisterCallback(callback)
        } catch (ignored: Exception) {
        }
      }
      projectionCallback = null
      try {
        projection?.stop()
      } catch (ignored: Exception) {
      }
      projection = null

      captureThread?.quitSafely()
      captureThread = null
      captureHandler = null

      appContext.reactContext?.let { context ->
        try {
          context.stopService(Intent(context, ScreenMirrorService::class.java))
        } catch (ignored: Exception) {
        }
      }
    }

    val payload = mutableMapOf<String, Any?>()
    if (message != null) payload["message"] = message
    emit(nextState, payload)
  }

  private fun getLocalIpAddress(): String {
    val interfaces = try {
      NetworkInterface.getNetworkInterfaces()
    } catch (ignored: Exception) {
      return LOOPBACK
    }

    while (interfaces.hasMoreElements()) {
      val networkInterface = interfaces.nextElement()
      if (!networkInterface.isUp || networkInterface.isLoopback || networkInterface.isVirtual) continue

      val addresses = networkInterface.inetAddresses
      var fallback: String? = null
      while (addresses.hasMoreElements()) {
        val address = addresses.nextElement()
        if (address !is Inet4Address || address.isLoopbackAddress || address.isLinkLocalAddress) continue
        if (address.isSiteLocalAddress) return address.hostAddress ?: LOOPBACK
        if (fallback == null) fallback = address.hostAddress
      }
      if (fallback != null) return fallback
    }

    return LOOPBACK
  }

  private fun emitStats() {
    emit(
      "stats",
      mapOf(
        "fps" to lastFps,
        "frames" to totalFrames,
        "clients" to clients.size
      )
    )
  }

  private fun emit(state: String, payload: Map<String, Any?> = emptyMap()) {
    try {
      sendEvent(EVENT_STATUS, mapOf("state" to state) + payload)
    } catch (ignored: Exception) {
      // The JS listener may already be gone during teardown.
    }
  }

  companion object {
    private const val EVENT_STATUS = "onMirrorStatus"
    private const val REQUEST_CODE = 9021
    private const val DEFAULT_PORT = 8899
    private const val MIN_PORT = 1024
    private const val MAX_PORT = 65535
    private const val DEFAULT_QUALITY = 70
    private const val MAX_FPS = 30
    private const val MAX_DIMENSION = 1280
    private const val STATS_INTERVAL_MS = 1000L
    private const val LOOPBACK = "127.0.0.1"

    private val CRLF = "\r\n".toByteArray()
    private val STREAM_HEADERS = (
      "HTTP/1.1 200 OK\r\n" +
        "Content-Type: multipart/x-mixed-replace; boundary=frame\r\n" +
        "Cache-Control: no-store\r\n" +
        "Connection: close\r\n\r\n"
      ).toByteArray()

    private val VIEWER_HTML = """
      <!doctype html>
      <html lang="en">
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>BUBI Screen mirror</title>
        <style>
          :root { color-scheme: dark; }
          * { box-sizing: border-box; }
          body {
            margin: 0;
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            background: #0a0604;
            color: #fffdfb;
            font-family: system-ui, sans-serif;
          }
          main { width: 100%; max-width: 1100px; padding: 20px; }
          header { display: flex; align-items: baseline; justify-content: space-between; margin-bottom: 8px; gap: 12px; }
          h1 { font-size: 16px; margin: 0; }
          #status { font-size: 12px; color: #fbbf24; }
          img { display: block; width: 100%; min-height: 120px; border: 1px solid #291c16; border-radius: 14px; background: #140f0d; }
          p { font-size: 11px; color: #a8a29e; line-height: 17px; }
          a { color: #f97316; }
        </style>
      </head>
      <body>
        <main>
          <header>
            <h1>BUBI developer screen mirror</h1>
            <span id="status">Waiting for the first frame...</span>
          </header>
          <img id="feed" src="/stream" alt="Live screen mirror" />
          <p>
            If the image stays black, confirm the phone app still says "Live" and that both devices
            are on the same Wi-Fi. <a href="/stream">Open the raw stream directly</a>.
          </p>
        </main>
        <script>
          var status = document.getElementById('status');
          var feed = document.getElementById('feed');
          var gotFrame = false;
          function setStatus(text, color) {
            status.textContent = text;
            status.style.color = color;
          }
          feed.addEventListener('load', function () {
            gotFrame = true;
            setStatus('Live - local network only', '#6ee7b7');
          });
          feed.addEventListener('error', function () {
            setStatus('Stream failed to load', '#f87171');
          });
          setTimeout(function () {
            if (!gotFrame) setStatus('No frames after 8s - check the phone app', '#fbbf24');
          }, 8000);
        </script>
      </body>
      </html>
    """.trimIndent()
  }
}
