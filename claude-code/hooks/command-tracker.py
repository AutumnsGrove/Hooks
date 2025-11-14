#!/usr/bin/env python3
# CLAUDE_HOOK_EVENT: PostToolUse
"""
Command Tracking Hook - Track ALL tool calls to SQLite database

Captures detailed information about every tool execution:
- Tool type (Bash, Edit, Write, Read, etc.)
- Parameters (command, file paths, etc.)
- Timestamp
- Session ID
- Success/failure status

Creates a comprehensive analytics database for understanding your workflow.
"""

import json
import sys
import sqlite3
import os
from datetime import datetime
from pathlib import Path

# Database path
DB_PATH = os.path.expanduser("~/.claude/analytics/tool_calls.db")

# Ensure directory exists
os.makedirs(os.path.dirname(DB_PATH), exist_ok=True)

# Read hook input
input_data = json.load(sys.stdin)

# Extract data
tool_name = input_data.get("tool_name", "unknown")
tool_input = input_data.get("tool_input", {})
session_id = os.getenv("CLAUDE_SESSION_ID", "unknown")

# Extract specific fields based on tool type
file_path = tool_input.get("file_path")
command = tool_input.get("command")
pattern = tool_input.get("pattern")  # For Grep
description = tool_input.get("description")

# Initialize database
conn = sqlite3.connect(DB_PATH)
cursor = conn.cursor()

# Create table if not exists
cursor.execute("""
    CREATE TABLE IF NOT EXISTS tool_calls (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        session_id TEXT NOT NULL,
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
        tool_type TEXT NOT NULL,
        file_path TEXT,
        command TEXT,
        pattern TEXT,
        description TEXT,
        params_json TEXT,
        success BOOLEAN DEFAULT 1
    )
""")

# Create indexes for fast queries
cursor.execute("CREATE INDEX IF NOT EXISTS idx_session ON tool_calls(session_id)")
cursor.execute("CREATE INDEX IF NOT EXISTS idx_timestamp ON tool_calls(timestamp)")
cursor.execute("CREATE INDEX IF NOT EXISTS idx_tool_type ON tool_calls(tool_type)")
cursor.execute("CREATE INDEX IF NOT EXISTS idx_file_path ON tool_calls(file_path) WHERE file_path IS NOT NULL")

# Insert tool call
cursor.execute("""
    INSERT INTO tool_calls (
        session_id, tool_type, file_path, command, pattern, description, params_json
    ) VALUES (?, ?, ?, ?, ?, ?, ?)
""", (
    session_id,
    tool_name,
    file_path,
    command,
    pattern,
    description,
    json.dumps(tool_input)
))

conn.commit()
conn.close()

# Optional: Print confirmation (comment out if too verbose)
# print(f"[tool-tracker] Logged {tool_name} call to database", file=sys.stderr)

sys.exit(0)
