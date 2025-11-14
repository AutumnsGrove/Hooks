#!/usr/bin/env python3
# CLAUDE_HOOK_EVENT: SessionEnd
"""
Session End Data Capture - Store comprehensive session analytics

Captures:
- Session duration and timestamp
- Summary of session activity
- Model used
- Session outcome

Creates a historical record of all coding sessions for analytics.
"""

import json
import sys
import sqlite3
import os
from datetime import datetime
from pathlib import Path

# Database paths
SESSIONS_DB = os.path.expanduser("~/.claude/analytics/sessions.db")
TOOL_CALLS_DB = os.path.expanduser("~/.claude/analytics/tool_calls.db")

# Ensure directory exists
os.makedirs(os.path.dirname(SESSIONS_DB), exist_ok=True)

# Read hook input
input_data = json.load(sys.stdin)

# Extract session data
session_id = os.getenv("CLAUDE_SESSION_ID", "unknown")
model = os.getenv("CLAUDE_MODEL", "unknown")

# Initialize database
conn = sqlite3.connect(SESSIONS_DB)
cursor = conn.cursor()

# Create table if not exists
cursor.execute("""
    CREATE TABLE IF NOT EXISTS sessions (
        id TEXT PRIMARY KEY,
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
        duration_seconds INTEGER,
        model TEXT,
        summary TEXT,
        tool_count INTEGER DEFAULT 0,
        file_count INTEGER DEFAULT 0,
        command_count INTEGER DEFAULT 0
    )
""")

# Try to get statistics from tool_calls database
tool_count = 0
file_count = 0
command_count = 0
duration_seconds = 0

try:
    tool_conn = sqlite3.connect(TOOL_CALLS_DB)
    tool_cursor = tool_conn.cursor()

    # Count total tools used
    tool_cursor.execute("""
        SELECT COUNT(*) FROM tool_calls WHERE session_id = ?
    """, (session_id,))
    tool_count = tool_cursor.fetchone()[0]

    # Count unique files modified
    tool_cursor.execute("""
        SELECT COUNT(DISTINCT file_path) FROM tool_calls
        WHERE session_id = ? AND file_path IS NOT NULL
    """, (session_id,))
    file_count = tool_cursor.fetchone()[0]

    # Count bash commands
    tool_cursor.execute("""
        SELECT COUNT(*) FROM tool_calls
        WHERE session_id = ? AND tool_type = 'Bash'
    """, (session_id,))
    command_count = tool_cursor.fetchone()[0]

    # Calculate session duration
    tool_cursor.execute("""
        SELECT
            CAST((julianday(MAX(timestamp)) - julianday(MIN(timestamp))) * 24 * 60 * 60 AS INTEGER)
        FROM tool_calls WHERE session_id = ?
    """, (session_id,))
    result = tool_cursor.fetchone()
    duration_seconds = result[0] if result[0] else 0

    tool_conn.close()
except Exception as e:
    print(f"[session-tracker] Warning: Could not get tool stats: {e}", file=sys.stderr)

# Create simple summary
summary = f"Session completed: {tool_count} tools, {file_count} files, {command_count} commands"

# Insert session record
cursor.execute("""
    INSERT OR REPLACE INTO sessions (
        id, model, summary, tool_count, file_count, command_count, duration_seconds
    ) VALUES (?, ?, ?, ?, ?, ?, ?)
""", (
    session_id,
    model,
    summary,
    tool_count,
    file_count,
    command_count,
    duration_seconds
))

conn.commit()
conn.close()

print(f"[session-tracker] Session data saved: {summary}", file=sys.stderr)
print(f"[session-tracker] Duration: {duration_seconds}s", file=sys.stderr)

sys.exit(0)
