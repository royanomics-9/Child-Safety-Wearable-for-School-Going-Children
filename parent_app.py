import base64
import html as html_lib
import json
import os
import random
import time
from datetime import datetime

import pandas as pd
import pydeck as pdk
import streamlit as st
from cryptography.hazmat.primitives.ciphers.aead import AESGCM
import db_helper

# ==============================================================================
# 1. STATIC CONFIG -- CHILD REGISTRY
# ==============================================================================
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

# ==============================================================================
# 2. UI THEME CONFIGURATION
# ==============================================================================
def get_browser_css(theme: str) -> str:
    if theme == "Light":
        root_vars = """
  --bg-app:#f5f7fa; --bg-panel:#ffffff; --bg-card:#ffffff;
  --border:#cbd5e1; --border-soft:#f1f5f9;
  --text-hi:#0f172a; --text-lo:#475569;
  --cyan:#0ea5e9; --green:#10b981; --amber:#f59e0b; --red:#ef4444;
"""
    else:
        root_vars = """
  --bg-app:#0a0e14; --bg-panel:#0f141d; --bg-card:#141b26;
  --border:#232c3a; --border-soft:#1c2531;
  --text-hi:#e7edf5; --text-lo:#8a96a8;
  --cyan:#3bd6ff; --green:#00e676; --amber:#ffd60a; --red:#ff3b30;
"""
    return f"""
<style>
:root{{
  {root_vars}
}}

.stApp {{
    background-color: var(--bg-app);
}}

section[data-testid="stSidebar"] {{
    background-color: var(--bg-panel);
    border-right: 1px solid var(--border);
}}

h1,h2,h3,h4,h5,h6,p,span,div,label {{
    color: var(--text-hi);
}}

.parent-banner {{
    background: linear-gradient(90deg, #0f1624, #152238);
    border: 1px solid var(--border);
    border-left: 4px solid var(--cyan);
    border-radius: 6px;
    padding: 14px 18px;
    margin-bottom: 20px;
}}

.parent-title {{
    font-family: 'Courier New', monospace;
    font-size: 1.55rem;
    font-weight: 700;
    letter-spacing: 1px;
    color: var(--text-hi);
    margin: 0;
}}

.parent-subtitle {{
    font-family: 'Courier New', monospace;
    font-size: 0.8rem;
    color: var(--cyan);
    letter-spacing: 2px;
    margin: 2px 0 0 0;
}}

.ops-card {{
    background: var(--bg-card);
    border: 1px solid var(--border);
    border-radius: 6px;
    padding: 16px;
    margin-bottom: 12px;
    min-height: 120px;
}}

.ops-card-title {{
    font-size: 0.85rem;
    font-weight: 700;
    letter-spacing: 0.5px;
    color: var(--text-hi);
    text-transform: uppercase;
    margin-bottom: 12px;
    border-bottom: 1px solid var(--border-soft);
    padding-bottom: 6px;
}}

.ops-row {{
    display: flex;
    justify-content: space-between;
    font-size: 0.85rem;
    padding: 4px 0;
}}

.ops-label {{
    color: var(--text-lo);
}}

.ops-value {{
    font-family: 'Courier New', monospace;
    font-weight: 600;
}}

.alert-banner-wide {{
    background: linear-gradient(135deg, rgba(255,59,48,0.08), rgba(255,59,48,0.15));
    border: 1px solid var(--red);
    border-left: 5px solid var(--red);
    border-radius: 6px;
    padding: 16px;
    margin-bottom: 20px;
    animation: pulse-alert 2.5s infinite;
}}

@keyframes pulse-alert {{
    0% {{ box-shadow: 0 0 0 0 rgba(255,59,48,0.3); }}
    70% {{ box-shadow: 0 0 0 10px rgba(255,59,48,0); }}
    100% {{ box-shadow: 0 0 0 0 rgba(255,59,48,0); }}
}}

.alert-title-wide {{
    font-size: 1.05rem;
    font-weight: 700;
    color: var(--red);
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 6px;
}}

.alert-desc-wide {{
    font-size: 0.88rem;
    color: var(--text-hi);
    line-height: 1.5;
}}

.progress-bar-container {{
    width: 100%;
    height: 8px;
    background: var(--border-soft);
    border-radius: 4px;
    overflow: hidden;
    margin-top: 6px;
}}

.progress-bar-fill {{
    height: 100%;
    border-radius: 4px;
}}

.decryption-box {{
    background: #070b12;
    border: 1px solid var(--border);
    border-radius: 6px;
    padding: 12px;
    font-family: 'Courier New', monospace;
    font-size: 0.78rem;
    margin-bottom: 16px;
    max-height: 250px;
    overflow-y: auto;
    word-break: break-all;
    color: #c9d6e3;
    line-height: 1.4;
}}

.decryption-title {{
    font-size: 0.8rem;
    font-weight: 700;
    color: var(--cyan);
    margin-bottom: 6px;
    text-transform: uppercase;
    letter-spacing: 0.5px;
}}

.verified-badge {{
    background: rgba(0, 230, 118, 0.1);
    color: var(--green);
    border: 1px solid var(--green);
    padding: 4px 12px;
    border-radius: 20px;
    font-size: 0.75rem;
    font-weight: 700;
    display: inline-block;
    margin-top: 8px;
}}

.dot {{
    display: inline-block;
    width: 8px;
    height: 8px;
    border-radius: 50%;
    margin-right: 6px;
}}

.badge {{
    display: inline-block;
    padding: 2px 9px;
    border-radius: 10px;
    font-size: 0.7rem;
    font-weight: 700;
    letter-spacing: 0.5px;
}}
</style>
"""

