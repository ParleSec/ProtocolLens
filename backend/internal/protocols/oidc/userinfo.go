package oidc

import (
	"encoding/json"
	"html"
	"net/http"
	"net/url"
	"strings"
	"time"

	"github.com/security-showcase/protocol-showcase/pkg/models"
)

// htmlEscape escapes a string for safe inclusion in HTML
func htmlEscape(s string) string {
	return html.EscapeString(s)
}

// handleAuthorize handles OIDC authorization requests
func (p *Plugin) handleAuthorize(w http.ResponseWriter, r *http.Request) {
	query := r.URL.Query()

	responseType := query.Get("response_type")
	clientID := query.Get("client_id")
	redirectURI := query.Get("redirect_uri")
	scope := query.Get("scope")
	state := query.Get("state")
	nonce := query.Get("nonce")
	codeChallenge := query.Get("code_challenge")
	codeChallengeMethod := query.Get("code_challenge_method")

	// Validate openid scope is present
	if !strings.Contains(scope, "openid") {
		writeOIDCError(w, http.StatusBadRequest, "invalid_scope", "openid scope is required for OIDC")
		return
	}

	// Validate required parameters
	if responseType != "code" {
		writeOIDCError(w, http.StatusBadRequest, "unsupported_response_type", "Only 'code' response type is supported")
		return
	}

	if clientID == "" {
		writeOIDCError(w, http.StatusBadRequest, "invalid_request", "client_id is required")
		return
	}

	// Validate client
	client, exists := p.mockIdP.GetClient(clientID)
	if !exists {
		writeOIDCError(w, http.StatusBadRequest, "invalid_client", "Unknown client")
		return
	}

	// Validate redirect URI
	if !p.mockIdP.ValidateRedirectURI(clientID, redirectURI) {
		writeOIDCError(w, http.StatusBadRequest, "invalid_request", "Invalid redirect_uri")
		return
	}

	// Generate login page with HTML-escaped values to prevent XSS
	loginPage := p.generateOIDCLoginPage(
		htmlEscape(clientID),
		htmlEscape(redirectURI),
		htmlEscape(scope),
		htmlEscape(state),
		htmlEscape(nonce),
		htmlEscape(codeChallenge),
		htmlEscape(codeChallengeMethod),
		htmlEscape(client.Name),
	)
	w.Header().Set("Content-Type", "text/html")
	w.Write([]byte(loginPage))
}

// handleAuthorizeSubmit handles OIDC login form submission
func (p *Plugin) handleAuthorizeSubmit(w http.ResponseWriter, r *http.Request) {
	if err := r.ParseForm(); err != nil {
		writeOIDCError(w, http.StatusBadRequest, "invalid_request", "Invalid form data")
		return
	}

	// Get form values
	email := r.FormValue("email")
	password := r.FormValue("password")
	clientID := r.FormValue("client_id")
	redirectURI := r.FormValue("redirect_uri")
	scope := r.FormValue("scope")
	state := r.FormValue("state")
	nonce := r.FormValue("nonce")
	codeChallenge := r.FormValue("code_challenge")
	codeChallengeMethod := r.FormValue("code_challenge_method")

	// Validate redirect URI against registered client URIs to prevent open redirect
	if !p.mockIdP.ValidateRedirectURI(clientID, redirectURI) {
		writeOIDCError(w, http.StatusBadRequest, "invalid_request", "Invalid redirect_uri")
		return
	}

	// Validate user credentials
	user, err := p.mockIdP.ValidateCredentials(email, password)
	if err != nil {
		// Return to login page with error - HTML escape all values to prevent XSS
		client, _ := p.mockIdP.GetClient(clientID)
		clientName := ""
		if client != nil {
			clientName = client.Name
		}
		loginPage := p.generateOIDCLoginPage(
			htmlEscape(clientID),
			htmlEscape(redirectURI),
			htmlEscape(scope),
			htmlEscape(state),
			htmlEscape(nonce),
			htmlEscape(codeChallenge),
			htmlEscape(codeChallengeMethod),
			htmlEscape(clientName),
		)
		loginPage = strings.Replace(loginPage, "<!-- ERROR -->", `<div class="error">Invalid email or password</div>`, 1)
		w.Header().Set("Content-Type", "text/html")
		w.Write([]byte(loginPage))
		return
	}

	// Create authorization code
	authCode, err := p.mockIdP.CreateAuthorizationCode(
		clientID, user.ID, redirectURI, scope, state, nonce,
		codeChallenge, codeChallengeMethod,
	)
	if err != nil {
		writeOIDCError(w, http.StatusInternalServerError, "server_error", "Failed to create authorization code")
		return
	}

	// Build redirect URL - redirect URI was already validated above
	redirectURL, err := url.Parse(redirectURI)
	if err != nil {
		writeOIDCError(w, http.StatusBadRequest, "invalid_request", "Malformed redirect_uri")
		return
	}
	q := redirectURL.Query()
	q.Set("code", authCode.Code)
	if state != "" {
		q.Set("state", state)
	}
	redirectURL.RawQuery = q.Encode()

	// Redirect to client (safe - redirect URI validated against registered URIs)
	http.Redirect(w, r, redirectURL.String(), http.StatusFound)
}

