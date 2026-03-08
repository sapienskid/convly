#!/usr/bin/env bash
set -Eeuo pipefail

SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd -P)"
REPO_ROOT="$(cd -- "$SCRIPT_DIR/../.." && pwd -P)"

PREFIX="/usr/local"
SKIP_DEPS=false
SKIP_VERIFY=false
SKIP_BUILD=false

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
  --prefix PATH      Installation prefix (default: /usr/local)
  --skip-deps        Skip pacman dependency installation
  --skip-verify      Skip release verification checks
  --skip-build       Skip build step and install an existing release binary
  -h, --help         Show this help text
USAGE
}

run_as_root() {
	if [[ "$EUID" -eq 0 ]]; then
		"$@"
	else
		if ! command -v sudo >/dev/null 2>&1; then
			log_error 'sudo is required for system installation'
			exit 1
		fi
		sudo "$@"
	fi
}

require_cmd() {
	local -r cmd="$1"
	if ! command -v "$cmd" >/dev/null 2>&1; then
		log_error "Missing required command: $cmd"
		exit 1
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
			--skip-deps)
				SKIP_DEPS=true
				shift
				;;
			--skip-verify)
				SKIP_VERIFY=true
				shift
				;;
			--skip-build)
				SKIP_BUILD=true
				shift
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

install_arch_dependencies() {
	require_cmd pacman

	if [[ ! -f /etc/arch-release ]]; then
		log_error 'This installer supports Arch Linux systems only'
		exit 1
	fi

	local -a deps=(
		base-devel
		nodejs
		pnpm
		rustup
		webkit2gtk-4.1
		gtk3
		libsoup3
	)

	log_info 'Installing build/runtime dependencies using pacman'
	run_as_root pacman -S --needed --noconfirm "${deps[@]}"
}

ensure_rust_toolchain() {
	if ! command -v rustup >/dev/null 2>&1; then
		log_error 'rustup is required to set up the Rust toolchain'
		exit 1
	fi

	if ! command -v rustc >/dev/null 2>&1; then
		log_info 'Configuring stable Rust toolchain'
		rustup default stable
	fi
}

build_release_binary() {
	cd "$REPO_ROOT"

	require_cmd pnpm
	require_cmd cargo

	log_info 'Installing JavaScript dependencies from lockfile'
	pnpm install --frozen-lockfile

	if [[ "$SKIP_VERIFY" == false ]]; then
		log_info 'Running release verification before installation'
		"$REPO_ROOT/scripts/release/verify.sh"
	elif [[ "$SKIP_BUILD" == false ]]; then
		log_info 'Building frontend assets (verification skipped)'
		pnpm run build
	fi

	if [[ "$SKIP_BUILD" == false ]]; then
		log_info 'Compiling release binary'
		cargo build --manifest-path "$REPO_ROOT/src-tauri/Cargo.toml" --release
	fi
}

resolve_binary_path() {
	local -a candidates=(
		"$REPO_ROOT/src-tauri/target/release/convly_studio"
		"$REPO_ROOT/src-tauri/target/release/convly-studio"
	)

	local candidate=""
	for candidate in "${candidates[@]}"; do
		if [[ -x "$candidate" ]]; then
			printf '%s\n' "$candidate"
			return 0
		fi
	done

	log_error 'Unable to find release binary. Run with build enabled first.'
	exit 1
}

install_artifacts() {
	local -r binary_path="$1"
	local -r icon_path="$REPO_ROOT/src-tauri/icons/128x128.png"

	if [[ ! -f "$icon_path" ]]; then
		log_error "Icon not found: $icon_path"
		exit 1
	fi

	local tmpdir=''
	tmpdir="$(mktemp -d)"
	trap 'rm -rf -- "$tmpdir"' EXIT

	local desktop_file="$tmpdir/convly-studio.desktop"
	cat > "$desktop_file" <<DESKTOP
[Desktop Entry]
Name=Convly Studio
Comment=Visual conversation storyboard and vertical video exporter
Exec=$PREFIX/bin/convly-studio
Icon=convly-studio
Terminal=false
Type=Application
Categories=AudioVideo;Video;
StartupWMClass=Convly Studio
DESKTOP

	log_info "Installing binary into $PREFIX"
	run_as_root install -Dm755 "$binary_path" "$PREFIX/bin/convly-studio"
	run_as_root install -Dm644 "$icon_path" "$PREFIX/share/icons/hicolor/128x128/apps/convly-studio.png"
	run_as_root install -Dm644 "$desktop_file" "$PREFIX/share/applications/convly-studio.desktop"

	log_info 'Installation finished'
	log_info "Launch with: $PREFIX/bin/convly-studio"
}

main() {
	parse_args "$@"

	if [[ "$SKIP_DEPS" == false ]]; then
		install_arch_dependencies
	fi

	ensure_rust_toolchain
	build_release_binary
	install_artifacts "$(resolve_binary_path)"
}

trap 'log_error "Installation failed at line $LINENO"' ERR
main "$@"
