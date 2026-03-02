//go:build ignore

package main

import (
	"encoding/json"
	"fmt"
	"net/http"
	"os"
	"strings"
	"time"
)

const (
	apiBase = "https://api.cloudflare.com/client/v4"
)

var requiredPerms = []string{
	"Workers Scripts Write",
	"Account Settings Read",
	"Workers R2 Storage Write",
	"Cloudflare Pages Write",
}

func main() {
	// Read required environment variables
	apiKey := os.Getenv("CLOUDFLARE_API_KEY")
	email := os.Getenv("CLOUDFLARE_EMAIL")
	accountID := os.Getenv("CLOUDFLARE_ACCOUNT_ID")

	if apiKey == "" {
		fmt.Fprintln(os.Stderr, "ERROR: CLOUDFLARE_API_KEY is required")
		os.Exit(1)
	}
	if email == "" {
		fmt.Fprintln(os.Stderr, "ERROR: CLOUDFLARE_EMAIL is required")
		os.Exit(1)
	}
	if accountID == "" {
		fmt.Fprintln(os.Stderr, "ERROR: CLOUDFLARE_ACCOUNT_ID is required")
		os.Exit(1)
	}

	fmt.Printf("Creating Cloudflare API Token: SafetyWallet Deploy Token\n")
	fmt.Printf("Account ID: %s\n", accountID)
	fmt.Println()

	// Step 1: Fetch permission groups
	permIDs, err := fetchPermissionGroups(apiKey, email)
	if err != nil {
		fmt.Fprintf(os.Stderr, "ERROR: Failed to fetch permission groups: %v\n", err)
		os.Exit(1)
	}

	// Verify all required permissions found
	missing := []string{}
	for _, p := range requiredPerms {
		if permIDs[p] == "" {
			missing = append(missing, p)
		}
	}
	if len(missing) > 0 {
		fmt.Fprintln(os.Stderr, "ERROR: Could not find required permission groups:")
		for _, p := range missing {
			fmt.Fprintf(os.Stderr, "  - %s: NOT FOUND\n", p)
		}
		os.Exit(1)
	}

	fmt.Println("Fetching permission group IDs...")
	fmt.Printf("  Workers Scripts Write: %s\n", permIDs["Workers Scripts Write"])
	fmt.Printf("  Account Settings Read: %s\n", permIDs["Account Settings Read"])
	fmt.Printf("  Workers R2 Storage Write: %s\n", permIDs["Workers R2 Storage Write"])
	fmt.Printf("  Cloudflare Pages Write: %s\n", permIDs["Cloudflare Pages Write"])
	fmt.Println()

	// Step 2: Create token
	tokenValue, tokenID, err := createToken(apiKey, email, accountID, permIDs)
	if err != nil {
		fmt.Fprintf(os.Stderr, "ERROR: Failed to create token: %v\n", err)
		os.Exit(1)
	}

	fmt.Println("=== TOKEN CREATED SUCCESSFULLY ===")
	fmt.Printf("Token ID: %s\n", tokenID)
	fmt.Println("Token Name: SafetyWallet Deploy Token")
	fmt.Println()
	fmt.Println("=== ADD THESE TO GITHUB SECRETS ===")
	fmt.Printf("CLOUDFLARE_API_TOKEN=%s\n", tokenValue)
	fmt.Printf("CLOUDFLARE_ACCOUNT_ID=%s\n", accountID)
	fmt.Println()
	fmt.Println("WARNING: This token value is shown only once. Save it now!")
}

func fetchPermissionGroups(apiKey, email string) (map[string]string, error) {
	req, err := http.NewRequest("GET", apiBase+"/user/tokens/permission_groups", nil)
	if err != nil {
		return nil, err
	}
	req.Header.Set("X-Auth-Email", email)
	req.Header.Set("X-Auth-Key", apiKey)

	client := &http.Client{Timeout: 30 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("HTTP %d", resp.StatusCode)
	}

	var result struct {
		Result []struct {
			ID   string `json:"id"`
			Name string `json:"name"`
		} `json:"result"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return nil, err
	}

	permIDs := make(map[string]string)
	for _, p := range result.Result {
		permIDs[p.Name] = p.ID
	}
	return permIDs, nil
}

func createToken(apiKey, email, accountID string, permIDs map[string]string) (string, string, error) {
	// Build permission_groups array
	var permGroups []map[string]string
	for _, p := range requiredPerms {
		permGroups = append(permGroups, map[string]string{"id": permIDs[p]})
	}

	payload := map[string]interface{}{
		"name": "SafetyWallet Deploy Token",
		"policies": []map[string]interface{}{
			{
				"effect": "allow",
				"resources": map[string]string{
					"com.cloudflare.api.account." + accountID: "*",
				},
				"permission_groups": permGroups,
			},
		},
	}

	body, err := json.Marshal(payload)
	if err != nil {
		return "", "", err
	}

	req, err := http.NewRequest("POST", apiBase+"/user/tokens", strings.NewReader(string(body)))
	if err != nil {
		return "", "", err
	}
	req.Header.Set("X-Auth-Email", email)
	req.Header.Set("X-Auth-Key", apiKey)
	req.Header.Set("Content-Type", "application/json")

	client := &http.Client{Timeout: 30 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		return "", "", err
	}
	defer resp.Body.Close()

	var result struct {
		Success bool `json:"success"`
		Result  struct {
			ID    string `json:"id"`
			Value string `json:"value"`
		} `json:"result"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return "", "", err
	}

	if !result.Success {
		return "", "", fmt.Errorf("API returned error")
	}

	return result.Result.Value, result.Result.ID, nil
}
