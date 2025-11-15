/**
 * Smart Test Runner OpenCode Plugin
 *
 * Automatically runs tests when test files are created or modified.
 *
 * **Migration from**: Claude Code test-runner.py (PostToolUse)
 *
 * **Features**:
 * - Auto-detects test framework (pytest, jest, go test, cargo test)
 * - Smart scope control: run specific tests if few files changed
 * - Concise test result summary
 * - Non-blocking: won't interrupt workflow if tests fail
 *
 * **Supported frameworks**:
 * - **Python**: pytest, unittest
 * - **JavaScript/TypeScript**: jest, vitest, npm test
 * - **Go**: go test
 * - **Rust**: cargo test
 *
 * **Test file detection**:
 * - Python: `test_*.py`, `*_test.py`
 * - JavaScript: `*.test.js`, `*.spec.ts`, etc.
 * - Go: `*_test.go`
 * - Rust: `tests/*.rs`
 *
 * **Smart scope**:
 * - ≤3 test files: Run only those specific tests
 * - >3 test files: Run full test suite
 *
 * **Configuration** (optional):
 * Set in opencode.json:
 * ```json
 * {
 *   "settings": {
 *     "test_runner": {
 *       "enabled": true,
 *       "auto_run": true,
 *       "file_threshold": 3,
 *       "timeout": 120000
 *     }
 *   }
 * }
 * ```
 *
 * **Test this plugin**:
 * 1. Enable plugin in opencode.json
 * 2. Edit a test file (e.g., test_example.py)
 * 3. Verify tests run automatically
 * 4. Check output for test summary
 */

import { Plugin } from '@opencode/plugin-api'
import { $ } from 'zx'
import * as path from 'path'
import * as fs from 'fs/promises'

interface TestInfo {
  isTest: boolean
  language?: string
}

// Test file patterns
const TEST_PATTERNS: Record<string, RegExp[]> = {
  python: [/test_.*\.py$/, /.*_test\.py$/],
  javascript: [/.*\.test\.(js|ts|jsx|tsx)$/, /.*\.spec\.(js|ts|jsx|tsx)$/],
  go: [/.*_test\.go$/],
  rust: [/tests\/.*\.rs$/]
}

export const TestRunnerPlugin: Plugin = async ({ $ }) => {
  /**
   * Check if file is a test file
   */
  function isTestFile(filePath: string): TestInfo {
    for (const [language, patterns] of Object.entries(TEST_PATTERNS)) {
      for (const pattern of patterns) {
        if (pattern.test(filePath)) {
          return { isTest: true, language }
        }
      }
    }
    return { isTest: false }
  }

  /**
   * Detect test framework for the language
   */
  async function detectTestFramework(language: string, projectDir: string): Promise<string | null> {
    if (language === 'python') {
      // Check for pytest
      try {
        await fs.access(path.join(projectDir, 'pytest.ini'))
        return 'pytest'
      } catch {
        try {
          await fs.access(path.join(projectDir, 'pyproject.toml'))
          return 'pytest'
        } catch {
          return 'python -m unittest'
        }
      }
    }

    if (language === 'javascript') {
      // Check package.json for test script
      try {
        const packageJsonPath = path.join(projectDir, 'package.json')
        const packageJson = JSON.parse(await fs.readFile(packageJsonPath, 'utf-8'))
        if (packageJson.scripts?.test) {
          return 'npm test'
        }
      } catch {
        // Fall back to npm test
      }
      return 'npm test'
    }

    if (language === 'go') {
      return 'go test'
    }

    if (language === 'rust') {
      return 'cargo test'
    }

    return null
  }

  /**
   * Run tests and display results
   */
  async function runTests(testCommand: string, testFiles: string[], projectDir: string) {
    console.log(`\n[test-runner] Running tests: ${testCommand}`)

    try {
      let result: any

      // Determine scope - run specific tests or full suite
      if (testFiles.length <= 3) {
        // Run specific test files
        if (testCommand.includes('pytest')) {
          result = await $`cd ${projectDir} && pytest ${testFiles} -v`.nothrow()
        } else if (testCommand.includes('npm test')) {
          result = await $`cd ${projectDir} && npm test -- --testPathPattern="${testFiles[0]}"`.nothrow()
        } else if (testCommand.includes('go test')) {
          result = await $`cd ${projectDir} && go test -v ${testFiles}`.nothrow()
        } else if (testCommand.includes('cargo test')) {
          result = await $`cd ${projectDir} && cargo test`.nothrow()
        } else {
          result = await $`cd ${projectDir} && ${testCommand}`.nothrow()
        }
      } else {
        // Run full test suite
        result = await $`cd ${projectDir} && ${testCommand}`.nothrow()
      }

      const output = result.stdout + result.stderr

      // Print results
      console.log('\n[test-runner] Test Results:')
      console.log('='.repeat(60))

      if (result.exitCode === 0) {
        console.log('✓ All tests passed!')
      } else {
        console.log('✗ Some tests failed')
      }

      // Extract summary based on framework
      if (testCommand.includes('pytest')) {
        const summaryMatch = output.match(/(\d+\s+\w+(?:,\s+\d+\s+\w+)*)\s+in\s+[\d.]+s/)
        if (summaryMatch) {
          console.log(`Summary: ${summaryMatch[1]}`)
        }
      } else if (testCommand.includes('jest') || testCommand.includes('npm test')) {
        const summaryMatch = output.match(/Tests:\s+(.+)/)
        if (summaryMatch) {
          console.log(`Summary: ${summaryMatch[1]}`)
        }
      } else if (testCommand.includes('go test')) {
        if (output.includes('PASS')) {
          console.log('Summary: All tests passed')
        } else if (output.includes('FAIL')) {
          console.log('Summary: Some tests failed')
        }
      } else if (testCommand.includes('cargo test')) {
        const summaryMatch = output.match(/test result:.*/)
        if (summaryMatch) {
          console.log(`Summary: ${summaryMatch[0]}`)
        }
      }

      console.log('='.repeat(60))

      // Show failed tests if any
      if (result.exitCode !== 0) {
        console.log('\n[test-runner] Failed test output:')
        const lines = output.split('\n')
        // Show last 20 lines
        const relevantLines = lines.slice(-20).filter(line => line.trim())
        relevantLines.forEach(line => console.log(`  ${line}`))
      }

    } catch (error) {
      console.warn('[test-runner] ⚠️  Error running tests:', error.message)
    }
  }

  return {
    tool: {
      execute: {
        /**
         * Run tests after Edit/Write on test files
         */
        after: async (input, output) => {
          // Only process Edit and Write tools
          if (input.tool !== 'Edit' && input.tool !== 'Write') {
            return
          }

          const filePath = input.parameters?.file_path

          if (!filePath) {
            return
          }

          // Check if this is a test file
          const { isTest, language } = isTestFile(filePath)

          if (!isTest || !language) {
            return
          }

          // Get project directory
          const projectDir = process.cwd()

          // Detect test framework
          const testCommand = await detectTestFramework(language, projectDir)

          if (!testCommand) {
            console.warn(`[test-runner] Could not detect test framework for ${language}`)
            return
          }

          // Run tests
          await runTests(testCommand, [filePath], projectDir)
        }
      }
    }
  }
}

export default TestRunnerPlugin
