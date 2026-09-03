import os
import json
import time
import threading
import webbrowser
from http.server import HTTPServer, SimpleHTTPRequestHandler

BRAIN_DIR = r"C:\Users\tatat\.gemini\antigravity\brain"
# 親ディレクトリ（プロジェクトルート）を自動取得
PROJECT_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))

def get_recent_transcripts(max_age_seconds=60):
    recent = []
    META_AGENT_ID = "2def3ae6-ffc3-4368-a990-3fe0e3815847"
    try:
        now = time.time()
        folders = [os.path.join(BRAIN_DIR, d) for d in os.listdir(BRAIN_DIR) if os.path.isdir(os.path.join(BRAIN_DIR, d))]
        for f in folders:
            if META_AGENT_ID in f:
                continue
            t_path = os.path.join(f, ".system_generated", "logs", "transcript.jsonl")
            if os.path.exists(t_path):
                mtime = os.path.getmtime(t_path)
                if now - mtime < max_age_seconds:
                    # このトランスクリプトが自分のプロジェクトのものか判定（パス文字列が含まれるか）
                    try:
                        with open(t_path, 'r', encoding='utf-8') as tf:
                            content = tf.read().lower()
                            proj_root_lower = PROJECT_ROOT.lower()
                            if proj_root_lower.replace("\\", "\\\\") in content or proj_root_lower in content or proj_root_lower.replace("\\", "/") in content:
                                recent.append(t_path)
                    except:
                        pass
    except Exception as e:
        print(f"Error finding transcripts: {e}")
    return recent

def get_latest_file_from_projects(filenames):
    latest_file = None
    latest_time = 0
    # 自身のプロジェクトフォルダ内のみを探す
    for fname in filenames:
        for p in [os.path.join(PROJECT_ROOT, fname), os.path.join(PROJECT_ROOT, "docs", fname)]:
            if os.path.exists(p):
                mtime = os.path.getmtime(p)
                if mtime > latest_time:
                    latest_time = mtime
                    latest_file = p
    return latest_file

def map_subagents(recent_transcripts):
    import re
    mapping = {}
    for t_path in recent_transcripts:
        try:
            with open(t_path, 'r', encoding='utf-8') as f:
                lines = f.readlines()
                for i, line in enumerate(lines):
                    if '"invoke_subagent"' in line:
                        try:
                            event = json.loads(line)
                            if event.get("type") == "PLANNER_RESPONSE":
                                tool_calls = event.get("tool_calls", [])
                                for tc in tool_calls:
                                    if tc.get("name") == "invoke_subagent":
                                        subs = tc.get("args", {}).get("Subagents", [])
                                        if isinstance(subs, str):
                                            subs = json.loads(subs)
                                        t_names = [sa.get("TypeName") for sa in subs]
                                        for j in range(1, 5):
                                            if i + j < len(lines):
                                                next_event = json.loads(lines[i+j])
                                                if next_event.get("type") == "GENERIC":
                                                    content = next_event.get("content", "")
                                                    matches = re.findall(r'"conversationId":\s*"([^"]+)"', content)
                                                    for idx, cid in enumerate(matches):
                                                        if idx < len(t_names):
                                                            mapping[cid] = t_names[idx]
                                                    break
                        except:
                            pass
        except:
            pass
    return mapping

