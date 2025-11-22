#!/usr/bin/env python3
# CLAUDE_HOOK_EVENT: PreToolUse
"""Hook to automatically convert npm commands to pnpm for better performance and disk efficiency."""
import json
import sys
import re

# Read hook input
input_data = json.load(sys.stdin)

# Only process Bash commands
if input_data.get("tool_name") != "Bash":
    sys.exit(0)

# Get the command
tool_input = input_data.get("tool_input", {})
command = tool_input.get("command", "")

# Check if command contains npm (as a standalone command)
if not re.search(r'\bnpm\b', command):
    sys.exit(0)

# Convert npm commands to pnpm equivalents
new_command = command

# Handle special cases first (order matters!)
# npm install <package> -> pnpm add <package>
new_command = re.sub(r'\bnpm\s+install\s+(?!$)(?!-)', 'pnpm add ', new_command)
new_command = re.sub(r'\bnpm\s+i\s+(?!$)(?!-)', 'pnpm add ', new_command)

# npm install -g <package> -> pnpm add -g <package>
new_command = re.sub(r'\bnpm\s+install\s+-g\b', 'pnpm add -g', new_command)
new_command = re.sub(r'\bnpm\s+i\s+-g\b', 'pnpm add -g', new_command)

# npm uninstall -> pnpm remove
new_command = re.sub(r'\bnpm\s+uninstall\b', 'pnpm remove', new_command)
new_command = re.sub(r'\bnpm\s+un\b', 'pnpm remove', new_command)

# npm install (no args) -> pnpm install
new_command = re.sub(r'\bnpm\s+install\s*$', 'pnpm install', new_command)
new_command = re.sub(r'\bnpm\s+i\s*$', 'pnpm install', new_command)

# All other npm commands -> pnpm (run, test, start, build, etc.)
new_command = re.sub(r'\bnpm\b', 'pnpm', new_command)

# Output the modified command
output = {
    "hookSpecificOutput": {
        "hookEventName": "PreToolUse",
        "permissionDecision": "allow",
        "updatedInput": {"command": new_command},
    }
}
print(json.dumps(output))
sys.exit(0)