def status_color_browser(status: str) -> str:
    return {
        "ONLINE": "var(--green)", "GOOD": "var(--green)", "NORMAL": "var(--green)",
        "STANDBY": "var(--cyan)",
        "DEGRADED": "var(--amber)", "SUSPICIOUS": "var(--amber)", "ACKNOWLEDGED": "var(--amber)",
        "ELEVATED CONCERN": "var(--amber)", "OPEN": "var(--amber)",
        "OFFLINE": "var(--red)", "HIGH DISTRESS": "var(--red)", "ESCALATED": "var(--red)",
    }.get(status, "var(--text-lo)")

def badge(text, color):
    return f'<span class="badge" style="background:{color}22;color:{color};border:1px solid {color}55;">{html_lib.escape(text)}</span>'

# ==============================================================================
# 3. HELPER FUNCTIONS
# ==============================================================================
def parse_dt(val):
    if isinstance(val, str):
        try:
            return datetime.fromisoformat(val)
        except Exception:
            return val
    return val

def device_radio_status(device_id: str, db) -> str:
    lc_str = db.get("last_contact", {}).get(device_id)
    if not lc_str:
        return "STANDBY"
    lc = parse_dt(lc_str)
    elapsed_min = (datetime.now() - lc).total_seconds() / 60
    hb_interval = float(db.get("heartbeat_interval_min", 90.0))
    return "ONLINE" if elapsed_min <= max(hb_interval * 1.5, 1) else "OFFLINE"

def device_storage_pct(device_id: str, db) -> float:
    microsd_list = db.get("microsd", {}).get(device_id, [])
    used_mb = len(microsd_list) * (80 / 1024)
    return round(min(used_mb / 512 * 100, 100), 1)

