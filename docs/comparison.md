# Claude Code vs OpenCode: Hook/Plugin Comparison

This document compares Claude Code hooks and OpenCode plugins to help you choose the right system for your needs.

---

## Quick Comparison Table

| Feature | Claude Code Hooks | OpenCode Plugins | Winner |
|---------|------------------|------------------|--------|
| **Language** | Python, Shell, JS, Any | TypeScript/JavaScript | Tie |
| **Lifecycle Events** | 9 events | ~4 events | 🏆 Claude Code |
| **Community Ecosystem** | Mature, more examples | Growing | 🏆 Claude Code |
| **Development Experience** | Script-based | TypeScript with types | 🏆 OpenCode |
| **Shell Commands** | subprocess, os.system | zx (`$`) | 🏆 OpenCode |
| **Async/Await** | asyncio (if needed) | Native | 🏆 OpenCode |
| **Type Safety** | Optional (mypy) | Built-in (TypeScript) | 🏆 OpenCode |
| **Installation** | Copy scripts, update JSON | npm install, register | Tie |
| **Performance** | Process per hook | In-process | 🏆 OpenCode |
| **Debugging** | Print statements, logs | console.log, debugger | 🏆 OpenCode |
| **Testing** | pytest, unittest | Jest, Vitest | Tie |
| **Hot Reload** | No | Possibly | 🏆 OpenCode |
| **Context Variables** | Rich (9+ env vars) | Limited | 🏆 Claude Code |
| **Can Use Both?** | ✅ Yes | ✅ Yes | ✅ Both |

---

## Detailed Comparison

### 1. Lifecycle Events

#### Claude Code (9 Events)

| Event | Use Case | Unique? |
|-------|----------|---------|
| `PreToolUse` | Before tool execution, can block/modify | No |
| `PostToolUse` | After tool completes | No |
| `UserPromptSubmit` | Before processing prompt | Yes ⭐ |
| `SessionStart` | Session begins | No |
| `SessionEnd` | Session ends | No |
| `SubagentStop` | Subagent completes | Yes ⭐ |
| `Stop` | Main agent finishes | No |
| `PreCompact` | Before transcript compaction | Yes ⭐ |
| `Notification` | Notification sent | Maybe |

#### OpenCode (~4 Events)

| Event | Use Case |
|-------|----------|
| `tool.execute.before` | Before tool execution, can block/modify |
| `tool.execute.after` | After tool completes |
| `session.start` | Session begins |
| `session.end` | Session ends |

**Winner**: 🏆 **Claude Code** - More granular control with 3 unique events (SubagentStop, PreCompact, UserPromptSubmit)

---

### 2. Language & Development Experience

#### Claude Code

**Advantages**:
- ✅ Use any language (Python, Shell, Go, etc.)
- ✅ Simpler for quick scripts
- ✅ No build step required
- ✅ Easy to prototype

**Disadvantages**:
- ❌ No type safety (unless using mypy)
- ❌ Process overhead (new process per hook)
- ❌ JSON parsing required (stdin/stdout)
- ❌ Less modern syntax

**Example**:
```python
#!/usr/bin/env python3
import json, sys

input_data = json.load(sys.stdin)
# ... logic ...
output = {"hookSpecificOutput": {...}}
print(json.dumps(output))
```

#### OpenCode

**Advantages**:
- ✅ TypeScript type safety
- ✅ Modern async/await syntax
- ✅ Native Node.js modules
- ✅ Better IDE support (autocomplete, refactoring)
- ✅ No process overhead (in-process)

**Disadvantages**:
- ❌ TypeScript-only (not polyglot)
- ❌ Requires compilation (tsc)
- ❌ More boilerplate for simple tasks

**Example**:
```typescript
export const MyPlugin: Plugin = async ({ $ }) => {
  return {
    tool: {
      execute: {
        before: async (input) => {
          // ... logic ...
          return input
        }
      }
    }
  }
}
```

**Winner**: 🏆 **OpenCode** for modern development experience, **Claude Code** for quick prototyping

---

### 3. Shell Command Execution

