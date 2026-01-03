# worklog

<div align="center">

[![GitHub Stars](https://img.shields.io/github/stars/jvalentini/worklog?style=flat)](https://github.com/jvalentini/worklog/stargazers)
[![GitHub Forks](https://img.shields.io/github/forks/jvalentini/worklog?style=flat)](https://github.com/jvalentini/worklog/network/members)
[![GitHub Issues](https://img.shields.io/github/issues/jvalentini/worklog?style=flat)](https://github.com/jvalentini/worklog/issues)
[![GitHub License](https://img.shields.io/github/license/jvalentini/worklog?style=flat)](https://github.com/jvalentini/worklog/blob/main/LICENSE)
[![GitHub Last Commit](https://img.shields.io/github/last-commit/jvalentini/worklog?style=flat)](https://github.com/jvalentini/worklog/commits)
[![Lines of Code](https://tokei.rs/b1/github/jvalentini/worklog?category=code)](https://github.com/jvalentini/worklog)

</div>

A CLI tool that aggregates development activity from multiple sources to generate daily stand-up summaries. It reads your AI coding agent session histories (OpenCode, Claude Code, Codex, Factory) alongside commit logs from a configurable list of Git repositories and your GitHub activity. Perfect for developers who work with AI coding assistants and want a quick summary of their work.

## Features

- **Project-Centric Reports**: Activity organized by project (repo) instead of by source type
- **AI Agent Sessions**: Reads session histories from OpenCode, Claude Code, Codex, and Factory
- **Editor Tracking**: Monitors VS Code and Cursor editor workspace usage and extensions
- **Terminal Analytics**: Aggregates command patterns and frequency from shell history
- **File System Monitoring**: Tracks file modifications and activity in project directories
- **Git Integration**: Pulls commit history from a configurable list of local repositories
- **GitHub Activity**: Fetches pushes, PRs, issues, reviews, and comments via `gh` CLI
- **Flexible Date Ranges**: Today, yesterday, this week, this month, or specific dates
- **Two Output Modes**: Concise one-liners (default) or verbose detailed breakdowns (`-v`)
- **Commit Type Grouping**: Verbose mode organizes commits by type (features, bug fixes, docs, etc.)
- **Multiple Output Formats**: Markdown (default), JSON, plain text, or Slack-formatted
- **Optional LLM Summaries**: AI-generated summaries with `--llm` flag (opt-in)
- **Interactive Dashboard**: Web-based analytics with charts and visualizations
- **Scheduled Reports**: Cron integration for automatic daily standups

## Breaking Changes (v2.0+)

**⚠️ If upgrading from v1.x, note these changes:**

- **Default output is now project-centric** (grouped by repo) instead of source-centric (grouped by Git/GitHub/AI Sessions)
  - Old behavior is no longer available
  - All activity for a project appears together under the project name
- **LLM summarization is now opt-in** with `--llm` flag
  - Previously enabled by default
  - Use `--llm` to generate AI summaries (requires OpenAI/Anthropic API key)
- **`--legacy` flag removed**
  - Project-centric view is the only mode

**Migration Guide:**
```bash
# Old (v1.x)
worklog              # Source-centric output with LLM summaries

# New (v2.x)
worklog              # Project-centric concise output (no LLM)
worklog --llm        # Project-centric with LLM summaries
worklog -v           # Project-centric verbose (detailed)
worklog -v --llm     # Project-centric verbose with LLM summaries
```

## Installation

Installs the latest release binary to `~/.local/bin/worklog` and walks you through creating `~/.config/worklog/config.json`.

```bash
curl -fsSL https://raw.githubusercontent.com/jvalentini/worklog/main/install.sh | bash
```

Skip the setup wizard:

```bash
curl -fsSL https://raw.githubusercontent.com/jvalentini/worklog/main/install.sh | bash -s -- --no-config
```

Install a specific version:

```bash
curl -fsSL https://raw.githubusercontent.com/jvalentini/worklog/main/install.sh | bash -s -- --version v1.0.0
```

### Manual Installation

```bash
git clone http://github.com/jvalentini/worklog.git
cd worklog
bun install
bun link
```

### Bash Completion

To enable bash completion for worklog commands:

```bash
# Generate completion script
worklog completion > ~/.worklog-completion.sh

# Source it in your ~/.bashrc or ~/.bash_profile
echo 'source ~/.worklog-completion.sh' >> ~/.bashrc

# Reload your bash profile
source ~/.bashrc
```

The completion supports all command-line options and flags.

## Usage

```bash
# Today's activity (default)
worklog

# Yesterday's standup
worklog -y
worklog --yesterday

# Specific date
worklog -d 2025-12-30

# This week's activity
worklog -w
worklog --week

# This month's activity
worklog -m
worklog --month

# Previous periods (use --last or -l)
worklog -l           # Yesterday (previous day)
worklog -ly          # Day before yesterday
worklog -lw          # Last week
worklog -lm          # Last month
worklog --last --week    # Same as -lw
worklog --last --month   # Same as -lm

# Output formats
worklog --json          # JSON output
worklog --plain         # Plain text
worklog --slack         # Slack-formatted with emoji codes

# Specify sources (all available: opencode,claude,codex,factory,git,github,vscode,cursor,terminal,filesystem)
worklog --sources git,github,vscode,terminal

# Specify git repos
worklog --repos ~/code/project1,~/code/project2

# Trend analysis
worklog --trends

# Interactive dashboard
worklog --dashboard

# Verbose output (detailed instead of concise summaries)
worklog -v

# Enable LLM summarization (disabled by default)
worklog --llm
worklog --llm -w     # LLM summary for this week

# Set up daily cron job
worklog cron install
worklog cron status
```

## Advanced Features

### Trend Analysis
Compare your current activity levels with previous periods:

```bash
worklog --trends
```

Shows percentage changes in activity across all sources compared to the previous equivalent time period.

### Interactive Dashboard
Launch a web-based dashboard with charts and analytics:

```bash
worklog --dashboard
```

Opens http://localhost:3000 with interactive visualizations of your work patterns, including:
- Activity distribution by source
- Hourly activity patterns
- Source-specific breakdowns
- Real-time statistics
- Dark mode toggle (persisted across sessions)
- Interactive source filter to focus on specific data sources

### Scheduled Reports (Cron)

Set up automatic daily standup reports with the `cron` subcommand:

```bash
# Install daily cron job (runs at 9am by default)
worklog cron install

# Custom time
worklog cron install --time 08:30

# Send directly to Slack
worklog cron install --slack https://hooks.slack.com/services/...

# Check current status
worklog cron status

# Remove the cron job
worklog cron uninstall
```

Reports are saved to `~/.local/share/worklog/daily/standup-YYYY-MM-DD.md` unless a Slack webhook is configured.

### Output Modes

Worklog provides **project-centric reporting** with two presentation modes:

#### **Concise Mode** (default)
One smart summary line per project, showing the most important work:
- For projects with ≤3 commits: Shows actual commit messages (prefixes stripped)
- For projects with >3 commits: Shows first commit + narrative summary (e.g., "2 features, 1 bug fix")
- Combines commits, AI sessions, and GitHub activity into readable summaries

#### **Verbose Mode** (`-v` or `--verbose`)
Detailed breakdown organized by activity type:
- **Commits grouped by type**: Features, Bug Fixes, Documentation, Refactoring, etc.
- **AI Sessions**: Full session descriptions
- **GitHub Activity**: PRs, issues, reviews with titles
- **Summary header**: Narrative overview (e.g., "2 features, 3 documentations, 1 maintenance")

Both modes support weekly reports (`-w`) and custom date ranges.

## Configuration

Create `~/.config/worklog/config.json`:

```json
{
  "defaultSources": ["opencode", "claude", "codex", "factory", "git", "github", "vscode", "cursor", "terminal", "filesystem"],
  "gitRepos": [
    "~/code/project1",
    "~/code/project2"
  ],
  "gitIdentityEmails": [
    "you@example.com",
    "you@work.com"
  ],
  "githubUser": "your-username",
  "paths": {
    "opencode": "~/.local/share/opencode/storage/session",
    "claude": "~/.claude/projects",
    "codex": "~/.codex/sessions",
    "factory": "~/.factory/sessions",
    "vscode": "~/.config/Code",
    "cursor": "~/.config/Cursor",
    "terminal": "~/.bash_history",
    "filesystem": "~/code"
  },
  "llm": {
    "enabled": false,
    "provider": "openai",
    "model": "gpt-4o-mini"
  }
}
```

### Environment Variables

| Variable | Description |
|----------|-------------|
| `WORKLOG_SOURCES` | Comma-separated list of sources |
| `WORKLOG_GIT_REPOS` | Comma-separated list of git repo paths |
| `WORKLOG_GIT_IDENTITY_EMAILS` | Comma-separated list of your git email addresses (for filtering merge detection) |
| `WORKLOG_GITHUB_USER` | GitHub username for activity fetching |
| `WORKLOG_LLM_ENABLED` | Enable/disable LLM summarization (default: false) |
| `WORKLOG_LLM_MODEL` | LLM model to use |
| `OPENAI_API_KEY` | OpenAI API key (required if using --llm with openai provider) |
| `ANTHROPIC_API_KEY` | Anthropic API key (required if using --llm with anthropic provider) |

## Data Sources

| Source | Description | Data Location |
|--------|-------------|---------------|
| `opencode` | OpenCode AI sessions | `~/.local/share/opencode/storage/session` |
| `claude` | Claude Code sessions | `~/.claude/projects` |
| `codex` | Codex sessions | `~/.codex/sessions` |
| `factory` | Factory sessions | `~/.factory/sessions` |
| `vscode` | VS Code workspace usage and extensions | `~/.config/Code` (Linux)<br>`~/Library/Application Support/Code` (macOS)<br>`~/AppData/Roaming/Code` (Windows) |
| `cursor` | Cursor editor sessions | `~/.config/Cursor` (Linux)<br>`~/Library/Application Support/Cursor` (macOS)<br>`~/AppData/Roaming/Cursor` (Windows) |
| `terminal` | Shell command patterns and frequency | `~/.bash_history`, `~/.zsh_history`, etc. |
| `filesystem` | File modification activity | Configured project directories |
| `git` | Git commit history | Configured repositories |
| `github` | GitHub activity | Via `gh api` (requires `gh` CLI) |

### GitHub Source

The GitHub source requires the [GitHub CLI](https://cli.github.com/) (`gh`) to be installed and authenticated:

```bash
gh auth login
```

## Output Examples

### Concise Mode (default)

Project-centric view with smart one-line summaries per project:

```markdown
# Daily Standup - Thursday, January 2, 2026

**worklog**: Add verbose mode and commit type grouping; Update documentation; Fix GitHub activity formatting

**api-server**: Implement OAuth authentication flow; Add rate limiting middleware

**mobile-app**: Update dependencies; Fix navigation bugs in settings screen

---
*Generated at 2026-01-02 16:00:00*
```

### Verbose Mode (`-v` or `--verbose`)

Detailed output grouped by commit type with full activity breakdown:

```markdown
# Daily Standup - Thursday, January 2, 2026

## worklog
**Summary**: 2 features, 3 documentations, 1 maintenance

**Features** (2):
- Add verbose mode and commit type grouping
- Implement GitHub PR title fetching

**Documentation** (3):
- Update README with new output examples
- Add breaking changes section
- Document new CLI flags

**Maintenance** (1):
- Clean up legacy formatter code

**AI Sessions** (2):
- Implementing enhanced project reporting
- Testing verbose output modes

**GitHub** (1):
- PR #42 opened: Add OAuth support

---
*Generated at 2026-01-02 16:00:00*
```

### Weekly Reports

Shows activity grouped by project (not by day), with PRs and branch merges highlighted first:

```markdown
# Weekly Standup - Dec 30, 2025 - Jan 5, 2026

## worklog

Opened PR #42: Add dark mode support (https://github.com/user/worklog/pull/42)
Merged PR #40: Fix timezone handling (https://github.com/user/worklog/pull/40)
Merged branch feature/trends → main

Implement verbose mode; Add basic CLI flags; Update tests

## api-server

Merged PR #15: OAuth implementation (https://github.com/user/api-server/pull/15)
Merged branch feature/auth → main

Create authentication endpoints

---
*Generated at 2026-01-05 16:00:00*
```

### Slack Format

Uses Slack emoji codes (`:file_folder:`, `:clipboard:`, etc.) and mrkdwn formatting for posting directly to Slack.

## Development

A `Makefile` is provided for common development tasks:

```bash
# Show available commands
make help

# Install dependencies
make deps

# Run in development mode
make dev

# Run tests
make test

# Run all checks (linting + type checking)
make check

# Auto-fix linting issues
make fix

# Build for all platforms
make build

# Build and install binary to ~/.local/bin
make install  # or: make i

# Remove binary from ~/.local/bin
make uninstall

# Test the installation script in Docker
make docker-test

# Clean build artifacts
make clean
```

Or use the individual Bun commands:

```bash
# Run in development
bun run dev

# Type checking
bun run typecheck

# Linting
bun run lint
bun run lint:fix

# Build
bun run build
```

## Requirements

### Using the released binary

- `curl` (to download the installer)
- `git` (required for the `git` source)
- [GitHub CLI](https://cli.github.com/) (`gh`) (optional, for the `github` source)

### Development (from source)

- [Bun](https://bun.sh) runtime

## License

MIT
