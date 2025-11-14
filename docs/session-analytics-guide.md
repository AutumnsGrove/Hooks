# Session Analytics Guide

This guide shows you how to use the session analytics hooks to gain insights into your coding patterns.

---

## What Gets Tracked

### 1. Command Tracking (All Tool Calls)
**Database**: `~/.claude/analytics/tool_calls.db` (Claude Code) or `~/.opencode/analytics/tool_calls.db` (OpenCode)

**Tracks every tool call**:
- Tool type (Bash, Edit, Write, Read, Grep, etc.)
- File paths modified
- Commands executed
- Patterns searched
- Timestamps
- Session ID

### 2. Session Tracking
**Database**: `~/.claude/analytics/sessions.db` or `~/.opencode/analytics/sessions.db`

**Tracks each session**:
- Session duration (start to end)
- Total tools used
- Files modified count
- Commands executed count
- Summary text
- Model used

### 3. Subagent Tracking (Claude Code Only)
**Database**: `~/.claude/analytics/subagent_sessions.db`

**Tracks subagent completions**:
- Subagent type (Explore, Plan, etc.)
- Task summary
- Files modified
- Parent session ID
- Timestamp

---

## Installation

### Claude Code

```bash
cd ~/Projects/Hooks/claude-code/
./deploy.sh
```

This will deploy:
- `command-tracker.py` (PostToolUse)
- `session-tracker.py` (SessionEnd)
- `subagent-tracker.py` (SubagentStop)

### OpenCode

```bash
cd ~/Projects/Hooks/opencode/
npm install

# Add to opencode.json:
{
  "plugins": [
    "./opencode/plugins/command-tracker.ts",
    "./opencode/plugins/session-tracker.ts"
  ]
}
```

---

## Analytics Queries

### Command Tracking Queries

#### Most Used Tools
```sql
SELECT tool_type, COUNT(*) as count
FROM tool_calls
GROUP BY tool_type
ORDER BY count DESC;
```

Example output:
```
tool_type | count
----------|------
Edit      | 142
Bash      | 89
Write     | 45
Read      | 23
Grep      | 12
```

#### Most Edited Files
```sql
SELECT file_path, COUNT(*) as edits
FROM tool_calls
WHERE tool_type IN ('Edit', 'Write')
  AND file_path IS NOT NULL
GROUP BY file_path
ORDER BY edits DESC
LIMIT 10;
```

#### Most Common Commands
```sql
SELECT command, COUNT(*) as count
FROM tool_calls
WHERE tool_type = 'Bash'
  AND command IS NOT NULL
GROUP BY command
ORDER BY count DESC
LIMIT 20;
```

#### Activity by Hour of Day
```sql
SELECT
  CAST(strftime('%H', timestamp) AS INTEGER) as hour,
  COUNT(*) as tool_calls
FROM tool_calls
GROUP BY hour
ORDER BY hour;
```

#### Tool Usage Over Time
```sql
SELECT
  DATE(timestamp) as date,
  tool_type,
  COUNT(*) as count
FROM tool_calls
WHERE timestamp >= date('now', '-7 days')
GROUP BY date, tool_type
ORDER BY date DESC, count DESC;
```

---

### Session Tracking Queries

#### Recent Sessions
```sql
SELECT
  id,
  datetime(timestamp) as time,
  duration_seconds / 60.0 as duration_minutes,
  tool_count,
  file_count,
  command_count,
  summary
FROM sessions
ORDER BY timestamp DESC
LIMIT 10;
```

#### Average Session Metrics
```sql
SELECT
  COUNT(*) as total_sessions,
  AVG(duration_seconds) / 60.0 as avg_minutes,
  AVG(tool_count) as avg_tools,
  AVG(file_count) as avg_files,
  AVG(command_count) as avg_commands
FROM sessions;
```

#### Most Productive Sessions
```sql
SELECT
  id,
  datetime(timestamp) as time,
  duration_seconds / 60.0 as duration_minutes,
  tool_count,
  file_count,
  summary
FROM sessions
ORDER BY tool_count DESC
LIMIT 5;
```

#### Sessions by Day of Week
```sql
SELECT
  CASE CAST(strftime('%w', timestamp) AS INTEGER)
    WHEN 0 THEN 'Sunday'
    WHEN 1 THEN 'Monday'
    WHEN 2 THEN 'Tuesday'
    WHEN 3 THEN 'Wednesday'
    WHEN 4 THEN 'Thursday'
    WHEN 5 THEN 'Friday'
    WHEN 6 THEN 'Saturday'
  END as day_of_week,
  COUNT(*) as session_count,
  AVG(tool_count) as avg_tools
FROM sessions
GROUP BY day_of_week
ORDER BY CAST(strftime('%w', timestamp) AS INTEGER);
```

#### Total Coding Time
```sql
SELECT
  SUM(duration_seconds) / 3600.0 as total_hours,
  COUNT(*) as total_sessions
FROM sessions;
```

