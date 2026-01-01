#!/usr/bin/env bash
set -euo pipefail

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

REPO_SLUG="jvalentini/worklog"

BIN_DIR="${WORKLOG_BIN_DIR:-${HOME}/.local/bin}"
BIN_PATH="${BIN_DIR}/worklog"

CONFIG_HOME="${XDG_CONFIG_HOME:-${HOME}/.config}"
CONFIG_DIR="${CONFIG_HOME}/worklog"
CONFIG_PATH="${CONFIG_DIR}/config.json"

DEFAULT_OPENCODE_PATH="~/.local/share/opencode/storage/session"
DEFAULT_CLAUDE_PATH="~/.claude/projects"
DEFAULT_CODEX_PATH="~/.codex/sessions"
DEFAULT_FACTORY_PATH="~/.factory/sessions"

WORKLOG_VERSION="${WORKLOG_VERSION:-latest}"
WORKLOG_SKIP_CONFIG="${WORKLOG_SKIP_CONFIG:-0}"

info() { echo -e "${GREEN}[*]${NC} $1"; }
warn() { echo -e "${YELLOW}[!]${NC} $1"; }
error() {
	echo -e "${RED}[x]${NC} $1" >&2
	exit 1
}

have() {
	command -v "$1" >/dev/null 2>&1
}

PROMPT_IN=""
if [ -t 0 ]; then
	PROMPT_IN="/dev/stdin"
elif [ -t 1 ] && [ -r /dev/tty ]; then
	PROMPT_IN="/dev/tty"
fi

is_interactive() {
	[ -n "${PROMPT_IN}" ]
}

