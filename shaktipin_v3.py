"""
================================================================================
 SHAKTIPIN V3 -- INCIDENT RESPONSE CONSOLE
 Emergency Operations Center / Command & Control Software (Simulation)
================================================================================

Run with:
    pip install streamlit cryptography pandas
    streamlit run shaktipin_v3.py

WHAT THIS IS
------------
A fully self-contained, single-file simulation of the "Shaktipin V3" child
safety device architecture: child registry, event sources, audio capture,
edge AI distress detection, GPS / fall-detection telemetry, an AES-128-GCM
encrypted packet pipeline (v1 -> v7), a gateway that resolves the nearest
police station / authorized help centre, a parent-app console, a 30-minute
live tracking engine, an independent 90-minute heartbeat engine, a network
emulator, and full operational dashboards (status, security, packet growth,
packet lifecycle inspector, event log).

IMPORTANT: This is a DEMONSTRATION / SIMULATION ONLY.
  - There is no real microphone, GPS chip, or accelerometer. All sensor
    values are synthetically generated for the purpose of visualizing the
    architecture and packet pipeline.
  - The "police station" / "help centre" directories are clearly-labelled
    placeholder demo data, not a real emergency-services directory.
  - No audio is ever generated, stored as real audio bytes, uploaded,
    streamed, downloaded, or transferred -- consistent with the source
    specification's "Audio never leaves the device" rule. Only metadata
    (an audio_id / filename / duration) is tracked, exactly as a real
    device would report to a parent app.
  - AES-128-GCM encryption in this file is REAL (using the `cryptography`
    library) so the Security panel reflects genuine ciphertext/nonce/tag
    values for a synthetic packet, not random placeholder strings.
"""

import base64
import html as html_lib
import json
import math
import os
import random
import time
import uuid
from datetime import datetime, timedelta

import pandas as pd
import pydeck as pdk
import streamlit as st
from cryptography.hazmat.primitives.ciphers.aead import AESGCM

# ==============================================================================
# 1. STATIC CONFIG -- CHILD REGISTRY / MOCK GATEWAY DATABASES
# ==============================================================================

# --- CHILD REGISTRY (Fixed / Non-Editable) -----------------------------------
CHILD_REGISTRY = [
    {"name": "Anushka Dave",     "device_id": "SP-1023", "variant": "Shaktipin",     "age": 9},
    {"name": "Avni Khanulia",    "device_id": "SP-1024", "variant": "Shaktipin",     "age": 11},
    {"name": "Harleen Kaur",     "device_id": "SP-1025", "variant": "Shaktipin Pro", "age": 8},
    {"name": "Harshita Pansari", "device_id": "SP-1026", "variant": "Shaktipin Pro", "age": 10},
    {"name": "Snehal Gupta",     "device_id": "SP-1027", "variant": "Shaktipin",     "age": 12},
    {"name": "Tahiti Roy",       "device_id": "SP-1028", "variant": "Shaktipin Pro", "age": 9},
]
CHILD_BY_NAME = {c["name"]: c for c in CHILD_REGISTRY}
CHILD_BY_DEVICE = {c["device_id"]: c for c in CHILD_REGISTRY}

# --- Reference geography (Bengaluru) for synthetic GPS drift -----------------
BASE_LAT, BASE_LON = 12.9716, 77.5946

# --- Gateway mock databases (CLEARLY SIMULATED / DEMO DATA ONLY) -------------
POLICE_DB = [
    {"name": "Zone 1 Police Outpost (Demo)",  "contact": "+91-80-1000-0101", "lat": 12.9352, "lon": 77.6245},
    {"name": "Zone 2 Police Station (Demo)",  "contact": "+91-80-1000-0102", "lat": 13.0210, "lon": 77.5800},
    {"name": "Zone 3 Police Station (Demo)",  "contact": "+91-80-1000-0103", "lat": 12.9698, "lon": 77.7500},
    {"name": "Zone 4 Police Station (Demo)",  "contact": "+91-80-1000-0104", "lat": 12.9750, "lon": 77.5300},
    {"name": "Zone 5 Police Outpost (Demo)",  "contact": "+91-80-1000-0105", "lat": 12.8990, "lon": 77.6010},
]
HELP_CENTER_DB = [
    {"name": "Authorized Child Help Centre - North (Demo)", "contact": "+91-80-1000-0201", "lat": 13.0120, "lon": 77.6100},
    {"name": "Authorized Child Help Centre - South (Demo)", "contact": "+91-80-1000-0202", "lat": 12.9100, "lon": 77.5950},
    {"name": "Authorized Child Help Centre - East (Demo)",  "contact": "+91-80-1000-0203", "lat": 12.9750, "lon": 77.6850},
    {"name": "Authorized Child Help Centre - West (Demo)",  "contact": "+91-80-1000-0204", "lat": 12.9650, "lon": 77.5350},
]

PACKET_VERSIONS = ["v1", "v2", "v3", "v4", "v5", "v6", "v7"]
PACKET_VERSION_LABELS = {
    "v1": "Event Packet",
    "v2": "GPS Packet",
    "v3": "BMI270 Packet",
    "v4": "Audio AI Packet",
    "v5": "AES128-GCM Packet",
    "v6": "Gateway Enriched Packet",
    "v7": "Parent Decrypted Packet",
}

KEYWORDS_DISTRESS = ["help", "stop", "scared", "mom", "papa", "no"]
KEYWORDS_NEUTRAL = ["okay", "fine", "playing", "school", "yes", "hungry"]

AUDIO_CLIP_SECONDS = 10
AUDIO_CLIP_SIZE_KB = 80  # fixed synthetic size per 10s low-bitrate telemetry clip
MICROSD_CAPACITY_MB = 512


# ==============================================================================
# 2. SESSION STATE INITIALISATION
# ==============================================================================

def init_state():
    defaults = {
        "event_log": [],
        "packets": [],                 # list of full packet-lifecycle records, newest first
        "audio_counter": 0,
        "microsd": {c["device_id"]: [] for c in CHILD_REGISTRY},
        "battery": {c["device_id"]: round(random.uniform(72, 100), 1) for c in CHILD_REGISTRY},
        "last_contact": {},            # device_id -> datetime
        "device_position": {},         # device_id -> {"lat":..,"lon":..} (random-walk GPS)
        "incidents": {},               # device_id -> {"status":..., "last_event":..., ...}
        "last_heartbeat": {},          # device_id -> datetime (last fired)
        "heartbeat_interval_min": 90.0,
        "tracking_sessions": {c["device_id"]: [] for c in CHILD_REGISTRY},
        "selected_child_name": CHILD_REGISTRY[0]["name"],
        "animate_tracking": False,
        "auto_refresh": False,
        "refresh_seconds": 5,
        "theme": "Dark",
    }
    for k, v in defaults.items():
        if k not in st.session_state:
            st.session_state[k] = v
    if "aes_key" not in st.session_state:
        st.session_state.aes_key = AESGCM.generate_key(bit_length=128)


