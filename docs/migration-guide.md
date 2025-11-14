# Migration Guide: Claude Code Hooks → OpenCode Plugins

This guide shows you how to migrate Claude Code hooks to OpenCode plugins with detailed examples and patterns.

---

## Table of Contents

1. [Quick Translation Reference](#quick-translation-reference)
2. [Step-by-Step Migration Process](#step-by-step-migration-process)
3. [Pattern Examples](#pattern-examples)
4. [Common Challenges](#common-challenges)
5. [Testing Your Migration](#testing-your-migration)

---

## Quick Translation Reference

### Event Mapping

| Claude Code Event | OpenCode Event | Migration Difficulty | Notes |
|-------------------|----------------|---------------------|-------|
| `PreToolUse` | `tool.execute.before` | ✅ Easy | Direct mapping |
| `PostToolUse` | `tool.execute.after` | ✅ Easy | Direct mapping |
| `SessionStart` | `session.start` | ⚠️ Medium | Less context available |
| `SessionEnd` | `session.end` | ⚠️ Medium | Different session data |
| `SubagentStop` | ❌ N/A | ❌ Not Possible | No OpenCode equivalent |
| `UserPromptSubmit` | `prompt.submit` (maybe) | ⚠️ Unknown | Depends on OpenCode version |
| `Stop` | `session.end` | ⚠️ Medium | Approximate mapping |
| `PreCompact` | ❌ N/A | ❌ Not Possible | Different context system |

### Language Mapping

| Aspect | Claude Code | OpenCode |
|--------|-------------|----------|
| **Language** | Python, Shell, JavaScript | TypeScript/JavaScript |
| **Input** | JSON via stdin | Function parameters |
| **Output** | JSON via stdout | Return value / throw error |
| **Shell Commands** | `subprocess.run()` | `$` from zx |
| **Blocking** | `exit(2)` | `throw new Error()` |
| **File Operations** | `open()`, `os`, `shutil` | `fs` module |
| **Async** | `asyncio` (if needed) | Native `async/await` |

---

## Step-by-Step Migration Process

### Step 1: Understand Your Hook

Before migrating, analyze your Claude Code hook:

1. **What event does it use?** (PreToolUse, PostToolUse, etc.)
2. **What does it do?** (Transform commands, run formatters, validate, etc.)
3. **What tools does it target?** (Bash, Edit, Write, all tools, etc.)
4. **Does it block execution?** (exit code 2)
5. **What external dependencies does it have?**

### Step 2: Choose the OpenCode Event

Use the event mapping table above to find the equivalent OpenCode event.

### Step 3: Create the Plugin File

```typescript
// opencode/plugins/your-plugin.ts
import { Plugin } from '@opencode/plugin-api'

export const YourPlugin: Plugin = async ({ $ }) => {
  return {
    tool: {
      execute: {
        before: async (input) => {
          // Your logic here
          return input
        }
      }
    }
  }
}

export default YourPlugin
```

### Step 4: Translate the Logic

See pattern examples below for common translation patterns.

### Step 5: Test the Plugin

1. Enable in `opencode.json`
2. Run OpenCode with test scenarios
3. Verify behavior matches Claude Code hook
4. Check error handling

---

## Pattern Examples

### Pattern 1: Command Transformation (PreToolUse → tool.execute.before)

#### Claude Code (Python)

```python
#!/usr/bin/env python3
# CLAUDE_HOOK_EVENT: PreToolUse
import json
import sys

# Read input
input_data = json.load(sys.stdin)

# Only process Bash commands
if input_data.get("tool_name") != "Bash":
    sys.exit(0)

# Get the command
command = input_data["tool_input"]["command"]

# Replace grep with rg
if "grep" in command:
    new_command = command.replace("grep", "rg")

    output = {
        "hookSpecificOutput": {
            "hookEventName": "PreToolUse",
            "permissionDecision": "allow",
            "updatedInput": {"command": new_command}
        }
    }
    print(json.dumps(output))
    sys.exit(0)

# No changes
sys.exit(0)
```

#### OpenCode (TypeScript)

```typescript
import { Plugin } from '@opencode/plugin-api'

export const GrepToRgPlugin: Plugin = async () => {
  return {
    tool: {
      execute: {
        before: async (input) => {
          // Only process Bash commands
          if (input.tool !== 'Bash') {
            return input
          }

          const command = input.parameters?.command

          if (!command || !command.includes('grep')) {
            return input
          }

          // Replace grep with rg
          const newCommand = command.replace(/\bgrep\b/g, 'rg')

          console.log(`[grep-to-rg] Transformed: ${command} → ${newCommand}`)

          // Return modified input
          return {
            ...input,
            parameters: { ...input.parameters, command: newCommand }
          }
        }
      }
    }
  }
}
```

**Key Differences**:
- ✅ No JSON parsing - parameters passed directly
- ✅ Return modified object instead of printing JSON
- ✅ Use spread operator for immutability
- ✅ No exit codes - just return

---

### Pattern 2: Post-Processing (PostToolUse → tool.execute.after)

#### Claude Code (Python)

```python
#!/usr/bin/env python3
# CLAUDE_HOOK_EVENT: PostToolUse
import os
import subprocess

# Get file paths from environment
file_paths = os.getenv("CLAUDE_FILE_PATHS", "").split(",")

for file_path in file_paths:
    if file_path.endswith(".py"):
        subprocess.run(["black", file_path])
        print(f"Formatted: {file_path}")
```

#### OpenCode (TypeScript)

```typescript
import { Plugin } from '@opencode/plugin-api'
import { $ } from 'zx'

export const AutoFormatterPlugin: Plugin = async ({ $ }) => {
  return {
    tool: {
      execute: {
        after: async (input, output) => {
          // Only process Edit/Write tools
          if (input.tool !== 'Edit' && input.tool !== 'Write') {
            return
          }

          const filePath = input.parameters?.file_path

          if (!filePath || !filePath.endsWith('.py')) {
            return
          }

          // Run formatter
          await $`black ${filePath}`
          console.log(`[auto-formatter] Formatted: ${filePath}`)
        }
      }
    }
  }
}
```

**Key Differences**:
- ✅ Use `$` from zx instead of `subprocess.run()`
- ✅ Native async/await (cleaner than subprocess)
- ✅ No environment variables - use input parameters
- ✅ No return value needed (side effects only)

---

### Pattern 3: Validation & Blocking (PreToolUse → tool.execute.before)

#### Claude Code (Python)

```python
#!/usr/bin/env python3
# CLAUDE_HOOK_EVENT: PreToolUse
import json
import sys
import re

input_data = json.load(sys.stdin)

if input_data.get("tool_name") != "Bash":
    sys.exit(0)

command = input_data["tool_input"]["command"]

# Check for git commit
if "git commit" in command:
    # Extract message
    match = re.search(r'-m\s+"(.+?)"', command)
    if match:
        message = match.group(1)

        # Validate conventional commit format
        pattern = r'^(feat|fix|docs|refactor|test|chore)(\(.+\))?: .+'
        if not re.match(pattern, message):
            # Block commit
            print("Error: Invalid commit message format", file=sys.stderr)
            sys.exit(2)  # Exit code 2 blocks execution

sys.exit(0)
```

#### OpenCode (TypeScript)

```typescript
import { Plugin } from '@opencode/plugin-api'

const CONVENTIONAL_PATTERN = /^(feat|fix|docs|refactor|test|chore)(\(.+\))?: .+/

export const CommitValidatorPlugin: Plugin = async () => {
  return {
    tool: {
      execute: {
        before: async (input) => {
          if (input.tool !== 'Bash') {
            return input
          }

          const command = input.parameters?.command

          if (!command || !command.includes('git commit')) {
            return input
          }

          // Extract message
          const match = command.match(/-m\s+["'](.+?)["']/)
          if (match) {
            const message = match[1]

            // Validate format
            if (!CONVENTIONAL_PATTERN.test(message)) {
              // Block execution by throwing error
              throw new Error(`
Invalid commit message format: "${message}"

Valid format: <type>: <description>
Example: feat: add user authentication
              `.trim())
            }
          }

          return input
        }
      }
    }
  }
}
```

**Key Differences**:
- ✅ Throw `Error` instead of `exit(2)` to block
- ✅ Error message in exception instead of stderr
- ✅ Return input if validation passes

---

### Pattern 4: Session Lifecycle

#### Claude Code (Python)

```python
#!/usr/bin/env python3
# CLAUDE_HOOK_EVENT: SessionEnd
import sqlite3
import json
import sys
from datetime import datetime

input_data = json.load(sys.stdin)

# Save session data
db = sqlite3.connect(os.path.expanduser("~/.claude/sessions.db"))
cursor = db.cursor()

cursor.execute("""
    INSERT INTO sessions (timestamp, summary)
    VALUES (?, ?)
""", (datetime.now().isoformat(), input_data.get("summary", "")))

db.commit()
db.close()

print("Session data saved")
```

#### OpenCode (TypeScript)

```typescript
import { Plugin } from '@opencode/plugin-api'
import Database from 'better-sqlite3'
import * as os from 'os'
import * as path from 'path'

export const SessionTrackerPlugin: Plugin = async () => {
  const dbPath = path.join(os.homedir(), '.opencode', 'sessions.db')
  const db = new Database(dbPath)

  // Create table
  db.exec(`
    CREATE TABLE IF NOT EXISTS sessions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
      summary TEXT
    )
  `)

  return {
    session: {
      end: async () => {
        // Save session data
        const insert = db.prepare(`
          INSERT INTO sessions (summary) VALUES (?)
        `)

        insert.run('Session completed')
        console.log('[session-tracker] Session data saved')
      }
    }
  }
}
```

**Key Differences**:
- ✅ Use `better-sqlite3` instead of `sqlite3`
- ✅ Initialize DB in plugin setup
- ✅ Use `session.end` instead of SessionEnd event
- ⚠️ Note: Session data may differ from Claude Code

---

### Pattern 5: Multi-File Operations

#### Claude Code (Shell)

```bash
#!/bin/bash
# CLAUDE_HOOK_EVENT: PostToolUse

IFS=',' read -ra FILES <<< "$CLAUDE_FILE_PATHS"

for file in "${FILES[@]}"; do
    if [[ "$file" == *.py ]]; then
        black "$file"
        ruff check --fix "$file"
    fi
done
```

#### OpenCode (TypeScript)

```typescript
import { Plugin } from '@opencode/plugin-api'
import { $ } from 'zx'

export const PythonFormatterPlugin: Plugin = async ({ $ }) => {
  return {
    tool: {
      execute: {
        after: async (input, output) => {
          const filePath = input.parameters?.file_path

          if (!filePath || !filePath.endsWith('.py')) {
            return
          }

          // Run formatters in parallel
          await Promise.all([
            $`black ${filePath}`,
            $`ruff check --fix ${filePath}`
          ])

          console.log(`[formatter] Processed ${filePath}`)
        }
      }
    }
  }
}
```

**Key Differences**:
- ✅ Use `Promise.all()` for parallel execution
- ✅ Direct file path parameter (no splitting needed)
- ✅ Cleaner error handling with try/catch

---

## Common Challenges

### Challenge 1: Environment Variables Not Available

**Claude Code**:
```python
file_paths = os.getenv("CLAUDE_FILE_PATHS", "").split(",")
project_dir = os.getenv("CLAUDE_PROJECT_DIR")
```

**OpenCode Solution**:
```typescript
// Use input parameters directly
const filePath = input.parameters?.file_path
// Or use process.cwd() for project directory
const projectDir = process.cwd()
```

### Challenge 2: SubagentStop Has No Equivalent

**Claude Code**:
```python
# CLAUDE_HOOK_EVENT: SubagentStop
# Track subagent completion
```

**OpenCode Solution**:
```typescript
// ❌ No direct equivalent
// ✅ Alternative: Use tool.execute.after and check for subagent-related tools
// Or accept this as a Claude Code-only feature
```

### Challenge 3: Different Tool Names

**Claude Code**: `"tool_name": "Bash"`
**OpenCode**: `input.tool === 'Bash'`

Make sure to check tool names match between systems.

### Challenge 4: Blocking Execution

**Claude Code**: `sys.exit(2)` blocks execution
**OpenCode**: `throw new Error()` blocks execution

Both achieve the same result, but syntax differs.

---

## Testing Your Migration

### 1. Unit Testing

```typescript
// test/grep-to-rg.test.ts
import { GrepToRgPlugin } from '../plugins/grep-to-rg'

describe('GrepToRgPlugin', () => {
  it('should transform grep to rg', async () => {
    const plugin = await GrepToRgPlugin()

    const input = {
      tool: 'Bash',
      parameters: { command: 'grep "test" src/*.py' }
    }

    const result = await plugin.tool.execute.before(input)

    expect(result.parameters.command).toBe('rg "test" src/*.py')
  })
})
```

### 2. Integration Testing

1. **Enable plugin** in `opencode.json`
2. **Run OpenCode** with test scenario
3. **Verify behavior** matches Claude Code hook
4. **Check logs** for expected output

### 3. Side-by-Side Comparison

Create a test project and run the same operations with:
1. Claude Code hook enabled
2. OpenCode plugin enabled

Compare:
- Output consistency
- Performance
- Error handling
- Edge cases

---

## Migration Checklist

When migrating a hook, verify:

- [ ] Event type correctly mapped
- [ ] Tool filtering works (Bash, Edit, Write, etc.)
- [ ] Input parameters extracted correctly
- [ ] Logic produces same output
- [ ] Error handling works (blocking if needed)
- [ ] External dependencies available (formatters, tools)
- [ ] File paths handled correctly
- [ ] Async operations use async/await
- [ ] Logging provides visibility
- [ ] JSDoc comments explain usage
- [ ] Plugin exported correctly
- [ ] Added to `opencode.json` example
- [ ] Tested with real scenarios

---

## Need Help?

- **Migration Analysis**: See [`../MIGRATION_ANALYSIS.md`](../MIGRATION_ANALYSIS.md)
- **Comparison**: See [`comparison.md`](./comparison.md)
- **OpenCode Plugins**: See [`../opencode/README.md`](../opencode/README.md)
- **Claude Code Hooks**: See [`../claude-code/README.md`](../claude-code/README.md)

---

*Migration guide last updated: 2025-11-14*
*Happy migrating! 🚀*
