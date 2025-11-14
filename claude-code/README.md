# Claude Code Hooks

This directory contains hooks for [Claude Code](https://claude.ai/code), Anthropic's official CLI for Claude.

## What are Claude Code Hooks?

Claude Code hooks are scripts that run in response to specific events during a Claude Code session, such as:
- **PreToolUse**: Before a tool executes (can block)
- **PostToolUse**: After a tool completes successfully
- **SessionStart**: When a session begins
- **SessionEnd**: When a session ends
- **SubagentStop**: When a subagent completes
- And more...

## Directory Structure

```
claude-code/
├── hooks/              # Hook scripts
│   ├── grep-to-rg.py   # Convert grep → rg for performance
│   └── ...
├── deploy_hooks.py     # Deployment script
├── deploy.sh           # Quick deployment wrapper
└── README.md           # This file
```

## Installation

### Quick Install

```bash
cd claude-code/
./deploy.sh
```

This will:
1. Copy hooks to `~/.claude/hooks/`
2. Update `~/.claude/settings.json` with hook configurations
3. Make hooks executable

### Manual Install

```bash
# Copy hooks to Claude directory
cp -r hooks/* ~/.claude/hooks/

# Update settings.json manually (see Configuration section)
```

## Available Hooks

### grep-to-rg (PreToolUse)
**Purpose**: Automatically converts `grep` commands to `ripgrep` (rg) for better performance

**How it works**:
- Intercepts Bash tool calls
- Detects `grep` in commands
- Rewrites to use `rg` instead
- Faster searches with better defaults

**Example**:
```bash
# Claude tries to run:
grep "function" src/*.py

# Hook automatically converts to:
rg "function" src/*.py
```

**Requirements**: Install ripgrep (`brew install ripgrep` or `apt install ripgrep`)

## Configuration

Hooks are configured in `~/.claude/settings.json`:

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
          }
        ]
      }
    ]
  }
}
```

## Creating Custom Hooks

### 1. Choose an Event Type

```python
# CLAUDE_HOOK_EVENT: PreToolUse
```

Add this comment at the top of your hook script. Supported events:
- `PreToolUse` - Before tool execution (can block with exit code 2)
- `PostToolUse` - After tool completes
- `UserPromptSubmit` - Before Claude processes user prompt
- `SessionStart` - Session begins
- `SessionEnd` - Session ends
- `SubagentStop` - Subagent completes
- `Stop` - Main agent finishes
- `PreCompact` - Before transcript compaction
- `Notification` - Claude sends notification

### 2. Read Input from stdin

```python
#!/usr/bin/env python3
import json
import sys

# Read hook input
input_data = json.load(sys.stdin)

# Access tool information
tool_name = input_data.get("tool_name")  # "Bash", "Edit", "Write", etc.
tool_input = input_data.get("tool_input", {})
```

### 3. Process and Respond

**For PreToolUse (to modify input)**:
```python
output = {
    "hookSpecificOutput": {
        "hookEventName": "PreToolUse",
        "permissionDecision": "allow",  # or "deny" to block
        "updatedInput": {"command": new_command}
    }
}
print(json.dumps(output))
sys.exit(0)
```

**For PostToolUse (no modification)**:
```python
# Just do your processing
subprocess.run(["black", file_path])
sys.exit(0)
```

### 4. Deploy

```bash
cd claude-code/
./deploy.sh
```

## Environment Variables

Hooks receive context via environment variables:

- `$CLAUDE_FILE_PATHS` - File paths relevant to tool call
- `$CLAUDE_PROJECT_DIR` - Project root directory
- `$CLAUDE_TOOL_OUTPUT` - Tool execution output (PostToolUse only)
- `$CLAUDE_NOTIFICATION` - Notification message content
- `$CLAUDE_ENV_FILE` - Environment variable persistence file (SessionStart)

## Hook Ideas

See `../IDEAS.md` for 20+ hook ideas including:
- Auto-formatters (Black, Prettier, gofmt)
- Smart TODO extractor
- UV enforcement
- Conventional commit validator
- rm -rf protection
- Auto test runner
- Session analytics
- And more...

## Troubleshooting

### Hook not running
1. Check `~/.claude/settings.json` has correct path
2. Ensure hook is executable: `chmod +x ~/.claude/hooks/your-hook.py`
3. Check hook has correct event type in metadata
4. Test hook manually: `echo '{"tool_name":"Bash","tool_input":{"command":"grep test"}}' | python3 hook.py`

### Hook blocking tool execution
- Check hook exit code (0 = success, 2 = block, other = error)
- Review hook output for error messages
- Test hook logic independently

### Deployment fails
- Ensure `~/.claude/` directory exists
- Check file permissions
- Review `deploy_hooks.py` output for errors

## Resources

- [Claude Code Documentation](https://docs.claude.com/en/docs/claude-code)
- [Community Hooks Research](../docs/claude-code-hooks-research.md)
- [Migration to OpenCode](../docs/migration-guide.md)
- [Comparison: Claude Code vs OpenCode](../docs/comparison.md)

## Contributing

To add a new hook:
1. Create hook script in `hooks/` directory
2. Add metadata comment: `# CLAUDE_HOOK_EVENT: EventType`
3. Test locally
4. Update this README with hook documentation
5. Submit PR

## Related

- **OpenCode Plugins**: See `../opencode/` for OpenCode plugin equivalents
- **Git Hooks**: See `../ClaudeUsage/pre_commit_hooks/` for traditional git hooks
- **Documentation**: See `../docs/` for migration guides and comparisons

---

*Last updated: 2025-11-14*