# ==============================================================================
# 3. SUBSYSTEM FUNCTIONS
# ==============================================================================

def log(message: str, device_id: str | None = None):
    st.session_state.event_log.insert(0, {
        "time": datetime.now().strftime("%H:%M:%S"),
        "device_id": device_id or "-",
        "message": message,
    })


def haversine_km(lat1, lon1, lat2, lon2):
    r = 6371.0
    p1, p2 = math.radians(lat1), math.radians(lat2)
    dphi = math.radians(lat2 - lat1)
    dlmb = math.radians(lon2 - lon1)
    a = math.sin(dphi / 2) ** 2 + math.cos(p1) * math.cos(p2) * math.sin(dlmb / 2) ** 2
    return 2 * r * math.asin(math.sqrt(a))


def nearest_entity(lat, lon, db):
    best = min(db, key=lambda e: haversine_km(lat, lon, e["lat"], e["lon"]))
    dist = haversine_km(lat, lon, best["lat"], best["lon"])
    return {"name": best["name"], "contact": best["contact"], "distance_km": round(dist, 2)}


# --- AUDIO CAPTURE ENGINE + microSD STORAGE ----------------------------------
def capture_audio(device_id: str) -> str:
    """Simulates a 10s on-device recording. No audio bytes are ever created,
    uploaded, streamed, downloaded or transferred -- only local metadata."""
    st.session_state.audio_counter += 1
    audio_id = f"AUD_{st.session_state.audio_counter:04d}"
    entry = {
        "audio_id": audio_id,
        "filename": f"{audio_id}.wav",
        "duration_sec": AUDIO_CLIP_SECONDS,
        "size_kb": AUDIO_CLIP_SIZE_KB,
        "stored_at": datetime.now().strftime("%H:%M:%S"),
    }
    st.session_state.microsd[device_id].append(entry)
    return audio_id


# --- EDGE AI ENGINE -----------------------------------------------------------
def run_edge_ai(event_type: str) -> dict:
    if event_type in ("SOS", "FALL_DETECTION"):
        keyword = random.choice(KEYWORDS_DISTRESS)
        confidence = round(random.uniform(0.85, 0.99), 2)
        distress_score = random.randint(70, 98)
    elif event_type in ("REQUEST_AUDIO", "REQUEST_INFO", "LIVE_TRACKING"):
        keyword = random.choice(KEYWORDS_DISTRESS + KEYWORDS_NEUTRAL)
        confidence = round(random.uniform(0.6, 0.95), 2)
        distress_score = random.randint(5, 60)
    else:  # HEALTH_PACKET_90MIN / DEVICE_HEALTH
        keyword = random.choice(KEYWORDS_NEUTRAL)
        confidence = round(random.uniform(0.7, 0.95), 2)
        distress_score = random.randint(0, 25)
    return {
        "keyword": keyword,
        "confidence": confidence,
        "distress_score": distress_score,
        "distress_detected": distress_score > 50,
    }


def distress_label(score: int):
    if score <= 20:
        return "NORMAL", "#00e676"
    if score <= 50:
        return "SUSPICIOUS", "#ffd60a"
    if score <= 80:
        return "ELEVATED CONCERN", "#ff8c00"
    return "HIGH DISTRESS", "#ff3b30"


# --- GPS SUBSYSTEM -------------------------------------------------------------
def get_gps(device_id: str):
    pos = st.session_state.device_position.get(device_id)
    if pos is None:
        pos = {"lat": BASE_LAT + random.uniform(-0.03, 0.03),
               "lon": BASE_LON + random.uniform(-0.03, 0.03)}
    else:
        pos = {"lat": pos["lat"] + random.uniform(-0.0008, 0.0008),
               "lon": pos["lon"] + random.uniform(-0.0008, 0.0008)}
    st.session_state.device_position[device_id] = pos
    gps_health = random.choices(["GOOD", "DEGRADED"], weights=[0.92, 0.08])[0]
    return {"lat": round(pos["lat"], 5), "lon": round(pos["lon"], 5)}, gps_health


# --- BMI270 SUBSYSTEM -----------------------------------------------------------
def get_bmi270(event_type: str):
    fall_detected = True if event_type == "FALL_DETECTION" else (random.random() < 0.03)
    if fall_detected:
        motion_status = "FALL_IMPACT"
        accel = {"x": round(random.uniform(-9, 9), 2),
                  "y": round(random.uniform(-9, 9), 2),
                  "z": round(random.uniform(-3, 3), 2)}
    else:
        motion_status = random.choice(["WALKING", "STATIONARY", "RUNNING", "STATIONARY"])
        accel = {"x": round(random.uniform(-2, 2), 2),
                  "y": round(random.uniform(-2, 2), 2),
                  "z": round(random.uniform(8, 11), 2)}
    return fall_detected, motion_status, accel


# --- AES128-GCM ENGINE (real encryption, no HMAC) ------------------------------
def aes_encrypt(payload: dict):
    aesgcm = AESGCM(st.session_state.aes_key)
    nonce = os.urandom(12)
    plaintext = json.dumps(payload).encode("utf-8")
    ct_and_tag = aesgcm.encrypt(nonce, plaintext, None)
    ciphertext, tag = ct_and_tag[:-16], ct_and_tag[-16:]
    return {
        "nonce": base64.b64encode(nonce).decode(),
        "ciphertext": base64.b64encode(ciphertext).decode(),
        "authentication_tag": base64.b64encode(tag).decode(),
    }


def aes_decrypt(nonce_b64, ciphertext_b64, tag_b64):
    aesgcm = AESGCM(st.session_state.aes_key)
    nonce = base64.b64decode(nonce_b64)
    ciphertext = base64.b64decode(ciphertext_b64)
    tag = base64.b64decode(tag_b64)
    plaintext = aesgcm.decrypt(nonce, ciphertext + tag, None)
    return json.loads(plaintext.decode())


