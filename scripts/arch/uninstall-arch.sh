#!/usr/bin/env bash
set -Eeuo pipefail

PREFIX="/usr/local"

log_info() {
	printf '[%s] INFO: %s\n' "$(date +'%Y-%m-%d %H:%M:%S')" "$*" >&2
}

log_error() {
	printf '[%s] ERROR: %s\n' "$(date +'%Y-%m-%d %H:%M:%S')" "$*" >&2
}

usage() {
	cat <<USAGE
Usage: $0 [OPTIONS]

Options:
  --prefix PATH      Installation prefix used during install (default: /usr/local)
  -h, --help         Show this help text
USAGE
}

run_as_root() {
	if [[ "$EUID" -eq 0 ]]; then
		"$@"
	else
		if ! command -v sudo >/dev/null 2>&1; then
			log_error 'sudo is required to remove system files'
			exit 1
		fi
		sudo "$@"
	fi
}

parse_args() {
	while [[ $# -gt 0 ]]; do
		case "$1" in
			--)
				shift
				continue
				;;
			--prefix)
				PREFIX="${2:-}"
				if [[ -z "$PREFIX" ]]; then
					log_error '--prefix requires a non-empty value'
					exit 1
				fi
				shift 2
				;;
			-h|--help)
				usage
				exit 0
				;;
			*)
				log_error "Unknown option: $1"
				usage
				exit 1
				;;
		esac
	done
}

main() {
	parse_args "$@"

	local -a targets=(
		"$PREFIX/bin/convly-studio"
		"$PREFIX/share/applications/convly-studio.desktop"
		"$PREFIX/share/icons/hicolor/128x128/apps/convly-studio.png"
	)

	local target=""
	for target in "${targets[@]}"; do
		if [[ -e "$target" ]]; then
			log_info "Removing $target"
			run_as_root rm -f -- "$target"
		else
			log_info "Skipping missing path: $target"
		fi
	done

	log_info 'Uninstall complete'
}

trap 'log_error "Uninstall failed at line $LINENO"' ERR
main "$@"
