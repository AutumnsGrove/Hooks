# Side-by-Side Examples: Claude Code vs OpenCode

This document shows the same hook/plugin implemented in both Claude Code and OpenCode, demonstrating the translation patterns.

---

## Example 1: grep-to-rg (Command Transformation)

### Claude Code Hook (Python)

**File**: `claude-code/hooks/grep-to-rg.py`

```python
#!/usr/bin/env python3
# CLAUDE_HOOK_EVENT: PreToolUse
"""Hook to automatically convert grep commands to ripgrep (rg) for better performance."""
import json
import sys

# Read hook input
input_data = json.load(sys.stdin)

# Only process Bash commands
if input_data.get("tool_name") != "Bash":
    sys.exit(0)

# Get the command
tool_input = input_data.get("tool_input", {})
command = tool_input.get("command", "")

# Replace grep with rg
if "grep" in command:
    new_command = command.replace("grep", "rg")

    output = {
        "hookSpecificOutput": {
            "hookEventName": "PreToolUse",
            "permissionDecision": "allow",
            "updatedInput": {"command": new_command},
        }
    }
    print(json.dumps(output))
    sys.exit(0)

# If no grep found, just continue normally
sys.exit(0)
```

### OpenCode Plugin (TypeScript)

**File**: `opencode/plugins/grep-to-rg.ts`

```typescript
import { Plugin } from '@opencode/plugin-api'

export const GrepToRgPlugin: Plugin = async () => {
  return {
    tool: {
      execute: {
        before: async (input) => {
          // Only process Bash tool calls
          if (input.tool !== 'Bash') {
            return input
          }

          const command = input.parameters?.command

          if (!command || !command.includes('grep')) {
            return input
          }

          // Replace grep with rg
          const newCommand = command.replace(/\bgrep\b/g, 'rg')

          console.log(`[grep-to-rg] Transformed: grep → rg`)

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
```

### Key Translation Points

| Aspect | Claude Code | OpenCode |
|--------|-------------|----------|
| **Input** | `json.load(sys.stdin)` | Function parameter `input` |
| **Tool check** | `input_data.get("tool_name") == "Bash"` | `input.tool === 'Bash'` |
| **Command access** | `input_data["tool_input"]["command"]` | `input.parameters?.command` |
| **Output** | `print(json.dumps({...}))` | `return { ...input, ... }` |
| **Exit** | `sys.exit(0)` | `return input` |
| **Blocking** | `sys.exit(2)` | `throw new Error()` |

---

## Example 2: Auto-Formatter (Post-Processing)

### Claude Code Hook (Python)

**File**: `claude-code/hooks/auto-formatter.py`

```python
#!/usr/bin/env python3
# CLAUDE_HOOK_EVENT: PostToolUse
"""Automatically format code files after edits."""
import os
import subprocess
import sys

# Get file paths from environment
file_paths_str = os.getenv("CLAUDE_FILE_PATHS", "")
if not file_paths_str:
    sys.exit(0)

file_paths = file_paths_str.split(",")

for file_path in file_paths:
    if not file_path:
        continue

    # Python: Black
    if file_path.endswith(".py"):
        try:
            subprocess.run(["black", file_path], check=True, capture_output=True)
            print(f"[auto-formatter] ✓ Black formatted: {file_path}")
        except subprocess.CalledProcessError as e:
            print(f"[auto-formatter] ⚠ Black failed: {e.stderr.decode()}")
        except FileNotFoundError:
            print("[auto-formatter] ⚠ Black not installed")

    # TypeScript/JavaScript: Prettier
    elif file_path.endswith((".ts", ".tsx", ".js", ".jsx")):
        try:
            subprocess.run(["prettier", "--write", file_path], check=True, capture_output=True)
            print(f"[auto-formatter] ✓ Prettier formatted: {file_path}")
        except subprocess.CalledProcessError as e:
            print(f"[auto-formatter] ⚠ Prettier failed: {e.stderr.decode()}")
        except FileNotFoundError:
            print("[auto-formatter] ⚠ Prettier not installed")

    # Go: gofmt
    elif file_path.endswith(".go"):
        try:
            subprocess.run(["gofmt", "-w", file_path], check=True, capture_output=True)
            print(f"[auto-formatter] ✓ gofmt formatted: {file_path}")
        except subprocess.CalledProcessError as e:
            print(f"[auto-formatter] ⚠ gofmt failed: {e.stderr.decode()}")
        except FileNotFoundError:
            print("[auto-formatter] ⚠ gofmt not installed")

sys.exit(0)
```

