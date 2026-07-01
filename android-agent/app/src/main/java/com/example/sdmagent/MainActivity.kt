package com.example.sdmagent

import android.app.admin.DevicePolicyManager
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.graphics.Color
import android.net.Uri
import android.os.Bundle
import android.provider.Settings
import android.util.Log
import android.view.inputmethod.EditorInfo
import android.view.inputmethod.InputMethodManager
import android.widget.Toast
import androidx.appcompat.app.AppCompatActivity
import androidx.core.content.ContextCompat
import androidx.lifecycle.lifecycleScope
import androidx.security.crypto.EncryptedSharedPreferences
import androidx.security.crypto.MasterKeys
import androidx.work.Constraints
import androidx.work.ExistingPeriodicWorkPolicy
import androidx.work.NetworkType
import androidx.work.PeriodicWorkRequestBuilder
import androidx.work.WorkManager
import com.google.android.material.button.MaterialButton
import com.google.android.material.snackbar.Snackbar
import com.google.android.material.textfield.TextInputEditText
import com.google.android.material.textfield.TextInputLayout
import com.google.firebase.messaging.FirebaseMessaging
import com.journeyapps.barcodescanner.ScanContract
import com.journeyapps.barcodescanner.ScanOptions
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.tasks.await
import kotlinx.coroutines.withContext
import okhttp3.OkHttpClient
import okhttp3.logging.HttpLoggingInterceptor
import org.json.JSONObject
import retrofit2.Response
import retrofit2.Retrofit
import retrofit2.converter.moshi.MoshiConverterFactory
import retrofit2.http.Body
import retrofit2.http.Header
import retrofit2.http.POST
import retrofit2.http.Path
import android.view.View
import android.widget.LinearLayout
import android.widget.TextView
import com.google.android.material.card.MaterialCardView
import java.util.UUID
import java.util.concurrent.TimeUnit
import android.graphics.BitmapFactory
import com.google.zxing.BinaryBitmap
import com.google.zxing.LuminanceSource
import com.google.zxing.MultiFormatReader
import com.google.zxing.RGBLuminanceSource
import com.google.zxing.common.HybridBinarizer
import androidx.activity.result.contract.ActivityResultContracts
import com.google.android.material.dialog.MaterialAlertDialogBuilder

// ── DTOs ──────────────────────────────────────────────────────────────────────

data class DeviceRegisterWithTokenRequest(
    val token: String,
    val deviceIdentifier: String,
    val serialNumber: String,
    val manufacturer: String,
    val model: String,
    val androidVersion: String,
    val fcmToken: String? = null
)

data class DeviceRegisterWithTokenResponse(
    val deviceId: String,
    val deviceJwt: String,
    val expiresInSeconds: Int
)

data class UpdateFcmTokenRequest(val fcmToken: String)

data class ReportStatusRequest(val success: Boolean)

data class HeartbeatRequest(val battery: Int, val freeStorage: Long)

data class InstalledAppItem(
    val packageId: String,
    val appName: String?,
    val versionName: String?,
    val versionCode: Int?,
    val isSystemApp: Boolean
)

data class ReportInstalledAppsRequest(val apps: List<InstalledAppItem>)

data class PendingCommandDto(
    val id: String,
    val commandType: String,
    val payload: String
)

// ── API interface ──────────────────────────────────────────────────────────────

interface ApiService {
    @POST("api/devices/register-with-token")
    suspend fun register(@Body req: DeviceRegisterWithTokenRequest): Response<DeviceRegisterWithTokenResponse>

    @POST("api/devices/update-fcm-token")
    suspend fun updateFcmToken(
        @Header("Authorization") auth: String,
        @Body req: UpdateFcmTokenRequest
    ): Response<Unit>

    @POST("api/devices/{deviceId}/commands/{commandId}/status")
    suspend fun reportCommandStatus(
        @Header("Authorization") auth: String,
        @Path("deviceId") deviceId: String,
        @Path("commandId") commandId: String,
        @Body req: ReportStatusRequest
    ): Response<Unit>

