#!/usr/bin/env bash
# Quick deployment wrapper for hooks

cd "$(dirname "$0")"
uv run python deploy_hooks.py
