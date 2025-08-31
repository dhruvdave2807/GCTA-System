import pandas as pd
from apscheduler.schedulers.background import BackgroundScheduler
from datetime import datetime
import time
from phase2 import run_phase2

TRIGGERED_IDS = set()

def check_and_trigger():
    df = pd.read_excel('Phase-1.xlsx')
    df.columns = df.columns.str.strip()  # Remove leading/trailing spaces
    print("Phase-1 columns:", df.columns.tolist())  # Debug print
    now = datetime.now()
    for idx, row in df.iterrows():
        record_time = pd.to_datetime(row['timestamp'])  # Change 'timestamp' if needed after seeing the print
        record_id = row['ID']
        if record_id in TRIGGERED_IDS:
            continue
        if now >= record_time:
            print(f"[Phase 1] Time matched for ID {record_id}, triggering Phase 2...")
            run_phase2(row)
            TRIGGERED_IDS.add(record_id)

def start_scheduler():
    scheduler = BackgroundScheduler()
    scheduler.add_job(check_and_trigger, 'interval', minutes=1)
    scheduler.start()
    print("Phase 1 scheduler started. Waiting for triggers...")
    try:
        while True:
            time.sleep(10)
    except (KeyboardInterrupt, SystemExit):
        scheduler.shutdown()

if __name__ == "__main__":
    start_scheduler()
