#include <Arduino.h>
#include <Wire.h>
#include <TinyGPS++.h>
#include <Adafruit_MPU6050.h>
#include <Adafruit_Sensor.h>
#include "mbedtls/gcm.h"

// =============================================================
// SHAKTI PIN — Full System Simulation v2
// No serial commands — all triggers via physical buttons or
// live MPU6050 accelerometer slider in Wokwi
//
// BUTTONS:
//   GPIO12 — SOS (hold >2s to confirm, buzzer on confirm)
//   GPIO14 — Force-inject fall sequence (demo shortcut)
//   GPIO27 — Simulate voice/scream VAD trigger
//
// MPU6050 REAL FALL DETECTION:
//   Drag Z-axis slider in Wokwi toward 0 for free-fall
//   Then snap above ~19.6 (2g) for impact
//   Algorithm validates both phases automatically
//
// UART LOOPBACK (simulation):
//   TX GPIO17 wired to RX GPIO16 on same board
//   On real hardware: two boards, same two pins, one wire
// =============================================================

// --- Pins ---
#define SOS_BTN_PIN     12      // hold >2000ms = SOS alert
#define FALL_BTN_PIN    14      // press = inject demo fall
#define VOICE_BTN_PIN   27      // press = scream VAD trigger
#define BUZZER_PIN      13      // child device only
#define GPS_RX_PIN      18
#define GPS_TX_PIN      19
#define GPS_BAUDRATE    9600
#define UART_RX_PIN     16
#define UART_TX_PIN     17

// --- AES-128-GCM ---
const uint8_t AES_KEY[16] = {
    0x2B, 0x7E, 0x15, 0x16, 0x28, 0xAE, 0xD2, 0xA6,
    0xAB, 0xF7, 0x15, 0x88, 0x09, 0xCF, 0x4F, 0x3C
};
const uint8_t AES_IV[12] = {
    0xCA, 0xFE, 0xBA, 0xBE, 0xFA, 0xCE,
    0xDB, 0xAD, 0xDE, 0xCA, 0xF8, 0x88
};

// --- Packet ---
struct __attribute__((__packed__)) ShaktiPacket {
    uint32_t deviceID;
    uint32_t counter;
    uint8_t  eventType;
    uint8_t  flags;
    float    latitude;
    float    longitude;
    float    maxGForce;
    uint32_t fallDurationMs;
    uint8_t  battery;
    char     audioClass[12];
    uint8_t  padding[3];
};

struct __attribute__((__packed__)) EncryptedFrame {
    uint8_t ciphertext[sizeof(ShaktiPacket)];
    uint8_t auth_tag[16];
};

// --- Nearest police station (swap to your location) ---
#define POLICE_NAME     "jeevan bheema nagar police station"
#define POLICE_LAT      12.96
#define POLICE_LNG      77.65
#define POLICE_PHONE    "+35316668400"

// --- Objects ---
TinyGPSPlus      gps;
Adafruit_MPU6050 mpu;

// --- State ---
float    currentLat   = 12.97833f;
float    currentLng   = 77.66000f;
bool     isGpsValid   = false;
uint32_t pktCounter   = 1;

// Fall detection
unsigned long ffStartTs  = 0;
bool          ffMet      = false;
unsigned long ffDuration = 0;

// SOS hold timer
unsigned long sosPressStart = 0;
bool          sosWasDown    = false;

// Voice capture
bool          voiceActive   = false;
unsigned long voiceStartMs  = 0;
const unsigned long VOICE_WINDOW_MS = 3000;

// Heartbeat
unsigned long lastHeartbeat = 0;
const unsigned long HB_MS   = 180000; // 3 min

// Button debounce
unsigned long fallBtnLastMs  = 0;
unsigned long voiceBtnLastMs = 0;
const unsigned long DEBOUNCE_MS = 300;

// =============================================================
// FORWARD DECLARATIONS
// =============================================================
void buildAndSend(uint8_t eventType, const char* audio,
                  float peakG, uint32_t ffMs);
void checkFall(float ax, float ay, float az);
void runGateway();
void buzzerPattern(int beeps, int onMs, int offMs);
float distanceKm(float lat1, float lon1, float lat2, float lon2);
void printSep(char c, int n);
void injectFallSequence();

