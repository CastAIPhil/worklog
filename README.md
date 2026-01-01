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

- **AI Agent Sessions**: Reads session histories from OpenCode, Claude Code, Codex, and Factory
- **Editor Tracking**: Monitors VS Code and Cursor editor workspace usage and extensions
- **Terminal Analytics**: Aggregates command patterns and frequency from shell history
- **File System Monitoring**: Tracks file modifications and activity in project directories
- **Git Integration**: Pulls commit history from a configurable list of local repositories
- **GitHub Activity**: Fetches pushes, PRs, issues, reviews, and comments via `gh` CLI
- **Flexible Date Ranges**: Today, yesterday, this week, this month, or specific dates
- **Multiple Output Formats**: Markdown (default concise), JSON, plain text, or Slack-formatted
- **Trend Analysis**: Compare activity levels with previous periods
- **Interactive Dashboard**: Web-based analytics with charts and visualizations

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

### Output Modes

By default, worklog provides **concise summaries** with smart per-source formatting:
- **Git**: Shows commit count with conventional commit type breakdown (feat, fix, docs, etc.)
- **GitHub**: Aggregates events by type (push, pr, review, issue, comment)
- **AI Sessions**: Displays session count, total interactions, and project distribution
- **Editors**: Lists workspaces opened and extensions updated
- **Terminal**: Summarizes command count with top tools used
- **File System**: Shows files modified with type breakdown

Use `--verbose` (`-v`) for detailed output with individual items, timestamps, and full descriptions.

## Configuration

Create `~/.config/worklog/config.json`:

```json
{
  "defaultSources": ["opencode", "claude", "codex", "factory", "git", "github", "vscode", "cursor", "terminal", "filesystem"],
  "gitRepos": [
    "~/code/project1",
    "~/code/project2"
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
    "enabled": true,
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
| `WORKLOG_GITHUB_USER` | GitHub username for activity fetching |
| `WORKLOG_LLM_ENABLED` | Enable/disable LLM summarization |
| `WORKLOG_LLM_MODEL` | LLM model to use |

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

Each source generates a smart one-line summary:

```
# Daily Standup - Tue, Dec 31, 2025

- **Git**: 8 commits (feat 3, fix 2, docs 2) across 2 repos
- **GitHub**: 5 events (push 2, pr 2, review 1) across 2 repos
- **OpenCode**: 2 sessions, 15 interactions
- **Claude**: 3 sessions, 24 interactions across 2 projects (api 2, web 1)
- **VS Code**: 2 workspaces (project1, project2), 3 extensions updated
- **Terminal**: 142 commands across 5 tools (git(41), bun(18), docker(9))
- **File System**: Modified 37 files across 3 directories (ts(22), md(6), js(4))

---
*Generated at 2025-12-31 16:00:00*
```

### Verbose Mode (`-v` or `--verbose`)

Detailed output with timestamps and full descriptions:

```
# Daily Standup - Tue, Dec 31, 2025

## OpenCode Sessions

- **09:15** OpenCode session: Refactoring authentication module
  - 12 interactions

## Git Commits

- **10:30** [project1] feat: add user authentication
- **14:22** [project1] fix: resolve token refresh issue

## GitHub Activity

- **11:00** [org/repo] PR #42 opened: Add OAuth support
- **15:30** [org/repo] Reviewed PR #41: Update dependencies

---
*Generated at 2025-12-31 16:00:00*
```

### Slack Format

Uses Slack emoji codes (`:wrench:`, `:octocat:`, etc.) and mrkdwn formatting for posting directly to Slack.

## Development

A `Makefile` is provided for common development tasks:

```bash
# Show available commands
make help

# Install dependencies
make install

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