trim() {
	local value="$1"
	value="${value#"${value%%[![:space:]]*}"}"
	value="${value%"${value##*[![:space:]]}"}"
	printf '%s' "$value"
}

expand_tilde() {
	local value="$1"
	if [[ "$value" == "~" ]]; then
		echo "${HOME}"
		return
	fi
	if [[ "$value" == "~"/* ]]; then
		echo "${HOME}${value:1}"
		return
	fi
	echo "$value"
}

json_escape() {
	local value="$1"
	value="${value//\\/\\\\}"
	value="${value//\"/\\\"}"
	value="${value//$'\n'/}"
	printf '%s' "$value"
}

json_array() {
	local first=1
	printf '['
	for item in "$@"; do
		if [ $first -eq 1 ]; then
			first=0
		else
			printf ', '
		fi
		printf '"%s"' "$(json_escape "$item")"
	done
	printf ']'
}

prompt_yes_no() {
	local question="$1"
	local default_answer="${2:-y}"
	local reply=""

	if ! is_interactive; then
		[ "$default_answer" = "y" ] && return 0 || return 1
	fi

	while true; do
		local suffix
		if [ "$default_answer" = "y" ]; then
			suffix="Y/n"
		else
			suffix="y/N"
		fi

		echo -n "$question [$suffix]: " >&2
		IFS= read -r reply <"$PROMPT_IN" || true
		reply="$(echo "${reply:-}" | tr '[:upper:]' '[:lower:]')"

		if [ -z "${reply}" ]; then
			reply="$default_answer"
		fi

		case "$reply" in
			y|yes) return 0 ;;
			n|no) return 1 ;;
			*) echo "Please answer y or n." >&2 ;;
		esac
	done
}

prompt_input() {
	local question="$1"
	local default_value="${2:-}"
	local reply=""

	if ! is_interactive; then
		echo "${default_value}"
		return 0
	fi

	if [ -n "$default_value" ]; then
		echo -n "$question [$default_value]: " >&2
	else
		echo -n "$question: " >&2
	fi

	IFS= read -r reply <"$PROMPT_IN" || true
	reply="$(trim "${reply:-}")"

	if [ -z "$reply" ]; then
		reply="$default_value"
	fi

	echo "$reply"
}

detect_target() {
	local os arch
	case "$(uname -s)" in
		Darwin) os="darwin" ;;
		Linux) os="linux" ;;
		MINGW*|MSYS*|CYGWIN*) os="windows" ;;
		*) error "Unsupported OS: $(uname -s)" ;;
	esac

	case "$(uname -m)" in
		x86_64|amd64) arch="x64" ;;
		arm64|aarch64) arch="arm64" ;;
		*) error "Unsupported architecture: $(uname -m)" ;;
	esac

	echo "${os}-${arch}"
}

sha256_file() {
	local file="$1"
	if have sha256sum; then
		sha256sum "$file" | awk '{print $1}'
		return 0
	fi
	if have shasum; then
		shasum -a 256 "$file" | awk '{print $1}'
		return 0
	fi
	return 1
}

download() {
	local url="$1"
	local dest="$2"
	curl -fsSL "$url" -o "$dest"
}

install_binary() {
	have curl || error "curl is required but not installed"
	have mktemp || error "mktemp is required but not installed"

	local target asset tag base_url tmp_bin tmp_sum expected actual
	target="$(detect_target)"
	asset="worklog-${target}"
	local os_name
	os_name="${target%%-*}"
	if [ "$os_name" = "windows" ]; then
		asset="worklog-${target}.exe"
		BIN_PATH="${BIN_DIR}/worklog.exe"
	fi

	tag="$WORKLOG_VERSION"
	if [ "$tag" != "latest" ] && [[ "$tag" != v* ]]; then
		tag="v${tag}"
	fi

	if [ "$tag" = "latest" ]; then
		base_url="https://github.com/${REPO_SLUG}/releases/latest/download"
	else
		base_url="https://github.com/${REPO_SLUG}/releases/download/${tag}"
	fi

	tmp_bin="$(mktemp)"
	tmp_sum="$(mktemp)"

	info "Downloading ${asset} (${tag})..."
	if ! download "${base_url}/${asset}" "$tmp_bin"; then
		error "Failed to download ${asset}. Create a GitHub release first, or set WORKLOG_VERSION."
	fi

	if download "${base_url}/checksums.txt" "$tmp_sum"; then
		expected="$(grep -E " ${asset}$" "$tmp_sum" | awk '{print $1}' | head -n 1 || true)"
		if [ -n "$expected" ]; then
			actual="$(sha256_file "$tmp_bin" 2>/dev/null || true)"
			if [ -z "$actual" ]; then
				warn "sha256sum/shasum not found; skipping checksum verification"
			elif [ "$expected" != "$actual" ]; then
				error "Checksum mismatch for ${asset} (expected ${expected}, got ${actual})"
			fi
		else
			warn "checksums.txt did not include ${asset}; skipping checksum verification"
		fi
	else
		warn "Could not download checksums.txt; skipping checksum verification"
	fi

	mkdir -p "$BIN_DIR"
	chmod +x "$tmp_bin"

	if have install; then
		install -m 755 "$tmp_bin" "$BIN_PATH"
	else
		mv "$tmp_bin" "$BIN_PATH"
		chmod 755 "$BIN_PATH"
	fi

	rm -f "$tmp_bin" "$tmp_sum" >/dev/null 2>&1 || true

	info "Installed worklog to ${BIN_PATH}"
}

configure_worklog() {
	if [ "$WORKLOG_SKIP_CONFIG" = "1" ]; then
		return 0
	fi

	if [ -f "$CONFIG_PATH" ]; then
		if is_interactive; then
			info "Found existing config at ${CONFIG_PATH}"
			if ! prompt_yes_no "Overwrite existing config?" "n"; then
				return 0
			fi
		else
			info "Config already exists at ${CONFIG_PATH}; leaving it unchanged"
			return 0
		fi
	fi

	if ! is_interactive; then
		warn "No interactive terminal detected; skipping configuration wizard"
		warn "Create ${CONFIG_PATH} manually, or re-run install.sh in a terminal"
		return 0
	fi

	info "Starting worklog setup wizard..."
	echo "" >&2

	local opencode_path claude_path codex_path factory_path
	local use_opencode use_claude use_codex use_factory

	opencode_path="$DEFAULT_OPENCODE_PATH"
	claude_path="$DEFAULT_CLAUDE_PATH"
	codex_path="$DEFAULT_CODEX_PATH"
	factory_path="$DEFAULT_FACTORY_PATH"

	local use_opencode_default use_claude_default use_codex_default use_factory_default

	use_opencode_default="n"
	if [ -d "$(expand_tilde "$DEFAULT_OPENCODE_PATH")" ]; then
		use_opencode_default="y"
	fi
	if prompt_yes_no "Include OpenCode sessions from ${DEFAULT_OPENCODE_PATH}?" "$use_opencode_default"; then
		use_opencode="y"
		opencode_path="$(prompt_input "OpenCode sessions path" "$DEFAULT_OPENCODE_PATH")"
	else
		use_opencode="n"
	fi

	use_claude_default="n"
	if [ -d "$(expand_tilde "$DEFAULT_CLAUDE_PATH")" ]; then
		use_claude_default="y"
	fi
	if prompt_yes_no "Include Claude Code sessions from ${DEFAULT_CLAUDE_PATH}?" "$use_claude_default"; then
		use_claude="y"
		claude_path="$(prompt_input "Claude Code projects path" "$DEFAULT_CLAUDE_PATH")"
	else
		use_claude="n"
	fi

	use_codex_default="n"
	if [ -d "$(expand_tilde "$DEFAULT_CODEX_PATH")" ]; then
		use_codex_default="y"
	fi
	if prompt_yes_no "Include Codex sessions from ${DEFAULT_CODEX_PATH}?" "$use_codex_default"; then
		use_codex="y"
		codex_path="$(prompt_input "Codex sessions path" "$DEFAULT_CODEX_PATH")"
	else
		use_codex="n"
	fi

	use_factory_default="n"
	if [ -d "$(expand_tilde "$DEFAULT_FACTORY_PATH")" ]; then
		use_factory_default="y"
	fi
	if prompt_yes_no "Include Factory sessions from ${DEFAULT_FACTORY_PATH}?" "$use_factory_default"; then
		use_factory="y"
		factory_path="$(prompt_input "Factory sessions path" "$DEFAULT_FACTORY_PATH")"
	else
		use_factory="n"
	fi

	local repos=()
	if prompt_yes_no "Configure local git repositories for commit scanning?" "y"; then
		info "Add git repos one-by-one (press Enter when done)."
		while true; do
			local repo_input expanded_repo
			repo_input="$(prompt_input "Git repo path" "")"
			repo_input="$(trim "$repo_input")"
			if [ -z "$repo_input" ]; then
				break
			fi
			expanded_repo="$(expand_tilde "$repo_input")"
			if [ ! -d "$expanded_repo" ]; then
				warn "Directory not found: ${repo_input}"
				continue
			fi
			if have git && ! git -C "$expanded_repo" rev-parse --is-inside-work-tree >/dev/null 2>&1; then
				warn "Not a git repository: ${repo_input}"
				continue
			fi
			repos+=("$repo_input")
		done
	fi

	local sources=()
	if [ "$use_opencode" = "y" ]; then sources+=("opencode"); fi
	if [ "$use_claude" = "y" ]; then sources+=("claude"); fi
	if [ "$use_codex" = "y" ]; then sources+=("codex"); fi
	if [ "$use_factory" = "y" ]; then sources+=("factory"); fi
	if [ ${#repos[@]} -gt 0 ]; then sources+=("git"); fi

	if [ ${#sources[@]} -eq 0 ]; then
		warn "No sources selected; defaulting to git"
		sources=("git")
	fi

	mkdir -p "$CONFIG_DIR"

	local sources_json repos_json
	sources_json="$(json_array "${sources[@]}")"
	repos_json="$(json_array "${repos[@]}")"

	cat >"$CONFIG_PATH" <<EOF
{
  "defaultSources": ${sources_json},
  "gitRepos": ${repos_json},
  "paths": {
    "opencode": "$(json_escape "$opencode_path")",
    "claude": "$(json_escape "$claude_path")",
    "codex": "$(json_escape "$codex_path")",
    "factory": "$(json_escape "$factory_path")"
  }
}
EOF

	chmod 600 "$CONFIG_PATH" >/dev/null 2>&1 || true
	info "Wrote config to ${CONFIG_PATH}"
}

main() {
	while [ $# -gt 0 ]; do
		case "$1" in
			--no-config)
				WORKLOG_SKIP_CONFIG=1
				;;
			--version)
				shift
				WORKLOG_VERSION="${1:-}"
				[ -n "$WORKLOG_VERSION" ] || error "--version requires a value (e.g. 1.0.0 or v1.0.0)"
				;;
			-h|--help)
				echo "worklog installer"
				echo ""
				echo "Usage: install.sh [--version <tag>] [--no-config]"
				echo ""
				echo "Environment variables:"
				echo "  WORKLOG_VERSION=vX.Y.Z|latest   Release tag to install (default: latest)"
				echo "  WORKLOG_BIN_DIR=~/.local/bin    Install directory (default: ~/.local/bin)"
				echo "  WORKLOG_SKIP_CONFIG=1           Skip config wizard"
				exit 0
				;;
			*)
				error "Unknown option: $1"
				;;
		esac
		shift
	done

	info "Installing worklog..."
	install_binary
	configure_worklog

	if [[ ":$PATH:" != *":$BIN_DIR:"* ]]; then
		warn "Add ${BIN_DIR} to your PATH (example):"
		echo ""
		echo "  echo 'export PATH=\"${BIN_DIR}:\$PATH\"' >> ~/.bashrc"
		echo "  # or for zsh:"
		echo "  echo 'export PATH=\"${BIN_DIR}:\$PATH\"' >> ~/.zshrc"
		echo ""
	fi

	info "Done! Run 'worklog --help' to get started."
}

main "$@"