// =============================================================
// SETUP
// =============================================================
void setup() {
    Serial.begin(115200);
    Serial1.begin(GPS_BAUDRATE, SERIAL_8N1, GPS_RX_PIN, GPS_TX_PIN);
    Serial2.begin(115200, SERIAL_8N1, UART_RX_PIN, UART_TX_PIN);

    Wire.begin(21, 22);
    if (!mpu.begin()) {
        Serial.println("[ERROR] MPU6050 not found — check SDA/SCL wiring");
    } else {
        mpu.setAccelerometerRange(MPU6050_RANGE_8_G);
        mpu.setGyroRange(MPU6050_RANGE_500_DEG);
        mpu.setFilterBandwidth(MPU6050_BAND_21_HZ);
        Serial.println("[OK] MPU6050 ready — drag Z slider in Wokwi to simulate fall");
    }

    pinMode(SOS_BTN_PIN,   INPUT_PULLUP);
    pinMode(FALL_BTN_PIN,  INPUT_PULLUP);
    pinMode(VOICE_BTN_PIN, INPUT_PULLUP);
    pinMode(BUZZER_PIN,    OUTPUT);
    digitalWrite(BUZZER_PIN, LOW);

    printSep('=', 54);
    Serial.println("  SHAKTI PIN — Child Safety Device Simulation");
    printSep('=', 54);
    Serial.println("  GPIO12 : SOS button     (hold 2s to trigger)");
    Serial.println("  GPIO14 : Fall button     (press once)");
    Serial.println("  GPIO27 : Voice/scream    (press once)");
    Serial.println("  MPU6050: Drag Z slider   (real fall detection)");
    Serial.println("  Auto   : Heartbeat every 3 minutes");
    printSep('-', 54);
    Serial.println();

    buzzerPattern(2, 80, 80);
}

// =============================================================
// LOOP
// =============================================================
void loop() {
    unsigned long now = millis();

    // 1. GPS parse
    while (Serial1.available() > 0) {
        if (gps.encode(Serial1.read())) {
            if (gps.location.isValid()) {
                currentLat = gps.location.lat();
                currentLng = gps.location.lng();
                isGpsValid = true;
            }
        }
    }
    static bool gpsWarnShown = false;
    if (now > 5000 && gps.charsProcessed() < 10 && !gpsWarnShown) {
        Serial.println("[GPS] No NMEA data — check pin 18. Using default coords.");
        gpsWarnShown = true;
    }

    // 2. MPU6050 — real accelerometer data → real fall detection
    sensors_event_t accel, gyro, temp;
    mpu.getEvent(&accel, &gyro, &temp);
    checkFall(accel.acceleration.x,
              accel.acceleration.y,
              accel.acceleration.z);

    // 3. SOS button — GPIO12, hold >2000ms
    bool sosNow = (digitalRead(SOS_BTN_PIN) == LOW);
    if (sosNow && !sosWasDown) {
        sosPressStart = now;
        sosWasDown    = true;
        Serial.println("[SOS] Button held — release after 2s to confirm");
    }
    if (!sosNow && sosWasDown) {
        unsigned long held = now - sosPressStart;
        sosWasDown = false;
        if (held >= 2000) {
            Serial.printf("[SOS] CONFIRMED — held %lums\n", held);
            uint8_t flags = isGpsValid ? 0x01 : 0x00;
            buildAndSend(0x01, "NONE", 0.0f, 0);
            buzzerPattern(3, 400, 200);
        } else {
            Serial.printf("[SOS] Ignored — held %lums (need 2000ms)\n", held);
        }
    }

    // 4. Fall demo button — GPIO14, single press injects fall sequence
    // This bypasses the MPU slider for quick demo
    if (digitalRead(FALL_BTN_PIN) == LOW &&
        (now - fallBtnLastMs) > DEBOUNCE_MS) {
        fallBtnLastMs = now;
        Serial.println("[FALL BTN] Demo fall sequence injected");
        injectFallSequence();
    }

    // 5. Voice button — GPIO27, single press triggers scream VAD
    if (digitalRead(VOICE_BTN_PIN) == LOW &&
        (now - voiceBtnLastMs) > DEBOUNCE_MS) {
        voiceBtnLastMs = now;
        if (!voiceActive) {
            voiceActive   = true;
            voiceStartMs  = now;
            digitalWrite(BUZZER_PIN, HIGH);
            Serial.println("[VOICE] VAD triggered — recording 3s window...");
        }
    }

    // Voice capture window end
    if (voiceActive && (now - voiceStartMs >= VOICE_WINDOW_MS)) {
        digitalWrite(BUZZER_PIN, LOW);
        voiceActive = false;
        Serial.println("[VOICE] Capture complete — classification: SCREAM");
        buildAndSend(0x03, "SCREAM", 0.0f, 0);
    }

    // 6. Heartbeat — every 3 minutes automatically
    if (now - lastHeartbeat >= HB_MS) {
        lastHeartbeat = now;
        Serial.println("[HEARTBEAT] Sending status packet");
        buildAndSend(0x04, "NONE", 0.0f, 0);
    }

    // 7. Gateway engine — reads loopback UART, decrypts, prints alert
    runGateway();

    delay(10);
}

