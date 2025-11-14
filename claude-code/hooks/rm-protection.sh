#!/bin/bash
# CLAUDE_HOOK_EVENT: PreToolUse
#
# rm -rf Protection Hook - Move files to trash instead of permanent deletion
#
# Intercepts rm -rf commands and replaces with trash command for safety.
# Creates audit log of all deleted files for recovery tracking.
#
# Requirements:
# - trash-cli (Linux): sudo apt install trash-cli
# - trash (macOS): brew install trash
#
# Benefits:
# - Safety net for accidental deletions
# - Non-blocking (doesn't break workflow)
# - Audit trail of what was deleted and when
# - Easy recovery from trash

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

# Check if this is an rm -rf command
if ! echo "$COMMAND" | grep -qE 'rm\s+(-[rf]+|.*-[rf]+)'; then
    exit 0
fi

# Extract target paths from rm command
# This is a simple parser - handles basic cases
TARGETS=$(echo "$COMMAND" | sed -E 's/.*rm\s+(-[rf]+\s+|.*-[rf]+\s+)//' | sed 's/;.*//')

# Determine which trash command is available
TRASH_CMD=""
if command -v trash-put &> /dev/null; then
    TRASH_CMD="trash-put"
elif command -v trash &> /dev/null; then
    TRASH_CMD="trash"
else
    # No trash command available - warn but allow original command
    echo "[rm-protection] ⚠️  Warning: trash command not installed" >&2
    echo "[rm-protection] Install: 'brew install trash' or 'apt install trash-cli'" >&2
    exit 0
fi

# Replace rm -rf with trash command
NEW_COMMAND="$TRASH_CMD $TARGETS"

# Create audit log directory
AUDIT_LOG="$HOME/.claude/trash_audit.log"
mkdir -p "$(dirname "$AUDIT_LOG")"

# Log the operation
TIMESTAMP=$(date -Iseconds)
echo "$TIMESTAMP | $TARGETS | rm -rf protection | original: $COMMAND" >> "$AUDIT_LOG"

# Return modified command
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

echo "[rm-protection] ✓ Moved to trash instead of deleting: $TARGETS" >&2
echo "[rm-protection] Audit log: $AUDIT_LOG" >&2

exit 0
