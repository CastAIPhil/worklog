#!/usr/bin/env bash
set -euo pipefail

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

INSTALL_DIR="${HOME}/.worklog"
REPO_URL="https://github.com/jvalentini/worklog.git"

info() { echo -e "${GREEN}[*]${NC} $1"; }
warn() { echo -e "${YELLOW}[!]${NC} $1"; }
error() { echo -e "${RED}[x]${NC} $1"; exit 1; }

# Check for required tools
command -v git >/dev/null 2>&1 || error "git is required but not installed"
command -v bun >/dev/null 2>&1 || error "bun is required. Install from https://bun.sh"

info "Installing worklog..."

# Clone or update repository
if [ -d "$INSTALL_DIR" ]; then
    info "Updating existing installation..."
    cd "$INSTALL_DIR"
    git pull --ff-only origin main
else
    info "Cloning repository..."
    git clone "$REPO_URL" "$INSTALL_DIR"
    cd "$INSTALL_DIR"
fi

# Install dependencies
info "Installing dependencies..."
bun install

# Create symlink in ~/.local/bin (common user bin directory)
BIN_DIR="${HOME}/.local/bin"
mkdir -p "$BIN_DIR"

SYMLINK="${BIN_DIR}/worklog"
if [ -L "$SYMLINK" ] || [ -e "$SYMLINK" ]; then
    rm "$SYMLINK"
fi
ln -s "${INSTALL_DIR}/bin/worklog.ts" "$SYMLINK"

info "Installed worklog to ${SYMLINK}"

# Check if BIN_DIR is in PATH
if [[ ":$PATH:" != *":$BIN_DIR:"* ]]; then
    warn "Add ${BIN_DIR} to your PATH:"
    echo ""
    echo "  echo 'export PATH=\"\$HOME/.local/bin:\$PATH\"' >> ~/.bashrc"
    echo "  # or for zsh:"
    echo "  echo 'export PATH=\"\$HOME/.local/bin:\$PATH\"' >> ~/.zshrc"
    echo ""
fi

info "Done! Run 'worklog --help' to get started."
