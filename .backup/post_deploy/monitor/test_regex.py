import re
import json

content = """Created the following subagents:
{
  "conversationId": "623a5260-5133-4347-8805-c9dc274c3199",
  "logAbsoluteUri": "file:///C:/Users/tatat/.gemini/antigravity/brain/623a5260-5133-4347-8805-c9dc274c3199/.system_generated/logs/transcript.jsonl",
  "workspaceUris": [
    "file:///c%3A/Users/tatat/MyApps/AI_Factory_Manager"
  ]
}"""

matches = re.findall(r'"conversationId":\s*"([^"]+)"', content)
print(matches)