---

### Subagent Tracking Queries (Claude Code Only)

#### Most Used Subagents
```sql
SELECT
  subagent_type,
  COUNT(*) as count,
  AVG(file_count) as avg_files_modified
FROM subagent_sessions
GROUP BY subagent_type
ORDER BY count DESC;
```

#### Recent Subagent Activity
```sql
SELECT
  subagent_type,
  datetime(timestamp) as time,
  file_count,
  summary
FROM subagent_sessions
ORDER BY timestamp DESC
LIMIT 10;
```

---

## Using the Analytics

### Command Line Access

#### Claude Code (Python + sqlite3)
```bash
# Open database
sqlite3 ~/.claude/analytics/tool_calls.db

# Run a query
sqlite3 ~/.claude/analytics/tool_calls.db "SELECT tool_type, COUNT(*) as count FROM tool_calls GROUP BY tool_type ORDER BY count DESC;"
```

#### OpenCode (Same)
```bash
sqlite3 ~/.opencode/analytics/tool_calls.db "SELECT tool_type, COUNT(*) as count FROM tool_calls GROUP BY tool_type ORDER BY count DESC;"
```

### Python Scripts

```python
#!/usr/bin/env python3
import sqlite3
import os
from pathlib import Path

# Connect to database
db_path = Path.home() / ".claude" / "analytics" / "tool_calls.db"
conn = sqlite3.connect(db_path)
cursor = conn.cursor()

# Get most used tools
cursor.execute("""
    SELECT tool_type, COUNT(*) as count
    FROM tool_calls
    GROUP BY tool_type
    ORDER BY count DESC
""")

print("Most Used Tools:")
print("-" * 40)
for row in cursor.fetchall():
    tool_type, count = row
    print(f"{tool_type:20} {count:>5} calls")

conn.close()
```

### Visualization with Python

```python
#!/usr/bin/env python3
import sqlite3
import matplotlib.pyplot as plt
from pathlib import Path

# Connect to database
db_path = Path.home() / ".claude" / "analytics" / "sessions.db"
conn = sqlite3.connect(db_path)

# Get session durations
import pandas as pd
df = pd.read_sql_query("""
    SELECT
        datetime(timestamp) as time,
        duration_seconds / 60.0 as duration_minutes,
        tool_count
    FROM sessions
    ORDER BY timestamp
""", conn)

# Plot session durations over time
plt.figure(figsize=(12, 6))
plt.plot(pd.to_datetime(df['time']), df['duration_minutes'])
plt.xlabel('Date')
plt.ylabel('Session Duration (minutes)')
plt.title('Coding Session Durations Over Time')
plt.xticks(rotation=45)
plt.tight_layout()
plt.savefig('session_durations.png')
print("Saved: session_durations.png")

conn.close()
```

---

## Example Insights

### Workflow Patterns

**Morning vs Evening Coder**:
```sql
SELECT
  CASE
    WHEN CAST(strftime('%H', timestamp) AS INTEGER) < 12 THEN 'Morning'
    WHEN CAST(strftime('%H', timestamp) AS INTEGER) < 18 THEN 'Afternoon'
    ELSE 'Evening'
  END as time_of_day,
  COUNT(*) as tool_calls,
  COUNT(DISTINCT session_id) as sessions
FROM tool_calls
GROUP BY time_of_day;
```

**Language Preferences**:
```sql
SELECT
  CASE
    WHEN file_path LIKE '%.py' THEN 'Python'
    WHEN file_path LIKE '%.ts' OR file_path LIKE '%.js' THEN 'JavaScript/TypeScript'
    WHEN file_path LIKE '%.go' THEN 'Go'
    WHEN file_path LIKE '%.rs' THEN 'Rust'
    ELSE 'Other'
  END as language,
  COUNT(*) as edits
FROM tool_calls
WHERE tool_type IN ('Edit', 'Write')
  AND file_path IS NOT NULL
GROUP BY language
ORDER BY edits DESC;
```

**Testing Habits**:
```sql
SELECT
  SUM(CASE WHEN file_path LIKE '%test%' THEN 1 ELSE 0 END) * 100.0 / COUNT(*) as test_file_percentage
FROM tool_calls
WHERE tool_type IN ('Edit', 'Write')
  AND file_path IS NOT NULL;
```

---

## Database Schema Reference

### tool_calls Table

| Column | Type | Description |
|--------|------|-------------|
| id | INTEGER | Primary key |
| session_id | TEXT | Session identifier |
| timestamp | DATETIME | When tool was called |
| tool_type | TEXT | Bash, Edit, Write, etc. |
| file_path | TEXT | File modified (nullable) |
| command | TEXT | Bash command (nullable) |
| pattern | TEXT | Grep pattern (nullable) |
| description | TEXT | Tool description (nullable) |
| params_json | TEXT | Full parameters as JSON |
| success | BOOLEAN | Whether tool succeeded |

