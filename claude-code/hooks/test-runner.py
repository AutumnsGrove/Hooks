#!/usr/bin/env python3
# CLAUDE_HOOK_EVENT: PostToolUse
"""
Smart Test Runner - Automatically run tests when test files are created/modified

Features:
- Auto-detects test framework (pytest, jest, go test, cargo test, etc.)
- Smart scope control: run related tests only if ≤3 files changed
- Supports: Python, JavaScript/TypeScript, Go, Rust
- Displays concise test results

Supported test frameworks:
- Python: pytest, unittest
- JavaScript/TypeScript: jest, vitest, npm test
- Go: go test
- Rust: cargo test

Test file detection patterns:
- Python: test_*.py, *_test.py
- JavaScript: *.test.js, *.spec.js, *.test.ts, *.spec.ts
- Go: *_test.go
- Rust: tests/ directory, #[test] in src/
"""

import json
import sys
import os
import subprocess
import re
from pathlib import Path

# Read hook input
input_data = json.load(sys.stdin)

# Only process Edit and Write tools
tool_name = input_data.get("tool_name", "")
if tool_name not in ["Edit", "Write"]:
    sys.exit(0)

# Get file paths
file_paths_str = os.getenv("CLAUDE_FILE_PATHS", "")
if not file_paths_str:
    sys.exit(0)

file_paths = [p.strip() for p in file_paths_str.split(",") if p.strip()]

# Test file patterns
TEST_PATTERNS = {
    'python': [r'test_.*\.py$', r'.*_test\.py$'],
    'javascript': [r'.*\.test\.(js|ts|jsx|tsx)$', r'.*\.spec\.(js|ts|jsx|tsx)$'],
    'go': [r'.*_test\.go$'],
    'rust': [r'tests/.*\.rs$']
}

def is_test_file(file_path):
    """Check if file is a test file."""
    for language, patterns in TEST_PATTERNS.items():
        for pattern in patterns:
            if re.search(pattern, file_path):
                return True, language
    return False, None

def detect_test_framework(language, project_dir):
    """Detect which test framework to use."""
    if language == 'python':
        # Check for pytest
        if os.path.exists(os.path.join(project_dir, 'pytest.ini')) or \
           os.path.exists(os.path.join(project_dir, 'pyproject.toml')):
            return 'pytest'
        return 'python -m unittest'

    elif language == 'javascript':
        # Check package.json for test script
        package_json = os.path.join(project_dir, 'package.json')
        if os.path.exists(package_json):
            try:
                with open(package_json) as f:
                    import json as json_lib
                    data = json_lib.load(f)
                    if 'scripts' in data and 'test' in data['scripts']:
                        return 'npm test'
            except:
                pass
        return 'npm test'

    elif language == 'go':
        return 'go test'

    elif language == 'rust':
        return 'cargo test'

    return None

def run_tests(test_command, test_files, project_dir):
    """Run tests and return results."""
    print(f"\n[test-runner] Running tests: {test_command}", file=sys.stderr)

    # Determine scope
    if len(test_files) <= 3:
        # Run specific test files
        if 'pytest' in test_command:
            cmd = f"cd {project_dir} && pytest {' '.join(test_files)} -v"
        elif 'npm test' in test_command:
            cmd = f"cd {project_dir} && npm test -- --testPathPattern=\"{test_files[0]}\""
        elif 'go test' in test_command:
            cmd = f"cd {project_dir} && go test -v {' '.join(test_files)}"
        elif 'cargo test' in test_command:
            cmd = f"cd {project_dir} && cargo test"
        else:
            cmd = f"cd {project_dir} && {test_command}"
    else:
        # Run full test suite
        cmd = f"cd {project_dir} && {test_command}"

    try:
        result = subprocess.run(
            cmd,
            shell=True,
            capture_output=True,
            text=True,
            timeout=120  # 2 minute timeout
        )

        # Parse output for summary
        output = result.stdout + result.stderr

        # Print results
        print(f"\n[test-runner] Test Results:", file=sys.stderr)
        print("=" * 60, file=sys.stderr)

        if result.returncode == 0:
            print("✓ All tests passed!", file=sys.stderr)
        else:
            print("✗ Some tests failed", file=sys.stderr)

        # Extract summary based on framework
        if 'pytest' in test_command:
            # pytest: "5 passed, 2 failed in 1.23s"
            summary_match = re.search(r'(\d+\s+\w+(?:,\s+\d+\s+\w+)*)\s+in\s+[\d.]+s', output)
            if summary_match:
                print(f"Summary: {summary_match.group(1)}", file=sys.stderr)

        elif 'jest' in test_command or 'npm test' in test_command:
            # Jest: "Tests: 2 failed, 5 passed, 7 total"
            summary_match = re.search(r'Tests:\s+(.+)', output)
            if summary_match:
                print(f"Summary: {summary_match.group(1)}", file=sys.stderr)

        elif 'go test' in test_command:
            # Go: "PASS" or "FAIL"
            if 'PASS' in output:
                print("Summary: All tests passed", file=sys.stderr)
            elif 'FAIL' in output:
                print("Summary: Some tests failed", file=sys.stderr)

        elif 'cargo test' in test_command:
            # Cargo: "test result: ok. 5 passed; 0 failed"
            summary_match = re.search(r'test result:.*', output)
            if summary_match:
                print(f"Summary: {summary_match.group(0)}", file=sys.stderr)

        print("=" * 60, file=sys.stderr)

        # Show failed tests if any
        if result.returncode != 0:
            print("\n[test-runner] Failed test output:", file=sys.stderr)
            # Print last 20 lines of output
            lines = output.split('\n')
            for line in lines[-20:]:
                if line.strip():
                    print(f"  {line}", file=sys.stderr)

    except subprocess.TimeoutExpired:
        print("[test-runner] ⚠️  Tests timed out after 2 minutes", file=sys.stderr)
    except Exception as e:
        print(f"[test-runner] ⚠️  Error running tests: {e}", file=sys.stderr)

# Check if any files are test files
test_files = []
language = None

for file_path in file_paths:
    if file_path and os.path.isfile(file_path):
        is_test, detected_lang = is_test_file(file_path)
        if is_test:
            test_files.append(file_path)
            if language is None:
                language = detected_lang

# If no test files, exit
if not test_files:
    sys.exit(0)

# Get project directory
project_dir = os.getenv("CLAUDE_PROJECT_DIR", os.getcwd())

# Detect test framework
test_command = detect_test_framework(language, project_dir)

if not test_command:
    print(f"[test-runner] Could not detect test framework for {language}", file=sys.stderr)
    sys.exit(0)

# Run tests
run_tests(test_command, test_files, project_dir)

sys.exit(0)
