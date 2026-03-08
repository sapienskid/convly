#!/usr/bin/env bash
set -Eeuo pipefail

SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd -P)"
REPO_ROOT="$(cd -- "$SCRIPT_DIR/../.." && pwd -P)"

log_info() {
	printf '[%s] INFO: %s\n' "$(date +'%Y-%m-%d %H:%M:%S')" "$*" >&2
}

log_error() {
	printf '[%s] ERROR: %s\n' "$(date +'%Y-%m-%d %H:%M:%S')" "$*" >&2
}

trap 'log_error "Release verification failed at line $LINENO"' ERR

require_cmd() {
	local -r cmd="$1"
	if ! command -v "$cmd" >/dev/null 2>&1; then
		log_error "Missing required command: $cmd"
		exit 1
	fi
}

main() {
	require_cmd pnpm
	require_cmd cargo

	cd "$REPO_ROOT"

	log_info 'Running type and Svelte checks'
	pnpm run check

	log_info 'Running unit tests'
	pnpm run test

	log_info 'Building SvelteKit frontend'
	pnpm run build

	log_info 'Running Rust checks'
	cargo check --manifest-path "$REPO_ROOT/src-tauri/Cargo.toml"

	log_info 'Release verification completed successfully'
}

main "$@"
