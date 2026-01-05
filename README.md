# worklog

<div align="center">

<img src=".github/banner.png" alt="worklog banner" width="800">

[![CI](https://github.com/jvalentini/worklog/actions/workflows/ci.yml/badge.svg)](https://github.com/jvalentini/worklog/actions/workflows/ci.yml)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.9-blue?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Bun](https://img.shields.io/badge/Bun-1.2-black?logo=bun&logoColor=white)](https://bun.sh/)
[![MIT License](https://img.shields.io/badge/License-MIT-blue.svg)](https://github.com/jvalentini/worklog/blob/main/LICENSE)
[![GitHub Release](https://img.shields.io/github/v/release/jvalentini/worklog)](https://github.com/jvalentini/worklog/releases)
[![Code Size](https://img.shields.io/github/languages/code-size/jvalentini/worklog)](https://github.com/jvalentini/worklog)
[![GitHub Stars](https://img.shields.io/github/stars/jvalentini/worklog?style=flat)](https://github.com/jvalentini/worklog)

[![macOS](https://img.shields.io/badge/macOS-supported-brightgreen?logo=apple)](https://github.com/jvalentini/worklog/releases)
[![Linux](https://img.shields.io/badge/Linux-supported-brightgreen?logo=linux&logoColor=white)](https://github.com/jvalentini/worklog/releases)
[![Windows](https://img.shields.io/badge/Windows-supported-brightgreen?logo=windows)](https://github.com/jvalentini/worklog/releases)

</div>

A CLI tool that aggregates development activity from AI coding agents (Claude Code, OpenCode, Codex, Factory), git commits, GitHub, editors, and more into daily stand-up summaries.

## Quick Start

**Install:**
```bash
curl -fsSL https://raw.githubusercontent.com/jvalentini/worklog/main/install.sh | bash
```

**Common Commands:**
```bash
worklog                  # Today's activity
worklog -y               # Yesterday
worklog -w               # This week
worklog -lw              # Last week
worklog -v               # Verbose output
worklog dashboard           # Launch web dashboard
worklog -x               # Smart AI-powered clustering
worklog search "query"   # Search history
```

## Features

- **Project-Centric Reports** - Activity organized by repository
- **11 Data Sources** - AI agents, git, GitHub, VS Code, Cursor, terminal, filesystem, calendar
- **Smart Summaries** - Context clustering with `--smart`, LLM summaries with `--llm`
- **Trend Analysis** - Compare activity across periods with `--trends`
- **Interactive Dashboard** - Web-based analytics at localhost:3000
- **Flexible Output** - Markdown, JSON, plain text, or Slack format
- **Search & Recovery** - Full-text search and session context recovery
- **Scheduled Reports** - systemd timers (cron fallback) with Slack support

## CLI Reference

### Date Options
| Flag | Description |
|------|-------------|
| `-d, --date <YYYY-MM-DD>` | Specific date |
| `-y, --yesterday` | Yesterday |
| `-w, --week` | Current week |
| `-m, --month` | Current month |
| `-q, --quarter` | Current quarter |
| `-l, --last` | Previous period (combine: `-lw`, `-lm`, `-lq`) |

### Output Options
| Flag | Description |
|------|-------------|
| `-j, --json` | JSON output |
| `-p, --plain` | Plain text |
| `-s, --slack` | Slack format with emoji codes |
| `-v, --verbose` | Detailed breakdown by activity type |

### Feature Flags
| Flag | Description |
|------|-------------|
| `-x, --smart` | Smart context clustering and summarization |
| `-L, --llm` | Enable LLM summarization (requires API key) |
| `-t, --trends` | Show activity trends vs previous period |

### Data Selection
| Flag | Description |
|------|-------------|
| `-S, --sources <list>` | Comma-separated sources to include |
| `-r, --repos <list>` | Comma-separated git repo paths |

### Subcommands

**`worklog search <query>`** - Search worklog history
```bash
worklog search "authentication" --fuzzy --since 2025-01-01
```
| Flag | Description |
|------|-------------|
| `-r, --regex` | Regex matching |
| `-f, --fuzzy` | Fuzzy matching |
| `--since, --until` | Date range |
| `-n, --limit` | Max results |

**`worklog recover`** - Recover context from previous sessions
```bash
worklog recover --week --project myproject
```

**`worklog schedule`** - Manage scheduled reports (systemd preferred, cron fallback)
```bash
worklog schedule install                   # Install daily/weekly/monthly/quarterly
worklog schedule install --no-quarterly    # Disable a period
worklog schedule install --slack <url>     # Configure Slack posts
worklog schedule install --backfill        # Backfill snapshots (4w daily/weekly + 1m monthly)
worklog schedule status                    # Check status
worklog schedule uninstall                 # Remove

# Generate a report immediately (always generates previous period)
worklog schedule run --period daily
worklog schedule run --period weekly

# Backfill snapshots without posting to Slack
worklog schedule backfill                  # Default: 4w daily/weekly + 1m monthly
worklog schedule backfill --since 2025-01-01 --until 2025-01-31
```

### Snapshot Timing

Scheduled snapshots run on your local machine and always generate the **previous** period using your configured timezone.

Default schedule (local time):
- **Daily**: 00:05
- **Weekly**: Monday 00:05
- **Monthly**: 1st day of month 00:05
- **Quarterly**: Jan/Apr/Jul/Oct 1st 00:05

Migration guide: `docs/snapshot-migration-guide.md`

**`worklog dashboard`** - Launch interactive dashboard from saved snapshots
```bash
worklog dashboard
worklog dashboard --theme chaos
```

**`worklog snapshot`** - Verify and repair saved snapshots
```bash
# Detect inconsistencies between weekly snapshots and daily snapshots
worklog snapshot verify

# Dry-run regeneration for a specific week
worklog snapshot regenerate --week 2025-12-22 --dry-run

# Regenerate all dailies that appear incomplete
worklog snapshot regenerate --all
```

**`worklog completion`** - Generate bash completion script
```bash
worklog completion > ~/.worklog-completion.sh
echo 'source ~/.worklog-completion.sh' >> ~/.bashrc
```

## Data Sources

| Source | Description |
|--------|-------------|
| `opencode` | OpenCode AI sessions |
| `claude` | Claude Code sessions |
| `codex` | Codex sessions |
| `factory` | Factory sessions |
| `git` | Local commit history |
| `github` | PRs, issues, reviews (requires `gh` CLI) |
| `vscode` | VS Code workspace activity |
| `cursor` | Cursor editor sessions |
| `terminal` | Shell command history |
| `filesystem` | File modifications |
| `calendar` | iCal events (optional) |

## Configuration

Create `~/.config/worklog/config.json`:

```json
{
  "defaultSources": ["opencode", "claude", "codex", "factory", "git", "github", "vscode", "cursor", "terminal", "filesystem"],
  "gitRepos": ["~/code/project1", "~/code/project2"],
  "gitIdentityEmails": ["you@example.com"],
  "githubUser": "your-username",
  "timezone": "America/New_York",
  "llm": {
    "enabled": false,
    "provider": "openai",
    "model": "gpt-4o-mini"
  },
  "dashboard": {
    "port": 3000
  }
}
```

### Environment Variables

| Variable | Description |
|----------|-------------|
| `OPENAI_API_KEY` | Required for `--llm` with OpenAI |
| `ANTHROPIC_API_KEY` | Required for `--llm` with Anthropic |
| `WORKLOG_SLACK_WEBHOOK` | Slack webhook for scheduled reports |
| `WORKLOG_TIMEZONE` | Override timezone for date boundaries |
| `WORKLOG_DASHBOARD_PORT` | Override dashboard port (default: 3000) |

## Output Examples

**Concise (default):**
```markdown
# Daily Standup - January 2, 2026

**worklog**: Add verbose mode; Update documentation; Fix formatting

**api-server**: Implement OAuth flow; Add rate limiting
```

**Verbose (`-v`):**
```markdown
# Daily Standup - January 2, 2026

## worklog
**Summary**: 2 features, 1 documentation

**Features** (2):
- Add verbose mode and commit type grouping
- Implement GitHub PR title fetching

**Documentation** (1):
- Update README with new examples

**AI Sessions** (1):
- Implementing enhanced project reporting
```

## Installation

### Quick Install
```bash
curl -fsSL https://raw.githubusercontent.com/jvalentini/worklog/main/install.sh | bash
```

Options:
- `--no-config` - Skip setup wizard
- `--version v1.0.0` - Install specific version

### From Source
```bash
git clone http://github.com/jvalentini/worklog.git
cd worklog
bun install
bun link
```

### Requirements
- `git` (for git source)
- `gh` CLI (optional, for GitHub source - run `gh auth login`)

## Development

```bash
make help      # Show all commands
make dev       # Run in development
make test      # Run tests
make check     # Lint + typecheck
make fix       # Auto-fix lint issues
make build     # Build for all platforms
make install   # Install to ~/.local/bin
```

## Breaking Changes (v2.0)

- Output is now **project-centric** (grouped by repo)
- LLM summarization is **opt-in** (`--llm` flag required)
- `--legacy` flag removed

## License

MIT
