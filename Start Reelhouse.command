#!/bin/bash
# Double-click to start Reelhouse on a Mac.
cd "$(dirname "$0")" || exit 1
if ! command -v node >/dev/null 2>&1; then
  echo "Reelhouse needs Node.js. Opening the download page: install the LTS version, then double-click this file again."
  open "https://nodejs.org"
  read -r -p "Press Enter to close."
  exit 1
fi
node scripts/launch.mjs
