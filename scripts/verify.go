//go:build ignore

package main

import (
	"fmt"
	"os"
	"os/exec"
	"path/filepath"
	"strings"
	"time"
)

// ANSI color codes
const (
	red    = "\033[0;31m"
	green  = "\033[0;32m"
	yellow = "\033[1;33m"
	cyan   = "\033[0;36m"
	bold   = "\033[1m"
	nc     = "\033[0m"
)

type stepResult int

const (
	resultPass stepResult = iota
	resultFail
	resultSkip
)

type step struct {
	name   string
	label  string
	result stepResult
}

func main() {
	startTime := time.Now()

	// Parse --skip-build flag
	skipBuild := false
	for _, arg := range os.Args[1:] {
		if arg == "--skip-build" {
			skipBuild = true
		}
	}

	results := runAllSteps(skipBuild)

	// Print summary
	printSummary(results, startTime)

	// Exit with appropriate code
	failed := 0
	for _, r := range results {
		if r.result == resultFail {
			failed++
		}
	}
	if failed > 0 {
		fmt.Printf("%s%sVERIFICATION FAILED%s — %d check(s) did not pass.%s\n", red, bold, nc, failed, nc)
		os.Exit(1)
	}
	fmt.Printf("%s%sALL CHECKS PASSED%s\n", green, bold, nc)
	os.Exit(0)
}

func runAllSteps(skipBuild bool) []step {
	results := []step{}

	// Step 1: Typecheck
	results = append(results, runStep("1/7", "TypeScript Type Check", "typecheck", func() error {
		return runCommand("npx", "turbo", "run", "typecheck")
	}))

	// Step 2: Lint
	results = append(results, runStep("2/7", "ESLint", "lint", func() error {
		return runCommand("npx", "turbo", "run", "lint")
	}))

	// Step 3: Unit Tests
	results = append(results, runStep("3/7", "Unit Tests (Vitest)", "test", func() error {
		return runCommand("npx", "vitest", "run")
	}))

	// Step 4: Anti-pattern Check
	results = append(results, runAntiPatternStep())

	// Step 5: Naming Lint
	results = append(results, runStep("5/7", "Naming Convention Check", "lint:naming", func() error {
		return runCommand("node", "scripts/lint-naming.js")
	}))

	// Step 6: Wrangler Sync
	results = append(results, runStep("6/7", "Wrangler Binding Sync", "wrangler-sync", func() error {
		return runCommand("node", "scripts/check-wrangler-sync.js")
	}))

	// Step 7: Build
	if skipBuild {
		results = append(results, step{
			name:   "7/7",
			label:  "Build (SKIPPED)",
			result: resultSkip,
		})
		printStepHeader("7/7", "Build (SKIPPED)")
		fmt.Printf("%s⊘ Build skipped via --skip-build%s\n", yellow, nc)
	} else {
		results = append(results, runStep("7/7", "Production Build", "build", func() error {
			return runCommand("npx", "turbo", "run", "build")
		}))
	}

	return results
}

func runStep(num, label, name string, fn func() error) step {
	printStepHeader(num, label)

	stepStart := time.Now()
	err := fn()
	elapsed := int(time.Since(stepStart).Seconds())

	if err != nil {
		fmt.Printf("%s✗ %s FAILED (%ds)%s\n", red, label, elapsed, nc)
		return step{name: name, label: label, result: resultFail}
	}
	fmt.Printf("%s✓ %s (%ds)%s\n", green, label, elapsed, nc)
	return step{name: name, label: label, result: resultPass}
}

func runAntiPatternStep() step {
	printStepHeader("4/7", "Anti-pattern Scan")

	// Find all .ts/.tsx files in apps/ and packages/
	var tsFiles []string
	err := filepath.Walk(".", func(path string, info os.FileInfo, err error) error {
		if err != nil {
			return nil
		}

		// Skip certain directories
		if info.IsDir() {
			dirName := info.Name()
			if dirName == "node_modules" || dirName == ".next" || dirName == "dist" || dirName == "coverage" || dirName == ".git" {
				return filepath.SkipDir
			}
			return nil
		}

		// Check for .ts or .tsx files
		name := info.Name()
		if strings.HasSuffix(name, ".ts") || strings.HasSuffix(name, ".tsx") {
			// Only include files in apps/ or packages/
			if strings.HasPrefix(path, "apps/") || strings.HasPrefix(path, "packages/") {
				tsFiles = append(tsFiles, path)
			}
		}
		return nil
	})

	if err != nil {
		fmt.Printf("%s✗ Anti-pattern Scan FAILED: %v%s\n", red, err, nc)
		return step{name: "anti-patterns", label: "Anti-pattern Scan", result: resultFail}
	}

	if len(tsFiles) == 0 {
		fmt.Printf("%s⊘ No TS/TSX files found to scan%s\n", yellow, nc)
		return step{name: "anti-patterns", label: "Anti-pattern Scan", result: resultSkip}
	}

	// Limit to 500 files like the shell script
	if len(tsFiles) > 500 {
		tsFiles = tsFiles[:500]
	}

	// Run check-anti-patterns.go with the files
	stepStart := time.Now()
	args := append([]string{"go", "run", "scripts/check-anti-patterns.go"}, tsFiles...)
	cmd := exec.Command(args[0], args[1:]...)
	cmd.Stdout = os.Stdout
	cmd.Stderr = os.Stderr
	err = cmd.Run()
	elapsed := int(time.Since(stepStart).Seconds())

	if err != nil {
		fmt.Printf("%s✗ Anti-pattern Scan FAILED (%ds)%s\n", red, elapsed, nc)
		return step{name: "anti-patterns", label: "Anti-pattern Scan", result: resultFail}
	}
	fmt.Printf("%s✓ Anti-pattern Scan (%ds)%s\n", green, elapsed, nc)
	return step{name: "anti-patterns", label: "Anti-pattern Scan", result: resultPass}
}

func printStepHeader(num, label string) {
	fmt.Printf("\n%s━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━%s\n", cyan, nc)
	fmt.Printf("%s[%s] %s%s\n", bold, num, label, nc)
	fmt.Printf("%s━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━%s\n", cyan, nc)
}

func printSummary(results []step, startTime time.Time) {
	passed := 0
	failed := 0
	skipped := 0
	for _, r := range results {
		switch r.result {
		case resultPass:
			passed++
		case resultFail:
			failed++
		case resultSkip:
			skipped++
		}
	}
	total := passed + failed + skipped
	elapsed := int(time.Since(startTime).Seconds())

	fmt.Printf("\n%s━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━%s\n", cyan, nc)
	fmt.Printf("%sVERIFICATION SUMMARY%s\n", bold, nc)
	fmt.Printf("%s━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━%s\n", cyan, nc)
	fmt.Printf("  %s✓ Passed:  %d%s\n", green, passed, nc)
	if failed > 0 {
		fmt.Printf("  %s✗ Failed:  %d%s\n", red, failed, nc)
	}
	if skipped > 0 {
		fmt.Printf("  %s⊘ Skipped: %d%s\n", yellow, skipped, nc)
	}
	fmt.Printf("  Total:   %d checks in %ds\n", total, elapsed)
	fmt.Println()
}

func runCommand(name string, args ...string) error {
	cmd := exec.Command(name, args...)
	cmd.Stdout = os.Stdout
	cmd.Stderr = os.Stderr
	return cmd.Run()
}
