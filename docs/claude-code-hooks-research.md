# Claude Code Hooks - Community Research

> Research conducted: 2025-11-11
> Sources: Reddit, GitHub, developer blogs, official documentation

## Executive Summary

This document catalogs Claude Code hooks discovered across the community ecosystem. Research covered 13+ GitHub repositories, official documentation, developer blogs, and community forums to identify creative and practical hook implementations.

**Already implemented in this project:**
- Audio notification hooks
- grep → ripgrep replacement hook

---

## Table of Contents

1. [Official Hook Types](#official-hook-types)
2. [Hooks by Category](#hooks-by-category)
3. [Implementation Patterns](#implementation-patterns)
4. [Notable Repositories](#notable-repositories)
5. [High-Priority Recommendations](#high-priority-recommendations)

---

## Official Hook Types

Claude Code supports 9 event types:

| Event | Trigger | Can Block? | Use Case |
|-------|---------|------------|----------|
| `PreToolUse` | Before tool execution | Yes (exit 2) | Validation, safety checks |
| `PostToolUse` | After successful completion | No | Formatting, tests, notifications |
| `UserPromptSubmit` | Before Claude processes prompt | Yes (exit 2) | Context injection, prompt validation |
| `Notification` | When Claude sends notifications | No | Alert routing, logging |
| `Stop` | Main agent finishes | No | Completion notifications, cleanup |
| `SubagentStop` | Subagent completes | No | Multi-agent orchestration |
| `PreCompact` | Before compaction | No | Transcript backup |
| `SessionStart` | New/resumed session | No | Environment setup, context loading |
| `SessionEnd` | Session terminates | No | Cleanup, auto-commits |

### Environment Variables

Hooks receive context via environment variables:

- `$CLAUDE_FILE_PATHS` - File paths relevant to tool call
- `$CLAUDE_PROJECT_DIR` - Project root directory
- `$CLAUDE_TOOL_OUTPUT` - Tool execution output (PostToolUse only)
- `$CLAUDE_NOTIFICATION` - Notification message content
- `$CLAUDE_ENV_FILE` - Environment variable persistence file (SessionStart)
- `$CLAUDE_CODE_REMOTE` - Remote vs local execution indicator
- `${CLAUDE_PLUGIN_ROOT}` - Plugin directory path

---

## Hooks by Category

### 1. Code Quality & Formatting

#### Auto-formatting Hooks
**Black/Ruff Python Formatter**
- Runs `black` and `ruff check --fix` on Python files after edits
- Event: PostToolUse on `Edit:*.py|Write:*.py`
- Sources: Multiple GitHub repos

**Prettier TypeScript/JavaScript**
- Auto-formats `.ts`, `.tsx`, `.js` files
- Event: PostToolUse
- Command: `prettier --write $CLAUDE_FILE_PATHS`

**Gofmt Go Formatter**
- Applies `gofmt` to Go files
- Event: PostToolUse on `Edit:*.go`

**Cargo Rust Formatter**
- Runs `cargo fmt` and `cargo clippy` reminders
- Event: PostToolUse

**ESLint Auto-Fix**
- JavaScript/TypeScript linting with automatic fixes
- Event: PostToolUse on `Edit:*.ts|Edit:*.tsx|Edit:*.js`
- Command: `eslint --fix $CLAUDE_FILE_PATHS`

#### Code Quality Validators
Source: [github.com/decider/claude-hooks](https://github.com/decider/claude-hooks)

**Function Length Checker**
- Enforces max 30-line functions
- Event: PreToolUse
- Exit code 2 blocks overly long functions

**File Size Validator**
- Limits files to 200 lines
- Event: PreToolUse on Write/Edit

**Line Length Enforcer**
- Maximum 100 characters per line
- Event: PreToolUse

**Nesting Depth Monitor**
- Prevents nesting beyond 4 levels
- Event: PreToolUse

**Code Complexity Analyzer**
- Detects overly complex functions (cyclomatic complexity)
- Event: PreToolUse

#### Type Checking

**TypeScript Type Checker**
- Runs `tsc --noEmit` after `.ts`/`.tsx` edits
- Event: PostToolUse
- Non-blocking warnings

**Python Type Hint Validator**
- Checks mypy compliance
- Event: PostToolUse on `Edit:*.py`

---

### 2. Testing & Validation

#### Automated Test Runners

**pytest Auto-Runner**
- Executes tests on Python file changes
- Event: PostToolUse on `Edit:test_*.py|Edit:*_test.py`
- Command: `pytest $CLAUDE_FILE_PATHS -v`

**Jest/Vitest Runner**
- Runs `npm test -- --related` for JS/TS test files
- Event: PostToolUse
- Smart test detection

**Go Test Runner**
- Executes `go test ./...` on Go changes
- Event: PostToolUse on `Edit:*.go`

**Cargo Test Runner**
- Runs Rust test suite on modifications
- Event: PostToolUse on `Edit:*.rs`
- Command: `cargo test`

#### Pre-commit Test Gates

**Test-Before-Commit Hook**
- Blocks commits unless tests pass
- Event: PreToolUse on `Bash:git commit*`
- Exit code 2 blocks failing commits
- Source: GitHub issue #4834

**Coverage Threshold Enforcer**
- Requires minimum code coverage (e.g., 80%)
- Event: PreToolUse on `Bash:git commit*`
- Integrates with pytest-cov, nyc

**Build Verification**
- Ensures project builds successfully
- Event: PreToolUse on git operations

#### Visual & Browser Testing

**Playwright Integration**
- Browser automation with screenshot capture
- Event: PostToolUse
- Source: [github.com/lackeyjb/playwright-skill](https://github.com/lackeyjb/playwright-skill)

**Puppeteer MCP**
- Headless browser testing
- MCP tool integration

**Chrome DevTools Protocol**
- Real-time DOM inspection and performance metrics
- Advanced debugging capabilities

---

### 3. Security & Compliance

#### Secret Scanning

**mintmcp/agent-security**
- Local-first secrets scanner (regex-based, zero external dependencies)
- Detects: API keys, AWS credentials, private keys, tokens
- Event: PreToolUse on Write/Edit
- Exit code 2 blocks commits with secrets
- Source: [github.com/mintmcp/agent-security](https://github.com/mintmcp/agent-security)

**Warning System (Post-hook variant)**
- Post-hooks alert without blocking
- Logs detected secrets for review

#### Security Validation

**Auth Code Validator**
- Scans authentication code for `console.log` statements
- Event: PreToolUse on auth-related files
- Prevents credential leakage
- Source: letanure.dev blog

**Sensitive File Monitor**
- Blocks dangerous file access patterns
- Event: PreToolUse on Read/Write
- Protects `/etc/passwd`, `.env`, `secrets.*`

**API Key Detector**
- Prevents accidental key commits
- Regex patterns for common API key formats

#### Dangerous Command Blocker

Source: [github.com/EvanL1/claude-code-hooks](https://github.com/EvanL1/claude-code-hooks)

**rm -rf Protection**
- Blocks destructive file system commands
- Event: PreToolUse on `Bash:*rm -rf*`
- Exit code 2 with warning message

**AWS Safety Checker**
- Detects dangerous cloud operations
- Patterns: `aws ec2 terminate-instances`, `aws s3 rb`
- Event: PreToolUse on Bash

**Production Environment Guard**
- Warns on production deployments
- Checks for `--production`, `PROD`, environment variables

#### Package Security

**Package Age Checker**
- Blocks outdated dependencies (>180 days configurable)
- Event: PreToolUse on `Bash:npm install*|Bash:pip install*`
- Source: [github.com/decider/claude-hooks](https://github.com/decider/claude-hooks)

**License Compliance Checker**
- Validates open-source licenses
- Blocks GPL in commercial projects (configurable)

---

### 4. Git & Version Control

#### Git Workflow Automation

**Automatic Backup Commits**
- PreToolUse hook creates safety commits before major changes
- Event: PreToolUse on destructive operations
- Enables easy rollback

**Commit Message Validator**
- Enforces conventional commit format
- Event: PreToolUse on `Bash:git commit*`
- Regex: `^(feat|fix|docs|refactor|test|chore|perf):`

**Commit Message Filter**
- Blocks auto-generated signatures (optional)
- Removes "🤖 Generated with Claude Code" if desired
- Event: PreToolUse on git commit

**Git Safety Check**
- Protects critical branches from deletion
- Event: PreToolUse on `Bash:git branch -D main|Bash:git branch -D master`
- Exit code 2 blocks

**Force Push Warning**
- Alerts on risky git operations
- Event: PreToolUse on `Bash:git push --force*`
- Requires confirmation

#### GitButler Integration

Source: [blog.gitbutler.com](https://blog.gitbutler.com)

**Auto-commit on Session End**
- Creates commits when Claude finishes
- Event: SessionEnd
- Command: `git add . && git commit -m "Auto-commit from Claude session"`

**Sophisticated Commit Messages**
- AI-generated commit descriptions
- Analyzes git diff for context

#### Changelog & Documentation

**Automated Changelog Generator**
- Appends to CHANGELOG.md based on commit type
- Event: PostToolUse on `Bash:git commit*`
- Parses conventional commits

**Release Notes Generator**
- Creates release documentation
- Event: PostToolUse
- Integrates with GitHub Actions

**README Updater**
- Keeps documentation in sync with code changes
- Event: PostToolUse on API/CLI changes

---

### 5. Notifications & Alerts

#### Desktop Notifications

**macOS terminal-notifier**
- Native notification center integration with sounds
- Event: Stop, SubagentStop
- Command: `terminal-notifier -message "Claude is done" -sound Glass`
- Source: khromov.se

**Linux notify-send**
- Cross-platform desktop alerts
- Event: Stop
- Command: `notify-send "Claude Code" "Task completed"`

#### Mobile & Remote Notifications

**Pushover Integration**
- Phone notifications via Pushover API
- Event: Stop, Notification
- Supports priority levels and custom sounds

**Slack Webhook**
- Team notifications in Slack channels
- Event: Stop, SubagentStop
- JSON payload with session details

**Discord Webhook**
- Bot messages in Discord servers
- Event: Stop
- Supports embeds, colors, avatars

**Telegram Bot**
- Interactive Telegram notifications with buttons
- Event: Stop
- Supports reply-to-command workflow

**LINE Integration**
- Token-based command system
- Popular in Asian markets

#### Email Integration

Source: [github.com/JessyTsui/Claude-Code-Remote](https://github.com/JessyTsui/Claude-Code-Remote)

**Claude Code Remote**
- Email notifications with reply-to-command capability
- SMTP/IMAP two-way communication
- Whitelist security for command sources

**Scheduled Reports**
- Daily/weekly usage summaries (planned feature)
- Email digest of activities

#### Communication Platforms

**CodeInbox**
- Unified notification hub (Slack, email via MagicBell)
- Event aggregation and routing
- Source: [github.com/codeinbox/codeinbox](https://github.com/codeinbox/codeinbox)

---

### 6. Audio & Text-to-Speech

#### Sound Notifications

**Event-based Sounds**
- Different sounds for edit/commit/test/git operations
- Pattern matching for sound selection
- Source: haihai.ai/hooks, stacktoheap.com

**Pattern Matching Audio**
- Regex-based sound selection
- Example: "Edit" → glass.aiff, "Bash:git*" → submarine.aiff

**System Ready/Stop Alerts**
- Session lifecycle audio cues
- Event: SessionStart, Stop

#### Text-to-Speech Hooks

Source: stacktoheap.com blog

**pyttsx3 Offline TTS**
- "Claude Code is done" announcements
- Cross-platform (macOS, Linux, Windows)
- No API required, fully offline
- Event: Stop
- Command: `python -c "import pyttsx3; engine = pyttsx3.init(); engine.say('Claude Code is done'); engine.runAndWait()"`

**ElevenLabs TTS**
- Premium voice quality
- Personality customization (British accent, enthusiastic tone)
- API-based, requires key

**OpenAI TTS**
- Six natural voices (alloy, echo, fable, onyx, nova, shimmer)
- API-based
- Command: `curl -s https://api.openai.com/v1/audio/speech -H "Authorization: Bearer $OPENAI_API_KEY" -H "Content-Type: application/json" -d '{"model": "tts-1", "input": "Claude Code is done", "voice": "nova"}' --output speech.mp3 && afplay speech.mp3`

**Subagent Completion TTS**
- "Subagent Complete" playback
- Event: SubagentStop

---

### 7. Monitoring & Observability

#### Real-time Monitoring

Source: [github.com/disler/claude-code-hooks-multi-agent-observability](https://github.com/disler/claude-code-hooks-multi-agent-observability)

**Multi-Agent Observability**
- WebSocket-based live event streaming
- Web UI dashboard for monitoring

**Session Tracking**
- Unique session IDs for concurrent agents
- Track multiple Claude instances

**Live Pulse Chart**
- Canvas-rendered activity visualization
- Real-time event stream display

**Event Filtering**
- Multi-criteria filtering (app/session/event type)
- Search and filter capabilities

#### Logging & Analytics

**Command Logger**
- Logs all commands to `~/.claude/logs/` as JSONL
- Event: PostToolUse
- Append-only logging

**Bash Command Logger**
- Extracts command + description using `jq`
- Event: PostToolUse on Bash
- Command: `echo "$CLAUDE_TOOL_OUTPUT" | jq -r '.command + " # " + .description' >> ~/.claude/bash_history.log`

**Usage Analytics**
- CSV tracking with timestamp/tool/status
- Event: PostToolUse
- Enables trend analysis

**Transcript Backup**
- Pre-compaction conversation preservation
- Event: PreCompact
- Saves full transcript before compression

#### Performance Metrics

**Token Usage Tracking**
- Cost per session/day with burn rate
- Event: Stop
- Integrates with OpenAI API billing

**WakaTime Integration**
- Automatic time tracking and productivity metrics
- Event: PostToolUse
- Dashboard analytics
- Source: wakatime.com

**ccusage CLI**
- Usage analysis from local JSONL files
- Command: `ccusage --today`, `ccusage --week`
- Source: [github.com/ryoppippi/ccusage](https://github.com/ryoppippi/ccusage)

**OpenTelemetry Support**
- Comprehensive observability (sessions, costs, PRs, commits)
- Event: All events
- Distributed tracing

#### Cost Tracking

**Status Line Integration**
- Real-time cost display in Claude UI
- Event: PostToolUse
- Updates token counter

**Daily Cost Reports**
- Average $6/day, 90% under $12 (reported by users)
- Billing analytics

---

### 8. CI/CD & DevOps

#### GitHub Actions Integration

Source: Official Claude Code GitHub Actions

**@claude PR Comments**
- Mention-triggered code analysis
- Comment on PR: "@claude review security"
- One-shot automation

**Automated PR Reviews**
- Security audits and code quality checks
- Event: Pull request opened
- Reports findings as PR comments

**One-shot Comment Resolution**
- Auto-implements reviewer suggestions
- Comment: "@claude fix the type error in src/app.ts"
- Creates commit with fix

**Release Automation**
- Automatic release note generation
- Event: Tag pushed
- Creates GitHub release with changelog

#### Jenkins Integration

Source: skywork.ai blog

**API Key Management**
- Secure credential binding
- Jenkins credentials store integration

**Pipeline Integration**
- Stage-based Claude invocation
- Groovy DSL: `sh 'claude-code --prompt "fix tests"'`

**Manual Review Gates**
- Label/parameter-controlled suggestions
- Human approval before applying changes

#### CI Hooks

**Headless Mode**
- Non-interactive execution for CI environments
- Flag: `--headless`
- Returns structured output

**Pre-commit Hooks**
- Build script integration
- Event: PreToolUse on git operations
- Ensures CI checks pass locally

**Test Gate Enforcement**
- Blocks commits on test failures
- Exit code 2 prevents push

---

### 9. Database & Infrastructure

#### Redis Integration

Source: [github.com/gregmulvihill/claude-orchestrator](https://github.com/gregmulvihill/claude-orchestrator)

**Multi-agent Orchestration**
- Redis for inter-container messaging
- Pub/sub pattern for coordination

**Service Discovery**
- Registry for agent coordination
- Health checks and failover

#### Docker & Containerization

**Docker Validator**
- Enforces naming conventions and tagging patterns
- Event: PreToolUse on `Bash:docker build*`
- Regex: Image names must follow `company/app:version` pattern

**Container Isolation**
- Sandboxed Claude execution
- Each agent in separate container

**Docker Compose Integration**
- Multi-service orchestration (React, Django, Postgres)
- Event: SessionStart
- Command: `docker-compose up -d`

**Dev Container Support**
- Redis/database companion containers
- Automatic service startup

#### Kubernetes

Source: [github.com/ruvnet/claude-flow](https://github.com/ruvnet/claude-flow)

**Claude Flow**
- K8s-optimized architecture
- Helm charts for deployment

**MCP Protocol Support**
- Native Claude Code integration
- Service mesh compatibility

---

### 10. Framework-Specific Hooks

#### Python

**UV Script Execution**
- Single-file Python scripts in `.claude/hooks/`
- Shebang: `#!/usr/bin/env -S uv run`
- Automatic dependency management

**Virtual Environment Activation**
- Automatic venv handling
- Event: SessionStart
- Command: `source .venv/bin/activate`

#### JavaScript/TypeScript

**Node.js Hooks**
- npm package integration
- Event: PostToolUse on `Edit:package.json`
- Auto-runs `npm install`

**Bun with TypeScript**
- Type-safe hook development
- Fast execution with Bun runtime

**TypeScript SDK**
- Source: [github.com/johnlindquist/claude-hooks](https://github.com/johnlindquist/claude-hooks)
- IntelliSense support
- Type definitions for hook events

#### PHP/Laravel

Source: [beyondcode/claude-hooks-sdk](https://github.com/beyondcode/claude-hooks-sdk) (Packagist)

**Laravel SDK**
- Fluent API for hook definitions
- Eloquent integration

**TALL Stack Support**
- Tailwind/Alpine/Laravel/Livewire configurations
- Auto-formatting for Blade templates

#### Ruby/Rails

Source: [github.com/obie/claude-on-rails](https://github.com/obie/claude-on-rails)

**ClaudeOnRails**
- Multi-agent Rails development framework
- Specialized subagents for Rails conventions

**Rails-expert Subagent**
- MVC/ActiveRecord conventions
- Migration generation

#### Go

**cc-tools**
- High-performance Go implementation
- Compiled hooks for speed

**Gin Framework Expert**
- Web API subagent
- RESTful routing patterns

**Fiber Framework Expert**
- Performance-focused subagent
- Express-like API

#### Rust

**Actix-web Expert**
- Async patterns subagent
- Type-safe routing

**Cargo Integration**
- Build/test/format automation
- Event: PostToolUse on `Edit:Cargo.toml`

---

### 11. Build & Deployment

#### Build Automation

**Incremental Build Triggers**
- PostToolUse build execution
- Event: PostToolUse on source file changes
- Command: `npm run build` or `make`

**Dependency Check**
- Verifies required tools installed
- Event: SessionStart
- Checks for node, python, docker, etc.

**File Watcher Integration**
- Monitors changes for rebuild
- Integration with nodemon, watchexec

#### Deployment Hooks

**SEO Validation**
- Sitemap deployment checks
- JSON schema validation
- URL liveness checks
- Event: PreToolUse on deploy commands

**WCAG Accessibility Check**
- Screen reader simulation
- Keyboard navigation testing
- Event: PreToolUse on deploy

**Pre-deploy Security Scan**
- Vulnerability detection
- OWASP top 10 checks
- Event: PreToolUse on deploy

#### NPM/Package Management

Source: [github.com/EvanL1/claude-code-hooks](https://github.com/EvanL1/claude-code-hooks)

**NPM Safety Check**
- Alerts on publish operations
- Event: PreToolUse on `Bash:npm publish*`
- Confirms intention

**Package Installation Guard**
- CI best practices enforcement
- Warns: "Use npm ci in CI environments"

**Java Build Check**
- Wrapper script recommendations
- Suggests `./gradlew` over `gradle`

---

### 12. Development Workflow

#### Context Injection

**SessionStart Context Loader**
- Loads git status, recent issues, dependencies
- Event: SessionStart
- Provides Claude with project context
- Command: `git status && git log -5 --oneline`

**Environment Setup**
- Automatic environment variable configuration
- Event: SessionStart
- Sources `.env`, `.env.local`

**Project Initialization**
- Custom project scaffolding
- Event: SessionStart (first time)

#### Communication Optimization

Source: letanure.dev

**Prompt Enhancement**
- UserPromptSubmit context addition
- Injects coding standards, style guides
- Event: UserPromptSubmit

**Response Guidance**
- Adds instructions: "Skip acknowledgments - focus on solution"
- Event: UserPromptSubmit
- Improves Claude response quality

**Prompt Validation**
- Security filtering before Claude processing
- Event: UserPromptSubmit
- Blocks prompts with PII, secrets

#### Terminal Enhancement

Source: [github.com/EvanL1/claude-code-hooks](https://github.com/EvanL1/claude-code-hooks)

**Beautiful Terminal UI**
- Time/path/mode display
- Colorized output with ANSI codes

**File Statistics Reporter**
- Line count, functions, classes analysis
- Event: PostToolUse on Edit/Write
- Command: `tokei $CLAUDE_FILE_PATHS`

**Dev Event Notifier**
- Build/test/deployment event alerts
- Real-time status updates

---

### 13. Advanced & Creative Uses

#### Remote Control

Source: [github.com/JessyTsui/Claude-Code-Remote](https://github.com/JessyTsui/Claude-Code-Remote)

**Email Command Interface**
- Reply-to-email command injection
- IMAP polling for new commands
- SMTP for result notifications

**Tmux Integration**
- Command injection into active sessions
- Event: SessionStart
- Enables remote Claude interaction

**Multi-platform Control**
- Email/Discord/Telegram/LINE
- Unified command routing

**Whitelist Security**
- Command source verification
- Only accepts from approved addresses/users

#### Prompt-based Hooks

Source: Official docs

**LLM Decision Hooks**
- Use Claude to make hook decisions
- Hook type: `"prompt"`
- Example: "Should this file be formatted?"

**Dynamic Permission System**
- AI-evaluated tool authorization
- Context-aware approval

#### File Watching

**Continuous Test Running**
- Monitor test files for changes
- Event: PostToolUse on `Edit:test_*.py`
- Auto-reruns tests

**Live Reload Integration**
- Browser refresh on file save
- Event: PostToolUse
- WebSocket notification to browser

#### MCP Integration

Source: claudecode.io

**MCP Tool Pattern Matching**
- Match `mcp__<server>__<tool>` patterns
- Event: PreToolUse, PostToolUse
- Example: `mcp__memory__store`

**Elicitation Dialog Hooks**
- Handle MCP tool parameter requests
- Interactive parameter collection

#### Time Tracking

**Pomodoro Integration**
- 25-minute timer with notifications
- Event: SessionStart
- Auto-break reminders

**Session Duration Tracking**
- Active time (not idle) measurement
- Event: SessionStart, SessionEnd
- Calculates billable hours

**Productivity Analytics**
- PR count, commit frequency
- Weekly/monthly reports
- Integration with WakaTime

#### Code Review Automation

Source: GitHub Actions docs

**PR Analysis**
- Comprehensive quality/security/architecture review
- Event: Pull request webhook
- Comments on PR with findings

**Review Comment Implementation**
- Auto-fix suggestions
- Event: PR comment with @claude mention
- Creates commit addressing comment

**CODEOWNERS Integration**
- Human approval gates
- Claude suggests, humans approve

#### Browser Automation

Source: [github.com/lackeyjb/playwright-skill](https://github.com/lackeyjb/playwright-skill)

**Playwright Skill**
- Custom automation with screenshots
- Event: PostToolUse
- Validates UI changes

**Visual Regression Testing**
- Compare rendered output
- Detects unintended visual changes

**Performance Monitoring**
- Network/metrics capture
- Lighthouse integration

#### Orchestration

Source: [github.com/0xfurai/claude-code-subagents](https://github.com/0xfurai/claude-code-subagents)

**Multi-agent Coordination**
- Voting mechanisms, consequence analysis
- Redis-based communication

**Sub-agent Management**
- 100+ production-ready subagents
- Framework experts (Rails, Django, Laravel, etc.)

---

## Implementation Patterns

### Exit Code Behavior

| Exit Code | Behavior | Use Case |
|-----------|----------|----------|
| 0 | Success | stdout visible, adds context in UserPromptSubmit/SessionStart |
| 2 | Blocking error | stderr fed to Claude, prevents execution |
| Other | Non-blocking error | stderr shown to user, execution continues |

### Hook Configuration Locations

**Priority order (highest to lowest):**
1. **Project-level**: `.claude/settings.json` (checked into git)
2. **Personal**: `~/.claude/settings.json` (user-specific overrides)
3. **Global**: `~/.config/claude-code/settings.json` (all projects)

### Matcher Patterns

**Tool name matching:**
```json
{
  "matcher": "Edit:*.ts|Edit:*.tsx"
}
```

**Wildcard support:**
```json
{
  "matcher": "Write|Edit"
}
```

**Regex patterns:**
- Case-sensitive matching
- Full tool signature: `ToolName:pattern`

**MCP tools:**
```json
{
  "matcher": "mcp__memory__*"
}
```

### JSON Output Control

Hooks can return JSON for sophisticated control:

**Control execution flow:**
```json
{
  "continue": true
}
```

**Permission decisions:**
```json
{
  "decision": "allow"
}
```

**Hide output from transcript:**
```json
{
  "suppressOutput": true
}
```

### Hook Script Template

**Bash:**
```bash
#!/bin/bash
# Description: What this hook does
# Event: PreToolUse
# Matcher: Edit:*.py

# Access environment variables
FILE_PATHS="$CLAUDE_FILE_PATHS"
PROJECT_DIR="$CLAUDE_PROJECT_DIR"

# Your logic here
if [ -z "$FILE_PATHS" ]; then
  echo "No files to process"
  exit 0
fi

# Perform action
black "$FILE_PATHS"

# Exit codes
# 0 = success
# 2 = blocking error (prevents tool execution)
# other = non-blocking error
exit 0
```

**Python with UV:**
```python
#!/usr/bin/env -S uv run
# /// script
# dependencies = ["ruff"]
# ///

import os
import sys

# Access environment variables
file_paths = os.environ.get("CLAUDE_FILE_PATHS", "").split()
project_dir = os.environ.get("CLAUDE_PROJECT_DIR", ".")

if not file_paths:
    print("No files to process")
    sys.exit(0)

# Your logic here
import subprocess
subprocess.run(["ruff", "check", "--fix"] + file_paths)

sys.exit(0)
```

---

## Notable Repositories

| Repository | Description | Stars | Key Features |
|------------|-------------|-------|--------------|
| [disler/claude-code-hooks-mastery](https://github.com/disler/claude-code-hooks-mastery) | Comprehensive educational resource | Popular | 8 hook types, tutorials |
| [johnlindquist/claude-hooks](https://github.com/johnlindquist/claude-hooks) | TypeScript SDK | Active | Type safety, IntelliSense |
| [decider/claude-hooks](https://github.com/decider/claude-hooks) | Clean code enforcement (Python) | Growing | Code quality validators |
| [EvanL1/claude-code-hooks](https://github.com/EvanL1/claude-code-hooks) | 11 curated workflow hooks | Popular | Safety checks, notifications |
| [mintmcp/agent-security](https://github.com/mintmcp/agent-security) | Local secrets scanner | Security | Zero dependencies, fast |
| [JessyTsui/Claude-Code-Remote](https://github.com/JessyTsui/Claude-Code-Remote) | Remote control via email/Discord | Innovative | Multi-platform, whitelist |
| [codeinbox/codeinbox](https://github.com/codeinbox/codeinbox) | MagicBell-powered notifications | SaaS | Unified notification hub |
| [disler/...multi-agent-observability](https://github.com/disler/claude-code-hooks-multi-agent-observability) | Real-time monitoring | Advanced | WebSocket, dashboard |
| [hesreallyhim/awesome-claude-code](https://github.com/hesreallyhim/awesome-claude-code) | Curated awesome list | Reference | Links to all resources |
| [beyondcode/claude-hooks-sdk](https://github.com/beyondcode/claude-hooks-sdk) | Laravel-inspired PHP SDK | PHP | Fluent API, Eloquent |
| [lackeyjb/playwright-skill](https://github.com/lackeyjb/playwright-skill) | Browser automation | Testing | Screenshots, visual tests |
| [gregmulvihill/claude-orchestrator](https://github.com/gregmulvihill/claude-orchestrator) | Redis-based multi-agent | Orchestration | Pub/sub, service discovery |
| [0xfurai/claude-code-subagents](https://github.com/0xfurai/claude-code-subagents) | 100+ subagents collection | Massive | Framework experts |

---

## High-Priority Recommendations

Based on existing hooks (audio notifications, grep→ripgrep), here are suggested additions prioritized by value:

### Tier 1: Critical (Implement First)

1. **Secret Scanner** ([mintmcp/agent-security](https://github.com/mintmcp/agent-security))
   - **Why**: Prevents accidental credential commits
   - **Impact**: Security critical
   - **Effort**: Low (simple integration)
   - **Event**: PreToolUse on Write/Edit

2. **Auto-formatter Suite** (Black, Prettier, Gofmt)
   - **Why**: Code consistency across team
   - **Impact**: High quality improvement
   - **Effort**: Medium (multiple formatters)
   - **Event**: PostToolUse

3. **Test Runner Integration** (pytest, Jest)
   - **Why**: TDD workflow, catch regressions early
   - **Impact**: High reliability improvement
   - **Effort**: Medium
   - **Event**: PostToolUse on test file changes

4. **Commit Message Validator**
   - **Why**: Git hygiene, conventional commits
   - **Impact**: Medium (better git history)
   - **Effort**: Low
   - **Event**: PreToolUse on `Bash:git commit*`

5. **SessionStart Context Loader**
   - **Why**: Better Claude context awareness
   - **Impact**: High (improves Claude responses)
   - **Effort**: Low
   - **Event**: SessionStart

### Tier 2: High Value (Creative/Useful)

6. **Text-to-Speech Status** (pyttsx3 offline)
   - **Why**: Audio feedback without API costs
   - **Impact**: Medium (quality of life)
   - **Effort**: Low
   - **Event**: Stop, SubagentStop

7. **Slack/Discord Integration**
   - **Why**: Team visibility, async notifications
   - **Impact**: Medium (collaboration)
   - **Effort**: Medium
   - **Event**: Stop, Notification

8. **Remote Email Control**
   - **Why**: Mobile workflow, away from desk
   - **Impact**: High (accessibility)
   - **Effort**: High (SMTP/IMAP setup)
   - **Event**: SessionStart (poll emails)

9. **Dangerous Command Blocker** (rm -rf, AWS)
   - **Why**: Prevent catastrophic mistakes
   - **Impact**: High (safety)
   - **Effort**: Low
   - **Event**: PreToolUse on Bash

10. **Visual Testing** (Playwright)
    - **Why**: UI validation, regression detection
    - **Impact**: Medium (frontend quality)
    - **Effort**: High
    - **Event**: PostToolUse

### Tier 3: Advanced (Power Users)

11. **Multi-agent Observability**
    - **Why**: Monitor concurrent sessions
    - **Impact**: Medium (advanced workflows)
    - **Effort**: High (WebSocket, dashboard)
    - **Event**: All events

12. **Cost Tracking**
    - **Why**: Token usage awareness, budgeting
    - **Impact**: Medium (cost control)
    - **Effort**: Medium
    - **Event**: Stop

13. **MCP Tool Integration**
    - **Why**: Extend Claude's capabilities
    - **Impact**: High (feature expansion)
    - **Effort**: High (MCP protocol)
    - **Event**: PreToolUse, PostToolUse

14. **Code Quality Validators** (function length, complexity)
    - **Why**: Enforce coding standards
    - **Impact**: Medium (maintainability)
    - **Effort**: Medium (regex, AST parsing)
    - **Event**: PreToolUse

### Quick Wins (Low Effort, Medium Impact)

- **Desktop Notifications** (terminal-notifier, notify-send)
- **Bash Command Logger** (JSONL logging)
- **File Statistics Reporter** (tokei integration)
- **Git Safety Check** (protect main/master)
- **NPM Safety Check** (confirm publish)

---

## Research Sources

- **Official Documentation**: code.claude.com/docs/en/hooks
- **GitHub Repositories**: 13+ dedicated hook collections
- **Developer Blogs**:
  - letanure.dev
  - stacktoheap.com
  - khromov.se
  - medium.com
  - haihai.ai
  - blog.gitbutler.com
  - skywork.ai
- **Community Forums**: Reddit (r/ClaudeAI), Hacker News
- **Integration Docs**: GitButler, GitHub Actions, Jenkins
- **Tool Providers**: WakaTime, MagicBell, Pushover

---

## Conclusion

The Claude Code hooks ecosystem is mature and rapidly growing, with implementations ranging from simple command wrappers to sophisticated multi-agent orchestration systems. The community has created hooks for nearly every aspect of the development workflow:

- **Code quality**: Auto-formatting, linting, complexity checks
- **Security**: Secret scanning, dangerous command blocking, package validation
- **Testing**: Automated test runners, visual testing, coverage enforcement
- **Git**: Commit validation, automatic backups, changelog generation
- **Notifications**: Desktop, mobile, email, chat platforms
- **Audio**: Sound effects, text-to-speech announcements
- **Monitoring**: Real-time dashboards, cost tracking, time tracking
- **CI/CD**: GitHub Actions, Jenkins, deployment automation
- **Advanced**: Remote control, multi-agent coordination, browser automation

The most valuable additions for this project appear to be:
1. **Secret scanning** (security critical)
2. **Auto-formatters** (code quality)
3. **Test integration** (reliability)
4. **TTS notifications** (creative, complements existing audio)
5. **Remote control** (innovative workflow)

---

*Research conducted: 2025-11-11*
*Next steps: Prioritize implementation based on Tier 1 recommendations*