#### Claude Code

```python
import subprocess

# Run command
result = subprocess.run(["black", file_path], capture_output=True)

# Check success
if result.returncode != 0:
    print(f"Error: {result.stderr.decode()}")
```

**Pros**: Works in any language
**Cons**: Verbose, manual error handling

#### OpenCode

```typescript
import { $ } from 'zx'

// Run command (auto error handling)
await $`black ${filePath}`

// Run multiple in parallel
await Promise.all([
  $`black ${filePath}`,
  $`ruff check --fix ${filePath}`
])
```

**Pros**: Concise, built-in error handling, easy parallelization
**Cons**: Requires zx dependency

**Winner**: 🏆 **OpenCode** - zx makes shell commands much cleaner

---

### 4. Environment Variables & Context

#### Claude Code

**Rich context via environment variables**:

```python
import os

file_paths = os.getenv("CLAUDE_FILE_PATHS", "").split(",")
project_dir = os.getenv("CLAUDE_PROJECT_DIR")
tool_output = os.getenv("CLAUDE_TOOL_OUTPUT")  # PostToolUse only
notification = os.getenv("CLAUDE_NOTIFICATION")
env_file = os.getenv("CLAUDE_ENV_FILE")  # SessionStart only
```

**Available variables**:
- `$CLAUDE_FILE_PATHS` - Comma-separated file paths
- `$CLAUDE_PROJECT_DIR` - Project root
- `$CLAUDE_TOOL_OUTPUT` - Tool output (PostToolUse)
- `$CLAUDE_NOTIFICATION` - Notification content
- `$CLAUDE_ENV_FILE` - Environment persistence file
- `$CLAUDE_CODE_REMOTE` - Remote vs local indicator
- `${CLAUDE_PLUGIN_ROOT}` - Plugin directory

#### OpenCode

**Limited context via input parameters**:

```typescript
const filePath = input.parameters?.file_path
const command = input.parameters?.command
const content = input.parameters?.content

// Or use Node.js built-ins
const projectDir = process.cwd()
const homeDir = os.homedir()
```

**Available data**:
- `input.tool` - Tool name
- `input.parameters` - Tool parameters
- `output` - Tool output (after hooks only)
- Process environment variables (less specific)

**Winner**: 🏆 **Claude Code** - More context-specific environment variables

---

### 5. Error Handling & Blocking

#### Claude Code

```python
# Block execution
sys.exit(2)  # Exit code 2 blocks

# Allow with modifications
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

**Pros**: Clear exit codes
**Cons**: Verbose JSON structure

#### OpenCode

```typescript
// Block execution
throw new Error('Blocked: reason here')

// Allow with modifications
return {
  ...input,
  parameters: { ...input.parameters, command: newCommand }
}
```

**Pros**: Cleaner syntax, exceptions are idiomatic
**Cons**: Less explicit about "blocking" intent

**Winner**: Tie - Both work well, different styles

---

### 6. Performance

#### Claude Code

- **Process overhead**: New process spawned per hook execution
- **JSON serialization**: Parse input, stringify output
- **Cold start**: Interpreter startup time
- **Parallel hooks**: Run independently (can parallelize)

**Estimated overhead**: ~50-200ms per hook call (Python)

#### OpenCode

- **In-process**: Runs within OpenCode process
- **Native objects**: No serialization overhead
- **Hot reload**: Possible (implementation-dependent)
- **Shared state**: Can maintain state across calls

**Estimated overhead**: <10ms per hook call

**Winner**: 🏆 **OpenCode** - Significantly faster execution

---

### 7. Testing & Debugging

#### Claude Code

**Testing**:
```python
# pytest
def test_hook():
    input_json = '{"tool_name": "Bash", "tool_input": {"command": "grep test"}}'
    result = subprocess.run(['./hook.py'], input=input_json, capture_output=True)
    assert result.returncode == 0
```

**Debugging**:
- Print statements
- Log files
- Run hook script manually with test input

**Pros**: Standard Python tooling
**Cons**: Process isolation makes debugging harder

#### OpenCode

**Testing**:
```typescript
// Jest/Vitest
import { GrepToRgPlugin } from './grep-to-rg'

