#!/usr/bin/env bash
set -Eeuo pipefail

# One-line entry point for the native LX Family Proxmox LXC installer.
# It keeps the Helper-Scripts engine upstream while resolving LX-specific
# CT and install files from this repository.
readonly LX_HELPER_ROOT="${LX_HELPER_ROOT:-https://raw.githubusercontent.com/laxxx-lab/lx-family-planner/main/deploy/proxmox-helper-scripts}"

export COMMUNITY_SCRIPTS_URL="$LX_HELPER_ROOT"
exec bash -c "$(curl -fsSL "$LX_HELPER_ROOT/ct/lx-family.sh")"
