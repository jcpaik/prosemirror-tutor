#!/usr/bin/env bash
# Fetch ProseMirror official docs and save as markdown.
# Usage: npm run fetch-docs (or bash scripts/fetch-docs.sh)
#
# Requires: pandoc (for HTML→Markdown conversion)
#   brew install pandoc

set -euo pipefail

DOCS_DIR="docs/prosemirror"
mkdir -p "$DOCS_DIR"

echo "Fetching ProseMirror guide..."
curl -sL https://prosemirror.net/docs/guide/ \
  | pandoc --from html --to gfm --wrap=none -o "$DOCS_DIR/guide.md"

echo "Fetching ProseMirror reference..."
curl -sL https://prosemirror.net/docs/ref/ \
  | pandoc --from html --to gfm --wrap=none -o "$DOCS_DIR/reference.md"

echo "Done. Docs saved to $DOCS_DIR/"
