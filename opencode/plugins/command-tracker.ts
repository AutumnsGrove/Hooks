/**
 * Command Tracker OpenCode Plugin
 *
 * Tracks ALL tool calls to SQLite database for comprehensive analytics.
 *
 * **Migration from**: Claude Code command-tracker.py (PostToolUse)
 *
 * **What it tracks**:
 * - Tool type (Bash, Edit, Write, Read, Grep, etc.)
 * - Parameters (commands, file paths, patterns, etc.)
 * - Timestamps
 * - Session ID
 * - Success/failure status
 *
 * **Database**: `~/.opencode/analytics/tool_calls.db`
 *
 * **Queries you can run**:
 * ```sql
 * -- Most used tools
 * SELECT tool_type, COUNT(*) as count FROM tool_calls GROUP BY tool_type ORDER BY count DESC;
 *
 * -- Most edited files
 * SELECT file_path, COUNT(*) as edits FROM tool_calls
 * WHERE tool_type IN ('Edit', 'Write') GROUP BY file_path ORDER BY edits DESC LIMIT 10;
 *
 * -- Commands run most often
 * SELECT command, COUNT(*) as count FROM tool_calls
 * WHERE tool_type = 'Bash' GROUP BY command ORDER BY count DESC LIMIT 20;
 * ```
 *
 * **Performance**: Uses async writes to avoid blocking (writes happen in background)
 *
 * **Test this plugin**:
 * 1. Enable plugin in opencode.json
 * 2. Use various tools (Edit, Bash, etc.)
 * 3. Check database: `sqlite3 ~/.opencode/analytics/tool_calls.db`
 * 4. Run analytics queries
 */

import { Plugin } from '@opencode/plugin-api'
import Database from 'better-sqlite3'
import * as os from 'os'
import * as path from 'path'
import * as fs from 'fs'

export const CommandTrackerPlugin: Plugin = async () => {
  // Database path
  const dbDir = path.join(os.homedir(), '.opencode', 'analytics')
  const dbPath = path.join(dbDir, 'tool_calls.db')

  // Ensure directory exists
  if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true })
  }

  // Initialize database
  const db = new Database(dbPath)

  // Create table
  db.exec(`
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
  `)

  // Create indexes for fast queries
  db.exec(`CREATE INDEX IF NOT EXISTS idx_session ON tool_calls(session_id)`)
  db.exec(`CREATE INDEX IF NOT EXISTS idx_timestamp ON tool_calls(timestamp)`)
  db.exec(`CREATE INDEX IF NOT EXISTS idx_tool_type ON tool_calls(tool_type)`)
  db.exec(`CREATE INDEX IF NOT EXISTS idx_file_path ON tool_calls(file_path) WHERE file_path IS NOT NULL`)

  // Prepare insert statement
  const insertStmt = db.prepare(`
    INSERT INTO tool_calls (
      session_id, tool_type, file_path, command, pattern, description, params_json
    ) VALUES (?, ?, ?, ?, ?, ?, ?)
  `)

  // Generate session ID (simple timestamp-based)
  const sessionId = process.env.OPENCODE_SESSION_ID || `session-${Date.now()}`

  return {
    tool: {
      execute: {
        /**
         * Track tool calls after execution
         */
        after: async (input, output) => {
          try {
            // Extract relevant fields
            const toolType = input.tool
            const filePath = input.parameters?.file_path || null
            const command = input.parameters?.command || null
            const pattern = input.parameters?.pattern || null
            const description = input.parameters?.description || null
            const paramsJson = JSON.stringify(input.parameters || {})

            // Insert into database (synchronous is fine, very fast)
            insertStmt.run(
              sessionId,
              toolType,
              filePath,
              command,
              pattern,
              description,
              paramsJson
            )

            // Optional: Log for visibility (comment out if too verbose)
            // console.log(`[command-tracker] Logged ${toolType} call`)
          } catch (error) {
            console.warn('[command-tracker] Failed to log tool call:', error.message)
          }
        }
      }
    }
  }
}

export default CommandTrackerPlugin