// =============================================================
// REAL FALL DETECTION — fed by live MPU6050 readings
// Drag Z-axis slider in Wokwi:
//   Toward 0    = free-fall phase  (normal is ~9.8 m/s2)
//   Above 19.6  = impact phase     (2g = 19.6 m/s2)
// =============================================================
void checkFall(float ax, float ay, float az) {
    float mag = sqrtf(ax*ax + ay*ay + az*az);
    float g   = mag / 9.81f;
    unsigned long now = millis();

    if (g < 0.4f) {
        if (ffStartTs == 0) ffStartTs = now;
        unsigned long dur = now - ffStartTs;
        if (dur >= 80 && !ffMet) {
            ffMet      = true;
            ffDuration = dur;
            Serial.printf("[FALL] Free-fall validated — %.2fg for %lums\n", g, dur);
        }
    } else {
        if (ffMet) {
            unsigned long sinceEnd = now - (ffStartTs + ffDuration);
            if (sinceEnd <= 500 && g > 2.0f) {
                Serial.printf("[FALL] Impact confirmed — %.2fg — FALL VERIFIED\n", g);
                buildAndSend(0x02, "NONE", g, ffDuration);
                buzzerPattern(5, 150, 100);
                ffMet    = false;
                ffStartTs = 0;
            } else if (sinceEnd > 500) {
                ffMet    = false;
                ffStartTs = 0;
            }
        } else {
            ffStartTs = 0;
        }
    }
}

// =============================================================
// DEMO FALL INJECT — called by GPIO14 press
// Feeds synthetic values into the same checkFall() function
// so threshold logic runs identically to real sensor path
// =============================================================
void injectFallSequence() {
    Serial.println("[FALL SIM] Phase 1 — free-fall (0.1g)");
    // Feed below-threshold value
    float ff_a = 0.1f * 9.81f;  // ~0.98 m/s2
    // Fake 3-axis split
    checkFall(ff_a * 0.577f, ff_a * 0.577f, ff_a * 0.577f);
    delay(100);
    checkFall(ff_a * 0.577f, ff_a * 0.577f, ff_a * 0.577f);
    Serial.println("[FALL SIM] Phase 2 — impact (2.5g)");
    float imp_a = 2.5f * 9.81f;
    checkFall(imp_a * 0.577f, imp_a * 0.577f, imp_a * 0.577f);
}