test('transforms grep to rg', async () => {
  const plugin = await GrepToRgPlugin()
  const result = await plugin.tool.execute.before({
    tool: 'Bash',
    parameters: { command: 'grep "test"' }
  })
  expect(result.parameters.command).toBe('rg "test"')
})
```

**Debugging**:
- TypeScript debugger (VS Code)
- console.log with source maps
- Hot reload (possibly)

**Pros**: Better IDE integration, type checking catches bugs early
**Cons**: Requires TypeScript tooling

**Winner**: 🏆 **OpenCode** - Superior development experience

---

### 8. Community & Ecosystem

#### Claude Code

- ✅ Mature ecosystem (launched first)
- ✅ More example hooks available
- ✅ Official documentation
- ✅ Active community (GitHub, Reddit)
- ✅ 50+ community hooks cataloged

**Resources**:
- [Official docs](https://docs.claude.com/en/docs/claude-code)
- [Community GitHub repos](https://github.com/search?q=claude+code+hooks)
- See `claude-code-hooks-research.md` for 20+ examples

#### OpenCode

- ⚠️ Newer system
- ⚠️ Fewer examples available
- ⚠️ Growing community
- ✅ Modern architecture
- ✅ Potential for rapid growth

**Winner**: 🏆 **Claude Code** (for now) - More established ecosystem

---

### 9. Installation & Deployment

#### Claude Code

```bash
# 1. Copy hooks to ~/.claude/hooks/
cp -r hooks/* ~/.claude/hooks/

# 2. Update ~/.claude/settings.json
{
  "hooks": {
    "PreToolUse": [{
      "hooks": [{
        "name": "grep-to-rg",
        "type": "command",
        "command": "/path/to/hook.py"
      }]
    }]
  }
}

# 3. Make executable
chmod +x ~/.claude/hooks/*.py
```

**Pros**: Simple file copy
**Cons**: Manual JSON editing (unless using deploy script)

#### OpenCode

```bash
# 1. Install dependencies
npm install

# 2. Register in opencode.json
{
  "plugins": [
    "./opencode/plugins/grep-to-rg.ts"
  ]
}
```

**Pros**: npm handles dependencies
**Cons**: Requires Node.js setup

**Winner**: Tie - Both have pros/cons

---

### 10. File Operations

#### Claude Code

```python
import os
import shutil

# Read file
with open(file_path, 'r') as f:
    content = f.read()

# Write file
with open(file_path, 'w') as f:
    f.write(content)

# Copy file
shutil.copy(src, dst)

# Delete file
os.remove(file_path)
```

#### OpenCode

```typescript
import * as fs from 'fs/promises'
import * as path from 'path'

// Read file
const content = await fs.readFile(filePath, 'utf-8')

// Write file
await fs.writeFile(filePath, content)

// Copy file
await fs.copyFile(src, dst)

// Delete file
await fs.unlink(filePath)
```

**Winner**: Tie - Both have good file system APIs

---

## Use Case Recommendations

### Choose Claude Code Hooks If:

- ✅ You need SubagentStop, PreCompact, or UserPromptSubmit events
- ✅ You prefer Python or Shell scripting
- ✅ You want to use existing Python tools/libraries
- ✅ You need the rich environment variables
- ✅ You want to prototype quickly without TypeScript setup
- ✅ You're already using Claude Code extensively

### Choose OpenCode Plugins If:

- ✅ You're a TypeScript/JavaScript developer
- ✅ You want better type safety and IDE support
- ✅ Performance is critical (low latency)
- ✅ You prefer modern async/await syntax
- ✅ You want in-process execution
- ✅ You're building a complex plugin with shared state
- ✅ You want to use npm packages easily

### Use Both If:

- ✅ You want maximum compatibility across AI assistants
- ✅ You have different hooks suited to different systems
- ✅ You're migrating gradually from one to the other
- ✅ You want to compare performance/behavior

---

## Feature Parity Matrix

| Feature | Claude Code | OpenCode | Notes |
|---------|-------------|----------|-------|
| Command transformation (PreToolUse) | ✅ | ✅ | Full parity |
| Post-processing (PostToolUse) | ✅ | ✅ | Full parity |
| Auto-formatters | ✅ | ✅ | Full parity |
| Commit validation | ✅ | ✅ | Full parity |
| Session start context | ✅ | ⚠️ | Limited context in OpenCode |
| Session end analytics | ✅ | ⚠️ | Different data available |
| Subagent tracking | ✅ | ❌ | Claude Code only |
| PreCompact hooks | ✅ | ❌ | Claude Code only |
| Prompt preprocessing | ✅ | ❌? | Unclear if OpenCode supports |
| rm -rf protection | ✅ | ✅ | Full parity |
| UV enforcement | ✅ | ✅ | Full parity |
| Smart TODO extraction | ✅ | ✅ | Full parity |
| Screenshot capture | ✅ | ✅ | Full parity |
| NPM vulnerability check | ✅ | ✅ | Full parity |

**Parity Score**: ~80% - Most features can be migrated

---

## Performance Benchmarks

### Hook Execution Time (Estimated)

| Operation | Claude Code | OpenCode | Difference |
|-----------|-------------|----------|----------|
| Command transformation | ~100ms | ~5ms | 20x faster |
| File formatting | ~200ms | ~150ms | ~1.3x faster |
| Git validation | ~80ms | ~10ms | 8x faster |
| Database logging | ~150ms | ~20ms | 7.5x faster |

*Note: Benchmarks are estimates and vary by system*

**Winner**: 🏆 **OpenCode** - Significantly lower latency

---

## Security Considerations

### Claude Code

- ✅ Sandboxed process per hook
- ✅ Can't access OpenCode internal state
- ⚠️ Arbitrary code execution (any language)
- ⚠️ File system access (same as user)

### OpenCode

- ⚠️ Runs in-process (shares memory)
- ⚠️ Can potentially access OpenCode internals
- ✅ TypeScript type safety reduces bugs
- ⚠️ npm supply chain risk

**Winner**: Tie - Different security models, both have risks

---

## Migration Difficulty by Hook Type

| Hook Type | Difficulty | Time Estimate |
|-----------|-----------|---------------|
| Command transformation | ✅ Easy | 15-30 min |
| File formatting | ✅ Easy | 20-40 min |
| Git hooks | ✅ Easy | 20-40 min |
| Session tracking | ⚠️ Medium | 1-2 hours |
| Analytics/DB logging | ⚠️ Medium | 1-2 hours |
| SubagentStop hooks | ❌ Hard | Not possible |
| Complex multi-step | ⚠️ Medium-Hard | 2-4 hours |

---

## Conclusion

### Overall Winner: Depends on Your Needs

- **For rapid prototyping & rich events**: 🏆 Claude Code
- **For modern development & performance**: 🏆 OpenCode
- **For maximum compatibility**: ✅ Use both!

### Bottom Line

Both systems are powerful. Choose based on:
1. **Your language preference** (Python/Shell vs TypeScript)
2. **Required lifecycle events** (need SubagentStop? → Claude Code)
3. **Development workflow** (type safety? → OpenCode)
4. **Performance needs** (latency-critical? → OpenCode)

### Can I Use Both?

**Yes!** This repository is designed for dual-support:
- Claude Code hooks in `claude-code/`
- OpenCode plugins in `opencode/`
- Git hooks in `ClaudeUsage/pre_commit_hooks/` (work with both)

Use whichever system fits each specific automation task.

---

## Resources

- **Migration Guide**: [migration-guide.md](./migration-guide.md)
- **Migration Analysis**: [../MIGRATION_ANALYSIS.md](../MIGRATION_ANALYSIS.md)
- **Claude Code Hooks**: [../claude-code/README.md](../claude-code/README.md)
- **OpenCode Plugins**: [../opencode/README.md](../opencode/README.md)

---

*Comparison last updated: 2025-11-14*
*Choose wisely, code happy! 🚀*