    @POST("api/devices/{deviceId}/commands/{commandId}/acknowledge")
    suspend fun acknowledgeCommand(
        @Header("Authorization") auth: String,
        @Path("deviceId") deviceId: String,
        @Path("commandId") commandId: String
    ): Response<Unit>

    @POST("api/devices/{deviceId}/heartbeat")
    suspend fun heartbeat(
        @Header("Authorization") auth: String,
        @Path("deviceId") deviceId: String,
        @Body req: HeartbeatRequest
    ): Response<Unit>

    @POST("api/devices/{deviceId}/installed-apps")
    suspend fun reportInstalledApps(
        @Header("Authorization") auth: String,
        @Path("deviceId") deviceId: String,
        @Body req: ReportInstalledAppsRequest
    ): Response<Unit>

    @retrofit2.http.DELETE("api/devices/{deviceId}")
    suspend fun deleteDevice(
        @Header("Authorization") auth: String,
        @Path("deviceId") deviceId: String
    ): Response<Unit>

    @retrofit2.http.GET("api/devices/{deviceId}/commands/pending")
    suspend fun getPendingCommands(
        @Header("Authorization") auth: String,
        @Path("deviceId") deviceId: String
    ): Response<List<PendingCommandDto>>
}

// ── Activity ───────────────────────────────────────────────────────────────────

class MainActivity : AppCompatActivity() {

    private var serverUrl: String = ""

    private lateinit var tvEnrollmentBadge: TextView
    private lateinit var tvDeviceName: TextView
    private lateinit var tvDeviceSubtitle: TextView
    private lateinit var tvMdmServer: TextView
    private lateinit var tvPolicy: TextView
    private lateinit var cardAdminSetup: MaterialCardView
    private lateinit var layoutAdminGranted: LinearLayout
    private lateinit var btnRequestAdmin: MaterialButton
    private lateinit var btnScanQr: MaterialButton
    private lateinit var tilEnrollmentToken: TextInputLayout
    private lateinit var etEnrollmentToken: TextInputEditText
    private lateinit var btnUnenroll: MaterialButton
    private lateinit var cardUnenroll: MaterialCardView
    private lateinit var cardEnrollDevice: MaterialCardView
    private lateinit var layoutEnrolled: LinearLayout
    private lateinit var tvViewPolicies: TextView

    // Device details accordion
    private lateinit var layoutDeviceDetailsHeader: LinearLayout
    private lateinit var layoutDeviceDetailsContent: LinearLayout
    private lateinit var ivExpandIcon: android.widget.ImageView
    private lateinit var tvDetailAndroidId: TextView
    private lateinit var tvDetailManufacturer: TextView
    private lateinit var tvDetailModel: TextView
    private lateinit var tvDetailAndroidVersion: TextView
    private lateinit var tvDetailSerial: TextView
    private lateinit var tvDetailDeviceId: TextView
    private var isDeviceDetailsExpanded = false

    private val deviceIdentifier: String by lazy {
        Settings.Secure.getString(contentResolver, Settings.Secure.ANDROID_ID)
            ?: UUID.randomUUID().toString()
    }

    private val barcodeLauncher = registerForActivityResult(ScanContract()) { result ->
        if (result.contents != null) {
            handleScannedContent(result.contents)
        }
    }

    private val pickImageLauncher = registerForActivityResult(ActivityResultContracts.GetContent()) { uri: Uri? ->
        uri?.let {
            lifecycleScope.launch {
                val qrContent = withContext(Dispatchers.IO) { decodeQRCode(it) }
                if (qrContent != null) {
                    handleScannedContent(qrContent)
                } else {
                    Toast.makeText(this@MainActivity, "No QR code found in image", Toast.LENGTH_SHORT).show()
                }
            }
        }
    }

    private fun decodeQRCode(uri: Uri): String? {
        return try {
            val inputStream = contentResolver.openInputStream(uri) ?: return null
            val bitmap = BitmapFactory.decodeStream(inputStream)
            inputStream.close()
            if (bitmap == null) return null

            val width = bitmap.width
            val height = bitmap.height
            val pixels = IntArray(width * height)
            bitmap.getPixels(pixels, 0, width, 0, 0, width, height)
            val source: LuminanceSource = RGBLuminanceSource(width, height, pixels)
            val binaryBitmap = BinaryBitmap(HybridBinarizer(source))
            val reader = MultiFormatReader()
            val result = reader.decode(binaryBitmap)
            result.text
        } catch (e: Exception) {
            Log.e("MainActivity", "Error decoding QR code", e)
            null
        }
    }

