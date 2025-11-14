/**
 * Auto-Formatter OpenCode Plugin
 *
 * Automatically formats code files after edits using appropriate formatters.
 *
 * **Migration from**: Claude Code Auto-Formatters Suite (PostToolUse)
 *
 * **How it works**:
 * - Runs after Edit or Write tool completes
 * - Detects file extension
 * - Runs appropriate formatter
 * - Supports: Python (Black), TypeScript/JavaScript (Prettier), Go (gofmt), Rust (rustfmt)
 *
 * **Supported Formatters**:
 * - **Python (.py)**: Black
 * - **TypeScript/JavaScript (.ts, .tsx, .js, .jsx)**: Prettier
 * - **Go (.go)**: gofmt
 * - **Rust (.rs)**: rustfmt
 *
 * **Requirements**:
 * Install formatters as needed:
 * ```bash
 * # Python
 * pip install black
 *
 * # JavaScript/TypeScript
 * npm install -g prettier
 *
 * # Go
 * go install golang.org/x/tools/cmd/gofmt@latest
 *
 * # Rust
 * rustup component add rustfmt
 * ```
 *
 * **Configuration**:
 * Formatters respect config files in your project:
 * - Black: pyproject.toml, .black
 * - Prettier: .prettierrc, prettier.config.js
 * - gofmt: Uses Go defaults
 * - rustfmt: rustfmt.toml
 *
 * **Test this plugin**:
 * 1. Enable plugin in opencode.json
 * 2. Edit a Python/TypeScript file
 * 3. Verify file was automatically formatted
 * 4. Check formatter ran without errors
 */

import { Plugin } from '@opencode/plugin-api'
import { $ } from 'zx'
import * as path from 'path'

export const AutoFormatterPlugin: Plugin = async ({ $ }) => {
  return {
    tool: {
      execute: {
        /**
         * Format files after Edit or Write operations
         */
        after: async (input, output) => {
          // Only process Edit and Write tools
          if (input.tool !== 'Edit' && input.tool !== 'Write') {
            return
          }

          const filePath = input.parameters?.file_path

          if (!filePath) {
            return
          }

          const ext = path.extname(filePath)

          try {
            // Python: Black
            if (ext === '.py') {
              console.log(`[auto-formatter] Running Black on ${filePath}`)
              await $`black ${filePath}`
              console.log(`[auto-formatter] ✓ Black completed`)
            }

            // TypeScript/JavaScript: Prettier
            else if (['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs'].includes(ext)) {
              console.log(`[auto-formatter] Running Prettier on ${filePath}`)
              await $`prettier --write ${filePath}`
              console.log(`[auto-formatter] ✓ Prettier completed`)
            }

            // Go: gofmt
            else if (ext === '.go') {
              console.log(`[auto-formatter] Running gofmt on ${filePath}`)
              await $`gofmt -w ${filePath}`
              console.log(`[auto-formatter] ✓ gofmt completed`)
            }

            // Rust: rustfmt
            else if (ext === '.rs') {
              console.log(`[auto-formatter] Running rustfmt on ${filePath}`)
              await $`rustfmt ${filePath}`
              console.log(`[auto-formatter] ✓ rustfmt completed`)
            }

            // JSON: Prettier
            else if (ext === '.json') {
              console.log(`[auto-formatter] Running Prettier on ${filePath}`)
              await $`prettier --write ${filePath}`
              console.log(`[auto-formatter] ✓ Prettier completed`)
            }

            // YAML: Prettier
            else if (['.yml', '.yaml'].includes(ext)) {
              console.log(`[auto-formatter] Running Prettier on ${filePath}`)
              await $`prettier --write ${filePath}`
              console.log(`[auto-formatter] ✓ Prettier completed`)
            }

            // Markdown: Prettier
            else if (ext === '.md') {
              console.log(`[auto-formatter] Running Prettier on ${filePath}`)
              await $`prettier --write ${filePath}`
              console.log(`[auto-formatter] ✓ Prettier completed`)
            }
          } catch (error) {
            // Formatter not installed or failed - log but don't throw
            console.warn(`[auto-formatter] Warning: Formatter failed for ${filePath}`)
            console.warn(`[auto-formatter] Error: ${error.message}`)
            console.warn(`[auto-formatter] Make sure the appropriate formatter is installed`)
          }
        }
      }
    }
  }
}

export default AutoFormatterPlugin
