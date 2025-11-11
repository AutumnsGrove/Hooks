#!/usr/bin/env python3
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
