# Hooks - AI Coding Assistant Hooks & Plugins

A comprehensive collection of hooks and plugins for **Claude Code** and **OpenCode**, plus traditional git hooks for code quality and security. Enhance your development workflow with event-driven automation across multiple AI coding assistants.

## What This Is

This repository provides **dual-support** for both Claude Code hooks and OpenCode plugins, allowing you to use the same automation concepts with either AI coding assistant.

**📦 What's included:**
- **Claude Code Hooks** - Event-driven scripts for Claude Code (PreToolUse, PostToolUse, etc.)
- **OpenCode Plugins** - TypeScript plugins for OpenCode (migrated equivalents)
- **Git Hooks** - Traditional pre-commit hooks for code quality and security (work with any workflow)
- **Multi-language support** - Python, JavaScript, TypeScript, Go, Shell

## 🎯 Choose Your System

### Claude Code Hooks
- ✅ Python, Shell, or JavaScript hooks
- ✅ More lifecycle events (SubagentStop, PreCompact)
- ✅ Rich environment variables
- ✅ Mature ecosystem
- 📖 See: [`claude-code/README.md`](./claude-code/README.md)

### OpenCode Plugins
- ✅ TypeScript/JavaScript plugins
- ✅ Native async/await
- ✅ Built-in zx for shell commands
- ✅ Familiar to web developers
- 📖 See: [`opencode/README.md`](./opencode/README.md)

### Migration Between Systems
- 📊 **Migration Analysis**: [`MIGRATION_ANALYSIS.md`](./MIGRATION_ANALYSIS.md)
- 📖 **Migration Guide**: [`docs/migration-guide.md`](./docs/migration-guide.md)
- ⚖️ **Comparison**: [`docs/comparison.md`](./docs/comparison.md)

## 🚀 Quick Start

### 1. Clone Repository

```bash
git clone https://github.com/AutumnsGrove/Hooks.git ~/Projects/Hooks
cd ~/Projects/Hooks
```

### 2. Choose Your System(s)

#### Option A: Claude Code Hooks

```bash
cd claude-code/
./deploy.sh
```

This automatically:
- Copies hooks from `claude-code/hooks/` to `~/.claude/hooks/`
- Updates `~/.claude/settings.json` to register them
- Preserves your existing hooks and settings

**📖 Full guide**: [`claude-code/README.md`](./claude-code/README.md)

#### Option B: OpenCode Plugins

```bash
cd opencode/
npm install

# Configure in your project's opencode.json
{
  "plugins": [
    "path/to/Hooks/opencode/plugins/grep-to-rg.ts"
  ]
}
```

**📖 Full guide**: [`opencode/README.md`](./opencode/README.md)

#### Option C: Git Hooks (Optional, Works with Both)

```bash
./ClaudeUsage/pre_commit_hooks/install_hooks.sh
```

Installs traditional git hooks for code quality and security.

### 3. Sync Across Machines

Since this is a git repository, easily sync hooks across machines:

```bash
# On a new machine
cd ~/Projects/Hooks
git pull origin main
cd claude-code/ && ./deploy.sh  # For Claude Code
# or
cd opencode/ && npm install      # For OpenCode
```

---

## 📁 Repository Structure

```
Hooks/
├── claude-code/                # Claude Code hooks
│   ├── hooks/                  # Hook scripts (Python, Shell)
│   │   └── grep-to-rg.py       # Convert grep → rg
│   ├── deploy_hooks.py         # Deployment script
│   ├── deploy.sh               # Quick deploy wrapper
│   └── README.md               # Claude Code setup guide
│
├── opencode/                   # OpenCode plugins
│   ├── plugins/                # Plugin implementations (TypeScript)
│   │   ├── grep-to-rg.ts       # Convert grep → rg
│   │   └── ... (coming soon)
│   ├── package.json            # Dependencies
│   ├── tsconfig.json           # TypeScript config
│   └── README.md               # OpenCode setup guide
│
├── docs/                       # Migration & comparison docs
│   ├── migration-guide.md      # How to migrate hooks to plugins
│   ├── comparison.md           # Claude Code vs OpenCode
│   └── claude-code-hooks-research.md  # Community research
│
├── ClaudeUsage/                # Guides & git hooks
│   ├── pre_commit_hooks/       # Traditional git hooks
│   │   ├── install_hooks.sh    # Interactive installer
│   │   ├── pre-commit-secrets-scanner  # Prevents API key leaks
│   │   ├── pre-commit-python   # Black, Ruff, pytest
│   │   ├── pre-commit-javascript  # Prettier, ESLint
│   │   └── ... (11 total hooks)
│   └── ... (18 workflow guides)
│
├── MIGRATION_ANALYSIS.md       # Migration feasibility analysis
├── IDEAS.md                    # 20+ hook/plugin ideas
├── CLAUDE.md                   # Project instructions
└── README.md                   # This file
```

---

## 🎯 Available Hooks

### Git Hooks

**Pre-commit hooks:**
- `pre-commit-secrets-scanner` - Prevents committing API keys (15+ patterns: Anthropic, OpenAI, AWS, GitHub, etc.)
- `pre-commit-python` - Black formatter, Ruff linter, pytest
- `pre-commit-javascript` - Prettier, ESLint
- `pre-commit-go` - gofmt, golangci-lint
- `pre-commit-multi-language` - Auto-detects project type

**Other git hooks:**
- `pre-push` - Runs test suite before pushing
- `post-checkout` - Auto-updates dependencies on branch switch
- `commit-msg` - Validates conventional commit format
- `prepare-commit-msg` - Adds templates to commit messages

