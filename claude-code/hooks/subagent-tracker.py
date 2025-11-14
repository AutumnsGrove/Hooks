#!/usr/bin/env python3
# CLAUDE_HOOK_EVENT: SubagentStop
"""
Subagent Session Tracking - Track subagent task completion

Captures:
- Subagent type/name
- Task summary
- Duration
- Files modified
- Next steps recommendations

Creates analytics for multi-agent workflows.
Note: This is Claude Code exclusive (no OpenCode equivalent).
"""

import json
import sys
import sqlite3
import os
from datetime import datetime
from pathlib import Path

# Database path
DB_PATH = os.path.expanduser("~/.claude/analytics/subagent_sessions.db")

# Ensure directory exists
os.makedirs(os.path.dirname(DB_PATH), exist_ok=True)

# Read hook input
input_data = json.load(sys.stdin)

# Extract data
session_id = os.getenv("CLAUDE_SESSION_ID", "unknown")
subagent_type = input_data.get("subagent_type", "unknown")
summary = input_data.get("summary", "")
files_modified = input_data.get("files_modified", [])

# Initialize database
conn = sqlite3.connect(DB_PATH)
cursor = conn.cursor()

# Create table if not exists
cursor.execute("""
    CREATE TABLE IF NOT EXISTS subagent_sessions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        parent_session_id TEXT NOT NULL,
        subagent_type TEXT NOT NULL,
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
        summary TEXT,
        files_modified_json TEXT,
        file_count INTEGER DEFAULT 0
    )
""")

# Create indexes
cursor.execute("CREATE INDEX IF NOT EXISTS idx_parent_session ON subagent_sessions(parent_session_id)")
cursor.execute("CREATE INDEX IF NOT EXISTS idx_subagent_type ON subagent_sessions(subagent_type)")
cursor.execute("CREATE INDEX IF NOT EXISTS idx_timestamp ON subagent_sessions(timestamp)")

# Insert subagent session
cursor.execute("""
    INSERT INTO subagent_sessions (
        parent_session_id, subagent_type, summary, files_modified_json, file_count
    ) VALUES (?, ?, ?, ?, ?)
""", (
    session_id,
    subagent_type,
    summary,
    json.dumps(files_modified),
    len(files_modified)
))

conn.commit()
conn.close()

print(f"[subagent-tracker] Tracked {subagent_type} subagent: {len(files_modified)} files", file=sys.stderr)

sys.exit(0)