# ==============================================================================
# 4. APP MAIN
# ==============================================================================
def main():
    st.set_page_config(
        page_title="SHAKTIPIN | Parent Companion Portal", 
        page_icon="🛡️", 
        layout="wide",
        initial_sidebar_state="expanded"
    )
    
    # Initialize DB & session state theme
    db = db_helper.load_db()
    if "theme" not in st.session_state:
        st.session_state.theme = db.get("theme", "Dark")
        
    st.markdown(get_browser_css(st.session_state.theme), unsafe_allow_html=True)
    
    # Header Banner
    st.markdown(
        '<div class="parent-banner">'
        '<div class="parent-title">🛡️ SHAKTIPIN &nbsp;|&nbsp; PARENT PORTAL</div>'
        '<div class="parent-subtitle">SECURE COMPANION APP FOR CHILD WEARABLES</div>'
        '</div>', unsafe_allow_html=True
    )

    # ================================================================= SIDEBAR
    with st.sidebar:
        st.markdown("#### ACTIVE CHILD")
        selected_child_name = st.selectbox(
            "Select active child", [c["name"] for c in CHILD_REGISTRY],
            label_visibility="collapsed"
        )
        selected_child = CHILD_BY_NAME[selected_child_name]
        selected_device = selected_child["device_id"]
        is_pro = "Pro" in selected_child["variant"]

        # Read latest database values
        db = db_helper.load_db()

        st.markdown("---")
        st.markdown("#### DEVICE DETAILS")
        st.markdown(
            f"**Device ID:** `{selected_device}`  \n"
            f"**Variant:** `{selected_child['variant']}`  \n"
            f"**Age:** `{selected_child['age']}` years old"
        )

        st.markdown("---")
        st.markdown("#### APP THEME")
        is_light = st.toggle("☀️ Light Tactical Mode", value=(st.session_state.theme == "Light"))
        new_theme = "Light" if is_light else "Dark"
        if new_theme != st.session_state.theme:
            st.session_state.theme = new_theme
            db["theme"] = new_theme
            db_helper.save_db(db)
            st.rerun()

        st.markdown("---")
        if st.button("⟲ REFRESH STATE", use_container_width=True):
            st.rerun()

    # ============================================================= ALERT BANNER
    inc = db.get("incidents", {}).get(selected_device)
    if inc and inc["status"] in ("OPEN", "ESCALATED"):
        alert_col = status_color_browser(inc["status"])
        st.markdown(
            f'<div class="alert-banner-wide">'
            f'<div class="alert-title-wide">'
            f'<span class="dot" style="background:{alert_col};box-shadow:0 0 8px {alert_col};"></span>'
            f'CRITICAL EMERGENCY ALERT: {inc["last_event"]}</div>'
            f'<div class="alert-desc-wide">'
            f'The Child Safety Distress pipeline has been triggered for <b>{selected_child_name}</b>.<br/>'
            f'<b>tinyML Distress Score:</b> {inc["distress_score"]}/100 &middot; '
            f'<b>Fall Incident:</b> {"YES" if inc["fall_detected"] else "NO"} &middot; '
            f'<b>Incident Status:</b> {inc["status"]}'
            f'</div></div>',
            unsafe_allow_html=True
        )
        
        c_ack, c_esc, c_spacer = st.columns([1, 1, 2])
        with c_ack:
            if st.button("Acknowledge Emergency", use_container_width=True, disabled=(inc["status"] == "ACKNOWLEDGED")):
                db["incidents"][selected_device]["status"] = "ACKNOWLEDGED"
                db["incidents"][selected_device]["updated_at"] = datetime.now().isoformat()
                db["event_log"].insert(0, {
                    "time": datetime.now().strftime("%H:%M:%S"),
                    "device_id": selected_device,
                    "message": "Incident State Update -> ACKNOWLEDGED (via Parent Portal)"
                })
                db_helper.save_db(db)
                st.toast("Alert Acknowledged.")
                st.rerun()
        with c_esc:
            if st.button("Escalate to Command Center", type="primary", use_container_width=True, disabled=(inc["status"] == "ESCALATED")):
                db["incidents"][selected_device]["status"] = "ESCALATED"
                db["incidents"][selected_device]["updated_at"] = datetime.now().isoformat()
                db["event_log"].insert(0, {
                    "time": datetime.now().strftime("%H:%M:%S"),
                    "device_id": selected_device,
                    "message": "Escalation Workflow Initiated (via Parent Portal)"
                })
                db_helper.save_db(db)
                st.toast("Workflow Escalated.")
                st.rerun()
        st.markdown("---")

    # ===================================================================== TABS
    tab_home, tab_track, tab_security, tab_actions = st.tabs([
        "🏠 DEVICE STATUS", "📍 GEOSPATIAL LIVE TRACKING", "🔐 AES-128-GCM DECRYPTION LAB", "⚡ COMMAND CENTER"
    ])

    # ================================================================== HOME TAB
    with tab_home:
        col1, col2 = st.columns(2)
        
        with col1:
            st.markdown("##### REAL-TIME HEALTH METRICS")
            
            # Load real-time metrics
            batt = db.get("battery", {}).get(selected_device, 100.0)
            batt_color = "var(--green)" if batt > 50 else ("var(--amber)" if batt > 20 else "var(--red)")
            
            radio = device_radio_status(selected_device, db)
            radio_color = status_color_browser(radio)
            
            storage = device_storage_pct(selected_device, db)
            storage_color = "var(--green)" if storage < 70 else ("var(--amber)" if storage < 90 else "var(--red)")

            st.markdown(
                f'<div class="metric-row"><span class="metric-label">Device Battery Level</span><span class="metric-val" style="color:{batt_color};">{batt}%</span></div>'
                f'<div class="progress-bar-container"><div class="progress-bar-fill" style="width:{batt}%;background:{batt_color};"></div></div>',
                unsafe_allow_html=True
            )
            st.markdown("<br/>", unsafe_allow_html=True)
            
            st.markdown(
                f'<div class="metric-row"><span class="metric-label">microSD Memory Capacity</span><span class="metric-val" style="color:{storage_color};">{storage}%</span></div>'
                f'<div class="progress-bar-container"><div class="progress-bar-fill" style="width:{storage}%;background:{storage_color};"></div></div>',
                unsafe_allow_html=True
            )
            
        with col2:
            st.markdown("##### CONNECTION TELEMETRY")
            
            st.markdown(
                f'<div class="ops-card">'
                f'<div class="ops-row"><span class="ops-label">Radio Status</span>'
                f'<span class="ops-value" style="color:{radio_color};"><span class="dot" style="background:{radio_color};box-shadow:0 0 6px {radio_color};"></span>{radio}</span></div>'
                f'<div class="ops-row"><span class="ops-label">Signal RSSI</span><span class="ops-value">-68 dBm</span></div>'
                f'<div class="ops-row"><span class="ops-label">Link Latency</span><span class="ops-value">115 ms</span></div>'
                f'<div class="ops-row"><span class="ops-label">Packet Loss Rate</span><span class="ops-value">0.02%</span></div>'
                f'</div>',
                unsafe_allow_html=True
            )

    # ================================================================= TRACK TAB
    with tab_track:
        st.markdown("##### GEOSPATIAL LIVE TRACKING MAP")
        
        sessions = db.get("tracking_sessions", {}).get(selected_device, [])
        device_packets = [p for p in db.get("packets", []) if p["device_id"] == selected_device]
        
        # Determine tracking coordinates
        track_packets = []
        if sessions:
            track_packets = sessions[0]
        elif device_packets:
            track_packets = list(reversed(device_packets[:10]))
            
        if not track_packets:
            st.info("No tracking history found. Run 'Trigger Live Tracking' from Command Center to populate this map.")
        else:
            map_data = []
            for i, p in enumerate(track_packets):
                is_last = (i == len(track_packets) - 1)
                if is_last:
                    fill_color = [0, 230, 118, 120]  # Semi-transparent green
                    line_color = [0, 230, 118, 255]  # Solid bright green circle border
                    size = 25
                else:
                    fill_color = [255, 59, 48, 220]  # Red
                    line_color = [255, 59, 48, 0]    # Transparent border
                    size = 12
                
                t_val = parse_dt(p["timestamp"])
                timestamp_str = t_val.strftime("%H:%M:%S") if isinstance(t_val, datetime) else str(t_val)
                min_mark = p.get("minute_mark", 0)
                
                lat = p["gps"]["lat"] if "gps" in p else p.get("gps_coordinates", {}).get("lat", 0.0)
                lon = p["gps"]["lon"] if "gps" in p else p.get("gps_coordinates", {}).get("lon", 0.0)
                
                map_data.append({
                    "lat": lat,
                    "lon": lon,
                    "timestamp": f"{timestamp_str} (T+{min_mark} min)",
                    "distress_score": p.get("distress_score", 0),
                    "fall_detected": "Yes" if p.get("fall_detected", False) else "No",
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
            
            col_map, col_details = st.columns([3, 2])
            
            with col_map:
                st.pydeck_chart(
                    pdk.Deck(
                        layers=[path_layer, scatter_layer],
                        initial_view_state=view_state,
                        map_provider="carto",
                        map_style="dark" if st.session_state.theme == "Dark" else "light",
                        tooltip={
                            "html": "<b>Time:</b> {timestamp}<br/><b>Distress Score:</b> {distress_score}<br/><b>Fall:</b> {fall_detected}",
                            "style": {
                                "backgroundColor": "#141b26" if st.session_state.theme == "Dark" else "#ffffff",
                                "color": "#e7edf5" if st.session_state.theme == "Dark" else "#1e293b",
                                "border": "1px solid #232c3a" if st.session_state.theme == "Dark" else "1px solid #cbd5e1",
                                "fontFamily": "Courier New, monospace"
                            }
                        }
                    ),
                    use_container_width=True
                )
            
            with col_details:
                st.markdown("**GPS BREADCRUMBS**")
                st.dataframe(df_map[["timestamp", "distress_score", "fall_detected", "lat", "lon"]], hide_index=True, use_container_width=True)

    # ================================================================== SECURITY TAB
    with tab_security:
        st.markdown("##### DECRYPTION & INTEGRITY VERIFICATION LAB (AES-128-GCM)")
        
        device_packets = [p for p in db.get("packets", []) if p["device_id"] == selected_device]
        if not device_packets:
            st.info("No telemetry packets found. Trigger an event in the Wearable Console.")
        else:
            p = device_packets[0]
            v5 = p["versions"]["v5"]
            
            col_enc, col_dec = st.columns(2)
            
            with col_enc:
                st.markdown("**1. Receive Encrypted Gateway Payload (v5)**")
                st.markdown("<div class='decryption-title'>Ciphertext and Tags</div>", unsafe_allow_html=True)
                st.markdown(
                    f"<div class='decryption-box'>"
                    f"<b>NONCE:</b><br/>{v5.get('nonce')}<br/><br/>"
                    f"<b>CIPHERTEXT:</b><br/>{v5.get('ciphertext')[:150]}...<br/><br/>"
                    f"<b>GCM AUTH TAG:</b><br/>{v5.get('authentication_tag')}"
                    f"</div>",
                    unsafe_allow_html=True
                )
                
                # Show key details
                aes_key_b64 = db.get("aes_key")
                st.markdown(
                    f'<div class="ops-card">'
                    f'<div class="ops-row"><span class="ops-label">Algorithm</span><span class="ops-value">AES-128-GCM</span></div>'
                    f'<div class="ops-row"><span class="ops-label">AES Key (Base64)</span><span class="ops-value" style="font-size:0.75rem;">{aes_key_b64}</span></div>'
                    f'</div>',
                    unsafe_allow_html=True
                )
                
                decrypt_clicked = st.button("🔓 DECRYPT & VERIFY PAYLOAD", use_container_width=True)
                
            with col_dec:
                st.markdown("**2. Decrypted Output**")
                if decrypt_clicked:
                    with st.spinner("Decrypting AES-GCM block and verifying tag..."):
                        time.sleep(0.4)
                    try:
                        aes_key = base64.b64decode(aes_key_b64)
                        aesgcm = AESGCM(aes_key)
                        nonce = base64.b64decode(v5["nonce"])
                        ciphertext = base64.b64decode(v5["ciphertext"])
                        tag = base64.b64decode(v5["authentication_tag"])
                        
                        plaintext = aesgcm.decrypt(nonce, ciphertext + tag, None)
                        decrypted_payload = json.loads(plaintext.decode())
                        
                        st.markdown("<div class='verified-badge'>✅ AES-GCM INTEGRITY CHECK VERIFIED</div>", unsafe_allow_html=True)
                        st.markdown("<div class='decryption-title' style='margin-top:12px;'>Decrypted Parent Payload (v7)</div>", unsafe_allow_html=True)
                        st.json(decrypted_payload)
                    except Exception as e:
                        st.error(f"Integrity check failed: {e}")
                else:
                    st.info("Click the Decrypt button on the left to verify GCM tag and extract parent payload.")

    # ================================================================== ACTIONS TAB
    with tab_actions:
        st.markdown("##### REMOTE COMMAND CENTER")
        st.caption("Request actions on the child's device remotely. The wearable console polls this queue and triggers events.")
        
        c_act1, c_act2, c_act3 = st.columns(3)
        
        with c_act1:
            st.markdown(
                f'<div class="ops-card">'
                f'<h6>Status Check</h6>'
                f'<p style="font-size:0.8rem;color:var(--text-lo);">Requests current coordinates and device system health metrics immediately.</p>'
                f'</div>',
                unsafe_allow_html=True
            )
            if st.button("ℹ Request Location & Status", use_container_width=True):
                db_helper.add_command(selected_device, "REQUEST_INFO")
                st.success("Command queued: REQUEST_INFO")
                st.toast("Command queued!")
                
        with c_act2:
            st.markdown(
                f'<div class="ops-card">'
                f'<h6>Live Audio Clip</h6>'
                f'<p style="font-size:0.8rem;color:var(--text-lo);">Prompts wearable microphone to store a 10s audio clip locally and report metadata.</p>'
                f'</div>',
                unsafe_allow_html=True
            )
            if st.button("🎙 Request Audio Clip", use_container_width=True, disabled=not is_pro):
                db_helper.add_command(selected_device, "REQUEST_AUDIO")
                st.success("Command queued: REQUEST_AUDIO")
                st.toast("Command queued!")
            if not is_pro:
                st.caption("🎙 Request Audio requires **Shaktipin Pro** model.")
                
        with c_act3:
            st.markdown(
                f'<div class="ops-card">'
                f'<h6>Start Live Tracking</h6>'
                f'<p style="font-size:0.8rem;color:var(--text-lo);">Establishes a 30-minute high-frequency tracking session (11 packets generated).</p>'
                f'</div>',
                unsafe_allow_html=True
            )
            if st.button("📍 Start Live Tracking", use_container_width=True):
                db_helper.add_command(selected_device, "LIVE_TRACKING")
                st.success("Command queued: LIVE_TRACKING")
                st.toast("Command queued!")

if __name__ == "__main__":
    main()
