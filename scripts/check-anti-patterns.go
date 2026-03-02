//go:build ignore

// SafetyWallet Anti-Pattern Guard
// Blocks commits containing forbidden patterns defined in AGENTS.md
// Usage: go run scripts/check-anti-patterns.go <file1> <file2> ...

package main

import (
	"bufio"
	"bytes"
	"fmt"
	"os"
	"path/filepath"
	"regexp"
	"strings"
)

type antiPattern struct {
	name    string
	pattern *regexp.Regexp
}

func main() {
	if len(os.Args) < 2 {
		fmt.Fprintf(os.Stderr, "Usage: go run scripts/check-anti-patterns.go <file1> <file2> ...\n")
		os.Exit(1)
	}

	patterns := []antiPattern{
		{name: "'as any'", pattern: regexp.MustCompile(`\bas\s+any\b`)},
		{name: "'@ts-ignore' or '@ts-expect-error'", pattern: regexp.MustCompile(`@ts-ignore|@ts-expect-error`)},
		{name: "'console.log'", pattern: regexp.MustCompile(`\bconsole\.log\b`)},
		{name: "Native dialog (window.alert/confirm)", pattern: regexp.MustCompile(`\bwindow\.(alert|confirm)\b`)},
		{name: "Empty catch block", pattern: regexp.MustCompile(`(?s)catch\s*\([^)]*\)\s*\{\s*\}`)},
	}

	files := os.Args[1:]
	totalErrors := 0

	for _, file := range files {
		if shouldSkip(file) {
			continue
		}

		errors := checkFile(file, patterns)
		totalErrors += errors
	}

	if totalErrors > 0 {
		fmt.Println("")
		fmt.Printf("COMMIT BLOCKED: %d anti-pattern violation(s) found.\n", totalErrors)
		fmt.Println("See AGENTS.md for project constraints.")
		os.Exit(1)
	}
}

func shouldSkip(file string) bool {
	base := filepath.Base(file)
	// Skip test files
	if strings.Contains(base, ".test.") || strings.Contains(base, ".spec.") || strings.Contains(base, "__tests__") {
		return true
	}
	// Skip scripts directory
	if strings.Contains(file, "/scripts/") || strings.HasPrefix(file, "scripts/") {
		return true
	}
	return false
}

func checkFile(file string, patterns []antiPattern) int {
	content, err := os.ReadFile(file)
	if err != nil {
		// Skip files that can't be read (e.g., binary files)
		return 0
	}

	errors := 0

	// Check first 4 patterns (line-based)
	for _, p := range patterns[:4] {
		scanner := bufio.NewScanner(bytes.NewReader(content))
		lineNum := 0
		for scanner.Scan() {
			lineNum++
			if p.pattern.Match(scanner.Bytes()) {
				line := scanner.Text()
				fmt.Printf("%d:%s\n", lineNum, line)
				fmt.Printf("  BLOCKED: %s in %s\n", p.name, file)
				errors++
			}
		}
	}

	// Check empty catch block pattern (multiline)
	p := patterns[4]
	if p.pattern.Match(content) {
		fmt.Printf("  BLOCKED: %s in %s\n", p.name, file)
		errors++
	}

	return errors
}
