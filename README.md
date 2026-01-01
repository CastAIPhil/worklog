# worklog

A CLI tool that aggregates development activity from multiple sources to generate daily stand-up summaries. Perfect for developers who work with AI coding assistants and want a quick summary of their work.

## Features

- **Multiple AI Sources**: Aggregates sessions from OpenCode, Claude Code, Codex, and Factory
- **Git Integration**: Pulls commit history from configured repositories
- **GitHub Activity**: Fetches pushes, PRs, issues, reviews, and comments via `gh` CLI
- **Flexible Date Ranges**: Today, yesterday, this week, this month, or specific dates
- **Multiple Output Formats**: Markdown, JSON, plain text, or Slack-formatted

## Installation

```bash
# Clone and install
git clone https://github.com/jvalentini/worklog.git
cd worklog
bun install

# Run directly
bun run bin/worklog.ts

# Or link globally
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

# Specify sources
worklog --sources git,github,opencode

# Specify git repos
worklog --repos ~/code/project1,~/code/project2

# Verbose output
worklog -v
```

## Configuration

Create `~/.config/worklog/config.json`:

```json
{
  "defaultSources": ["opencode", "claude", "codex", "factory", "git", "github"],
  "gitRepos": [
    "~/code/project1",
    "~/code/project2"
  ],
  "githubUser": "your-username",
  "paths": {
    "opencode": "~/.local/share/opencode/storage/session",
    "claude": "~/.claude/projects",
    "codex": "~/.codex/sessions",
    "factory": "~/.factory/sessions"
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
| `git` | Git commit history | Configured repositories |
| `github` | GitHub activity | Via `gh api` (requires `gh` CLI) |

### GitHub Source

The GitHub source requires the [GitHub CLI](https://cli.github.com/) (`gh`) to be installed and authenticated:

```bash
gh auth login
```

## Output Examples

### Markdown (default)

```markdown
# Daily Standup - Tue, Dec 31, 2025

## :wrench: OpenCode Sessions

- **09:15** OpenCode session: Refactoring authentication module
  - 12 interactions

## :memo: Git Commits

- **10:30** [project1] feat: add user authentication
- **14:22** [project1] fix: resolve token refresh issue

## :octocat: GitHub Activity

- **11:00** [org/repo] PR #42 opened: Add OAuth support
- **15:30** [org/repo] Reviewed PR #41: Update dependencies

---
*Generated at 2025-12-31 16:00:00*
```

### Slack Format

Uses Slack emoji codes (`:wrench:`, `:octocat:`, etc.) and mrkdwn formatting for posting directly to Slack.

## Development

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

- [Bun](https://bun.sh) runtime
- [GitHub CLI](https://cli.github.com/) (`gh`) for GitHub activity fetching

## License

MIT