// =============================================================
// BUILD PACKET, ENCRYPT AES-128-GCM, SEND OVER UART
// =============================================================
void buildAndSend(uint8_t eventType, const char* audio,
                   float peakG, uint32_t ffMs) {
    ShaktiPacket pkt;
    memset(&pkt, 0, sizeof(pkt));
    pkt.deviceID        = 0x00000001;
    pkt.counter         = pktCounter++;
    pkt.eventType       = eventType;
    pkt.flags           = isGpsValid ? 0x01 : 0x00;
    pkt.latitude        = currentLat;
    pkt.longitude       = currentLng;
    pkt.maxGForce       = peakG;
    pkt.fallDurationMs  = ffMs;
    pkt.battery         = 85;
    strncpy(pkt.audioClass, audio, sizeof(pkt.audioClass));

    printSep('=', 46);
    Serial.println("[CHILD] Packet (plaintext before encryption)");
    printSep('-', 46);
    Serial.printf("  Device ID : 0x%08X\n", pkt.deviceID);
    Serial.printf("  Counter   : %lu\n",     pkt.counter);
    Serial.printf("  Event     : 0x%02X  ",  pkt.eventType);
    switch (eventType) {
        case 0x01: Serial.println("SOS — manual trigger");    break;
        case 0x02: Serial.println("Fall detected");           break;
        case 0x03: Serial.println("Voice emergency — scream"); break;
        case 0x04: Serial.println("Heartbeat");               break;
    }
    Serial.printf("  GPS valid : %s\n",      isGpsValid ? "YES" : "NO — default coords");
    Serial.printf("  Latitude  : %.6f\n",    pkt.latitude);
    Serial.printf("  Longitude : %.6f\n",    pkt.longitude);
    Serial.printf("  Battery   : %d%%\n",    pkt.battery);
    if (eventType == 0x02) {
        Serial.printf("  Peak G    : %.2f g\n",  peakG);
        Serial.printf("  Fall time : %lu ms\n",   ffMs);
    }

    // AES-128-GCM encrypt — hardware accelerator on ESP32
    EncryptedFrame frame;
    mbedtls_gcm_context gcm;
    mbedtls_gcm_init(&gcm);
    mbedtls_gcm_setkey(&gcm, MBEDTLS_CIPHER_ID_AES, AES_KEY, 128);
    mbedtls_gcm_crypt_and_tag(
        &gcm, MBEDTLS_GCM_ENCRYPT, sizeof(ShaktiPacket),
        AES_IV, sizeof(AES_IV), NULL, 0,
        (const uint8_t*)&pkt,
        frame.ciphertext,
        sizeof(frame.auth_tag), frame.auth_tag
    );
    mbedtls_gcm_free(&gcm);

    Serial.println("\n[AES-128-GCM] Encrypted");
    Serial.print("  Auth tag  : ");
    for (int i = 0; i < 16; i++) {
        if (frame.auth_tag[i] < 0x10) Serial.print("0");
        Serial.print(frame.auth_tag[i], HEX);
        Serial.print(" ");
    }
    Serial.println();

    Serial2.write((uint8_t*)&frame, sizeof(EncryptedFrame));
    Serial.printf("[UART TX]  %d bytes sent\n", sizeof(EncryptedFrame));
    printSep('=', 46);
    Serial.println();
}

