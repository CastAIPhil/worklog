# Smoke Test Checklist

This checklist verifies the core functionality added in the feat/beads branch: project attribution, trends analysis, and cron integration.

## Attribution (Project-Centric Output)

### Basic Functionality
- [ ] `worklog` (default) shows project-centric output instead of source-centric
- [ ] `worklog --yesterday` works correctly
- [ ] `worklog --week` works correctly
- [ ] `worklog --month` works correctly
- [ ] `worklog -v` (verbose mode) works with project-centric view
- [ ] `worklog --json` produces valid JSON output
- [ ] `worklog --slack` produces Slack-formatted output
- [ ] `worklog --plain` produces plain text output

### Source Attribution
- [ ] Git commits are correctly attributed to projects
- [ ] AI sessions (OpenCode/Claude/Codex) are correctly attributed to projects
- [ ] GitHub activity is correctly attributed to projects
- [ ] VS Code/Cursor activity is correctly attributed to projects
- [ ] Terminal activity is correctly attributed to projects

### LLM Integration
- [ ] `worklog --llm` generates AI summaries (requires API key)
- [ ] `worklog -v --llm` works with verbose mode
- [ ] LLM summaries are project-focused, not source-focused

## Trends Analysis

### Basic Trends
- [ ] `worklog --trends` shows current vs previous period comparison
- [ ] `worklog --trends --week` compares this week to last week
- [ ] `worklog --trends --month` compares this month to last month
- [ ] Trends show percentage changes for each project
- [ ] Trends handle edge cases (no previous data, zero activity)

### Trends Output Formats
- [ ] `worklog --trends --json` produces valid JSON
- [ ] `worklog --trends --slack` produces Slack-formatted trends
- [ ] `worklog --trends --plain` produces plain text trends

## Cron Integration

### Cron Setup
- [ ] `worklog cron install` creates cron job successfully
- [ ] `worklog cron status` shows cron job status
- [ ] `worklog cron uninstall` removes cron job successfully

### Cron Execution
- [ ] `worklog cron run` executes without errors
- [ ] Cron job creates daily standup file in `~/.local/share/worklog/daily/`
- [ ] Cron job respects configured output format (markdown by default)

### Cron with Slack
- [ ] `worklog cron install --slack <webhook>` configures Slack posting
- [ ] Cron job successfully posts to Slack webhook
- [ ] Slack message uses proper formatting and emojis

## Integration Tests

### Multi-Source Attribution
- [ ] Single project with activity from multiple sources (Git + AI + GitHub) appears correctly grouped
- [ ] Multiple projects each get their own section
- [ ] Projects with no activity don't appear in output

### Error Handling
- [ ] Invalid date ranges handled gracefully
- [ ] Missing config files handled gracefully
- [ ] Network failures (GitHub API) handled gracefully
- [ ] Missing API keys for LLM handled gracefully

### Performance
- [ ] `worklog --week` completes in reasonable time (< 30 seconds)
- [ ] `worklog --month` completes in reasonable time (< 60 seconds)
- [ ] Memory usage stays reasonable during large data processing

## Regression Tests

### Backward Compatibility
- [ ] All existing CLI flags still work
- [ ] All existing config options still work
- [ ] All existing output formats still work

### Data Integrity
- [ ] Commit messages and counts are accurate
- [ ] AI session data is parsed correctly
- [ ] GitHub activity data is fetched correctly
- [ ] Date calculations are accurate

## Manual Verification Steps

1. **Set up test data**: Ensure you have recent activity across multiple sources
2. **Run basic commands**: Verify project-centric output is working
3. **Test trends**: Compare output with manual calculations
4. **Test cron**: Set up cron job and verify it runs and posts correctly
5. **Cross-reference**: Compare worklog output with actual GitHub/Git history

## Quick Smoke Test Commands

```bash
# Basic functionality
worklog
worklog -v
worklog --yesterday
worklog --json | jq .  # Should be valid JSON

# Trends
worklog --trends
worklog --trends --week
worklog --trends --json

# Cron
worklog cron install
worklog cron status
worklog cron run
worklog cron uninstall
```

## Environment Setup for Testing

Ensure these are configured for full testing:
- Git repositories in config
- GitHub CLI authenticated (`gh auth status`)
- OpenAI/Anthropic API key for LLM features
- Slack webhook URL for cron testing
- Recent activity data across multiple sources