### OpenCode Plugin (TypeScript)

**File**: `opencode/plugins/auto-formatter.ts`

```typescript
import { Plugin } from '@opencode/plugin-api'
import { $ } from 'zx'
import * as path from 'path'

export const AutoFormatterPlugin: Plugin = async ({ $ }) => {
  return {
    tool: {
      execute: {
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
              await $`black ${filePath}`
              console.log(`[auto-formatter] ✓ Black formatted: ${filePath}`)
            }

            // TypeScript/JavaScript: Prettier
            else if (['.ts', '.tsx', '.js', '.jsx'].includes(ext)) {
              await $`prettier --write ${filePath}`
              console.log(`[auto-formatter] ✓ Prettier formatted: ${filePath}`)
            }

            // Go: gofmt
            else if (ext === '.go') {
              await $`gofmt -w ${filePath}`
              console.log(`[auto-formatter] ✓ gofmt formatted: ${filePath}`)
            }
          } catch (error) {
            console.warn(`[auto-formatter] ⚠ Formatter failed for ${filePath}`)
            console.warn(`[auto-formatter] Error: ${error.message}`)
          }
        }
      }
    }
  }
}

export default AutoFormatterPlugin
```

### Key Translation Points

| Aspect | Claude Code | OpenCode |
|--------|-------------|----------|
| **Event** | `PostToolUse` | `tool.execute.after` |
| **File paths** | `os.getenv("CLAUDE_FILE_PATHS").split(",")` | `input.parameters?.file_path` (single) |
| **Shell commands** | `subprocess.run([...])` | `await $\`...\`` (zx) |
| **Error handling** | `try/except subprocess.CalledProcessError` | `try/catch` |
| **Extension check** | `file_path.endswith(".py")` | `path.extname(filePath) === '.py'` |
| **Output** | `print()` | `console.log()` |

---

## Example 3: Conventional Commit Validator (Validation & Blocking)

### Claude Code Hook (Python)

**File**: `claude-code/hooks/commit-validator.py`

```python
#!/usr/bin/env python3
# CLAUDE_HOOK_EVENT: PreToolUse
"""Enforce conventional commit message format."""
import json
import sys
import re

# Read input
input_data = json.load(sys.stdin)

# Only process Bash commands
if input_data.get("tool_name") != "Bash":
    sys.exit(0)

command = input_data.get("tool_input", {}).get("command", "")

# Check if this is a git commit
if "git commit" not in command:
    sys.exit(0)

# Skip if --no-verify flag
if "--no-verify" in command:
    sys.exit(0)

# Extract commit message
match = re.search(r'-m\s+["\'](.+?)["\']', command)
if not match:
    sys.exit(0)  # Using editor, can't validate

message = match.group(1)

# Validate conventional commit format
pattern = r'^(feat|fix|docs|refactor|test|chore|perf|style|ci|build)(\(.+\))?: .+'
if not re.match(pattern, message):
    # Invalid format - block commit
    print("❌ Invalid commit message format", file=sys.stderr)
    print(f"Message: \"{message}\"", file=sys.stderr)
    print("", file=sys.stderr)
    print("Valid format: <type>: <description>", file=sys.stderr)
    print("Example: feat: add user authentication", file=sys.stderr)
    sys.exit(2)  # Exit code 2 blocks execution

# Valid format
print(f"✓ Valid conventional commit: {message}")
sys.exit(0)
```

### OpenCode Plugin (TypeScript)

**File**: `opencode/plugins/conventional-commit-validator.ts`