    private fun handleScannedContent(scanned: String) {
        try {
            val uri = Uri.parse(scanned)
            val token = uri.getQueryParameter("token")
            if (token != null) {
                serverUrl = determineBaseUrl(uri)
                etEnrollmentToken.setText(token)
                performEnrollment(token)
            } else {
                etEnrollmentToken.setText(scanned)
                performEnrollment(scanned)
            }
        } catch (e: Exception) {
            etEnrollmentToken.setText(scanned)
            performEnrollment(scanned)
        }
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_main)

        tvEnrollmentBadge = findViewById(R.id.tvEnrollmentBadge)
        tvDeviceName = findViewById(R.id.tvDeviceName)
        tvDeviceSubtitle = findViewById(R.id.tvDeviceSubtitle)
        tvMdmServer = findViewById(R.id.tvMdmServer)
        tvPolicy = findViewById(R.id.tvPolicy)
        cardAdminSetup = findViewById(R.id.cardAdminSetup)
        layoutAdminGranted = findViewById(R.id.layoutAdminGranted)
        btnRequestAdmin = findViewById(R.id.btnRequestAdmin)
        btnScanQr = findViewById(R.id.btnScanQr)
        tilEnrollmentToken = findViewById(R.id.tilEnrollmentToken)
        etEnrollmentToken = findViewById(R.id.etEnrollmentToken)
        btnUnenroll = findViewById(R.id.btnUnenroll)
        cardUnenroll = findViewById(R.id.cardUnenroll)

        cardEnrollDevice = findViewById(R.id.cardEnrollDevice)
        layoutEnrolled = findViewById(R.id.layoutEnrolled)
        tvViewPolicies = findViewById(R.id.tvViewPolicies)
        tvViewPolicies.setOnClickListener {
            startActivity(Intent(this, PoliciesActivity::class.java))
        }

        layoutDeviceDetailsHeader = findViewById(R.id.layoutDeviceDetailsHeader)
        layoutDeviceDetailsContent = findViewById(R.id.layoutDeviceDetailsContent)
        ivExpandIcon = findViewById(R.id.ivExpandIcon)
        tvDetailAndroidId = findViewById(R.id.tvDetailAndroidId)
        tvDetailManufacturer = findViewById(R.id.tvDetailManufacturer)
        tvDetailModel = findViewById(R.id.tvDetailModel)
        tvDetailAndroidVersion = findViewById(R.id.tvDetailAndroidVersion)
        tvDetailSerial = findViewById(R.id.tvDetailSerial)
        tvDetailDeviceId = findViewById(R.id.tvDetailDeviceId)

        layoutDeviceDetailsHeader.setOnClickListener {
            isDeviceDetailsExpanded = !isDeviceDetailsExpanded
            layoutDeviceDetailsContent.visibility = if (isDeviceDetailsExpanded) View.VISIBLE else View.GONE
            ivExpandIcon.rotation = if (isDeviceDetailsExpanded) 180f else 0f
        }

        displayDeviceInfo()

        val intentUri: Uri? = intent?.data
        if (intentUri != null) {
            val deepLinkToken = intentUri.getQueryParameter("token")
            serverUrl = determineBaseUrl(intentUri)
            if (deepLinkToken != null) {
                etEnrollmentToken.setText(deepLinkToken)
            }
        } else {
            serverUrl = determineBaseUrl(null)
        }

        refreshEnrollmentStatus()
        refreshAdminStatus()

        btnRequestAdmin.setOnClickListener { promptDeviceAdmin() }

