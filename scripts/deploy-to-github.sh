#!/usr/bin/env bash
set -euo pipefail

REPO_NAME="noahs-reader"
export PATH="/opt/homebrew/bin:$PATH"

cd "$(dirname "$0")/.."

if ! gh auth status &>/dev/null; then
  echo "Log in to GitHub first:"
  gh auth login --hostname github.com --git-protocol https --web
fi

USERNAME=$(gh api user -q .login)
echo "Deploying as $USERNAME → https://${USERNAME}.github.io/${REPO_NAME}/"

if git remote get-url origin &>/dev/null; then
  git push -u origin main
else
  gh repo create "$REPO_NAME" --public --source=. --remote=origin --push --description "Noah's Reader — RSVP speed reading web app"
fi

gh api "repos/${USERNAME}/${REPO_NAME}/pages" -X POST -f build_type=workflow 2>/dev/null || true

echo ""
echo "Done! Site will be live in ~1–2 minutes at:"
echo "https://${USERNAME}.github.io/${REPO_NAME}/"