def key_fingerprint():
    import hashlib
    return hashlib.sha256(st.session_state.aes_key).hexdigest()[:16].upper()


# --- NETWORK EMULATOR -----------------------------------------------------------
def network_metrics():
    return {
        "RSSI": f"{random.randint(-95, -55)} dBm",
        "SNR": f"{round(random.uniform(2, 25), 1)} dB",
        "Retries": random.randint(0, 4),
        "Packet Loss": f"{round(random.uniform(0, 5), 2)} %",
        "Link Quality": f"{random.randint(60, 99)} %",
        "Latency": f"{random.randint(80, 650)} ms",
    }


# --- DEVICE STATUS HELPERS -------------------------------------------------------
def device_radio_status(device_id: str) -> str:
    lc = st.session_state.last_contact.get(device_id)
    if lc is None:
        return "STANDBY"
    elapsed_min = (datetime.now() - lc).total_seconds() / 60
    return "ONLINE" if elapsed_min <= max(st.session_state.heartbeat_interval_min * 1.5, 1) else "OFFLINE"


def device_storage_pct(device_id: str) -> float:
    used_mb = len(st.session_state.microsd[device_id]) * (AUDIO_CLIP_SIZE_KB / 1024)
    return round(min(used_mb / MICROSD_CAPACITY_MB * 100, 100), 1)


def drain_battery(device_id: str, amount=0.4):
    st.session_state.battery[device_id] = max(1.0, round(st.session_state.battery[device_id] - amount, 1))


# ==============================================================================
# 4. EVENT PIPELINE  (Event Manager -> GPS -> BMI270 -> Audio AI -> AES -> Gateway -> Parent)
# ==============================================================================

def execute_event_pipeline(event_type: str, child: dict) -> dict:
    device_id = child["device_id"]
    ts = datetime.now()

    log(f"{event_type} Triggered", device_id)

    # Audio Capture & Edge AI Engine (Pro Only)
    if child.get("variant") == "Shaktipin Pro":
        log("Audio Recording Started", device_id)
        audio_id = capture_audio(device_id)
        log(f"Audio Stored on microSD ({audio_id}.wav)", device_id)

        ai = run_edge_ai(event_type)
        log("Edge AI Completed", device_id)
    else:
        log("Audio processing bypassed (non-Pro device)", device_id)
        audio_id = "N/A (Base Model)"
        ai = {
            "keyword": "N/A",
            "confidence": 0.0,
            "distress_score": 0,
            "distress_detected": False,
        }

    # v1 Event Packet
    v1 = {
        "packet_version": "v1",
        "event_type": event_type,
        "child_name": child["name"],
        "device_id": device_id,
        "timestamp": ts.isoformat(timespec="seconds"),
    }

    # v2 GPS Packet
    gps_coords, gps_health = get_gps(device_id)
    v2 = {**v1, "gps_coordinates": gps_coords, "gps_health": gps_health}
    log("GPS Added", device_id)

    # v3 BMI270 Packet
    fall_detected, motion_status, accel = get_bmi270(event_type)
    v3 = {**v2, "fall_detected": fall_detected, "motion_status": motion_status, "acceleration_data": accel}
    log("BMI270 Added", device_id)

    # v4 Audio AI Packet
    v4 = {
        **v3,
        "audio_id": audio_id,
        "keyword": ai["keyword"],
        "confidence": ai["confidence"],
        "distress_score": ai["distress_score"],
        "distress_detected": ai["distress_detected"],
    }

    # v5 AES128-GCM Packet
    v5 = aes_encrypt(v4)
    log("AES128-GCM Applied", device_id)

    # v6 Gateway Enriched Packet
    police = nearest_entity(gps_coords["lat"], gps_coords["lon"], POLICE_DB)
    help_center = nearest_entity(gps_coords["lat"], gps_coords["lon"], HELP_CENTER_DB)
    v6 = {**v5, "nearest_police_station": police, "authorized_help_center": help_center}
    log("Gateway Enrichment Complete", device_id)

    # v7 Parent Decrypted Packet
    decrypted = aes_decrypt(v5["nonce"], v5["ciphertext"], v5["authentication_tag"])
    v7 = {**decrypted, "nearest_police_station": police, "authorized_help_center": help_center}
    log("Packet Delivered to Parent", device_id)

    record = {
        "id": uuid.uuid4().hex[:8].upper(),
        "event_type": event_type,
        "child": child["name"],
        "device_id": device_id,
        "timestamp": ts,
        "versions": {"v1": v1, "v2": v2, "v3": v3, "v4": v4, "v5": v5, "v6": v6, "v7": v7},
        "distress_score": ai["distress_score"],
        "distress_detected": ai["distress_detected"],
        "keyword": ai["keyword"],
        "confidence": ai["confidence"],
        "fall_detected": fall_detected,
        "gps": gps_coords,
    }

    st.session_state.packets.insert(0, record)
    st.session_state.last_contact[device_id] = ts
    drain_battery(device_id)

    if ai["distress_detected"] or fall_detected or event_type in ("SOS", "FALL_DETECTION"):
        st.session_state.incidents[device_id] = {
            "status": "OPEN",
            "last_event": event_type,
            "packet_id": record["id"],
            "distress_score": ai["distress_score"],
            "fall_detected": fall_detected,
            "updated_at": ts,
        }

    return record


def run_live_tracking(child: dict, animate: bool):
    device_id = child["device_id"]
    log("Live Tracking Session Started (30 min / 11 packets)", device_id)
    session_packets = []
    progress_box = st.empty()
    for i in range(11):
        minute_mark = i * 3
        pkt = execute_event_pipeline("LIVE_TRACKING", child)
        pkt["minute_mark"] = minute_mark
        session_packets.append(pkt)
        if animate:
            progress_box.info(f"Packet {i + 1}/11 generated  |  simulated T+{minute_mark} min")
            time.sleep(0.35)
    progress_box.empty()
    st.session_state.tracking_sessions[device_id].insert(0, session_packets)
    log("Live Tracking Session Completed", device_id)


def check_heartbeats():
    """90-Minute Heartbeat Engine. Runs independently per-device and is NOT
    suppressed or reset by SOS / Fall / Request Info / Request Audio events.
    Scheduling is anchored to each device's last-fired time, so changing the
    interval (e.g. for demo purposes) takes effect immediately and correctly,
    rather than depending on when the slider happened to be moved."""
    interval = timedelta(minutes=st.session_state.heartbeat_interval_min)
    now = datetime.now()
    for child in CHILD_REGISTRY:
        device_id = child["device_id"]
        last = st.session_state.last_heartbeat.get(device_id)
        if last is None:
            st.session_state.last_heartbeat[device_id] = now
            continue
        if now - last >= interval:
            execute_event_pipeline("HEALTH_PACKET_90MIN", child)
            st.session_state.last_heartbeat[device_id] = now


