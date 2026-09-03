import os
import sys

PROJECT_ROOT = r"C:\Users\tatat\MyApps\AI_Company_Template"
sys.path.append(os.path.join(PROJECT_ROOT, "monitor"))
import server

transcripts = server.get_recent_transcripts(3600)
print(f"Found {len(transcripts)} transcripts.")
for t in transcripts:
    print(t)
    
submap = server.map_subagents(transcripts)
print("Subagent Map:")
print(submap)

import json
depts = server.analyze_logs()
print("Analyze Logs Result:")
print(json.dumps(depts, indent=2, ensure_ascii=False))
