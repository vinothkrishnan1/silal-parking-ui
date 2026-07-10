import os
import datetime

LOG_FILE_PATH = os.path.join(os.path.dirname(__file__), "log_debug.txt")

def log_info(message: str):
    timestamp = datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    log_line = f"[{timestamp}] {message}\n"
    
    # Append new line efficiently
    with open(LOG_FILE_PATH, "a", encoding="utf-8") as f:
        f.write(log_line)

def cleanup_logs(days=30):
    if not os.path.exists(LOG_FILE_PATH):
        return
        
    cutoff_date = datetime.datetime.now() - datetime.timedelta(days=days)
    
    try:
        with open(LOG_FILE_PATH, "r", encoding="utf-8") as f:
            lines = f.readlines()
            
        kept_lines = []
        for line in lines:
            try:
                if line.startswith("["):
                    time_str = line[1:20]
                    log_date = datetime.datetime.strptime(time_str, "%Y-%m-%d %H:%M:%S")
                    if log_date >= cutoff_date:
                        kept_lines.append(line)
                else:
                    kept_lines.append(line)
            except ValueError:
                kept_lines.append(line)
                
        with open(LOG_FILE_PATH, "w", encoding="utf-8") as f:
            f.writelines(kept_lines)
    except Exception as e:
        print(f"Failed to cleanup logs: {e}")

if __name__ == "__main__":
    # Run this script standalone (e.g., via cron) to clean up old logs
    cleanup_logs(30)
    print("30-day log cleanup executed.")