        btnScanQr.setOnClickListener {
            val options = arrayOf("Scan with Camera", "Choose from Gallery/File")
            MaterialAlertDialogBuilder(this)
                .setTitle("Enrollment QR Code")
                .setItems(options) { _, which ->
                    when (which) {
                        0 -> {
                            val scanOptions = ScanOptions()
                                .setDesiredBarcodeFormats(ScanOptions.QR_CODE)
                                .setPrompt("Scan MDM enrollment QR code")
                                .setBeepEnabled(false)
                                .setBarcodeImageEnabled(false)
                                .setOrientationLocked(false)
                            barcodeLauncher.launch(scanOptions)
                        }
                        1 -> {
                            pickImageLauncher.launch("image/*")
                        }
                    }
                }
                .show()
        }

        tilEnrollmentToken.setEndIconOnClickListener {
            val token = etEnrollmentToken.text?.toString()?.trim()
            if (!token.isNullOrEmpty()) {
                hideKeyboard()
                performEnrollment(token)
            }
        }

        etEnrollmentToken.setOnEditorActionListener { _, actionId, _ ->
            if (actionId == EditorInfo.IME_ACTION_DONE) {
                val token = etEnrollmentToken.text?.toString()?.trim()
                if (!token.isNullOrEmpty()) {
                    hideKeyboard()
                    performEnrollment(token)
                }
                true
            } else false
        }

