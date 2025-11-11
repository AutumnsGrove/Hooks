# Hooks - Claude Code Hook Collection

A curated collection of hooks and associated tools designed for Claude Code. Enhance your development workflow with event-driven automation, code quality checks, and security scanning.

## What This Is

**Claude Code Hooks** are shell commands that execute in response to events like tool calls, user prompts, and other actions within Claude Code. This repository provides a collection of useful hooks and the tools they depend on, making it easy to sync and reuse across different development machines.

**What's included:**
- Claude Code event hooks (tool call hooks, prompt hooks, etc.)
- Git pre-commit hooks for code quality and security
- Security scanners and code formatters
- Multi-language support (Python, JavaScript, Go, Shell)

## 🚀 Quick Start

### Installation

1. **Clone this repository:**
   ```bash
   git clone https://github.com/AutumnsGrove/Hooks.git ~/Projects/Hooks
   ```

2. **Install git hooks (optional but recommended):**
   ```bash
   cd ~/Projects/Hooks
   ./ClaudeUsage/pre_commit_hooks/install_hooks.sh
   ```

3. **Configure Claude Code hooks:**
   - Copy desired hooks from this repository to your Claude Code settings
   - Hooks are configured in your Claude Code user settings file
   - See [Claude Code documentation](https://docs.claude.com/en/docs/claude-code) for configuration details

### Using Across Machines

Since this is a git repository, you can easily sync hooks across machines:

```bash
# On a new machine
cd ~/Projects/Hooks
git pull origin main

# Copy/link hooks to your projects as needed
```

---

## 📁 What's Included

```
Hooks/
├── CLAUDE.md                   # Project instructions
├── ClaudeUsage/                # Comprehensive workflow guides
│   ├── pre_commit_hooks/       # Git hooks for code quality & security
│   │   ├── install_hooks.sh    # Interactive installer (auto-detects language)
│   │   ├── pre-commit-secrets-scanner  # Prevents API key leaks
│   │   ├── pre-commit-python   # Black, Ruff, pytest
│   │   ├── pre-commit-javascript  # Prettier, ESLint
│   │   ├── pre-commit-go       # gofmt, golangci-lint
│   │   ├── pre-push            # Run tests before push
│   │   ├── post-checkout       # Auto-update deps on branch switch
│   │   └── ... (8 total hooks)
│   ├── git_guide.md            # Git workflow and conventional commits
│   ├── secrets_management.md  # API key handling
│   └── ... (18 total guides)
└── src/                        # Custom hook implementations
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

### Claude Code Hooks

*Coming soon - examples of Claude Code event hooks:*
- Tool call validation hooks
- User prompt preprocessing hooks
- Response post-processing hooks
- Custom automation triggers

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

### Configuring Claude Code Hooks

Edit your Claude Code settings to add hooks:

```json
{
  "hooks": {
    "user-prompt-submit": "~/Projects/Hooks/src/validate_prompt.sh",
    "tool-call-before": "~/Projects/Hooks/src/log_tool_call.sh"
  }
}
```

See Claude Code documentation for available hook events and configuration.

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
