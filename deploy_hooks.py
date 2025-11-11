#!/usr/bin/env python3
"""
Deploy hooks from this project to ~/.claude directory.
Updates settings.json to register the hooks.
"""
import json
import shutil
import sys
from pathlib import Path

# Paths
PROJECT_ROOT = Path(__file__).parent
HOOKS_SOURCE = PROJECT_ROOT / "src" / "hooks"
CLAUDE_DIR = Path.home() / ".claude"
CLAUDE_HOOKS_DIR = CLAUDE_DIR / "hooks"
CLAUDE_SETTINGS = CLAUDE_DIR / "settings.json"


def ensure_claude_dirs():
    """Ensure ~/.claude and ~/.claude/hooks directories exist."""
    CLAUDE_DIR.mkdir(exist_ok=True)
    CLAUDE_HOOKS_DIR.mkdir(exist_ok=True)
    print(f"✓ Claude directories ready: {CLAUDE_DIR}")


def get_hook_files():
    """Get all hook files from src/hooks/, excluding __init__.py."""
    if not HOOKS_SOURCE.exists():
        print(f"✗ Source hooks directory not found: {HOOKS_SOURCE}")
        return []

    hooks = []
    for file in HOOKS_SOURCE.iterdir():
        if file.is_file() and file.name != "__init__.py":
            hooks.append(file)

    return hooks


def copy_hooks(hooks):
    """Copy hook files to ~/.claude/hooks/."""
    if not hooks:
        print("✗ No hooks found to deploy")
        return []

    deployed = []
    for hook_file in hooks:
        dest = CLAUDE_HOOKS_DIR / hook_file.name
        shutil.copy2(hook_file, dest)

        # Make executable if it's a script
        if hook_file.suffix in [".py", ".sh"]:
            dest.chmod(0o755)

        deployed.append(dest)
        print(f"✓ Deployed: {hook_file.name} -> {dest}")

    return deployed


def load_settings():
    """Load existing settings.json or create a new one."""
    if CLAUDE_SETTINGS.exists():
        with open(CLAUDE_SETTINGS, "r") as f:
            return json.load(f)
    else:
        return {}


def update_settings(deployed_hooks):
    """Update settings.json with hook configurations."""
    settings = load_settings()

    # Initialize hooks section if it doesn't exist
    if "hooks" not in settings:
        settings["hooks"] = {}

    # Map hook files to their appropriate event types
    hook_configs = {}

    for hook_path in deployed_hooks:
        hook_name = hook_path.stem  # filename without extension

        # Determine hook type from filename or content
        if "pre-tool" in hook_name.lower() or "grep-to-rg" in hook_name.lower():
            event_type = "PreToolUse"
        elif "post-tool" in hook_name.lower():
            event_type = "PostToolUse"
        elif "prompt" in hook_name.lower():
            event_type = "UserPromptSubmit"
        else:
            # Default to PreToolUse for safety
            event_type = "PreToolUse"

        # Register the hook
        if event_type not in hook_configs:
            hook_configs[event_type] = []

        hook_configs[event_type].append(
            {"name": hook_name, "type": "command", "command": str(hook_path)}
        )

    # Update settings with new hooks, matching existing format
    for event_type, new_hooks in hook_configs.items():
        if event_type not in settings["hooks"]:
            # Initialize with the nested structure
            settings["hooks"][event_type] = [{"hooks": []}]

        # Get the hooks array (handle existing format)
        if not settings["hooks"][event_type]:
            settings["hooks"][event_type] = [{"hooks": []}]

        hooks_array = settings["hooks"][event_type][0].get("hooks", [])

        # Remove existing entries for these hooks (to avoid duplicates)
        existing_commands = {h["command"] for h in new_hooks}
        hooks_array = [
            h for h in hooks_array if h.get("command") not in existing_commands
        ]

        # Add new hooks
        hooks_array.extend(new_hooks)

        # Update settings structure
        settings["hooks"][event_type][0]["hooks"] = hooks_array

    # Save updated settings
    with open(CLAUDE_SETTINGS, "w") as f:
        json.dump(settings, f, indent=2)

    print(f"✓ Updated settings: {CLAUDE_SETTINGS}")
    return settings


def display_summary(settings):
    """Display a summary of registered hooks."""
    print("\n" + "=" * 60)
    print("DEPLOYED HOOKS SUMMARY")
    print("=" * 60)

    if "hooks" in settings:
        for event_type, hook_groups in settings["hooks"].items():
            print(f"\n{event_type}:")
            for group in hook_groups:
                hooks = group.get("hooks", [])
                for hook in hooks:
                    name = hook.get("name", "unnamed")
                    command = hook.get("command", "")
                    # Only show hooks from ~/.claude/hooks (our deployed ones)
                    if "/.claude/hooks/" in command:
                        print(f"  • {name}")
                        print(f"    {command}")
    else:
        print("No hooks configured")

    print("\n" + "=" * 60)


def main():
    """Main deployment process."""
    print("=" * 60)
    print("CLAUDE CODE HOOKS DEPLOYMENT")
    print("=" * 60 + "\n")

    # Step 1: Ensure directories exist
    ensure_claude_dirs()

    # Step 2: Get hook files from project
    hooks = get_hook_files()
    print(f"\nFound {len(hooks)} hook(s) to deploy")

    if not hooks:
        print("\n✗ No hooks to deploy. Exiting.")
        sys.exit(1)

    # Step 3: Copy hooks to ~/.claude/hooks/
    print("\nDeploying hooks...")
    deployed = copy_hooks(hooks)

    # Step 4: Update settings.json
    print("\nUpdating settings.json...")
    settings = update_settings(deployed)

    # Step 5: Display summary
    display_summary(settings)

    print("\n✓ Deployment complete!")
    print("\nRestart Claude Code to activate the hooks.")


if __name__ == "__main__":
    main()