        btnUnenroll.setOnClickListener {
            MaterialAlertDialogBuilder(this)
                .setTitle("Unenroll Device")
                .setMessage("Are you sure you want to unenroll this device? This will remove all corporate policies and disconnect it from the MDM server.")
                .setPositiveButton("Unenroll") { _, _ ->
                    performUnenroll()
                }
                .setNegativeButton("Cancel", null)
                .show()
        }
    }

    override fun onResume() {
        super.onResume()
        refreshAdminStatus()
        refreshEnrollmentStatus()
    }

    private fun displayDeviceInfo() {
        val manufacturer = android.os.Build.MANUFACTURER
            .replaceFirstChar { it.uppercaseChar() }
        val model = android.os.Build.MODEL
        val version = android.os.Build.VERSION.RELEASE
        val serial = android.os.Build.SERIAL ?: "unknown"

        tvDeviceName.text = "$manufacturer $model"
        tvDeviceSubtitle.text = "Android $version · Serial: $serial"

        tvDetailAndroidId.text = deviceIdentifier
        tvDetailManufacturer.text = manufacturer
        tvDetailModel.text = model
        tvDetailAndroidVersion.text = version
        tvDetailSerial.text = serial
    }

    private fun refreshAdminStatus() {
        val dpm = getSystemService(Context.DEVICE_POLICY_SERVICE) as DevicePolicyManager
        val adminComponent = ComponentName(this, AdminReceiver::class.java)
        val isGranted = dpm.isAdminActive(adminComponent) || dpm.isDeviceOwnerApp(packageName)

        if (isGranted) {
            cardAdminSetup.visibility = View.GONE
            layoutAdminGranted.visibility = View.VISIBLE
        } else {
            cardAdminSetup.visibility = View.VISIBLE
            layoutAdminGranted.visibility = View.GONE
            btnRequestAdmin.isEnabled = true
        }
    }

    private fun refreshEnrollmentStatus() {
        val prefs = getPrefs()
        val deviceId = prefs.getString("device_id", null)
        val savedUrl = prefs.getString("server_url", null)
        val enrolled = deviceId != null

        if (enrolled && savedUrl != null) {
            tvEnrollmentBadge.text = "● Enrolled"
            tvEnrollmentBadge.setTextColor(Color.parseColor("#166534"))
            tvEnrollmentBadge.background = ContextCompat.getDrawable(this, R.drawable.badge_enrolled_bg)
            tvMdmServer.text = savedUrl.trimEnd('/')
            tvPolicy.text = "Default"
            tvDetailDeviceId.text = deviceId
            cardEnrollDevice.visibility = View.GONE
            layoutEnrolled.visibility = View.VISIBLE
            cardUnenroll.visibility = View.VISIBLE
        } else {
            tvEnrollmentBadge.text = "● Not Enrolled"
            tvEnrollmentBadge.setTextColor(Color.parseColor("#D97706"))
            tvEnrollmentBadge.background = ContextCompat.getDrawable(this, R.drawable.badge_not_enrolled_bg)
            tvMdmServer.text = "Not connected"
            tvPolicy.text = "None assigned"
            tvDetailDeviceId.text = "Not enrolled"
            cardEnrollDevice.visibility = View.VISIBLE
            layoutEnrolled.visibility = View.GONE
            cardUnenroll.visibility = View.GONE
        }

        btnUnenroll.isEnabled = enrolled
    }

    private fun promptDeviceAdmin() {
        val adminComponent = ComponentName(this, AdminReceiver::class.java)
        val intent = Intent(DevicePolicyManager.ACTION_ADD_DEVICE_ADMIN).apply {
            putExtra(DevicePolicyManager.EXTRA_DEVICE_ADMIN, adminComponent)
            putExtra(
                DevicePolicyManager.EXTRA_ADD_EXPLANATION,
                "SDM Agent needs Device Admin to lock the screen and enforce policies."
            )
        }
        startActivity(intent)
    }

    private fun performEnrollment(token: String) {
        if (serverUrl.isEmpty()) {
            serverUrl = getPrefs().getString("server_url", null) ?: determineBaseUrl(null)
        }

        setEnrollmentUiEnabled(false)

        lifecycleScope.launch {
            try {
                val fcmToken = try {
                    FirebaseMessaging.getInstance().token.await()
                } catch (e: Exception) {
                    Log.e("MainActivity", "Could not get FCM token", e)
                    null
                }

                val req = DeviceRegisterWithTokenRequest(
                    token = token,
                    deviceIdentifier = deviceIdentifier,
                    serialNumber = android.os.Build.SERIAL ?: "unknown",
                    manufacturer = android.os.Build.MANUFACTURER,
                    model = android.os.Build.MODEL,
                    androidVersion = android.os.Build.VERSION.RELEASE,
                    fcmToken = fcmToken
                )

                val logging = HttpLoggingInterceptor().apply { level = HttpLoggingInterceptor.Level.BODY }
                val api = Retrofit.Builder()
                    .baseUrl(serverUrl)
                    .client(OkHttpClient.Builder().addInterceptor(logging).build())
                    .addConverterFactory(MoshiConverterFactory.create())
                    .build()
                    .create(ApiService::class.java)

                val resp = api.register(req)
                if (resp.isSuccessful && resp.body() != null) {
                    val body = resp.body()!!
                    savePrefs(body.deviceJwt, body.deviceId, serverUrl)
                    scheduleHeartbeat()
                    etEnrollmentToken.setText("")
                    refreshEnrollmentStatus()
                    Toast.makeText(this@MainActivity, "Device enrolled successfully", Toast.LENGTH_LONG).show()
                } else {
                    val err = resp.errorBody()?.string() ?: "Unknown error"
                    showError("Enrollment failed (${resp.code()}): $err")
                    setEnrollmentUiEnabled(true)
                }
            } catch (e: Exception) {
                showError("Error: ${e.message}")
                setEnrollmentUiEnabled(true)
            }
        }
    }

    private fun setEnrollmentUiEnabled(enabled: Boolean) {
        btnScanQr.isEnabled = enabled
        tilEnrollmentToken.isEnabled = enabled
    }

    private fun showError(message: String) {
        Snackbar.make(findViewById(android.R.id.content), message, Snackbar.LENGTH_LONG).show()
    }

    private fun savePrefs(jwt: String, deviceId: String, url: String) {
        getPrefs().edit()
            .putString("device_jwt", jwt)
            .putString("device_id", deviceId)
            .putString("server_url", url)
            .apply()
    }

    private fun scheduleHeartbeat() {
        val networkConstraint = Constraints.Builder()
            .setRequiredNetworkType(NetworkType.CONNECTED)
            .build()

        WorkManager.getInstance(this).enqueueUniquePeriodicWork(
            "sdm_heartbeat",
            ExistingPeriodicWorkPolicy.UPDATE,
            PeriodicWorkRequestBuilder<HeartbeatWorker>(15, TimeUnit.MINUTES)
                .setConstraints(networkConstraint)
                .build()
        )
        WorkManager.getInstance(this).enqueueUniquePeriodicWork(
            "sdm_policy_sync",
            ExistingPeriodicWorkPolicy.KEEP,
            PeriodicWorkRequestBuilder<PolicySyncWorker>(15, TimeUnit.MINUTES)
                .setConstraints(networkConstraint)
                .build()
        )
        WorkManager.getInstance(this).enqueueUniquePeriodicWork(
            "sdm_app_inventory",
            ExistingPeriodicWorkPolicy.KEEP,
            PeriodicWorkRequestBuilder<AppInventoryWorker>(6, TimeUnit.HOURS)
                .setConstraints(networkConstraint)
                .build()
        )
        WorkManager.getInstance(this).enqueueUniquePeriodicWork(
            "sdm_command_poll",
            ExistingPeriodicWorkPolicy.UPDATE,
            PeriodicWorkRequestBuilder<CommandPollingWorker>(15, TimeUnit.MINUTES)
                .setConstraints(networkConstraint)
                .build()
        )
        Log.d("MainActivity", "Background workers scheduled (heartbeat + policy sync + app inventory + command poll)")
    }

    private fun performUnenroll() {
        val prefs = getPrefs()
        val jwt = prefs.getString("device_jwt", null)
        val deviceId = prefs.getString("device_id", null)
        val savedUrl = prefs.getString("server_url", null) ?: serverUrl

        btnUnenroll.isEnabled = false

        lifecycleScope.launch {
            if (jwt != null && deviceId != null) {
                try {
                    val logging = HttpLoggingInterceptor().apply { level = HttpLoggingInterceptor.Level.BODY }
                    val api = Retrofit.Builder()
                        .baseUrl(savedUrl)
                        .client(OkHttpClient.Builder().addInterceptor(logging).build())
                        .addConverterFactory(MoshiConverterFactory.create())
                        .build()
                        .create(ApiService::class.java)

                    val resp = api.deleteDevice("Bearer $jwt", deviceId)
                    if (resp.isSuccessful || resp.code() == 404) {
                        Log.d("MainActivity", "Device deleted from backend (${resp.code()})")
                    } else {
                        Log.w("MainActivity", "Backend delete returned ${resp.code()}, clearing local state anyway")
                    }
                } catch (e: Exception) {
                    Log.w("MainActivity", "Could not reach backend to delete device, clearing local state anyway", e)
                }
            }

            WorkManager.getInstance(this@MainActivity).cancelUniqueWork("sdm_heartbeat")
            WorkManager.getInstance(this@MainActivity).cancelUniqueWork("sdm_policy_sync")
            WorkManager.getInstance(this@MainActivity).cancelUniqueWork("sdm_app_inventory")
            WorkManager.getInstance(this@MainActivity).cancelUniqueWork("sdm_command_poll")
            prefs.edit().clear().apply()

            refreshEnrollmentStatus()
            setEnrollmentUiEnabled(true)
            Toast.makeText(this@MainActivity, "Device unenrolled", Toast.LENGTH_LONG).show()
        }
    }

    private fun hideKeyboard() {
        val imm = getSystemService(INPUT_METHOD_SERVICE) as InputMethodManager
        currentFocus?.let { imm.hideSoftInputFromWindow(it.windowToken, 0) }
    }

    private fun determineBaseUrl(uri: Uri?): String {
        uri?.getQueryParameter("server")?.let { return ensureTrailingSlash(it) }
        try {
            assets.open("config.json").bufferedReader().use { r ->
                val jo = JSONObject(r.readText())
                if (jo.has("server")) return ensureTrailingSlash(jo.getString("server"))
            }
        } catch (_: Exception) { }
        return "http://10.0.2.2:5254/"
    }

    private fun ensureTrailingSlash(url: String) = if (url.endsWith("/")) url else "$url/"

    private fun getPrefs(): android.content.SharedPreferences {
        val masterKeyAlias = MasterKeys.getOrCreate(MasterKeys.AES256_GCM_SPEC)
        return EncryptedSharedPreferences.create(
            "sdm_prefs", masterKeyAlias, this,
            EncryptedSharedPreferences.PrefKeyEncryptionScheme.AES256_SIV,
            EncryptedSharedPreferences.PrefValueEncryptionScheme.AES256_GCM
        )
    }
}
