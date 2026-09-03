import os
import sys
import json

PROJECT_ROOT = r"C:\Users\tatat\MyApps\AI_Company_Template"
sys.path.append(os.path.join(PROJECT_ROOT, "monitor"))
import server

depts = server.analyze_logs()
with open("C:/Users/tatat/MyApps/AI_Company_Template/monitor/debug.json", "w", encoding="utf-8") as f:
    json.dump(depts, f, indent=2, ensure_ascii=False)