### sessions Table

| Column | Type | Description |
|--------|------|-------------|
| id | TEXT | Session ID (primary key) |
| timestamp | DATETIME | Session start time |
| duration_seconds | INTEGER | Session duration |
| model | TEXT | Model used (e.g., "Sonnet 4.5") |
| summary | TEXT | Session summary |
| tool_count | INTEGER | Total tools used |
| file_count | INTEGER | Unique files modified |
| command_count | INTEGER | Bash commands run |

### subagent_sessions Table (Claude Code Only)

| Column | Type | Description |
|--------|------|-------------|
| id | INTEGER | Primary key |
| parent_session_id | TEXT | Parent session ID |
| subagent_type | TEXT | Explore, Plan, etc. |
| timestamp | DATETIME | Completion time |
| summary | TEXT | Task summary |
| files_modified_json | TEXT | Files as JSON array |
| file_count | INTEGER | Number of files |

---

## Privacy & Storage

### Data Storage Locations

**Claude Code**:
- `~/.claude/analytics/tool_calls.db`
- `~/.claude/analytics/sessions.db`
- `~/.claude/analytics/subagent_sessions.db`

**OpenCode**:
- `~/.opencode/analytics/tool_calls.db`
- `~/.opencode/analytics/sessions.db`

### Privacy Considerations

✅ **All data stays local** - Never sent to external servers
✅ **SQLite databases** - Easy to backup, query, or delete
✅ **No sensitive data** - Only tool names, file paths, commands (what you'd see in logs)
✅ **Full control** - You own the data, delete anytime

### Managing Database Size

```bash
# Check database size
du -h ~/.claude/analytics/*.db

# Compact databases (reclaim space)
sqlite3 ~/.claude/analytics/tool_calls.db "VACUUM;"
sqlite3 ~/.claude/analytics/sessions.db "VACUUM;"

# Delete old data (>90 days)
sqlite3 ~/.claude/analytics/tool_calls.db "DELETE FROM tool_calls WHERE timestamp < datetime('now', '-90 days');"

# Backup databases
cp -r ~/.claude/analytics ~/.claude/analytics-backup-$(date +%Y%m%d)
```

---

## Troubleshooting

### Database Not Created

**Check hooks are deployed**:
```bash
ls -la ~/.claude/hooks/command-tracker.py
ls -la ~/.claude/hooks/session-tracker.py
```

**Check hooks are registered** in `~/.claude/settings.json`

**Manually create directory**:
```bash
mkdir -p ~/.claude/analytics
```

### Queries Running Slow

**Create missing indexes**:
```sql
CREATE INDEX IF NOT EXISTS idx_session ON tool_calls(session_id);
CREATE INDEX IF NOT EXISTS idx_timestamp ON tool_calls(timestamp);
CREATE INDEX IF NOT EXISTS idx_tool_type ON tool_calls(tool_type);
CREATE INDEX IF NOT EXISTS idx_file_path ON tool_calls(file_path) WHERE file_path IS NOT NULL;
```

**Vacuum database**:
```bash
sqlite3 ~/.claude/analytics/tool_calls.db "VACUUM;"
```

### Missing Session Data

Session tracking only captures data **at session end**. If session crashes or doesn't end properly, data may not be saved.

**Workaround**: Command tracking saves immediately, so you can reconstruct session data from `tool_calls` table.

---

## Advanced Usage

### Export to CSV

```bash
sqlite3 -header -csv ~/.claude/analytics/tool_calls.db "SELECT * FROM tool_calls WHERE timestamp >= date('now', '-7 days');" > tool_calls_week.csv
```

### Join Sessions and Tool Calls

```sql
SELECT
  s.id as session_id,
  datetime(s.timestamp) as session_time,
  s.duration_seconds / 60.0 as duration_minutes,
  COUNT(t.id) as actual_tool_count,
  s.summary
FROM sessions s
LEFT JOIN tool_calls t ON t.session_id = s.id
GROUP BY s.id
ORDER BY s.timestamp DESC
LIMIT 10;
```

### Find Your Most Productive Hours

```sql
SELECT
  CAST(strftime('%H', timestamp) AS INTEGER) as hour,
  COUNT(*) as tool_calls,
  COUNT(DISTINCT session_id) as sessions,
  COUNT(*) * 1.0 / COUNT(DISTINCT session_id) as tools_per_session
FROM tool_calls
GROUP BY hour
ORDER BY tools_per_session DESC;
```

---

## Next Steps

1. **Let it collect data** - Use Claude Code/OpenCode normally for a few days
2. **Run example queries** - Explore the data with SQL queries above
3. **Create visualizations** - Use Python/matplotlib to visualize trends
4. **Optimize your workflow** - Use insights to understand your coding patterns
5. **Share insights** - Create reports for team or personal review

Happy analyzing! 📊

---

*Last updated: 2025-11-14*
*Questions? See the main README or create an issue on GitHub.*
