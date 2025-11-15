/**
 * UV Enforcer OpenCode Plugin
 *
 * Automatically rewrites Python commands to use UV package manager.
 *
 * **Migration from**: Claude Code UV Enforcement hook (PreToolUse)
 *
 * **How it works**:
 * - Intercepts Bash commands before execution
 * - Detects Python-related commands (python, pytest, pip)
 * - Rewrites to use `uv run` prefix
 * - Supports escape hatch for special cases
 *
 * **Transformations**:
 * ```bash
 * python script.py       → uv run python script.py
 * pytest tests/          → uv run pytest tests/
 * pip install package    → uv pip install package
 * ```
 *
 * **Escape Hatch**:
 * Use `# VANILLA_PYTHON` comment in prompt to bypass enforcement:
 * ```bash
 * # VANILLA_PYTHON
 * python script.py  # Will NOT be rewritten
 * ```
 *
 * **Requirements**:
 * - Install UV: `curl -LsSf https://astral.sh/uv/install.sh | sh`
 *
 * **Test this plugin**:
 * 1. Enable plugin in opencode.json
 * 2. Run a Python command via Bash tool
 * 3. Verify command was prefixed with `uv run`
 * 4. Test escape hatch with # VANILLA_PYTHON comment
 */

import { Plugin } from '@opencode/plugin-api'

export const UvEnforcerPlugin: Plugin = async () => {
  return {
    tool: {
      execute: {
        /**
         * Intercept Bash commands and enforce UV usage
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

          // Check for escape hatch
          if (command.includes('# VANILLA_PYTHON')) {
            console.log('[uv-enforcer] Escape hatch detected, allowing vanilla Python')
            return input
          }

          // Check if command already uses uv
          if (command.includes('uv run') || command.includes('uv pip')) {
            return input
          }

          let newCommand = command

          // Transform python commands
          if (/^python\s/.test(command)) {
            newCommand = command.replace(/^python\s/, 'uv run python ')
            console.log('[uv-enforcer] Enforcing UV: python → uv run python')
          }
          // Transform pytest commands
          else if (/^pytest\s/.test(command)) {
            newCommand = command.replace(/^pytest\s/, 'uv run pytest ')
            console.log('[uv-enforcer] Enforcing UV: pytest → uv run pytest')
          }
          // Transform pip commands
          else if (/^pip\s/.test(command)) {
            newCommand = command.replace(/^pip\s/, 'uv pip ')
            console.log('[uv-enforcer] Enforcing UV: pip → uv pip')
          }

          // Only return modified input if transformation occurred
          if (newCommand !== command) {
            console.log(`[uv-enforcer] Original: ${command}`)
            console.log(`[uv-enforcer] Updated:  ${newCommand}`)

            return {
              ...input,
              parameters: {
                ...input.parameters,
                command: newCommand
              }
            }
          }

          return input
        }
      }
    }
  }
}

export default UvEnforcerPlugin
