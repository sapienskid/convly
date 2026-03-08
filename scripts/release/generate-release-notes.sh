#!/usr/bin/env bash
set -Eeuo pipefail

SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd -P)"
REPO_ROOT="$(cd -- "$SCRIPT_DIR/../.." && pwd -P)"

VERSION="${1:-}"
OUTPUT_FILE="${2:-$REPO_ROOT/release-notes.md}"

log_error() {
	printf '[%s] ERROR: %s\n' "$(date +'%Y-%m-%d %H:%M:%S')" "$*" >&2
}

usage() {
	cat <<USAGE
Usage: $0 <version> [output_file]

Examples:
  $0 0.2.0
  $0 0.2.0 /tmp/release-notes.md
USAGE
}

trap 'log_error "Release notes generation failed at line $LINENO"' ERR

require_cmd() {
	local -r cmd="$1"
	if ! command -v "$cmd" >/dev/null 2>&1; then
		log_error "Missing required command: $cmd"
		exit 1
	fi
}

main() {
	if [[ -z "$VERSION" ]]; then
		usage
		exit 1
	fi

	require_cmd git

	cd "$REPO_ROOT"

	local -r tag="v$VERSION"
	local -r full_sha="$(git rev-parse HEAD)"
	local -r short_sha="$(git rev-parse --short=12 HEAD)"
	local -r release_date="$(date -u +'%Y-%m-%d')"

	local previous_tag=''
	previous_tag="$(git tag --list 'v*' --sort=-v:refname | grep -Fxv "$tag" | head -n1 || true)"

	local changes=''
	if [[ -n "$previous_tag" ]]; then
		changes="$(git log --no-merges --pretty=format:'- %s (%h)' "$previous_tag..HEAD" | sed '/^[[:space:]]*$/d' || true)"
	else
		changes="$(git log --no-merges --pretty=format:'- %s (%h)' | sed '/^[[:space:]]*$/d' || true)"
	fi

	if [[ -z "$changes" ]]; then
		changes='- Maintenance release.'
	fi

	local repo_slug="${GITHUB_REPOSITORY:-}"
	if [[ -z "$repo_slug" ]]; then
		repo_slug="$(git remote get-url origin 2>/dev/null | sed -E 's#(git@github.com:|https://github.com/)##; s#\.git$##' || true)"
	fi

	mkdir -p "$(dirname -- "$OUTPUT_FILE")"

	{
		echo "# Convly Studio $tag"
		echo
		echo "Date: $release_date"
		echo "Commit: \`$full_sha\`"
		if [[ -n "$previous_tag" ]]; then
			echo "Previous tag: \`$previous_tag\`"
		fi
		echo
		echo "## Summary"
		echo "Automated release for version \`$VERSION\` from commit \`$short_sha\`."
		echo
		echo "## Changes"
		echo "$changes"
		if [[ -n "$repo_slug" && -n "$previous_tag" ]]; then
			echo
			echo "## Compare"
			echo "https://github.com/$repo_slug/compare/$previous_tag...$tag"
		fi
	} > "$OUTPUT_FILE"
}

main "$@"