def next_heartbeat_due(device_id: str) -> datetime | None:
    last = st.session_state.last_heartbeat.get(device_id)
    if last is None:
        return None
    return last + timedelta(minutes=st.session_state.heartbeat_interval_min)


def acknowledge_incident(device_id):
    inc = st.session_state.incidents.get(device_id)
    if inc and inc["status"] == "OPEN":
        inc["status"] = "ACKNOWLEDGED"
        inc["updated_at"] = datetime.now()
        log("Incident State Update -> ACKNOWLEDGED", device_id)


def escalate_incident(device_id):
    inc = st.session_state.incidents.get(device_id)
    if inc:
        inc["status"] = "ESCALATED"
        inc["updated_at"] = datetime.now()
        log("Escalation Workflow Initiated", device_id)


# ==============================================================================
# 5. UI THEME (Dark Operations Theme)
# ==============================================================================

def get_css(theme: str) -> str:
    if theme == "Light":
        root_vars = """
  --bg-app:#f5f7fa; --bg-panel:#ffffff; --bg-card:#ffffff;
  --border:#cbd5e1; --border-soft:#f1f5f9;
  --text-hi:#0f172a; --text-lo:#475569;
  --cyan:#0ea5e9; --green:#10b981; --amber:#f59e0b; --orange:#f97316; --red:#ef4444;
"""
    else:
        root_vars = """
  --bg-app:#0a0e14; --bg-panel:#0f141d; --bg-card:#141b26;
  --border:#232c3a; --border-soft:#1c2531;
  --text-hi:#e7edf5; --text-lo:#8a96a8;
  --cyan:#3bd6ff; --green:#00e676; --amber:#ffd60a; --orange:#ff8c00; --red:#ff3b30;
"""
    return f"""
<style>
:root{{
  {root_vars}
}}
.stApp{{ background-color:var(--bg-app); }}
section[data-testid="stSidebar"]{{ background-color:var(--bg-panel); border-right:1px solid var(--border); }}
div[data-testid="stHeader"]{{ background-color:rgba(0,0,0,0); }}
h1,h2,h3,h4,h5,h6,p,span,div,label{{ color:var(--text-hi); }}
.block-container{{ padding-top:1.2rem; }}

.ops-banner{{
  background:linear-gradient(90deg,#0d1320,#10182a);
  border:1px solid var(--border); border-left:4px solid var(--cyan);
  border-radius:6px; padding:14px 18px; margin-bottom:14px;
}}
.ops-title{{ font-family:'Courier New',monospace; font-size:1.55rem; font-weight:700;
  letter-spacing:1px; color:var(--text-hi); margin:0; }}
.ops-subtitle{{ font-family:'Courier New',monospace; font-size:0.8rem; color:var(--cyan);
  letter-spacing:2px; margin:2px 0 0 0; }}
.ops-disclaimer{{ font-size:0.74rem; color:var(--text-lo); margin-top:8px; line-height:1.4; }}

.status-strip{{ display:flex; gap:10px; flex-wrap:wrap; margin-bottom:14px; }}
.status-chip{{ background:var(--bg-card); border:1px solid var(--border); border-radius:6px;
  padding:10px 16px; min-width:150px; flex:1; }}
.status-chip-label{{ font-size:0.68rem; color:var(--text-lo); letter-spacing:1px; text-transform:uppercase; }}
.status-chip-value{{ font-family:'Courier New',monospace; font-size:1.05rem; font-weight:700; margin-top:3px; }}

.dot{{ display:inline-block; width:8px; height:8px; border-radius:50%; margin-right:6px; }}

.ops-card{{ background:var(--bg-card); border:1px solid var(--border); border-radius:6px;
  padding:12px 14px; margin-bottom:10px; overflow-y:auto; }}
.ops-card-title{{ font-size:0.78rem; font-weight:700; letter-spacing:0.5px; color:var(--text-hi);
  text-transform:uppercase; margin-bottom:8px; border-bottom:1px solid var(--border-soft); padding-bottom:6px; }}
.ops-row{{ display:flex; justify-content:space-between; font-size:0.82rem; padding:3px 0; }}
.ops-label{{ color:var(--text-lo); }}
.ops-value{{ font-family:'Courier New',monospace; font-weight:600; }}

.json-card{{ background:#0c1119; border:1px solid var(--border); border-radius:6px;
  padding:10px 12px; margin-bottom:10px; }}
.json-card-title{{ font-family:'Courier New',monospace; font-size:0.78rem; font-weight:700;
  color:var(--cyan); letter-spacing:0.5px; margin-bottom:6px; }}
.json-pre{{ font-family:'Courier New',monospace; font-size:0.74rem; color:#c9d6e3;
  white-space:pre-wrap; word-break:break-all; max-height:300px; overflow-y:auto; margin:0; line-height:1.35; }}

.badge{{ display:inline-block; padding:2px 9px; border-radius:10px; font-size:0.7rem;
  font-weight:700; letter-spacing:0.5px; }}

.log-console{{ background:#0a0f17; border:1px solid var(--border); border-radius:6px;
  padding:10px 14px; max-height:480px; overflow-y:auto; font-family:'Courier New',monospace; font-size:0.78rem; }}
.log-line{{ padding:2px 0; border-bottom:1px solid #11161f; }}
.log-time{{ color:var(--cyan); }}
.log-device{{ color:#9aa7bb; }}

div[data-testid="stMetric"]{{ background:var(--bg-card); border:1px solid var(--border);
  border-radius:6px; padding:10px 12px; }}

/* Card upgrades styling */
.device-card {{
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: 8px;
  padding: 16px;
  margin-bottom: 12px;
  transition: all 0.3s ease;
  position: relative;
}}
.device-card:hover {{
  border-color: var(--cyan);
  transform: translateY(-2px);
}}
.device-card.active {{
  border: 2px solid var(--cyan);
  box-shadow: 0 0 15px rgba(59, 214, 255, 0.25);
}}
.device-card-header {{
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-bottom: 1px solid var(--border-soft);
  padding-bottom: 8px;
  margin-bottom: 12px;
}}
.device-card-title {{
  font-size: 1rem;
  font-weight: 700;
  color: var(--text-hi);
}}
.device-card-subtitle {{
  font-size: 0.75rem;
  color: var(--text-lo);
  font-family: monospace;
}}
.device-metric-row {{
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
  font-size: 0.82rem;
}}
.progress-bar-container {{
  width: 100px;
  height: 6px;
  background: var(--border-soft);
  border-radius: 3px;
  overflow: hidden;
}}
.progress-bar-fill {{
  height: 100%;
  border-radius: 3px;
}}
</style>
"""