// handleToken handles OIDC token requests
func (p *Plugin) handleToken(w http.ResponseWriter, r *http.Request) {
	if err := r.ParseForm(); err != nil {
		writeOIDCError(w, http.StatusBadRequest, "invalid_request", "Invalid form data")
		return
	}

	grantType := r.FormValue("grant_type")

	switch grantType {
	case "authorization_code":
		p.handleAuthorizationCodeGrant(w, r)
	case "refresh_token":
		p.handleRefreshTokenGrant(w, r)
	default:
		writeOIDCError(w, http.StatusBadRequest, "unsupported_grant_type", "Grant type not supported")
	}
}

func (p *Plugin) handleAuthorizationCodeGrant(w http.ResponseWriter, r *http.Request) {
	code := r.FormValue("code")
	redirectURI := r.FormValue("redirect_uri")
	clientID := r.FormValue("client_id")
	clientSecret := r.FormValue("client_secret")
	codeVerifier := r.FormValue("code_verifier")

	// Try to get client credentials from Authorization header
	if clientID == "" {
		clientID, clientSecret, _ = r.BasicAuth()
	}

	// Validate client
	client, exists := p.mockIdP.GetClient(clientID)
	if !exists {
		writeOIDCError(w, http.StatusUnauthorized, "invalid_client", "Unknown client")
		return
	}

	if !client.Public {
		if _, err := p.mockIdP.ValidateClient(clientID, clientSecret); err != nil {
			writeOIDCError(w, http.StatusUnauthorized, "invalid_client", "Client authentication failed")
			return
		}
	}

	// Validate authorization code
	authCode, err := p.mockIdP.ValidateAuthorizationCode(code, clientID, redirectURI, codeVerifier)
	if err != nil {
		writeOIDCError(w, http.StatusBadRequest, "invalid_grant", err.Error())
		return
	}

	// Generate tokens including ID token
	tokenResponse, err := p.issueOIDCTokens(authCode)
	if err != nil {
		writeOIDCError(w, http.StatusInternalServerError, "server_error", "Failed to issue tokens")
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.Header().Set("Cache-Control", "no-store")
	w.Header().Set("Pragma", "no-cache")
	json.NewEncoder(w).Encode(tokenResponse)
}

func (p *Plugin) handleRefreshTokenGrant(w http.ResponseWriter, r *http.Request) {
	refreshToken := r.FormValue("refresh_token")
	clientID := r.FormValue("client_id")
	clientSecret := r.FormValue("client_secret")
	scope := r.FormValue("scope")

	// Try to get client credentials from Authorization header
	if clientID == "" {
		clientID, clientSecret, _ = r.BasicAuth()
	}

	// Validate client
	client, exists := p.mockIdP.GetClient(clientID)
	if !exists {
		writeOIDCError(w, http.StatusUnauthorized, "invalid_client", "Unknown client")
		return
	}

	if !client.Public {
		if _, err := p.mockIdP.ValidateClient(clientID, clientSecret); err != nil {
			writeOIDCError(w, http.StatusUnauthorized, "invalid_client", "Client authentication failed")
			return
		}
	}

	// Validate refresh token
	rt, err := p.mockIdP.ValidateRefreshToken(refreshToken, clientID)
	if err != nil {
		writeOIDCError(w, http.StatusBadRequest, "invalid_grant", err.Error())
		return
	}

	// Use original scope if not specified
	if scope == "" {
		scope = rt.Scope
	}

	// Generate new tokens (including new ID token if openid scope)
	jwtService := p.mockIdP.JWTService()
	scopes := strings.Split(scope, " ")
	userClaims := p.mockIdP.UserClaims(rt.UserID, scopes)

	// Create access token
	accessToken, err := jwtService.CreateAccessToken(
		rt.UserID,
		clientID,
		scope,
		time.Hour,
		userClaims,
	)
	if err != nil {
		writeOIDCError(w, http.StatusInternalServerError, "server_error", "Failed to create access token")
		return
	}

	// Create new refresh token (rotation)
	newRefreshToken, err := jwtService.CreateRefreshToken(
		rt.UserID,
		clientID,
		scope,
		7*24*time.Hour,
	)
	if err != nil {
		writeOIDCError(w, http.StatusInternalServerError, "server_error", "Failed to create refresh token")
		return
	}

	// Store new refresh token
	p.mockIdP.StoreRefreshToken(newRefreshToken, clientID, rt.UserID, scope, time.Now().Add(7*24*time.Hour))

	response := models.TokenResponse{
		AccessToken:  accessToken,
		TokenType:    "Bearer",
		ExpiresIn:    3600,
		RefreshToken: newRefreshToken,
		Scope:        scope,
	}

	// Include new ID token if openid scope is present
	hasOpenID := false
	for _, s := range scopes {
		if s == "openid" {
			hasOpenID = true
			break
		}
	}

	if hasOpenID {
		idToken, err := jwtService.CreateIDToken(
			rt.UserID,
			clientID,
			"", // No nonce for refresh
			time.Now(),
			time.Hour,
			userClaims,
		)
		if err == nil {
			response.IDToken = idToken
		}
	}

	w.Header().Set("Content-Type", "application/json")
	w.Header().Set("Cache-Control", "no-store")
	w.Header().Set("Pragma", "no-cache")
	json.NewEncoder(w).Encode(response)
}

// issueOIDCTokens creates access token, refresh token, and ID token
func (p *Plugin) issueOIDCTokens(authCode *models.AuthorizationCode) (*models.TokenResponse, error) {
	jwtService := p.mockIdP.JWTService()

	// Parse scopes
	scopes := strings.Split(authCode.Scope, " ")
	userClaims := p.mockIdP.UserClaims(authCode.UserID, scopes)

	// Create access token
	accessToken, err := jwtService.CreateAccessToken(
		authCode.UserID,
		authCode.ClientID,
		authCode.Scope,
		time.Hour,
		userClaims,
	)
	if err != nil {
		return nil, err
	}

	// Create refresh token
	refreshToken, err := jwtService.CreateRefreshToken(
		authCode.UserID,
		authCode.ClientID,
		authCode.Scope,
		7*24*time.Hour,
	)
	if err != nil {
		return nil, err
	}

	// Store refresh token
	p.mockIdP.StoreRefreshToken(refreshToken, authCode.ClientID, authCode.UserID, authCode.Scope, time.Now().Add(7*24*time.Hour))

	response := &models.TokenResponse{
		AccessToken:  accessToken,
		TokenType:    "Bearer",
		ExpiresIn:    3600,
		RefreshToken: refreshToken,
		Scope:        authCode.Scope,
	}

	// Create ID token if openid scope is present
	hasOpenID := false
	for _, scope := range scopes {
		if scope == "openid" {
			hasOpenID = true
			break
		}
	}

	if hasOpenID {
		idToken, err := jwtService.CreateIDToken(
			authCode.UserID,
			authCode.ClientID,
			authCode.Nonce,
			time.Now(),
			time.Hour,
			userClaims,
		)
		if err != nil {
			return nil, err
		}
		response.IDToken = idToken
	}

	return response, nil
}

func (p *Plugin) generateOIDCLoginPage(clientID, redirectURI, scope, state, nonce, codeChallenge, codeChallengeMethod, clientName string) string {
	if clientName == "" {
		if client, exists := p.mockIdP.GetClient(clientID); exists {
			clientName = client.Name
		} else {
			clientName = clientID
		}
	}

	return `<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Login - OpenID Connect</title>
    <style>
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body {
            font-family: 'Segoe UI', system-ui, sans-serif;
            background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%);
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            color: #e4e4e7;
        }
        .container {
            background: rgba(255, 255, 255, 0.03);
            backdrop-filter: blur(10px);
            border: 1px solid rgba(255, 255, 255, 0.1);
            border-radius: 16px;
            padding: 40px;
            width: 100%;
            max-width: 420px;
            box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
        }
        .logo {
            text-align: center;
            margin-bottom: 30px;
        }
        .logo h1 {
            font-size: 24px;
            font-weight: 600;
            color: #fff;
        }
        .logo .oidc-badge {
            display: inline-block;
            background: linear-gradient(135deg, #f97316 0%, #ea580c 100%);
            color: white;
            padding: 4px 12px;
            border-radius: 20px;
            font-size: 12px;
            font-weight: 600;
            margin-top: 8px;
        }
        .client-info {
            background: rgba(249, 115, 22, 0.1);
            border: 1px solid rgba(249, 115, 22, 0.2);
            border-radius: 8px;
            padding: 16px;
            margin-bottom: 24px;
            text-align: center;
        }
        .client-info span {
            color: #fdba74;
            font-size: 14px;
        }
        .client-info strong {
            color: #fff;
        }
        .form-group {
            margin-bottom: 20px;
        }
        label {
            display: block;
            font-size: 14px;
            font-weight: 500;
            margin-bottom: 8px;
            color: #d4d4d8;
        }
        input[type="email"], input[type="password"] {
            width: 100%;
            padding: 12px 16px;
            border: 1px solid rgba(255, 255, 255, 0.1);
            border-radius: 8px;
            background: rgba(0, 0, 0, 0.2);
            color: #fff;
            font-size: 16px;
            transition: all 0.2s;
        }
        input:focus {
            outline: none;
            border-color: #f97316;
            box-shadow: 0 0 0 3px rgba(249, 115, 22, 0.2);
        }
        button {
            width: 100%;
            padding: 14px;
            background: linear-gradient(135deg, #f97316 0%, #ea580c 100%);
            border: none;
            border-radius: 8px;
            color: #fff;
            font-size: 16px;
            font-weight: 600;
            cursor: pointer;
            transition: transform 0.2s, box-shadow 0.2s;
        }
        button:hover {
            transform: translateY(-2px);
            box-shadow: 0 10px 20px -10px rgba(249, 115, 22, 0.5);
        }
        .error {
            background: rgba(239, 68, 68, 0.1);
            border: 1px solid rgba(239, 68, 68, 0.2);
            color: #fca5a5;
            padding: 12px;
            border-radius: 8px;
            margin-bottom: 20px;
            font-size: 14px;
        }
        .demo-users {
            margin-top: 24px;
            padding-top: 24px;
            border-top: 1px solid rgba(255, 255, 255, 0.1);
        }
        .demo-users h3 {
            font-size: 14px;
            color: #a1a1aa;
            margin-bottom: 12px;
        }
        .demo-user {
            background: rgba(0, 0, 0, 0.2);
            border: 1px solid rgba(255, 255, 255, 0.05);
            border-radius: 8px;
            padding: 12px;
            margin-bottom: 8px;
            cursor: pointer;
            transition: all 0.2s;
        }
        .demo-user:hover {
            background: rgba(249, 115, 22, 0.1);
            border-color: rgba(249, 115, 22, 0.2);
        }
        .demo-user .name { font-weight: 500; color: #fff; }
        .demo-user .email { font-size: 12px; color: #71717a; }
        .scopes {
            margin-top: 16px;
            font-size: 12px;
            color: #71717a;
        }
        .scopes span {
            display: inline-block;
            background: rgba(249, 115, 22, 0.1);
            padding: 4px 8px;
            border-radius: 4px;
            margin: 2px;
        }
        .scopes .openid { background: rgba(34, 197, 94, 0.2); color: #86efac; }
    </style>
</head>
<body>
    <div class="container">
        <div class="logo">
            <h1>Protocol Showcase</h1>
            <div class="oidc-badge">OpenID Connect</div>
        </div>
        
        <div class="client-info">
            <span>Signing in to <strong>` + clientName + `</strong></span>
        </div>

        <!-- ERROR -->

        <form method="POST" action="/oidc/authorize">
            <input type="hidden" name="client_id" value="` + clientID + `">
            <input type="hidden" name="redirect_uri" value="` + redirectURI + `">
            <input type="hidden" name="scope" value="` + scope + `">
            <input type="hidden" name="state" value="` + state + `">
            <input type="hidden" name="nonce" value="` + nonce + `">
            <input type="hidden" name="code_challenge" value="` + codeChallenge + `">
            <input type="hidden" name="code_challenge_method" value="` + codeChallengeMethod + `">
            
            <div class="form-group">
                <label for="email">Email</label>
                <input type="email" id="email" name="email" placeholder="alice@example.com" required>
            </div>
            
            <div class="form-group">
                <label for="password">Password</label>
                <input type="password" id="password" name="password" placeholder="password" required>
            </div>
            
            <button type="submit">Sign In with OpenID Connect</button>
        </form>

        <div class="demo-users">
            <h3>Demo Users (click to autofill)</h3>
            <div class="demo-user" onclick="fillCredentials('alice@example.com', 'password123')">
                <div class="name">Alice (Standard User)</div>
                <div class="email">alice@example.com</div>
            </div>
            <div class="demo-user" onclick="fillCredentials('admin@example.com', 'admin123')">
                <div class="name">Admin (Elevated Permissions)</div>
                <div class="email">admin@example.com</div>
            </div>
        </div>

        <div class="scopes">
            Requested scopes: ` + formatOIDCScopes(scope) + `
        </div>
    </div>

    <script>
        function fillCredentials(email, password) {
            document.getElementById('email').value = email;
            document.getElementById('password').value = password;
        }
    </script>
</body>
</html>`
}

func formatOIDCScopes(scope string) string {
	if scope == "" {
		return "<span>none</span>"
	}
	scopes := strings.Split(scope, " ")
	result := ""
	for _, s := range scopes {
		if s == "openid" {
			result += `<span class="openid">` + s + `</span>`
		} else {
			result += "<span>" + s + "</span>"
		}
	}
	return result
}

