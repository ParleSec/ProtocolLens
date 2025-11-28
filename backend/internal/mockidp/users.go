package mockidp

import (
	"crypto/sha256"
	"encoding/base64"
	"time"
)

// UserClaims returns OIDC claims for a user
func (idp *MockIdP) UserClaims(userID string, scopes []string) map[string]interface{} {
	user, exists := idp.GetUser(userID)
	if !exists {
		return nil
	}

	claims := make(map[string]interface{})

	// Always include sub
	claims["sub"] = user.ID

	// Check scopes and include appropriate claims
	for _, scope := range scopes {
		switch scope {
		case "profile":
			claims["name"] = user.Name
			claims["preferred_username"] = user.ID
			claims["updated_at"] = user.CreatedAt.Unix()
		case "email":
			claims["email"] = user.Email
			claims["email_verified"] = true // Demo assumes verified
		case "roles":
			claims["roles"] = user.Roles
		}
	}

	// Add custom claims
	for k, v := range user.Claims {
		claims[k] = v
	}

	return claims
}

// CreateUserInfoResponse creates a UserInfo response for OIDC
func (idp *MockIdP) CreateUserInfoResponse(userID string, scopes []string) map[string]interface{} {
	return idp.UserClaims(userID, scopes)
}

// GetUserRoles returns the roles for a user
func (idp *MockIdP) GetUserRoles(userID string) []string {
	user, exists := idp.GetUser(userID)
	if !exists {
		return nil
	}
	return user.Roles
}

// HasRole checks if a user has a specific role
func (idp *MockIdP) HasRole(userID string, role string) bool {
	roles := idp.GetUserRoles(userID)
	for _, r := range roles {
		if r == role {
			return true
		}
	}
	return false
}

// PKCE utilities

// validatePKCE validates the code verifier against the code challenge
func validatePKCE(verifier, challenge, method string) bool {
	if verifier == "" {
		return false
	}

	switch method {
	case "S256":
		// SHA256 hash of verifier, base64url encoded
		hash := sha256.Sum256([]byte(verifier))
		computed := base64.RawURLEncoding.EncodeToString(hash[:])
		return computed == challenge
	case "plain":
		return verifier == challenge
	default:
		// Default to S256 if not specified
		hash := sha256.Sum256([]byte(verifier))
		computed := base64.RawURLEncoding.EncodeToString(hash[:])
		return computed == challenge
	}
}

// GeneratePKCE generates a PKCE code verifier and challenge pair
func GeneratePKCE() (verifier, challenge string) {
	verifier = generateRandomString(64)
	hash := sha256.Sum256([]byte(verifier))
	challenge = base64.RawURLEncoding.EncodeToString(hash[:])
	return
}

// Demo user presets for quick selection

// DemoUserPreset represents a preset demo user configuration
type DemoUserPreset struct {
	ID          string            `json:"id"`
	Name        string            `json:"name"`
	Description string            `json:"description"`
	Credentials DemoCredentials   `json:"credentials"`
	Scopes      []string          `json:"suggested_scopes"`
}

// DemoCredentials contains login credentials for demo
type DemoCredentials struct {
	Email    string `json:"email"`
	Password string `json:"password"`
}

// GetDemoUserPresets returns preset configurations for demo users
func (idp *MockIdP) GetDemoUserPresets() []DemoUserPreset {
	return []DemoUserPreset{
		{
			ID:          "alice",
			Name:        "Alice (Standard User)",
			Description: "A standard user with basic permissions",
			Credentials: DemoCredentials{
				Email:    "alice@example.com",
				Password: "password123",
			},
			Scopes: []string{"openid", "profile", "email"},
		},
		{
			ID:          "bob",
			Name:        "Bob (Standard User)",
			Description: "Another standard user for testing multi-user scenarios",
			Credentials: DemoCredentials{
				Email:    "bob@example.com",
				Password: "password123",
			},
			Scopes: []string{"openid", "profile", "email"},
		},
		{
			ID:          "admin",
			Name:        "Admin (Elevated Permissions)",
			Description: "An administrator with elevated permissions and roles",
			Credentials: DemoCredentials{
				Email:    "admin@example.com",
				Password: "admin123",
			},
			Scopes: []string{"openid", "profile", "email", "roles"},
		},
	}
}

// Demo client presets

// DemoClientPreset represents a preset demo client configuration
type DemoClientPreset struct {
	ID          string   `json:"id"`
	Name        string   `json:"name"`
	Description string   `json:"description"`
	Type        string   `json:"type"` // "confidential", "public", "machine"
	GrantTypes  []string `json:"grant_types"`
	Scopes      []string `json:"scopes"`
	Secret      string   `json:"secret,omitempty"`
}

// GetDemoClientPresets returns preset configurations for demo clients
func (idp *MockIdP) GetDemoClientPresets() []DemoClientPreset {
	return []DemoClientPreset{
		{
			ID:          "demo-app",
			Name:        "Demo Application (Confidential)",
			Description: "A server-side application with a client secret",
			Type:        "confidential",
			GrantTypes:  []string{"authorization_code", "refresh_token"},
			Scopes:      []string{"openid", "profile", "email"},
			Secret:      "demo-secret",
		},
		{
			ID:          "public-app",
			Name:        "Public Application (SPA)",
			Description: "A single-page application without a client secret (uses PKCE)",
			Type:        "public",
			GrantTypes:  []string{"authorization_code", "refresh_token"},
			Scopes:      []string{"openid", "profile", "email"},
		},
		{
			ID:          "machine-client",
			Name:        "Machine-to-Machine Client",
			Description: "A service account for API access without user context",
			Type:        "machine",
			GrantTypes:  []string{"client_credentials"},
			Scopes:      []string{"api:read", "api:write"},
			Secret:      "machine-secret",
		},
	}
}

// TokenMetadata provides metadata about issued tokens for inspection
type TokenMetadata struct {
	TokenType   string    `json:"token_type"`
	Subject     string    `json:"subject"`
	ClientID    string    `json:"client_id"`
	Scope       string    `json:"scope"`
	IssuedAt    time.Time `json:"issued_at"`
	ExpiresAt   time.Time `json:"expires_at"`
	TokenID     string    `json:"token_id,omitempty"`
}

// CreateTokenMetadata creates metadata for a token (for looking glass)
func CreateTokenMetadata(tokenType, subject, clientID, scope string, issuedAt, expiresAt time.Time) TokenMetadata {
	return TokenMetadata{
		TokenType: tokenType,
		Subject:   subject,
		ClientID:  clientID,
		Scope:     scope,
		IssuedAt:  issuedAt,
		ExpiresAt: expiresAt,
	}
}

