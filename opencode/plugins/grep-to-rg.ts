/**
 * grep-to-rg OpenCode Plugin
 *
 * Automatically converts grep commands to ripgrep (rg) for better performance.
 *
 * **Migration from**: Claude Code `grep-to-rg.py` (PreToolUse hook)
 *
 * **How it works**:
 * - Intercepts Bash tool calls before execution
 * - Detects `grep` in commands
 * - Replaces with `rg` (ripgrep) for faster searches
 * - Preserves command arguments and structure
 *
 * **Requirements**:
 * - Install ripgrep: `brew install ripgrep` or `apt install ripgrep`
 *
 * **Example**:
 * ```bash
 * # AI tries to run:
 * grep "function" src/*.py
 *
 * # Plugin automatically converts to:
 * rg "function" src/*.py
 * ```
 *
 * **Benefits**:
 * - 10-50x faster than grep on large codebases
 * - Respects .gitignore by default
 * - Better defaults for code search
 * - Colored output
 *
 * **Test this plugin**:
 * 1. Enable plugin in opencode.json
 * 2. Trigger a Bash command with grep
 * 3. Verify command was transformed to rg
 * 4. Check output for improved performance
 */

import { Plugin } from '@opencode/plugin-api'

export const GrepToRgPlugin: Plugin = async () => {
  return {
    tool: {
      execute: {
        /**
         * Intercept Bash commands before execution
         * Replace grep with rg for performance
         */
        before: async (input) => {
          // Only process Bash tool calls
          if (input.tool !== 'Bash') {
            return input
          }

          // Get the command from parameters
          const command = input.parameters?.command

          // Skip if no command or no grep found
          if (!command || !command.includes('grep')) {
            return input
          }

          // Replace grep with rg
          // Use global replace to handle multiple grep calls in one command
          const newCommand = command.replace(/\bgrep\b/g, 'rg')

          // Log the transformation for visibility
          console.log(`[grep-to-rg] Transformed: grep → rg`)
          console.log(`[grep-to-rg] Original: ${command}`)
          console.log(`[grep-to-rg] Updated:  ${newCommand}`)

          // Return modified input
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

export default GrepToRgPlugin
