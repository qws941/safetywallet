//go:build ignore

package main

import (
	"fmt"
	"os"
	"os/exec"
	"path/filepath"
)

func main() {
	if err := run(); err != nil {
		fmt.Fprintf(os.Stderr, "Error: %v\n", err)
		os.Exit(1)
	}
}

func run() error {
	fmt.Println("Building all workspaces...")

	// Step 1: Run npm run build
	cmd := exec.Command("npm", "run", "build")
	cmd.Stdout = os.Stdout
	cmd.Stderr = os.Stderr
	if err := cmd.Run(); err != nil {
		return fmt.Errorf("npm run build failed: %w", err)
	}

	// Step 2: Create dist directory
	fmt.Println("Preparing combined dist directory...")
	distDir := "dist"
	if err := os.MkdirAll(distDir, 0755); err != nil {
		return fmt.Errorf("failed to create dist directory: %w", err)
	}

	// Step 3: Copy static exports with corrected app names
	copied := false

	// Copy worker (corrected from worker-app)
	if err := copyStaticExport("apps/worker/out", distDir, "worker"); err != nil {
		return err
	}
	if fileInfo, err := os.Stat("apps/worker/out"); err == nil && fileInfo.IsDir() {
		copied = true
	}

	// Copy admin (corrected from admin-app)
	if err := copyStaticExport("apps/admin/out", filepath.Join(distDir, "admin"), "admin"); err != nil {
		return err
	}
	if fileInfo, err := os.Stat("apps/admin/out"); err == nil && fileInfo.IsDir() {
		copied = true
	}

	if !copied {
		fmt.Println("Warning: No static exports found to copy")
	} else {
		fmt.Println("Combined static assets ready in dist/")
	}

	return nil
}

func copyStaticExport(srcDir, destDir, appName string) error {
	if _, err := os.Stat(srcDir); os.IsNotExist(err) {
		fmt.Printf("Warning: %s out/ directory does not exist, skipping\n", appName)
		return nil
	}

	fmt.Printf("Copying %s...\n", appName)

	// Create destination directory
	if err := os.MkdirAll(destDir, 0755); err != nil {
		return fmt.Errorf("failed to create directory %s: %w", destDir, err)
	}

	// Walk and copy files recursively
	return filepath.Walk(srcDir, func(path string, info os.FileInfo, err error) error {
		if err != nil {
			return err
		}

		// Calculate relative path
		relPath, err := filepath.Rel(srcDir, path)
		if err != nil {
			return err
		}

		// Skip the root directory itself
		if relPath == "." {
			return nil
		}

		destPath := filepath.Join(destDir, relPath)

		if info.IsDir() {
			return os.MkdirAll(destPath, info.Mode())
		}

		// Copy file
		return copyFile(path, destPath)
	})
}

func copyFile(src, dest string) error {
	srcFile, err := os.Open(src)
	if err != nil {
		return fmt.Errorf("failed to open %s: %w", src, err)
	}
	defer srcFile.Close()

	destFile, err := os.Create(dest)
	if err != nil {
		return fmt.Errorf("failed to create %s: %w", dest, err)
	}
	defer destFile.Close()

	buf := make([]byte, 32*1024)
	for {
		n, err := srcFile.Read(buf)
		if n > 0 {
			if _, writeErr := destFile.Write(buf[:n]); writeErr != nil {
				return fmt.Errorf("failed to write %s: %w", dest, writeErr)
			}
		}
		if err != nil {
			if err.Error() == "EOF" {
				break
			}
			return fmt.Errorf("failed to read %s: %w", src, err)
		}
	}

	// Preserve file permissions
	srcInfo, err := os.Stat(src)
	if err == nil {
		os.Chmod(dest, srcInfo.Mode())
	}

	return nil
}