```typescript
import { Plugin } from '@opencode/plugin-api'

const CONVENTIONAL_PATTERN = /^(feat|fix|docs|refactor|test|chore|perf|style|ci|build)(\(.+\))?: .+/

export const ConventionalCommitValidatorPlugin: Plugin = async () => {
  return {
    tool: {
      execute: {
        before: async (input) => {
          // Only process Bash tool calls
          if (input.tool !== 'Bash') {
            return input
          }

          const command = input.parameters?.command

          if (!command || !command.includes('git commit')) {
            return input
          }

          // Skip if --no-verify flag
          if (command.includes('--no-verify')) {
            return input
          }

          // Extract commit message
          const match = command.match(/-m\s+["'](.+?)["']/)

          if (!match) {
            return input  // Using editor, can't validate
          }

          const message = match[1]

          // Validate format
          if (!CONVENTIONAL_PATTERN.test(message)) {
            // Block execution by throwing error
            throw new Error(`
❌ Invalid commit message format

Message: "${message}"

Valid format: <type>: <description>
Example: feat: add user authentication
            `.trim())
          }

          console.log(`[commit-validator] ✓ Valid conventional commit: ${message}`)
          return input
        }
      }
    }
  }
}

export default ConventionalCommitValidatorPlugin
```

### Key Translation Points

| Aspect | Claude Code | OpenCode |
|--------|-------------|----------|
| **Event** | `PreToolUse` | `tool.execute.before` |
| **Regex** | `re.match(pattern, message)` | `CONVENTIONAL_PATTERN.test(message)` |
| **Blocking** | `sys.exit(2)` | `throw new Error()` |
| **Error output** | `print(..., file=sys.stderr)` | Include in `Error` message |
| **Success** | `sys.exit(0)` | `return input` |
| **Pattern definition** | String pattern in code | Compiled regex constant |

---

## Example 4: UV Enforcer (Command Rewriting)

### Claude Code Hook (Shell)

**File**: `claude-code/hooks/uv-enforcer.sh`

```bash
#!/bin/bash
# CLAUDE_HOOK_EVENT: PreToolUse

# Read JSON input from stdin
INPUT=$(cat)

# Parse tool name
TOOL_NAME=$(echo "$INPUT" | jq -r '.tool_name')

# Only process Bash commands
if [ "$TOOL_NAME" != "Bash" ]; then
    exit 0
fi

# Get command
COMMAND=$(echo "$INPUT" | jq -r '.tool_input.command')

# Check for escape hatch
if echo "$COMMAND" | grep -q "# VANILLA_PYTHON"; then
    exit 0
fi

# Transform python commands
NEW_COMMAND="$COMMAND"

if echo "$COMMAND" | grep -q "^python "; then
    NEW_COMMAND=$(echo "$COMMAND" | sed 's/^python /uv run python /')
    echo "[uv-enforcer] Enforcing UV: python → uv run python" >&2
elif echo "$COMMAND" | grep -q "^pytest "; then
    NEW_COMMAND=$(echo "$COMMAND" | sed 's/^pytest /uv run pytest /')
    echo "[uv-enforcer] Enforcing UV: pytest → uv run pytest" >&2
elif echo "$COMMAND" | grep -q "^pip "; then
    NEW_COMMAND=$(echo "$COMMAND" | sed 's/^pip /uv pip /')
    echo "[uv-enforcer] Enforcing UV: pip → uv pip" >&2
fi

# If command changed, return modified input
if [ "$NEW_COMMAND" != "$COMMAND" ]; then
    OUTPUT=$(jq -n \
        --arg cmd "$NEW_COMMAND" \
        '{
            hookSpecificOutput: {
                hookEventName: "PreToolUse",
                permissionDecision: "allow",
                updatedInput: {
                    command: $cmd
                }
            }
        }')
    echo "$OUTPUT"
fi

exit 0
```

### OpenCode Plugin (TypeScript)

**File**: `opencode/plugins/uv-enforcer.ts`

```typescript
import { Plugin } from '@opencode/plugin-api'

export const UvEnforcerPlugin: Plugin = async () => {
  return {
    tool: {
      execute: {
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
            return input
          }

          let newCommand = command

          // Transform python commands
          if (/^python\s/.test(command)) {
            newCommand = command.replace(/^python\s/, 'uv run python ')
            console.log('[uv-enforcer] Enforcing UV: python → uv run python')
          }
          else if (/^pytest\s/.test(command)) {
            newCommand = command.replace(/^pytest\s/, 'uv run pytest ')
            console.log('[uv-enforcer] Enforcing UV: pytest → uv run pytest')
          }
          else if (/^pip\s/.test(command)) {
            newCommand = command.replace(/^pip\s/, 'uv pip ')
            console.log('[uv-enforcer] Enforcing UV: pip → uv pip')
          }

          if (newCommand !== command) {
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
```