def status_color(status: str) -> str:
    return {
        "ONLINE": "#00e676", "GOOD": "#00e676", "NORMAL": "#00e676",
        "STANDBY": "#3bd6ff",
        "DEGRADED": "#ffd60a", "SUSPICIOUS": "#ffd60a", "ACKNOWLEDGED": "#ffd60a",
        "ELEVATED CONCERN": "#ff8c00", "OPEN": "#ff8c00",
        "OFFLINE": "#ff3b30", "HIGH DISTRESS": "#ff3b30", "ESCALATED": "#ff3b30",
    }.get(status, "#8a96a8")


def chip(label, value, color="#3bd6ff"):
    st.markdown(
        f'<div class="status-chip"><div class="status-chip-label">{html_lib.escape(label)}</div>'
        f'<div class="status-chip-value" style="color:{color};">'
        f'<span class="dot" style="background:{color};box-shadow:0 0 6px {color};"></span>{html_lib.escape(str(value))}</div></div>',
        unsafe_allow_html=True,
    )


def render_card(title, rows, height=None):
    style = f' style="height:{height}px;"' if height else ""
    rows_html = "".join(
        f'<div class="ops-row"><span class="ops-label">{html_lib.escape(str(k))}</span>'
        f'<span class="ops-value" style="color:{v[1] if isinstance(v, tuple) else "var(--text-hi)"};">'
        f'{html_lib.escape(str(v[0] if isinstance(v, tuple) else v))}</span></div>'
        for k, v in rows
    )
    st.markdown(f'<div class="ops-card"{style}><div class="ops-card-title">{html_lib.escape(title)}</div>{rows_html}</div>',
                unsafe_allow_html=True)


def json_card(title, data: dict, height=300):
    pretty = html_lib.escape(json.dumps(data, indent=2))
    st.markdown(
        f'<div class="json-card"><div class="json-card-title">{html_lib.escape(title)}</div>'
        f'<pre class="json-pre" style="max-height:{height}px;">{pretty}</pre></div>',
        unsafe_allow_html=True,
    )


def badge(text, color):
    return f'<span class="badge" style="background:{color}22;color:{color};border:1px solid {color}55;">{html_lib.escape(text)}</span>'


# ==============================================================================
# 6. APP
# ==============================================================================

