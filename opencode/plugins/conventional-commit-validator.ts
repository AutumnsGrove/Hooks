/**
 * Conventional Commit Validator OpenCode Plugin
 *
 * Enforces conventional commit message format before git commits.
 *
 * **Migration from**: Claude Code Conventional Commit Validator (PreToolUse)
 *
 * **How it works**:
 * - Intercepts `git commit` commands before execution
 * - Validates commit message format
 * - Blocks commits that don't follow conventional commits spec
 * - Provides helpful error messages with examples
 *
 * **Valid Formats**:
 * ```
 * <type>: <description>
 * <type>(<scope>): <description>
 * ```
 *
 * **Supported Types**:
 * - `feat`: New feature
 * - `fix`: Bug fix
 * - `docs`: Documentation changes
 * - `refactor`: Code refactoring
 * - `test`: Test changes
 * - `chore`: Build/tooling changes
 * - `perf`: Performance improvements
 * - `style`: Code style changes
 * - `ci`: CI/CD changes
 * - `build`: Build system changes
 *
 * **Examples**:
 * ```bash
 * ✅ git commit -m "feat: add user authentication"
 * ✅ git commit -m "fix(auth): correct JWT expiration"
 * ✅ git commit -m "docs: update README with examples"
 * ❌ git commit -m "added new feature"
 * ❌ git commit -m "Fix bug"
 * ```
 *
 * **Bypass**:
 * Use `--no-verify` flag to skip validation:
 * ```bash
 * git commit --no-verify -m "emergency fix"
 * ```
 *
 * **Test this plugin**:
 * 1. Enable plugin in opencode.json
 * 2. Attempt a git commit with invalid format
 * 3. Verify commit was blocked with helpful error
 * 4. Commit with valid format and verify success
 */

import { Plugin } from '@opencode/plugin-api'

// Conventional commit pattern
const CONVENTIONAL_COMMIT_PATTERN = /^(feat|fix|docs|refactor|test|chore|perf|style|ci|build)(\(.+\))?: .+/

// Alternative: Accept capitalized first word patterns
const ALTERNATIVE_PATTERN = /^(Add|Update|Fix|Refactor|Remove|Improve|Create|Delete|Implement|Enhance): .+/

export const ConventionalCommitValidatorPlugin: Plugin = async () => {
  return {
    tool: {
      execute: {
        /**
         * Validate git commit messages before execution
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

          // Check if this is a git commit command
          if (!command.includes('git commit')) {
            return input
          }

          // Skip if --no-verify flag is present (user bypass)
          if (command.includes('--no-verify')) {
            console.log('[commit-validator] Skipping validation (--no-verify flag detected)')
            return input
          }

          // Extract commit message from command
          // Handle both -m "message" and --message="message" formats
          const messageMatch = command.match(/-m\s+["'](.+?)["']|--message=["'](.+?)["']/)

          if (!messageMatch) {
            // No -m flag found, might be using editor or other method
            // Allow it to proceed (validation will happen in git's commit-msg hook if present)
            return input
          }

          const message = messageMatch[1] || messageMatch[2]

          // Validate message format
          const isConventional = CONVENTIONAL_COMMIT_PATTERN.test(message)
          const isAlternative = ALTERNATIVE_PATTERN.test(message)

          if (!isConventional && !isAlternative) {
            // Invalid format - block commit
            const errorMessage = `
┌─────────────────────────────────────────────────────────────────────┐
│ ❌ Invalid Commit Message Format                                    │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│ Your commit message does not follow conventional commits format.   │
│                                                                     │
│ Current message:                                                    │
│   "${message}"
│                                                                     │
│ ✅ Valid formats:                                                   │
│   <type>: <description>                                             │
│   <type>(<scope>): <description>                                    │
│                                                                     │
│ 📝 Supported types:                                                 │
│   feat, fix, docs, refactor, test, chore, perf, style, ci, build   │
│                                                                     │
│ 💡 Examples:                                                        │
│   feat: add user authentication                                     │
│   fix(auth): correct JWT expiration handling                        │
│   docs: update README with installation steps                       │
│   refactor: simplify error handling logic                           │
│                                                                     │
│ 🔓 Bypass validation (not recommended):                             │
│   git commit --no-verify -m "your message"                          │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
`.trim()

            console.error(errorMessage)

            // Throw error to block execution
            throw new Error('Commit blocked: Invalid message format. See error message above.')
          }

          // Valid format - allow commit
          if (isConventional) {
            console.log('[commit-validator] ✓ Conventional commit format validated')
          } else {
            console.log('[commit-validator] ✓ Alternative commit format validated')
          }

          return input
        }
      }
    }
  }
}

export default ConventionalCommitValidatorPlugin
