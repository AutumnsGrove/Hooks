/**
 * Session Tracker OpenCode Plugin
 *
 * Captures comprehensive session analytics when sessions end.
 *
 * **Migration from**: Claude Code session-tracker.py (SessionEnd)
 *
 * **What it tracks**:
 * - Session duration (start to end)
 * - Total tools used
 * - Unique files modified
 * - Commands executed
 * - Summary of activity
 *
 * **Database**: `~/.opencode/analytics/sessions.db`
 *
 * **Queries you can run**:
 * ```sql
 * -- Recent sessions
 * SELECT * FROM sessions ORDER BY timestamp DESC LIMIT 10;
 *
 * -- Average session duration
 * SELECT AVG(duration_seconds) / 60.0 as avg_minutes FROM sessions;
 *
 * -- Most productive sessions (by tool count)
 * SELECT * FROM sessions ORDER BY tool_count DESC LIMIT 5;
 *
 * -- Total files modified across all sessions
 * SELECT SUM(file_count) as total_files FROM sessions;
 * ```
 *
 * **Note**: Duration and stats calculated from tool_calls database
 *
 * **Test this plugin**:
 * 1. Enable plugin in opencode.json
 * 2. Complete a session with various tool calls
 * 3. Check database: `sqlite3 ~/.opencode/analytics/sessions.db`
 * 4. Run analytics queries
 */

import { Plugin } from '@opencode/plugin-api'
import Database from 'better-sqlite3'
import * as os from 'os'
import * as path from 'path'
import * as fs from 'fs'

export const SessionTrackerPlugin: Plugin = async () => {
  // Database paths
  const dbDir = path.join(os.homedir(), '.opencode', 'analytics')
  const sessionsDbPath = path.join(dbDir, 'sessions.db')
  const toolCallsDbPath = path.join(dbDir, 'tool_calls.db')

  // Ensure directory exists
  if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true })
  }

  // Initialize sessions database
  const db = new Database(sessionsDbPath)

  // Create table
  db.exec(`
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
  `)

  // Generate session ID
  const sessionId = process.env.OPENCODE_SESSION_ID || `session-${Date.now()}`
  const sessionStartTime = Date.now()

  return {
    session: {
      /**
       * Capture session data when session ends
       */
      end: async () => {
        try {
          // Calculate duration
          const durationSeconds = Math.floor((Date.now() - sessionStartTime) / 1000)

          let toolCount = 0
          let fileCount = 0
          let commandCount = 0

          // Try to get statistics from tool_calls database
          try {
            if (fs.existsSync(toolCallsDbPath)) {
              const toolDb = new Database(toolCallsDbPath, { readonly: true })

              // Count total tools
              const toolResult = toolDb.prepare(`
                SELECT COUNT(*) as count FROM tool_calls WHERE session_id = ?
              `).get(sessionId) as { count: number }
              toolCount = toolResult.count

              // Count unique files
              const fileResult = toolDb.prepare(`
                SELECT COUNT(DISTINCT file_path) as count FROM tool_calls
                WHERE session_id = ? AND file_path IS NOT NULL
              `).get(sessionId) as { count: number }
              fileCount = fileResult.count

              // Count bash commands
              const commandResult = toolDb.prepare(`
                SELECT COUNT(*) as count FROM tool_calls
                WHERE session_id = ? AND tool_type = 'Bash'
              `).get(sessionId) as { count: number }
              commandCount = commandResult.count

              toolDb.close()
            }
          } catch (error) {
            console.warn('[session-tracker] Could not get tool stats:', error.message)
          }

          // Create summary
          const summary = `Session completed: ${toolCount} tools, ${fileCount} files, ${commandCount} commands`

          // Insert session record
          const insertStmt = db.prepare(`
            INSERT OR REPLACE INTO sessions (
              id, model, summary, tool_count, file_count, command_count, duration_seconds
            ) VALUES (?, ?, ?, ?, ?, ?, ?)
          `)

          insertStmt.run(
            sessionId,
            process.env.OPENCODE_MODEL || 'unknown',
            summary,
            toolCount,
            fileCount,
            commandCount,
            durationSeconds
          )

          console.log(`[session-tracker] Session data saved: ${summary}`)
          console.log(`[session-tracker] Duration: ${durationSeconds}s`)

          db.close()
        } catch (error) {
          console.error('[session-tracker] Failed to save session data:', error.message)
        }
      }
    }
  }
}

export default SessionTrackerPlugin