def main():
    st.set_page_config(page_title="SHAKTIPIN V3 | Incident Response Console",
                        page_icon="🛡️", layout="wide", initial_sidebar_state="expanded")
    init_state()
    st.markdown(get_css(st.session_state.theme), unsafe_allow_html=True)
    check_heartbeats()

    # ---------------------------------------------------------------- HEADER
    st.markdown(
        '<div class="ops-banner">'
        '<div class="ops-title">🛡️ SHAKTIPIN V3 &nbsp;|&nbsp; INCIDENT RESPONSE CONSOLE</div>'
        '<div class="ops-subtitle">CHILD SAFETY EMERGENCY OPERATIONS CENTER &middot; COMMAND &amp; CONTROL SOFTWARE</div>'
        '<div class="ops-disclaimer">SIMULATION ONLY &mdash; all sensor data, audio metadata, GPS positions, '
        'and police/help-centre directories on this console are synthetically generated for demonstration. '
        'No real hardware, audio, or emergency-services data is involved. Audio is never uploaded, streamed, '
        'downloaded, or transferred &mdash; only on-device metadata is reported, exactly as the architecture specifies.</div>'
        '</div>', unsafe_allow_html=True,
    )

    # ---------------------------------------------------------------- SIDEBAR
    with st.sidebar:
        st.markdown("#### OPERATIONS THEME")
        is_light = st.toggle("☀️ Light Tactical Mode", value=(st.session_state.theme == "Light"))
        new_theme = "Light" if is_light else "Dark"
        if new_theme != st.session_state.theme:
            st.session_state.theme = new_theme
            st.rerun()

        st.markdown("---")
        st.markdown("#### SELECT ACTIVE DEVICE")
        for c in CHILD_REGISTRY:
            did = c["device_id"]
            is_active = (c["name"] == st.session_state.selected_child_name)
            variant_badge = "Pro" if "Pro" in c["variant"] else "Base"
            btn_label = f"{c['name']} ({did}) [{variant_badge}] (Active)" if is_active else f"{c['name']} ({did}) [{variant_badge}]"
            if st.button(btn_label, key=f"select_sidebar_{did}", use_container_width=True):
                st.session_state.selected_child_name = c["name"]
                st.rerun()

        st.markdown("---")
        st.markdown("#### HEARTBEAT ENGINE")
        st.session_state.heartbeat_interval_min = st.slider(
            "Heartbeat interval (minutes)", min_value=0.1, max_value=90.0,
            value=float(st.session_state.heartbeat_interval_min), step=0.1,
            help="Spec default is 90 minutes. Lower this to demo the independent heartbeat engine firing faster.",
        )
        st.session_state.animate_tracking = st.checkbox("Animate live-tracking playback", value=st.session_state.animate_tracking)

        st.markdown("---")
        st.markdown("#### CONSOLE REFRESH")
        st.session_state.auto_refresh = st.checkbox("Auto-refresh console", value=st.session_state.auto_refresh)
        st.session_state.refresh_seconds = st.slider("Refresh interval (sec)", 2, 30, st.session_state.refresh_seconds)

        st.markdown("---")
        if st.button("⟲ RESET CONSOLE", width="stretch"):
            st.session_state.clear()
            st.rerun()

    selected_child = CHILD_BY_NAME[st.session_state.selected_child_name]
    selected_device = selected_child["device_id"]

    # ---------------------------------------------------------------- TOP STATUS STRIP
    devices_online = sum(1 for c in CHILD_REGISTRY if device_radio_status(c["device_id"]) in ("ONLINE", "STANDBY"))
    open_incidents = sum(1 for inc in st.session_state.incidents.values() if inc["status"] == "OPEN")
    next_hb = next_heartbeat_due(selected_device)
    next_hb_str = next_hb.strftime("%H:%M:%S") if next_hb else "PENDING"

    st.markdown('<div class="status-strip">', unsafe_allow_html=True)
    cols = st.columns(5)
    with cols[0]: chip("System Status", "ONLINE", status_color("ONLINE"))
    with cols[1]: chip("Devices Online", f"{devices_online}/{len(CHILD_REGISTRY)}", status_color("ONLINE") if devices_online == len(CHILD_REGISTRY) else status_color("DEGRADED"))
    with cols[2]: chip("Active Incidents", open_incidents, status_color("OPEN") if open_incidents else status_color("NORMAL"))
    with cols[3]: chip("Packets Generated", len(st.session_state.packets), "#3bd6ff")
    with cols[4]: chip("Next Heartbeat", f"{next_hb_str} ({selected_device})", "#3bd6ff")
    st.markdown('</div>', unsafe_allow_html=True)

    # ---------------------------------------------------------------- TABS
    tab_overview, tab_trigger, tab_packet, tab_growth, tab_security, tab_gateway, tab_tracking, tab_log = st.tabs([
        "OPERATIONS OVERVIEW", "EVENT TRIGGERS", "PACKET LIFECYCLE", "PACKET ANALYTICS",
        "SECURITY", "GATEWAY", "LIVE TRACKING", "EVENT LOG",
    ])

    # ================================================================== OVERVIEW
    with tab_overview:
        st.markdown("##### DEVICE STATUS PANEL")
        grid_cols = st.columns(3)
        for i, c in enumerate(CHILD_REGISTRY):
            did = c["device_id"]
            batt = st.session_state.battery[did]
            batt_color = "#00e676" if batt > 50 else ("#ffd60a" if batt > 20 else "#ff3b30")
            radio = device_radio_status(did)
            storage = device_storage_pct(did)
            storage_color = "#00e676" if storage < 70 else ("#ffd60a" if storage < 90 else "#ff3b30")
            last_packets = [p for p in st.session_state.packets if p["device_id"] == did]
            gps_health = "NO DATA"
            if last_packets:
                gps_health = last_packets[0]["versions"]["v2"]["gps_health"]
            lc = st.session_state.last_contact.get(did)
            lc_str = lc.strftime("%H:%M:%S") if lc else "NEVER"
            with grid_cols[i % 3]:
                is_active = (c["name"] == st.session_state.selected_child_name)
                active_class = " active" if is_active else ""
                active_tag = badge("ACTIVE", "var(--cyan)") if is_active else ""
                
                card_html = f"""
                <div class="device-card{active_class}">
                    <div class="device-card-header">
                        <div>
                            <div class="device-card-title">{c['name']}</div>
                            <div class="device-card-subtitle">{c['variant']} &middot; {did}</div>
                        </div>
                        <div>{active_tag}</div>
                    </div>
                    <div class="device-metric-row">
                        <span class="ops-label">Battery</span>
                        <div style="display: flex; align-items: center; gap: 8px;">
                            <span class="ops-value" style="color: {batt_color}; font-size: 0.8rem;">{batt}%</span>
                            <div class="progress-bar-container">
                                <div class="progress-bar-fill" style="width: {batt}%; background-color: {batt_color};"></div>
                            </div>
                        </div>
                    </div>
                    <div class="device-metric-row">
                        <span class="ops-label">microSD Storage</span>
                        <div style="display: flex; align-items: center; gap: 8px;">
                            <span class="ops-value" style="color: {storage_color}; font-size: 0.8rem;">{storage}%</span>
                            <div class="progress-bar-container">
                                <div class="progress-bar-fill" style="width: {storage}%; background-color: {storage_color};"></div>
                            </div>
                        </div>
                    </div>
                    <div class="device-metric-row">
                        <span class="ops-label">GPS Health</span>
                        <span class="ops-value" style="color: {status_color(gps_health)};">{gps_health}</span>
                    </div>
                    <div class="device-metric-row">
                        <span class="ops-label">Radio Status</span>
                        <span class="ops-value" style="color: {status_color(radio)};">
                            <span class="dot" style="background: {status_color(radio)}; box-shadow: 0 0 6px {status_color(radio)};"></span>
                            {radio}
                        </span>
                    </div>
                    <div class="device-metric-row" style="margin-bottom: 0px;">
                        <span class="ops-label">Last Contact</span>
                        <span class="ops-value">{lc_str}</span>
                    </div>
                </div>
                """
                st.markdown(card_html, unsafe_allow_html=True)
                
                # Button to select device
                if not is_active:
                    if st.button("🎯 Focus Device", key=f"focus_overview_{did}", use_container_width=True):
                        st.session_state.selected_child_name = c["name"]
                        st.rerun()
                else:
                    st.button("🌟 Selected", key=f"focus_overview_{did}", disabled=True, use_container_width=True)

        st.markdown("##### NETWORK EMULATOR")
        nm = network_metrics()
        nm_cols = st.columns(6)
        for col, (k, v) in zip(nm_cols, nm.items()):
            with col:
                st.metric(k, v)

        st.markdown("##### INCIDENT BOARD")
        if not st.session_state.incidents:
            st.info("No incidents recorded yet. Trigger SOS / Fall Detection from EVENT TRIGGERS to populate this board.")
        else:
            for did, inc in sorted(st.session_state.incidents.items(), key=lambda kv: kv[1]["updated_at"], reverse=True):
                child = CHILD_BY_DEVICE[did]
                c1, c2, c3, c4, c5 = st.columns([2.2, 1.4, 1.6, 1, 1])
                with c1:
                    st.markdown(f"**{child['name']}**  `{did}`", unsafe_allow_html=True)
                with c2:
                    st.markdown(badge(inc["status"], status_color(inc["status"])), unsafe_allow_html=True)
                with c3:
                    label, color = distress_label(inc["distress_score"])
                    st.markdown(badge(f"{label} ({inc['distress_score']})", color), unsafe_allow_html=True)
                with c4:
                    if st.button("Acknowledge", key=f"ack_{did}", disabled=inc["status"] != "OPEN"):
                        acknowledge_incident(did)
                        st.rerun()
                with c5:
                    if st.button("Escalate", key=f"esc_{did}", disabled=inc["status"] == "ESCALATED"):
                        escalate_incident(did)
                        st.rerun()

    # ================================================================== EVENT TRIGGERS
    with tab_trigger:
        st.markdown(f"##### TRIGGER EVENT FOR: **{selected_child['name']}**  (`{selected_device}`)")
        st.caption("All event sources execute the identical pipeline: Audio Capture → microSD → Edge AI → GPS → BMI270 → AES128-GCM → Gateway → Parent App.")

        b1, b2, b3, b4, b5 = st.columns(5)
        with b1:
            if st.button("🚨 SOS BUTTON", width="stretch"):
                execute_event_pipeline("SOS", selected_child)
                st.rerun()
        with b2:
            if st.button("⚠ FALL DETECTION", width="stretch"):
                execute_event_pipeline("FALL_DETECTION", selected_child)
                st.rerun()
        with b3:
            if st.button("ℹ REQUEST INFO", width="stretch"):
                execute_event_pipeline("REQUEST_INFO", selected_child)
                st.rerun()
        with b4:
            is_pro = (selected_child.get("variant") == "Shaktipin Pro")
            if is_pro:
                if st.button("🎙 REQUEST AUDIO", width="stretch"):
                    execute_event_pipeline("REQUEST_AUDIO", selected_child)
                    st.rerun()
            else:
                st.button("🎙 REQUEST AUDIO (Pro Only)", width="stretch", disabled=True, help="Audio features require Shaktipin Pro variant.")
        with b5:
            if st.button("🩺 DEVICE HEALTH", width="stretch"):
                execute_event_pipeline("DEVICE_HEALTH", selected_child)
                st.rerun()

        st.markdown("---")
        st.markdown("##### MOST RECENT PACKET")
        device_packets = [p for p in st.session_state.packets if p["device_id"] == selected_device]
        if not device_packets:
            st.info("No packets yet for this device. Trigger an event above.")
        else:
            p = device_packets[0]
            label, color = distress_label(p["distress_score"])
            is_pro = (selected_child.get("variant") == "Shaktipin Pro")
            if is_pro:
                tiny_ml_rows = [
                    ("Keyword", p.get("keyword", "N/A")),
                    ("Distress Score", (p["distress_score"], color)),
                    ("Confidence", (f"{int(p.get('confidence', 0.0) * 100)}%", color)),
                    ("Status", (label, color)),
                ]
            else:
                tiny_ml_rows = [
                    ("Keyword", "N/A"),
                    ("Distress Score", ("0", status_color("NORMAL"))),
                    ("Confidence", "0%"),
                    ("Status", ("Bypassed (Base Model)", status_color("NORMAL"))),
                ]

            c1, c2, c3, c4 = st.columns(4)
            with c1: render_card("Event", [("Type", p["event_type"]), ("Time", p["timestamp"].strftime("%H:%M:%S")), ("Packet ID", p["id"])], height=150)
            with c2: render_card("tinyML Output", tiny_ml_rows, height=150)
            with c3: render_card("Fall Detection", [("Fall Detected", ("YES", "#ff3b30") if p["fall_detected"] else ("NO", "#00e676")), ("Motion Status", p["versions"]["v3"]["motion_status"])], height=150)
            with c4: render_card("GPS Telemetry", [("Lat", p["gps"]["lat"]), ("Lon", p["gps"]["lon"]), ("Health", (p["versions"]["v2"]["gps_health"], status_color(p["versions"]["v2"]["gps_health"])))], height=150)

    # ================================================================== PACKET LIFECYCLE INSPECTOR
    with tab_packet:
        st.markdown("##### PACKET LIFECYCLE INSPECTOR")
        st.caption("v1 → v7 shown simultaneously. No hidden expanders, no collapsed views.")
        if not st.session_state.packets:
            st.info("No packets generated yet.")
        else:
            options = [f"{p['timestamp'].strftime('%H:%M:%S')} | {p['event_type']} | {p['child']} | #{p['id']}" for p in st.session_state.packets]
            idx = st.selectbox("Select packet", range(len(options)), format_func=lambda i: options[i])
            pkt = st.session_state.packets[idx]
            row1 = st.columns(4)
            row2 = st.columns(3)
            for col, v in zip(row1 + row2, PACKET_VERSIONS):
                with col:
                    json_card(f"{v.upper()} — {PACKET_VERSION_LABELS[v]}", pkt["versions"][v], height=260)

    # ================================================================== PACKET ANALYTICS
    with tab_growth:
        st.markdown("##### PACKET GROWTH ANALYSIS")
        if not st.session_state.packets:
            st.info("No packets generated yet.")
        else:
            options = [f"{p['timestamp'].strftime('%H:%M:%S')} | {p['event_type']} | {p['child']} | #{p['id']}" for p in st.session_state.packets]
            idx = st.selectbox("Select packet", range(len(options)), format_func=lambda i: options[i], key="growth_select")
            pkt = st.session_state.packets[idx]
            sizes = [len(json.dumps(pkt["versions"][v])) for v in PACKET_VERSIONS]
            df = pd.DataFrame({"Packet Version": [v.upper() for v in PACKET_VERSIONS],
                                "Label": [PACKET_VERSION_LABELS[v] for v in PACKET_VERSIONS],
                                "Size (bytes)": sizes}).set_index("Packet Version")
            c1, c2 = st.columns([1, 1.4])
            with c1:
                st.dataframe(df, width="stretch")
            with c2:
                st.bar_chart(df["Size (bytes)"])

    # ================================================================== SECURITY
    with tab_security:
        st.markdown("##### SECURITY PANEL")
        c1, c2 = st.columns(2)
        with c1:
            render_card("AES128-GCM Engine", [
                ("Encryption Status", ("ACTIVE", "#00e676")),
                ("Algorithm", "AES-128-GCM"),
                ("Authentication", "Built-in GCM Tag (NO separate HMAC)"),
                ("Session Key Fingerprint", key_fingerprint()),
            ], height=170)
        if not st.session_state.packets:
            st.info("No packets generated yet — encrypt an event to populate the security inspector.")
        else:
            options = [f"{p['timestamp'].strftime('%H:%M:%S')} | {p['event_type']} | {p['child']} | #{p['id']}" for p in st.session_state.packets]
            idx = st.selectbox("Select packet", range(len(options)), format_func=lambda i: options[i], key="sec_select")
            pkt = st.session_state.packets[idx]
            v5 = pkt["versions"]["v5"]
            try:
                aes_decrypt(v5["nonce"], v5["ciphertext"], v5["authentication_tag"])
                integrity = ("VERIFIED", "#00e676")
            except Exception:
                integrity = ("FAILED", "#ff3b30")
            with c2:
                render_card("Integrity Check (v5)", [("Tag Verification", integrity)], height=170)
            json_card("v5 — Nonce / Ciphertext / Authentication Tag", v5, height=220)

    # ================================================================== GATEWAY
    with tab_gateway:
        st.markdown("##### GATEWAY ARCHITECTURE")
        st.caption("Police / help-centre directories below are SIMULATED DEMO DATA for the gateway-enrichment visualization only.")
        c1, c2 = st.columns(2)
        with c1:
            st.markdown("**Police Station Database (Demo)**")
            st.dataframe(pd.DataFrame(POLICE_DB), hide_index=True, width="stretch")
        with c2:
            st.markdown("**Authorized Help Centre Database (Demo)**")
            st.dataframe(pd.DataFrame(HELP_CENTER_DB), hide_index=True, width="stretch")

        st.markdown("---")
        st.markdown("##### LATEST GATEWAY ENRICHMENT (v6)")
        if not st.session_state.packets:
            st.info("No packets generated yet.")
        else:
            pkt = st.session_state.packets[0]
            v6 = pkt["versions"]["v6"]
            c1, c2 = st.columns(2)
            with c1: json_card("Nearest Police Station", v6["nearest_police_station"], height=140)
            with c2: json_card("Authorized Help Centre", v6["authorized_help_center"], height=140)

    # ================================================================== LIVE TRACKING
    with tab_tracking:
        st.markdown(f"##### LIVE TRACKING ENGINE — {selected_child['name']} (`{selected_device}`)")
        st.caption("Duration: 30 minutes · Interval: 3 minutes · Packets: 11. Every packet executes the full pipeline.")
        if st.button("📍 START LIVE TRACKING SESSION", width="stretch"):
            run_live_tracking(selected_child, st.session_state.animate_tracking)
            st.rerun()

        sessions = st.session_state.tracking_sessions[selected_device]
        if not sessions:
            st.info("No live tracking sessions recorded yet for this device.")
        else:
            sess = sessions[0]
            df = pd.DataFrame([{
                "Packet": i + 1, "T (min)": p["minute_mark"],
                "Distress Score": p["distress_score"], "Fall Detected": p["fall_detected"],
                "lat": p["gps"]["lat"], "lon": p["gps"]["lon"],
            } for i, p in enumerate(sess)])
            c1, c2 = st.columns([1.3, 1])
            with c1:
                st.dataframe(df.drop(columns=["lat", "lon"]), hide_index=True, width="stretch")
            
            # Custom Pydeck implementation to allow hover tooltips and styled green-circled last location
            map_data = []
            for i, p in enumerate(sess):
                is_last = (i == len(sess) - 1)
                if is_last:
                    fill_color = [0, 230, 118, 120]  # Semi-transparent green
                    line_color = [0, 230, 118, 255]  # Solid bright green circle border
                    size = 25
                else:
                    fill_color = [255, 59, 48, 220]  # Red
                    line_color = [255, 59, 48, 0]    # Transparent border
                    size = 12
                
                timestamp_str = p["timestamp"].strftime("%H:%M:%S")
                map_data.append({
                    "lat": p["gps"]["lat"],
                    "lon": p["gps"]["lon"],
                    "timestamp": f"{timestamp_str} (T+{p['minute_mark']} min)",
                    "distress_score": p["distress_score"],
                    "fall_detected": "Yes" if p["fall_detected"] else "No",
                    "fill_color": fill_color,
                    "line_color": line_color,
                    "size": size,
                })
            df_map = pd.DataFrame(map_data)
            
            last_coord = df_map.iloc[-1]
            view_state = pdk.ViewState(
                latitude=last_coord["lat"],
                longitude=last_coord["lon"],
                zoom=13.5,
                pitch=0
            )
            
            scatter_layer = pdk.Layer(
                "ScatterplotLayer",
                df_map,
                pickable=True,
                opacity=0.85,
                stroked=True,
                filled=True,
                radius_scale=2,
                radius_min_pixels=6,
                radius_max_pixels=30,
                line_width_min_pixels=3,
                get_position="[lon, lat]",
                get_radius="size",
                get_fill_color="fill_color",
                get_line_color="line_color",
            )
            
            path_data = [{"path": df_map[["lon", "lat"]].values.tolist()}]
            path_layer = pdk.Layer(
                "PathLayer",
                path_data,
                get_path="path",
                get_color="[59, 214, 255, 150]" if st.session_state.theme == "Dark" else "[2, 132, 199, 150]",
                width_min_pixels=3,
                pickable=False
            )
            
            with c2:
                st.pydeck_chart(
                    pdk.Deck(
                        layers=[path_layer, scatter_layer],
                        initial_view_state=view_state,
                        map_style="mapbox://styles/mapbox/dark-v9" if st.session_state.theme == "Dark" else "mapbox://styles/mapbox/light-v9",
                        tooltip={
                            "html": "<b>Time:</b> {timestamp}<br/><b>Distress Score:</b> {distress_score}<br/><b>Fall Detected:</b> {fall_detected}",
                            "style": {
                                "backgroundColor": "#141b26" if st.session_state.theme == "Dark" else "#ffffff",
                                "color": "#e7edf5" if st.session_state.theme == "Dark" else "#1e293b",
                                "border": "1px solid #232c3a" if st.session_state.theme == "Dark" else "1px solid #cbd5e1",
                                "fontFamily": "Courier New, monospace"
                            }
                        }
                    )
                )

    # ================================================================== EVENT LOG
    with tab_log:
        st.markdown("##### EVENT LOGGING ENGINE")
        if st.button("Clear Log"):
            st.session_state.event_log = []
            st.rerun()
        if not st.session_state.event_log:
            st.info("No events logged yet.")
        else:
            lines = "".join(
                f'<div class="log-line"><span class="log-time">{e["time"]}</span> '
                f'<span class="log-device">[{e["device_id"]}]</span> {html_lib.escape(e["message"])}</div>'
                for e in st.session_state.event_log[:300]
            )
            st.markdown(f'<div class="log-console">{lines}</div>', unsafe_allow_html=True)

    # ---------------------------------------------------------------- AUTO REFRESH
    if st.session_state.auto_refresh:
        time.sleep(st.session_state.refresh_seconds)
        st.rerun()


main()
