# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2026-01-01

### Features
- Initial worklog CLI implementation
- One-liner install script
- Support for multiple AI agent sessions (OpenCode, Claude Code, Codex, Factory)
- Git commit history integration
- GitHub activity fetching (PRs, issues, reviews, comments)
- Flexible date ranges (today, yesterday, week, month, custom dates)
- Multiple output formats (Markdown, JSON, plain text, Slack)
- Comprehensive configuration system

### Tests
- Unit tests for date utilities
- Docker integration test for install.sh

### Chores
- Setup automated releases with release-please (#4) — thanks @jvalentini
- Linting, pre-commit hooks, and CI/CD workflows
- Biome and oxlint to mise tools

### Styles
- Apply biome formatting to tsconfig.json

### Documentation
- Add comprehensive README with usage, configuration, and examples
- Add repo URL to README

### Removed
- install.sh script

## [Unreleased]