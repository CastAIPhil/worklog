.PHONY: help i deps dev t c fix build install uninstall clean docker-test completion

# Detect platform
UNAME_S := $(shell uname -s)
UNAME_M := $(shell uname -m)

ifeq ($(UNAME_S),Darwin)
  ifeq ($(UNAME_M),arm64)
    PLATFORM := darwin-arm64
  else
    PLATFORM := darwin-x64
  endif
else ifeq ($(UNAME_S),Linux)
  ifeq ($(UNAME_M),aarch64)
    PLATFORM := linux-arm64
  else
    PLATFORM := linux-x64
  endif
endif

INSTALL_DIR := $(HOME)/.local/bin
BINARY := worklog

help:
	@echo "Usage: make <target>"
	@echo ""
	@echo "  deps          Install dependencies"
	@echo "  dev           Run in development mode"
	@echo "  t, test       Run tests"
	@echo "  c, check      Run all checks (lint + typecheck)"
	@echo "  fix           Auto-fix linting issues"
	@echo "  build         Build for all platforms"
	@echo "  i, install    Build and install binary to ~/.local/bin"
	@echo "  uninstall     Remove binary from ~/.local/bin"
	@echo "  completion    Set up bash completion for worklog"
	@echo "  docker-test   Test install script in Docker"

deps:
	bun install

dev:
	bun run dev

t test:
	bun test

c check:
	bun run check

fix:
	bun run lint:fix

build:
	bun run build

i install:
	@echo "Building for $(PLATFORM)..."
	bun build bin/worklog.ts --compile --target=bun-$(PLATFORM) --outfile=dist/$(BINARY)-$(PLATFORM)
	@mkdir -p $(INSTALL_DIR)
	@cp dist/$(BINARY)-$(PLATFORM) $(INSTALL_DIR)/$(BINARY)
	@chmod +x $(INSTALL_DIR)/$(BINARY)
	@echo "Installed $(BINARY) to $(INSTALL_DIR)/$(BINARY)"
	@echo ""
	@echo "Make sure $(INSTALL_DIR) is in your PATH:"
	@echo '  export PATH="$$HOME/.local/bin:$$PATH"'
	@echo ""
	./install.sh --config-only

uninstall:
	@rm -f $(INSTALL_DIR)/$(BINARY)
	@echo "Removed $(BINARY) from $(INSTALL_DIR)"

clean:
	rm -rf dist node_modules

completion:
	@echo "Setting up bash completion for worklog..."
	@bun bin/worklog.ts completion > "$(HOME)/.worklog-completion.sh"
	@touch "$(HOME)/.bashrc"
	@grep -qxF 'source ~/.worklog-completion.sh' "$(HOME)/.bashrc" || echo 'source ~/.worklog-completion.sh' >> "$(HOME)/.bashrc"
	@echo "Bash completion installed. Run 'source ~/.bashrc' to activate."

docker-test:
	docker build -f Dockerfile.test -t worklog-test . && docker run --rm worklog-test
