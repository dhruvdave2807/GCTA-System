import pandas as pd
import requests

def run_phase2(phase1_row):
    # Example: match by 'ID'
    phase2_df = pd.read_excel('Phase-2.xlsx')
    match = phase2_df[phase2_df['ID'] == phase1_row['ID']]
    if match.empty:
        print(f"[Phase 2] No matching row found for ID {phase1_row['ID']}")
        return
    row = match.iloc[0]
    payload = {
        "recipient": row.get('phone', '<demo phone number>'),
        "threat_type": row.get('threat_type', ''),
        "location": row.get('location', ''),
        "level": row.get('level', ''),
        "message": row.get('message', '')
    }
    try:
        resp = requests.post("http://localhost:5000/api/send-alert", json=payload)
        if resp.ok:
            print("[Phase 2] Notification sent successfully.")
        else:
            print(f"[Phase 2] Failed to send notification: {resp.text}")
    except Exception as e:
        print(f"[Phase 2] Error: {e}")
