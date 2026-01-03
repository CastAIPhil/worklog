# worklog

<div align="center">

[![GitHub Stars](https://img.shields.io/github/stars/jvalentini/worklog?style=flat)](https://github.com/jvalentini/worklog/stargazers)
[![GitHub License](https://img.shields.io/github/license/jvalentini/worklog?style=flat)](https://github.com/jvalentini/worklog/blob/main/LICENSE)
[![Lines of Code](https://tokei.rs/b1/github/jvalentini/worklog?category=code)](https://github.com/jvalentini/worklog)

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
worklog -D               # Launch web dashboard
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
- **Scheduled Reports** - Cron integration with Slack support

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
| `-D, --dashboard` | Launch interactive web dashboard |
| `-T, --theme <name>` | Dashboard theme (`default`, `chaos`) |

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

**`worklog cron`** - Manage scheduled reports
```bash
worklog cron install              # Install (default 9am)
worklog cron install -t 08:30     # Custom time
worklog cron install -s <webhook> # Post to Slack
worklog cron status               # Check status
worklog cron uninstall            # Remove
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
| `OPENAI_API_KEY` | Required for `--llm` with OpenAI |
| `ANTHROPIC_API_KEY` | Required for `--llm` with Anthropic |
| `WORKLOG_SLACK_WEBHOOK` | Slack webhook for cron reports |

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
