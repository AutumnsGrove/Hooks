# OpenCode Plugins

This directory contains plugins for [OpenCode](https://opencode.dev), an open-source AI coding assistant with a plugin system similar to Claude Code hooks.

## What are OpenCode Plugins?

OpenCode plugins are TypeScript/JavaScript modules that extend OpenCode's functionality. They can:
- Intercept tool execution (before/after)
- Monitor session lifecycle events
- Transform inputs and outputs
- Run custom code at specific triggers

## Directory Structure

```
opencode/
├── plugins/                 # Plugin implementations
│   ├── grep-to-rg.ts       # Convert grep → rg
│   ├── auto-formatter.ts   # Format code after edits
│   ├── uv-enforcer.ts      # Force uv usage
│   └── ...
├── package.json            # Dependencies
├── tsconfig.json           # TypeScript config
└── README.md               # This file
```

## Installation

### Prerequisites

```bash
# Install Node.js (v18+ recommended)
# Install OpenCode (follow OpenCode installation guide)
```

### Install Dependencies

```bash
cd opencode/
npm install
```

### Enable Plugins

Create or update `opencode.json` in your project:

```json
{
  "plugins": [
    "./opencode/plugins/grep-to-rg.ts",
    "./opencode/plugins/auto-formatter.ts"
  ]
}
```

## Available Plugins

### grep-to-rg (tool.execute.before)
**Purpose**: Automatically converts `grep` commands to `ripgrep` (rg) for better performance

**Migration from**: Claude Code `grep-to-rg.py` hook

**How it works**:
- Intercepts Bash tool calls before execution
- Detects `grep` in commands
- Transforms to use `rg` instead
- Returns modified command

**Example**:
```typescript
export const GrepToRgPlugin: Plugin = async () => {
  return {
    tool: {
      execute: {
        before: async (input) => {
          if (input.tool === 'Bash' && input.parameters.command?.includes('grep')) {
            const newCommand = input.parameters.command.replace(/grep/g, 'rg')
            return { ...input, parameters: { command: newCommand } }
          }
          return input
        }
      }
    }
  }
}
```

**Requirements**: Install ripgrep (`brew install ripgrep` or `apt install ripgrep`)

---

### More Plugins Coming Soon!

See the migration status in `../MIGRATION_ANALYSIS.md` for the full list of planned plugins.

## Creating Custom Plugins

### 1. Create Plugin File

```typescript
// opencode/plugins/my-plugin.ts
import { Plugin } from '@opencode/plugin-api'

export const MyPlugin: Plugin = async ({ $ }) => {
  return {
    tool: {
      execute: {
        before: async (input) => {
          // Runs before tool execution
          // Can modify input or throw error to block
          return input
        },
        after: async (input, output) => {
          // Runs after tool execution
          // Can run side effects ($ for shell commands)
          await $`echo "Tool completed: ${input.tool}"`
        }
      }
    },
    session: {
      start: async () => {
        console.log('Session started!')
      },
      end: async () => {
        console.log('Session ended!')
      }
    }
  }
}
```

### 2. Register Plugin

Add to `opencode.json`:

```json
{
  "plugins": [
    "./opencode/plugins/my-plugin.ts"
  ]
}
```

### 3. Test Plugin

```bash
# Run OpenCode with your plugin enabled
opencode --config opencode.json
```

## Plugin API Reference

### Lifecycle Events

| Event | When | Can Block? | Use Case |
|-------|------|-----------|----------|
| `tool.execute.before` | Before tool runs | Yes (throw error) | Validation, transformation |
| `tool.execute.after` | After tool completes | No | Formatting, tests, notifications |
| `session.start` | Session begins | No | Setup, context loading |
| `session.end` | Session ends | No | Cleanup, analytics |

### Available Tools

Plugins can access:
- `$` (zx) - Shell command execution
- `fs` - File system operations
- `path` - Path manipulation
- All Node.js built-in modules

### Input Structure

```typescript
interface ToolInput {
  tool: string                    // "Bash", "Edit", "Write", etc.
  parameters: {
    command?: string              // For Bash
    file_path?: string            // For Edit/Write/Read
    content?: string              // For Write
    old_string?: string           // For Edit
    new_string?: string           // For Edit
    [key: string]: any
  }
}
```

### Blocking Execution

```typescript
before: async (input) => {
  if (shouldBlock(input)) {
    throw new Error('Tool execution blocked: reason here')
  }
  return input
}
```

### Modifying Input

```typescript
before: async (input) => {
  return {
    ...input,
    parameters: {
      ...input.parameters,
      command: modifiedCommand
    }
  }
}
```

### Running Side Effects

```typescript
after: async (input, output) => {
  // Run commands
  await $`black ${input.parameters.file_path}`

  // Write files
  await fs.promises.writeFile('/tmp/log.txt', 'Done!')

  // No return value needed
}
```

## Migration from Claude Code

If you're migrating from Claude Code hooks, see:
- **Migration Guide**: `../docs/migration-guide.md`
- **Comparison**: `../docs/comparison.md`
- **Analysis**: `../MIGRATION_ANALYSIS.md`

### Quick Translation Reference

| Claude Code | OpenCode | Notes |
|-------------|----------|-------|
| `PreToolUse` | `tool.execute.before` | ✅ Direct equivalent |
| `PostToolUse` | `tool.execute.after` | ✅ Direct equivalent |
| `SessionStart` | `session.start` | ⚠️ Less context available |
| `SessionEnd` | `session.end` | ⚠️ Less session data |
| `SubagentStop` | N/A | ❌ Not available |

## Example Plugins

### Auto-Formatter (PostToolUse → tool.execute.after)

```typescript
export const AutoFormatterPlugin: Plugin = async ({ $ }) => {
  return {
    tool: {
      execute: {
        after: async (input, output) => {
          if (input.tool === 'Edit' || input.tool === 'Write') {
            const filePath = input.parameters.file_path
            if (filePath?.endsWith('.py')) {
              await $`black ${filePath}`
            } else if (filePath?.match(/\.(ts|tsx|js|jsx)$/)) {
              await $`prettier --write ${filePath}`
            }
          }
        }
      }
    }
  }
}
```

### UV Enforcer (PreToolUse → tool.execute.before)

```typescript
export const UvEnforcerPlugin: Plugin = async () => {
  return {
    tool: {
      execute: {
        before: async (input) => {
          if (input.tool === 'Bash') {
            let command = input.parameters.command || ''

            // Check for escape hatch
            if (command.includes('# VANILLA_PYTHON')) {
              return input
            }

            // Rewrite Python commands to use uv
            if (command.match(/^python /)) {
              command = command.replace(/^python /, 'uv run python ')
            } else if (command.match(/^pytest /)) {
              command = command.replace(/^pytest /, 'uv run pytest ')
            }

            return {
              ...input,
              parameters: { ...input.parameters, command }
            }
          }
          return input
        }
      }
    }
  }
}
```

### Command Tracking (PostToolUse → tool.execute.after)

```typescript
import Database from 'better-sqlite3'

export const CommandTrackerPlugin: Plugin = async () => {
  const db = new Database(path.join(os.homedir(), '.opencode/analytics.db'))

  // Create table
  db.exec(`
    CREATE TABLE IF NOT EXISTS tool_calls (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
      tool_type TEXT NOT NULL,
      file_path TEXT,
      command TEXT,
      success BOOLEAN
    )
  `)

  return {
    tool: {
      execute: {
        after: async (input, output) => {
          const insert = db.prepare(`
            INSERT INTO tool_calls (tool_type, file_path, command, success)
            VALUES (?, ?, ?, ?)
          `)

          insert.run(
            input.tool,
            input.parameters.file_path || null,
            input.parameters.command || null,
            true
          )
        }
      }
    }
  }
}
```

## Troubleshooting

### Plugin not loading
1. Check `opencode.json` has correct path
2. Ensure plugin exports correctly: `export const MyPlugin: Plugin = ...`
3. Check for TypeScript compilation errors
4. Verify plugin is in `plugins` array

### Plugin blocking execution
- Check error messages in OpenCode output
- Test plugin logic independently
- Use `console.log()` for debugging

### Type errors
```bash
npm install --save-dev @types/node
```

## Performance Tips

1. **Async logging**: Use background threads for database writes
2. **Batch operations**: Group multiple file operations
3. **Lazy loading**: Only load heavy dependencies when needed
4. **Caching**: Cache expensive computations

## Resources

- [OpenCode Documentation](https://opencode.dev/docs)
- [Plugin API Reference](https://opencode.dev/docs/plugins)
- [Migration Guide](../docs/migration-guide.md)
- [Community Examples](https://github.com/opencode/plugins)

## Contributing

To add a new plugin:
1. Create plugin file in `plugins/` directory
2. Add JSDoc comments with usage examples
3. Test with OpenCode
4. Update this README
5. Submit PR

## Related

- **Claude Code Hooks**: See `../claude-code/` for Claude Code equivalents
- **Git Hooks**: See `../ClaudeUsage/pre_commit_hooks/` for traditional git hooks
- **Migration Analysis**: See `../MIGRATION_ANALYSIS.md` for migration status

---

*Last updated: 2025-11-14*
*More plugins coming soon!*