def analyze_logs():
    active_depts = {
        "web-dev-dept": "待機中", "qa-dept": "待機中", "security-dept": "待機中",
        "deploy-dept": "待機中", "memory-dept": "待機中", "investigation-dept": "待機中",
        "secretary-dept": "待機中", "research-dept": "待機中",
        "design-dept": "待機中", "audit-dept": "待機中", "planning-dept": "待機中"
    }
    
    commander_status = "💤 待機中"
    recent_transcripts = get_recent_transcripts(3600) 
    subagent_map = map_subagents(recent_transcripts)
    
    for folder_name, dept_name in subagent_map.items():
        if dept_name in active_depts and recent_transcripts:
            t_path = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(recent_transcripts[0])))), folder_name, '.system_generated', 'logs', 'transcript.jsonl')
            if os.path.exists(t_path):
                try:
                    with open(t_path, 'r', encoding='utf-8') as f:
                        lines = [l for l in f.read().splitlines() if l.strip()]
                        if lines:
                            last_event = json.loads(lines[-1])
                            t = last_event.get('type')
                            tc = 'tool_calls' in last_event
                            if t == 'PLANNER_RESPONSE' and not tc:
                                pass
                            else:
                                active_depts[dept_name] = "🔥 実行中"
                except:
                    pass

    commander_t_path = None
    for t_path in recent_transcripts:
        folder_name = os.path.basename(os.path.dirname(os.path.dirname(os.path.dirname(t_path))))
        if folder_name not in subagent_map:
            commander_t_path = t_path
            break
            
    if commander_t_path:
        try:
            with open(commander_t_path, 'r', encoding='utf-8') as f:
                lines = [l for l in f.read().splitlines() if l.strip()]
                if lines:
                    last_event = json.loads(lines[-1])
                    t = last_event.get('type')
                    tc = 'tool_calls' in last_event
                    if t == 'PLANNER_RESPONSE' and not tc:
                        pass
                    else:
                        commander_status = "🧠 稼働中"
        except:
            pass

    secretary_logs = []
    log_file = get_latest_file_from_projects(["logs.md"])
    if log_file:
        try:
            with open(log_file, 'r', encoding='utf-8') as lf:
                lines = lf.readlines()
                secretary_logs = [line.strip() for line in lines if line.strip()][-20:]
        except UnicodeDecodeError:
            try:
                with open(log_file, 'r', encoding='cp932') as lf:
                    lines = lf.readlines()
                    secretary_logs = [line.strip() for line in lines if line.strip()][-20:]
            except:
                pass
        except:
            pass

    regent_content = ""
    regent_file = get_latest_file_from_projects(["regent.md", "Regent.md"])
    if regent_file:
        try:
            with open(regent_file, 'r', encoding='utf-8', errors='replace') as rf:
                regent_content = rf.read()
        except:
            try:
                with open(regent_file, 'r', encoding='cp932', errors='replace') as rf:
                    regent_content = rf.read()
            except:
                pass

    depts_list = []
    for name, status in active_depts.items():
        depts_list.append({
            "name": name,
            "status": status,
            "role": "部署"
        })

    return {
        "project_name": os.path.basename(PROJECT_ROOT),
        "commander": commander_status,
        "departments": depts_list,
        "secretary_logs": secretary_logs,
        "regent_content": regent_content
    }

def auto_shutdown_monitor(server_instance):
    idle_start_time = None
    SHUTDOWN_TIMEOUT = 300  # 300秒 = 5分

    while True:
        time.sleep(5)  # 5秒ごとにチェック
        try:
            data = analyze_logs()
            is_idle = True
            
            # Commanderのステータスチェック
            if "稼働中" in data.get("commander", ""):
                is_idle = False
                
            # 各部署のステータスチェック
            if is_idle:
                for dept in data.get("departments", []):
                    if "実行中" in dept.get("status", ""):
                        is_idle = False
                        break
                        
            if is_idle:
                if idle_start_time is None:
                    idle_start_time = time.time()
                elif time.time() - idle_start_time >= SHUTDOWN_TIMEOUT:
                    print("すべてのAIが5分間待機中であったため、モニターを自動終了します。")
                    # サーバーをシャットダウン
                    threading.Thread(target=server_instance.shutdown, daemon=True).start()
                    time.sleep(1)
                    os._exit(0)
            else:
                # いずれかが稼働中になった場合、タイマーをリセット
                idle_start_time = None
        except Exception as e:
            print(f"Error in auto_shutdown_monitor: {e}")

class MonitorHandler(SimpleHTTPRequestHandler):
    def do_GET(self):
        if self.path == '/api/status':
            self.send_response(200)
            self.send_header('Content-type', 'application/json')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            
            data = analyze_logs()
            self.wfile.write(json.dumps(data).encode('utf-8'))
        else:
            super().do_GET()

if __name__ == '__main__':
    # cwdをスクリプトのあるディレクトリ（monitorフォルダ）に変更し、index.htmlを正しく配信できるようにする
    os.chdir(os.path.dirname(os.path.abspath(__file__)))
    port = 8080
    port_file = os.path.join(os.path.dirname(os.path.abspath(__file__)), "monitor_port.txt")
    if os.path.exists(port_file):
        try:
            os.remove(port_file)
        except:
            pass

    while True:
        try:
            server = HTTPServer(('', port), MonitorHandler)
            print(f"Starting Real-time Monitor Server on http://localhost:{port} ...")
            
            try:
                with open(port_file, "w") as f:
                    f.write(str(port))
            except Exception as e:
                print(f"Failed to write port file: {e}")
                
            # 無通信・無稼働タイマー用のスレッドを開始
            monitor_thread = threading.Thread(target=auto_shutdown_monitor, args=(server,), daemon=True)
            monitor_thread.start()
                
            server.serve_forever()
            break
        except OSError as e:
            print(f"Port {port} is in use, trying next port...")
            port += 1
