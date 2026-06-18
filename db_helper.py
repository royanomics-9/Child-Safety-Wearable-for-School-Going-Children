import json
import os
from datetime import datetime

DB_FILE = os.path.join(os.path.dirname(os.path.abspath(__file__)), "shaktipin_db.json")

def load_db():
    if not os.path.exists(DB_FILE):
        # Initialize default database structure matching childhood registry and defaults
        default_data = {
            "packets": [],
            "microsd": {},
            "battery": {},
            "last_contact": {},
            "device_position": {},
            "incidents": {},
            "last_heartbeat": {},
            "tracking_sessions": {},
            "commands": [],
            "theme": "Dark"
        }
        save_db(default_data)
        return default_data
    try:
        with open(DB_FILE, "r") as f:
            return json.load(f)
    except Exception:
        # Fallback if file is corrupted
        return {}

def save_db(data):
    try:
        with open(DB_FILE, "w") as f:
            json.dump(data, f, indent=2, default=str)
    except Exception as e:
        print(f"Error saving database: {e}")

def add_packet_db(packet_record):
    db = load_db()
    # Serialize timestamp
    p_copy = dict(packet_record)
    if isinstance(p_copy.get("timestamp"), datetime):
        p_copy["timestamp"] = p_copy["timestamp"].isoformat()
    
    db["packets"].insert(0, p_copy)
    save_db(db)

def get_commands(device_id):
    db = load_db()
    commands = [c for c in db.get("commands", []) if c["device_id"] == device_id and not c.get("processed", False)]
    return commands

def clear_commands(device_id):
    db = load_db()
    db["commands"] = [c for c in db.get("commands", []) if not (c["device_id"] == device_id and not c.get("processed", False))]
    save_db(db)

def add_command(device_id, command_type):
    db = load_db()
    if "commands" not in db:
        db["commands"] = []
    db["commands"].append({
        "device_id": device_id,
        "command": command_type,
        "timestamp": datetime.now().isoformat(),
        "processed": False
    })
    save_db(db)