### Claude Code Hooks & OpenCode Plugins

**Currently available:**

| Hook/Plugin | Claude Code | OpenCode | Purpose |
|-------------|-------------|----------|---------|
| **grep-to-rg** | ✅ | ✅ | Convert grep → rg for performance |
| **uv-enforcer** | ✅ | ✅ | Enforce UV package manager usage |
| **auto-formatter** | ✅ | ✅ | Auto-format code (Black, Prettier, gofmt, rustfmt) |
| **conventional-commit-validator** | ✅ | ✅ | Enforce commit message format |
| **command-tracker** | ✅ | ✅ | Log all tool calls to SQLite database |
| **session-tracker** | ✅ | ✅ | Capture session analytics (duration, tools, files) |
| **subagent-tracker** | ✅ | ❌ | Track subagent completions (Claude Code only) |
| **todo-extractor** | ✅ | ✅ | Extract TODOs with priority detection |
| **rm-protection** | ✅ | ✅ | Move files to trash instead of deleting |
| **test-runner** | ✅ | ✅ | Auto-run tests when test files change |

**Total**: 10 hooks implemented (9 available in both systems)

**Still planned** (see [`IDEAS.md`](./IDEAS.md) for details):
- Live website screenshot optimizer
- NPM vulnerability checker
- Smart PR creator
- Session end TTS notifications
- And 10+ more...

See [`MIGRATION_ANALYSIS.md`](./MIGRATION_ANALYSIS.md) for full migration status.

---

## 🔐 Security Features

This collection includes security best practices:

- ✅ **Pre-commit secrets scanner** - Detects 15+ secret patterns before commit:
  - Anthropic, OpenAI, AWS, GitHub, Google API keys
  - JWT tokens, bearer tokens, private keys
  - Hardcoded passwords and database credentials
  - Provides actionable fix instructions when secrets detected

- ✅ Comprehensive `.gitignore` patterns
- ✅ Security audit guides

---

## 🛠️ Usage

### Installing Git Hooks in Your Projects

```bash
# Interactive installer (auto-detects your language)
cd ~/Projects/YourProject
~/Projects/Hooks/ClaudeUsage/pre_commit_hooks/install_hooks.sh

# This installs:
# - Code quality checks (formatters + linters)
# - Security scanner (prevents API key leaks)
# - Test runner (blocks push if tests fail)
# - Dependency auto-updater
```

### Developing and Deploying Claude Code Hooks

**1. Create a new hook:**
```bash
# Add your hook to claude-code/hooks/
cd ~/Projects/Hooks
# Create your hook file (Python, Shell, etc.)
# Example: src/hooks/my-custom-hook.py
```

**2. Deploy to Claude Code:**
```bash
./deploy.sh
# Or use Python directly:
uv run python deploy_hooks.py
```

**3. Restart Claude Code** to activate the hooks

**Hook event type detection:**

The deployment script detects hook types using two methods:

1. **Metadata in file** (recommended):
   ```python
   #!/usr/bin/env python3
   # CLAUDE_HOOK_EVENT: PreToolUse
   ```

2. **Filename conventions** (fallback):
   - `*pre-tool*` or `*pretool*` → PreToolUse
   - `*post-tool*` or `*posttool*` → PostToolUse
   - `*prompt*` or `*user-prompt*` → UserPromptSubmit
   - `*session-start*` → SessionStart
   - `*session-end*` → SessionEnd
   - `*subagent-stop*` → SubagentStop

The deployment script automatically:
- Auto-detects hook event types
- Copies hooks to `~/.claude/hooks/`
- Updates `~/.claude/settings.json`
- Makes hooks executable
- Preserves existing hooks and settings

See [Claude Code documentation](https://docs.claude.com/en/docs/claude-code) for hook API details.

---

## 📚 Documentation

All guides in `ClaudeUsage/` directory:

- [git_guide.md](ClaudeUsage/git_guide.md) - Git workflow and conventional commits
- [pre_commit_hooks/setup_guide.md](ClaudeUsage/pre_commit_hooks/setup_guide.md) - Hook installation and customization
- [pre_commit_hooks/TROUBLESHOOTING.md](ClaudeUsage/pre_commit_hooks/TROUBLESHOOTING.md) - Common issues and solutions
- [secrets_management.md](ClaudeUsage/secrets_management.md) - API key security
- See [ClaudeUsage/README.md](ClaudeUsage/README.md) for complete index

---

## 🤝 Contributing

Found a useful hook? Want to share your automation?

1. Fork this repository
2. Add your hook to the appropriate directory
3. Update documentation
4. Submit a pull request

Follow conventional commit format:
```bash
feat: add pre-commit hook for Rust projects
fix: correct Python hook detection logic
docs: update installation instructions
```

---

## 🆘 Troubleshooting

### "Pre-commit hooks not working"
```bash
chmod +x ~/Projects/Hooks/ClaudeUsage/pre_commit_hooks/*
~/Projects/Hooks/ClaudeUsage/pre_commit_hooks/install_hooks.sh
```

### "Hook not found"
Make sure you've pulled the latest changes:
```bash
cd ~/Projects/Hooks
git pull origin main
```

See [ClaudeUsage/pre_commit_hooks/TROUBLESHOOTING.md](ClaudeUsage/pre_commit_hooks/TROUBLESHOOTING.md) for comprehensive troubleshooting.

---

## 📝 License

This collection is provided as-is for use with Claude Code. Customize freely for your projects.

---

**Last updated:** 2025-11-11
**Compatible with:** Claude Code CLI
**Hook types:** Git hooks, Claude Code event hooks