// =============================================================
// GATEWAY ENGINE — decrypts, verifies, dispatches alert
// =============================================================
void runGateway() {
    static uint8_t rxBuf[sizeof(EncryptedFrame)];
    static size_t  rxCount = 0;

    while (Serial2.available()) {
        uint8_t b = Serial2.read();
        if (rxCount < sizeof(EncryptedFrame))
            rxBuf[rxCount++] = b;

        if (rxCount == sizeof(EncryptedFrame)) {
            rxCount = 0;
            EncryptedFrame* f = (EncryptedFrame*)rxBuf;

            printSep('=', 46);
            Serial.println("[GATEWAY] Frame received");
            Serial.println("[GATEWAY] AES-128-GCM decrypt + auth verify");

            ShaktiPacket out;
            mbedtls_gcm_context gcm;
            mbedtls_gcm_init(&gcm);
            mbedtls_gcm_setkey(&gcm, MBEDTLS_CIPHER_ID_AES, AES_KEY, 128);
            int ret = mbedtls_gcm_auth_decrypt(
                &gcm, sizeof(ShaktiPacket),
                AES_IV, sizeof(AES_IV),
                NULL, 0,
                f->auth_tag, 16,
                f->ciphertext, (uint8_t*)&out
            );
            mbedtls_gcm_free(&gcm);

            if (ret != 0) {
                Serial.println("[GATEWAY] REJECT — auth tag mismatch, packet dropped");
                printSep('=', 46);
                return;
            }
            Serial.println("[GATEWAY] Auth tag verified — decryption OK");
            Serial.printf("[GATEWAY] Counter %lu accepted\n", out.counter);

            // Lookup table resolution
            const char* alias  = "Child-001";
            const char* parent = "+919876543210";

            float dist = distanceKm(out.latitude, out.longitude,
                                     POLICE_LAT, POLICE_LNG);

            printSep('-', 46);
            Serial.printf("  Child     : %s\n",  alias);
            Serial.printf("  Parent    : %s\n",  parent);
            Serial.printf("  Event     : ");
            switch (out.eventType) {
                case 0x01: Serial.println("SOS — manual trigger");    break;
                case 0x02: Serial.println("Fall detected");           break;
                case 0x03: Serial.print("Voice alert — ");
                           Serial.println(out.audioClass);            break;
                case 0x04: Serial.println("Heartbeat — device OK");   break;
            }
            Serial.printf("  GPS       : %s\n",  (out.flags & 0x01) ? "Valid" : "No fix");
            Serial.printf("  Latitude  : %.6f\n", out.latitude);
            Serial.printf("  Longitude : %.6f\n", out.longitude);
            Serial.printf("  Battery   : %d%%\n", out.battery);
            if (out.eventType == 0x02) {
                Serial.printf("  Peak G    : %.2f g\n",  out.maxGForce);
                Serial.printf("  Fall time : %lu ms\n",  out.fallDurationMs);
            }
            Serial.print("  Child map : http://maps.google.com/?q=");
            Serial.print(out.latitude, 6);
            Serial.print(",");
            Serial.println(out.longitude, 6);

            printSep('-', 46);
            Serial.printf("  Nearest police : %s\n", POLICE_NAME);
            Serial.printf("  Distance       : %.2f km\n", dist);
            Serial.printf("  Phone          : %s\n", POLICE_PHONE);
            Serial.print("  Police map     : http://maps.google.com/?q=");
            Serial.print(POLICE_LAT, 6);
            Serial.print(",");
            Serial.println(POLICE_LNG, 6);

            printSep('-', 46);
            // Parent notification — WiFi HTTPS POST to notification API
            // In production: ESP32 sends to Telegram Bot / Firebase FCM
            Serial.println("  [NOTIFY] Parent alert dispatched via WiFi");
            Serial.printf("  EMERGENCY — %s\n", alias);
            switch (out.eventType) {
                case 0x01:
                    Serial.println("  SOS button pressed — child needs help");
                    break;
                case 0x02:
                    Serial.printf("  Fall detected — %.1fg impact, %lums freefall\n",
                                  out.maxGForce, out.fallDurationMs);
                    break;
                case 0x03:
                    Serial.printf("  Distress audio — %s\n", out.audioClass);
                    break;
                case 0x04:
                    Serial.println("  Heartbeat — device OK");
                    break;
            }
            Serial.print("  Location : http://maps.google.com/?q=");
            Serial.print(out.latitude, 6);
            Serial.print(",");
            Serial.println(out.longitude, 6);
            Serial.printf("  Battery  : %d%%\n", out.battery);
            Serial.printf("  Police   : %s — %.2f km\n", POLICE_NAME, dist);
            printSep('=', 46);
            Serial.println();
        }
    }
}

// =============================================================
// UTILITIES
// =============================================================
float distanceKm(float lat1, float lon1, float lat2, float lon2) {
    const float R = 6371.0f;
    float dLat = (lat2 - lat1) * PI / 180.0f;
    float dLon = (lon2 - lon1) * PI / 180.0f;
    float a = sinf(dLat/2)*sinf(dLat/2) +
              cosf(lat1*PI/180.0f) * cosf(lat2*PI/180.0f) *
              sinf(dLon/2)*sinf(dLon/2);
    return R * 2.0f * atan2f(sqrtf(a), sqrtf(1.0f - a));
}

void buzzerPattern(int beeps, int onMs, int offMs) {
    for (int i = 0; i < beeps; i++) {
        digitalWrite(BUZZER_PIN, HIGH); delay(onMs);
        digitalWrite(BUZZER_PIN, LOW);
        if (i < beeps - 1) delay(offMs);
    }
}

void printSep(char c, int n) {
    for (int i = 0; i < n; i++) Serial.print(c);
    Serial.println();
}
