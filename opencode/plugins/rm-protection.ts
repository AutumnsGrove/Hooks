/**
 * rm -rf Protection OpenCode Plugin
 *
 * Intercepts destructive rm -rf commands and uses trash instead for safety.
 *
 * **Migration from**: Claude Code rm-protection.sh (PreToolUse)
 *
 * **How it works**:
 * - Detects `rm -rf` or `rm -fr` commands
 * - Replaces with `trash` command
 * - Creates audit log of deletions
 * - Non-blocking - doesn't interrupt workflow
 *
 * **Requirements**:
 * ```bash
 * # Linux
 * sudo apt install trash-cli
 *
 * # macOS
 * brew install trash
 * ```
 *
 * **Audit log location**: `~/.opencode/trash_audit.log`
 *
 * **Audit log format**:
 * ```
 * 2025-11-14T15:30:00-05:00 | /path/to/deleted/file | rm -rf protection | original: rm -rf /path
 * ```
 *
 * **Recovery**:
 * ```bash
 * # macOS
 * # Files are in ~/.Trash - recover from Finder
 *
 * # Linux (trash-cli)
 * trash-list              # List trashed files
 * trash-restore           # Restore interactively
 * trash-restore /path     # Restore specific file
 * ```
 *
 * **Bypass** (if you really need rm -rf):
 * Use absolute path: `/bin/rm -rf /path`
 *
 * **Test this plugin**:
 * 1. Enable plugin in opencode.json
 * 2. Run: rm -rf /tmp/test
 * 3. Verify command was changed to trash /tmp/test
 * 4. Check audit log: cat ~/.opencode/trash_audit.log
 * 5. Verify file is in trash (not permanently deleted)
 */

import { Plugin } from '@opencode/plugin-api'
import { $ } from 'zx'
import * as fs from 'fs/promises'
import * as path from 'path'
import * as os from 'os'

export const RmProtectionPlugin: Plugin = async () => {
  // Audit log path
  const auditLogDir = path.join(os.homedir(), '.opencode')
  const auditLogPath = path.join(auditLogDir, 'trash_audit.log')

  // Ensure audit log directory exists
  try {
    await fs.mkdir(auditLogDir, { recursive: true })
  } catch {
    // Directory already exists
  }

  /**
   * Check which trash command is available
   */
  async function getTrashCommand(): Promise<string | null> {
    try {
      await $`which trash-put`
      return 'trash-put'
    } catch {
      try {
        await $`which trash`
        return 'trash'
      } catch {
        return null
      }
    }
  }

  /**
   * Log deletion to audit log
   */
  async function logDeletion(targets: string, originalCommand: string) {
    const timestamp = new Date().toISOString()
    const logEntry = `${timestamp} | ${targets} | rm -rf protection | original: ${originalCommand}\n`

    try {
      await fs.appendFile(auditLogPath, logEntry)
    } catch (error) {
      console.warn('[rm-protection] Could not write to audit log:', error.message)
    }
  }

  return {
    tool: {
      execute: {
        /**
         * Intercept rm -rf commands before execution
         */
        before: async (input) => {
          // Only process Bash tool calls
          if (input.tool !== 'Bash') {
            return input
          }

          const command = input.parameters?.command

          if (!command) {
            return input
          }

          // Check if this is an rm -rf command
          const rmMatch = command.match(/rm\s+(-[rf]+|-[a-z]*[rf][a-z]*)/i)

          if (!rmMatch) {
            return input
          }

          // Check which trash command is available
          const trashCmd = await getTrashCommand()

          if (!trashCmd) {
            console.warn('[rm-protection] ⚠️  Warning: trash command not installed')
            console.warn('[rm-protection] Install: brew install trash (macOS) or apt install trash-cli (Linux)')
            // Allow original command but warn
            return input
          }

          // Extract targets from rm command
          // Simple parser for basic cases: rm -rf /path or rm -rf file1 file2
          const targets = command
            .replace(/.*rm\s+(-[rf]+\s+|-[a-z]*[rf][a-z]*\s+)/, '')
            .replace(/;.*/, '')
            .trim()

          // Replace rm -rf with trash command
          const newCommand = `${trashCmd} ${targets}`

          // Log the operation
          await logDeletion(targets, command)

          console.log('[rm-protection] ✓ Moved to trash instead of deleting:', targets)
          console.log('[rm-protection] Audit log:', auditLogPath)

          // Return modified command
          return {
            ...input,
            parameters: {
              ...input.parameters,
              command: newCommand
            }
          }
        }
      }
    }
  }
}

export default RmProtectionPlugin