### Key Translation Points

| Aspect | Claude Code (Shell) | OpenCode (TypeScript) |
|--------|---------------------|----------------------|
| **Input parsing** | `jq -r '.tool_name'` | `input.tool` |
| **Pattern matching** | `grep -q "^python "` | `/^python\s/.test(command)` |
| **String replacement** | `sed 's/^python /uv run python /'` | `command.replace(/^python\s/, 'uv run python ')` |
| **Output** | `jq -n --arg ...` | `return { ...input, ... }` |
| **Logging** | `echo ... >&2` | `console.log()` |

---

## Summary of Translation Patterns

### 1. Input Access

```python
# Claude Code (Python)
input_data = json.load(sys.stdin)
tool_name = input_data.get("tool_name")
command = input_data["tool_input"]["command"]
```

```typescript
// OpenCode (TypeScript)
const toolName = input.tool
const command = input.parameters?.command
```

### 2. Output/Return

```python
# Claude Code - Allow with modifications
output = {
    "hookSpecificOutput": {
        "hookEventName": "PreToolUse",
        "permissionDecision": "allow",
        "updatedInput": {"command": new_command}
    }
}
print(json.dumps(output))
sys.exit(0)
```

```typescript
// OpenCode - Allow with modifications
return {
  ...input,
  parameters: {
    ...input.parameters,
    command: newCommand
  }
}
```

### 3. Blocking Execution

```python
# Claude Code - Block
print("Error message", file=sys.stderr)
sys.exit(2)
```

```typescript
// OpenCode - Block
throw new Error('Error message')
```

### 4. Shell Commands

```python
# Claude Code
subprocess.run(["black", file_path], check=True)
```

```typescript
// OpenCode
await $`black ${filePath}`
```

### 5. File Operations

```python
# Claude Code
with open(file_path, 'r') as f:
    content = f.read()
```

```typescript
// OpenCode
const content = await fs.readFile(filePath, 'utf-8')
```

---

## Configuration Examples

### Claude Code

**`~/.claude/settings.json`**:

```json
{
  "hooks": {
    "PreToolUse": [
      {
        "hooks": [
          {
            "name": "grep-to-rg",
            "type": "command",
            "command": "/home/user/.claude/hooks/grep-to-rg.py"
          },
          {
            "name": "uv-enforcer",
            "type": "command",
            "command": "/home/user/.claude/hooks/uv-enforcer.sh"
          },
          {
            "name": "commit-validator",
            "type": "command",
            "command": "/home/user/.claude/hooks/commit-validator.py"
          }
        ]
      }
    ],
    "PostToolUse": [
      {
        "hooks": [
          {
            "name": "auto-formatter",
            "type": "command",
            "command": "/home/user/.claude/hooks/auto-formatter.py"
          }
        ]
      }
    ]
  }
}
```

### OpenCode

**`opencode.json`**:

```json
{
  "plugins": [
    "./opencode/plugins/grep-to-rg.ts",
    "./opencode/plugins/uv-enforcer.ts",
    "./opencode/plugins/conventional-commit-validator.ts",
    "./opencode/plugins/auto-formatter.ts"
  ]
}
```

---

## Testing Examples

### Claude Code Hook Test

```bash
# Test grep-to-rg hook manually
echo '{"tool_name":"Bash","tool_input":{"command":"grep test src/*.py"}}' | \
  python3 claude-code/hooks/grep-to-rg.py | jq
```

Expected output:
```json
{
  "hookSpecificOutput": {
    "hookEventName": "PreToolUse",
    "permissionDecision": "allow",
    "updatedInput": {
      "command": "rg test src/*.py"
    }
  }
}
```

### OpenCode Plugin Test

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

---

*Examples last updated: 2025-11-14*
*See the actual implementations in `claude-code/hooks/` and `opencode/plugins/`*
