# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [2.0.0](https://github.com/jvalentini/worklog/compare/worklog-v1.1.0...worklog-v2.0.0) (2026-01-01)


### ⚠ BREAKING CHANGES

* This release introduces v2.0.0 with improved install.sh and binary distribution

### Features

* prepare for v2.0.0 major release ([529199a](https://github.com/jvalentini/worklog/commit/529199af0c9c8c3f0700c0059aedf2c3cd8aa685))


### Bug Fixes

* correct JSON formatting in generated config.json ([f439812](https://github.com/jvalentini/worklog/commit/f439812fe0e45418408cd78ab41bf9432e635f2f))


### Chores

* configure release-please to skip releases, use tags-only approach ([0669359](https://github.com/jvalentini/worklog/commit/0669359555725840ae10100090c07266e93e1ed7))

## [1.1.0](https://github.com/jvalentini/worklog/compare/worklog-v1.0.0...worklog-v1.1.0) (2026-01-01)


### Features

* add one-liner install script ([67bb2f7](https://github.com/jvalentini/worklog/commit/67bb2f7020e63e12cbe2fb0b246d01c4054b1477))
* Initial worklog CLI implementation ([f155af3](https://github.com/jvalentini/worklog/commit/f155af3278230c41543fe8a58138417132431518))


### Documentation

* add comprehensive README with usage, configuration, and examples ([de2bdc7](https://github.com/jvalentini/worklog/commit/de2bdc721ce93fa19353d19c0b788c45e25ddd05))
* add repo URL to README ([ed17fc4](https://github.com/jvalentini/worklog/commit/ed17fc48e33a11a459ecd224e6fe9d847870bdbd))
* add repository stats badges to README ([1238309](https://github.com/jvalentini/worklog/commit/1238309d469ead70fe1747525d9176d44d85d54b))
* clarify sources, fix output example, update URL ([4ba143d](https://github.com/jvalentini/worklog/commit/4ba143d54ce8a79bf6a96c8b71e7cd3dfe32728d))
* update changelog for release-please setup ([4f4c24d](https://github.com/jvalentini/worklog/commit/4f4c24d4d1e0e149e867c5aa2092a575f7af8d5f))


### Styles

* apply biome formatting to tsconfig.json ([c5be4a7](https://github.com/jvalentini/worklog/commit/c5be4a7c486337b9a5133199fe92a9a8e5c78c45))


### Tests

* add unit tests for date utilities ([e5ba1e9](https://github.com/jvalentini/worklog/commit/e5ba1e9a7a33c89d8c43ee47425c4639699d7b96))


### Chores

* add biome and oxlint to mise tools ([d8d6a14](https://github.com/jvalentini/worklog/commit/d8d6a147c50fb5db2cf9616711bb1fd46775d544))
* add issues permission and PAT support for release-please ([0f58945](https://github.com/jvalentini/worklog/commit/0f5894576d171672b08e1b97595b9b8d4be963d2))
* add linting, pre-commit hooks, and CI/CD workflows ([9b86628](https://github.com/jvalentini/worklog/commit/9b86628e0f5873197e0c4c3046bb3d24e9d2ff71))
* add release-please manifest file ([0387695](https://github.com/jvalentini/worklog/commit/03876958924213681e4d23b2c7511d003b6cef49))
* release v1.0.0 ([9a98f61](https://github.com/jvalentini/worklog/commit/9a98f61fbc4aacd6ed0852614e5c27aa64815d22))
* remove install.sh ([1472d05](https://github.com/jvalentini/worklog/commit/1472d0549ae9f0e720317ca695d3ed6273eea89c))
* setup release-please for automated releases ([29da1e0](https://github.com/jvalentini/worklog/commit/29da1e0073ad64d284def369250bd6c38b3ef001))
* update release-please action to correct name ([9cc2055](https://github.com/jvalentini/worklog/commit/9cc2055b9d5ed9cd84ebb9c88e892f16030a02e8))


### Continuous Integration

* add Docker integration test for install.sh ([f33ad66](https://github.com/jvalentini/worklog/commit/f33ad66814f24f4615b0f3a42a91b8317ef06ef0))

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

### Chores
- Improve install.sh with binary downloads and interactive config wizard (#7) — thanks @jvalentini
