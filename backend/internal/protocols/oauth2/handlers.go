package oauth2

import (
	"encoding/json"
	"net/http"
	"net/url"
	"strings"
	"time"

	"github.com/security-showcase/protocol-showcase/pkg/models"
)

// Authorization endpoint - GET
func (p *Plugin) handleAuthorize(w http.ResponseWriter, r *http.Request) {
	query := r.URL.Query()

	responseType := query.Get("response_type")
	clientID := query.Get("client_id")
	redirectURI := query.Get("redirect_uri")
	scope := query.Get("scope")
	state := query.Get("state")
	codeChallenge := query.Get("code_challenge")
	codeChallengeMethod := query.Get("code_challenge_method")

	// Validate required parameters
	if responseType != "code" {
		writeOAuth2Error(w, "unsupported_response_type", "Only 'code' response type is supported", "")
		return
	}

	if clientID == "" {
		writeOAuth2Error(w, "invalid_request", "client_id is required", "")
		return
	}

	// Validate client
	client, exists := p.mockIdP.GetClient(clientID)
	if !exists {
		writeOAuth2Error(w, "invalid_client", "Unknown client", "")
		return
	}

	// Validate redirect URI
	if !p.mockIdP.ValidateRedirectURI(clientID, redirectURI) {
		writeOAuth2Error(w, "invalid_request", "Invalid redirect_uri", "")
		return
	}

	// For demo purposes, return a login page
	loginPage := p.generateLoginPage(clientID, redirectURI, scope, state, codeChallenge, codeChallengeMethod, client.Name)
	w.Header().Set("Content-Type", "text/html")
	w.Write([]byte(loginPage))
}

// Authorization endpoint - POST (login form submission)
func (p *Plugin) handleAuthorizeSubmit(w http.ResponseWriter, r *http.Request) {
	if err := r.ParseForm(); err != nil {
		writeOAuth2Error(w, "invalid_request", "Invalid form data", "")
		return
	}

	// Get form values
	email := r.FormValue("email")
	password := r.FormValue("password")
	clientID := r.FormValue("client_id")
	redirectURI := r.FormValue("redirect_uri")
	scope := r.FormValue("scope")
	state := r.FormValue("state")
	codeChallenge := r.FormValue("code_challenge")
	codeChallengeMethod := r.FormValue("code_challenge_method")
	nonce := r.FormValue("nonce") // For OIDC

	// Validate user credentials
	user, err := p.mockIdP.ValidateCredentials(email, password)
	if err != nil {
		// Return to login page with error
		loginPage := p.generateLoginPage(clientID, redirectURI, scope, state, codeChallenge, codeChallengeMethod, "")
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
		writeOAuth2Error(w, "server_error", "Failed to create authorization code", state)
		return
	}

	// Build redirect URL
	redirectURL, _ := url.Parse(redirectURI)
	q := redirectURL.Query()
	q.Set("code", authCode.Code)
	if state != "" {
		q.Set("state", state)
	}
	redirectURL.RawQuery = q.Encode()

	// Redirect to client
	http.Redirect(w, r, redirectURL.String(), http.StatusFound)
}

// Token endpoint
func (p *Plugin) handleToken(w http.ResponseWriter, r *http.Request) {
	if err := r.ParseForm(); err != nil {
		writeOAuth2Error(w, "invalid_request", "Invalid form data", "")
		return
	}

	grantType := r.FormValue("grant_type")

	switch grantType {
	case "authorization_code":
		p.handleAuthorizationCodeGrant(w, r)
	case "refresh_token":
		p.handleRefreshTokenGrant(w, r)
	case "client_credentials":
		p.handleClientCredentialsGrant(w, r)
	default:
		writeOAuth2Error(w, "unsupported_grant_type", "Grant type not supported", "")
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

	// Validate client (if not public)
	client, exists := p.mockIdP.GetClient(clientID)
	if !exists {
		writeOAuth2Error(w, "invalid_client", "Unknown client", "")
		return
	}

	if !client.Public {
		if _, err := p.mockIdP.ValidateClient(clientID, clientSecret); err != nil {
			writeOAuth2Error(w, "invalid_client", "Client authentication failed", "")
			return
		}
	}

	// Validate authorization code
	authCode, err := p.mockIdP.ValidateAuthorizationCode(code, clientID, redirectURI, codeVerifier)
	if err != nil {
		writeOAuth2Error(w, "invalid_grant", err.Error(), "")
		return
	}

	// Generate tokens
	tokenResponse, err := p.issueTokens(authCode.UserID, clientID, authCode.Scope, authCode.Nonce)
	if err != nil {
		writeOAuth2Error(w, "server_error", "Failed to issue tokens", "")
		return
	}

	writeJSON(w, http.StatusOK, tokenResponse)
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
		writeOAuth2Error(w, "invalid_client", "Unknown client", "")
		return
	}

	if !client.Public {
		if _, err := p.mockIdP.ValidateClient(clientID, clientSecret); err != nil {
			writeOAuth2Error(w, "invalid_client", "Client authentication failed", "")
			return
		}
	}

	// Validate refresh token
	rt, err := p.mockIdP.ValidateRefreshToken(refreshToken, clientID)
	if err != nil {
		writeOAuth2Error(w, "invalid_grant", err.Error(), "")
		return
	}

	// Use original scope if not specified
	if scope == "" {
		scope = rt.Scope
	}

	// Generate new tokens
	tokenResponse, err := p.issueTokens(rt.UserID, clientID, scope, "")
	if err != nil {
		writeOAuth2Error(w, "server_error", "Failed to issue tokens", "")
		return
	}

	writeJSON(w, http.StatusOK, tokenResponse)
}

func (p *Plugin) handleClientCredentialsGrant(w http.ResponseWriter, r *http.Request) {
	clientID := r.FormValue("client_id")
	clientSecret := r.FormValue("client_secret")
	scope := r.FormValue("scope")

	// Try to get client credentials from Authorization header
	if clientID == "" {
		clientID, clientSecret, _ = r.BasicAuth()
	}

	// Validate client
	client, err := p.mockIdP.ValidateClient(clientID, clientSecret)
	if err != nil {
		writeOAuth2Error(w, "invalid_client", "Client authentication failed", "")
		return
	}

	// Check if client is authorized for this grant type
	hasGrant := false
	for _, gt := range client.GrantTypes {
		if gt == "client_credentials" {
			hasGrant = true
			break
		}
	}
	if !hasGrant {
		writeOAuth2Error(w, "unauthorized_client", "Client not authorized for this grant type", "")
		return
	}

	// Issue access token (no refresh token for client credentials)
	jwtService := p.mockIdP.JWTService()
	accessToken, err := jwtService.CreateAccessToken(
		clientID, // Subject is the client itself
		clientID,
		scope,
		time.Hour,
		map[string]interface{}{
			"client_name": client.Name,
		},
	)
	if err != nil {
		writeOAuth2Error(w, "server_error", "Failed to create access token", "")
		return
	}

	tokenResponse := models.TokenResponse{
		AccessToken: accessToken,
		TokenType:   "Bearer",
		ExpiresIn:   3600,
		Scope:       scope,
	}

	writeJSON(w, http.StatusOK, tokenResponse)
}

// Token introspection endpoint (RFC 7662)
func (p *Plugin) handleIntrospect(w http.ResponseWriter, r *http.Request) {
	if err := r.ParseForm(); err != nil {
		writeOAuth2Error(w, "invalid_request", "Invalid form data", "")
		return
	}

	token := r.FormValue("token")
	// tokenTypeHint := r.FormValue("token_type_hint") // Optional

	// Authenticate the client making the introspection request
	clientID, clientSecret, _ := r.BasicAuth()
	if clientID == "" {
		clientID = r.FormValue("client_id")
		clientSecret = r.FormValue("client_secret")
	}

	if _, err := p.mockIdP.ValidateClient(clientID, clientSecret); err != nil {
		writeOAuth2Error(w, "invalid_client", "Client authentication required", "")
		return
	}

	// Validate the token
	jwtService := p.mockIdP.JWTService()
	claims, err := jwtService.ValidateToken(token)
	if err != nil {
		// Token is not active
		writeJSON(w, http.StatusOK, models.IntrospectionResponse{Active: false})
		return
	}

	// Build introspection response
	response := models.IntrospectionResponse{
		Active:    true,
		TokenType: "Bearer",
	}

	if scope, ok := claims["scope"].(string); ok {
		response.Scope = scope
	}
	if sub, ok := claims["sub"].(string); ok {
		response.Sub = sub
		response.Username = sub
	}
	if clientID, ok := claims["aud"].(string); ok {
		response.ClientID = clientID
	}
	if exp, ok := claims["exp"].(float64); ok {
		response.Exp = int64(exp)
	}
	if iat, ok := claims["iat"].(float64); ok {
		response.Iat = int64(iat)
	}
	if iss, ok := claims["iss"].(string); ok {
		response.Iss = iss
	}
	if jti, ok := claims["jti"].(string); ok {
		response.Jti = jti
	}

	writeJSON(w, http.StatusOK, response)
}

// Token revocation endpoint (RFC 7009)
func (p *Plugin) handleRevoke(w http.ResponseWriter, r *http.Request) {
	if err := r.ParseForm(); err != nil {
		writeOAuth2Error(w, "invalid_request", "Invalid form data", "")
		return
	}

	token := r.FormValue("token")
	tokenTypeHint := r.FormValue("token_type_hint")

	// Authenticate the client
	clientID, clientSecret, _ := r.BasicAuth()
	if clientID == "" {
		clientID = r.FormValue("client_id")
		clientSecret = r.FormValue("client_secret")
	}

	client, exists := p.mockIdP.GetClient(clientID)
	if !exists {
		writeOAuth2Error(w, "invalid_client", "Unknown client", "")
		return
	}

	if !client.Public {
		if _, err := p.mockIdP.ValidateClient(clientID, clientSecret); err != nil {
			writeOAuth2Error(w, "invalid_client", "Client authentication failed", "")
			return
		}
	}

	// Revoke the token
	if tokenTypeHint == "refresh_token" || tokenTypeHint == "" {
		p.mockIdP.RevokeRefreshToken(token)
	}

	// Per RFC 7009, always return 200 OK regardless of whether token was valid
	w.WriteHeader(http.StatusOK)
}

// Demo endpoint - list users
func (p *Plugin) handleListUsers(w http.ResponseWriter, r *http.Request) {
	presets := p.mockIdP.GetDemoUserPresets()
	writeJSON(w, http.StatusOK, map[string]interface{}{
		"users": presets,
	})
}

// Demo endpoint - list clients
func (p *Plugin) handleListClients(w http.ResponseWriter, r *http.Request) {
	presets := p.mockIdP.GetDemoClientPresets()
	writeJSON(w, http.StatusOK, map[string]interface{}{
		"clients": presets,
	})
}

// issueTokens creates access token and refresh token
func (p *Plugin) issueTokens(userID, clientID, scope, nonce string) (*models.TokenResponse, error) {
	jwtService := p.mockIdP.JWTService()

	// Get user claims
	scopes := strings.Split(scope, " ")
	userClaims := p.mockIdP.UserClaims(userID, scopes)

	// Create access token
	accessToken, err := jwtService.CreateAccessToken(
		userID,
		clientID,
		scope,
		time.Hour,
		userClaims,
	)
	if err != nil {
		return nil, err
	}

	// Create refresh token
	refreshToken, err := jwtService.CreateRefreshToken(
		userID,
		clientID,
		scope,
		7*24*time.Hour,
	)
	if err != nil {
		return nil, err
	}

	// Store refresh token
	p.mockIdP.StoreRefreshToken(refreshToken, clientID, userID, scope, time.Now().Add(7*24*time.Hour))

	response := &models.TokenResponse{
		AccessToken:  accessToken,
		TokenType:    "Bearer",
		ExpiresIn:    3600,
		RefreshToken: refreshToken,
		Scope:        scope,
	}

	return response, nil
}

// Helper functions

func writeJSON(w http.ResponseWriter, status int, data interface{}) {
	w.Header().Set("Content-Type", "application/json")
	w.Header().Set("Cache-Control", "no-store")
	w.Header().Set("Pragma", "no-cache")
	w.WriteHeader(status)
	json.NewEncoder(w).Encode(data)
}

func writeOAuth2Error(w http.ResponseWriter, errorCode, description, state string) {
	response := map[string]string{
		"error":             errorCode,
		"error_description": description,
	}
	if state != "" {
		response["state"] = state
	}
	writeJSON(w, http.StatusBadRequest, response)
}

func (p *Plugin) generateLoginPage(clientID, redirectURI, scope, state, codeChallenge, codeChallengeMethod, clientName string) string {
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
    <title>Login - Protocol Showcase</title>
    <style>
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body {
            font-family: 'Segoe UI', system-ui, sans-serif;
            background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            color: #e4e4e7;
        }
        .container {
            background: rgba(255, 255, 255, 0.05);
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
        .logo p {
            color: #a1a1aa;
            font-size: 14px;
            margin-top: 8px;
        }
        .client-info {
            background: rgba(99, 102, 241, 0.1);
            border: 1px solid rgba(99, 102, 241, 0.2);
            border-radius: 8px;
            padding: 16px;
            margin-bottom: 24px;
            text-align: center;
        }
        .client-info span {
            color: #a5b4fc;
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
            border-color: #6366f1;
            box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.2);
        }
        button {
            width: 100%;
            padding: 14px;
            background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
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
            box-shadow: 0 10px 20px -10px rgba(99, 102, 241, 0.5);
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
            background: rgba(99, 102, 241, 0.1);
            border-color: rgba(99, 102, 241, 0.2);
        }
        .demo-user .name {
            font-weight: 500;
            color: #fff;
        }
        .demo-user .email {
            font-size: 12px;
            color: #71717a;
        }
        .scopes {
            margin-top: 16px;
            font-size: 12px;
            color: #71717a;
        }
        .scopes span {
            display: inline-block;
            background: rgba(99, 102, 241, 0.1);
            padding: 4px 8px;
            border-radius: 4px;
            margin: 2px;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="logo">
            <h1>Protocol Showcase</h1>
            <p>OAuth 2.0 Authorization</p>
        </div>
        
        <div class="client-info">
            <span>Signing in to <strong>` + clientName + `</strong></span>
        </div>

        <!-- ERROR -->

        <form method="POST" action="/oauth2/authorize">
            <input type="hidden" name="client_id" value="` + clientID + `">
            <input type="hidden" name="redirect_uri" value="` + redirectURI + `">
            <input type="hidden" name="scope" value="` + scope + `">
            <input type="hidden" name="state" value="` + state + `">
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
            
            <button type="submit">Sign In</button>
        </form>

        <div class="demo-users">
            <h3>Demo Users (click to autofill)</h3>
            <div class="demo-user" onclick="fillCredentials('alice@example.com', 'password123')">
                <div class="name">Alice (Standard User)</div>
                <div class="email">alice@example.com</div>
            </div>
            <div class="demo-user" onclick="fillCredentials('bob@example.com', 'password123')">
                <div class="name">Bob (Standard User)</div>
                <div class="email">bob@example.com</div>
            </div>
            <div class="demo-user" onclick="fillCredentials('admin@example.com', 'admin123')">
                <div class="name">Admin (Elevated Permissions)</div>
                <div class="email">admin@example.com</div>
            </div>
        </div>

        <div class="scopes">
            Requested scopes: ` + formatScopes(scope) + `
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

func formatScopes(scope string) string {
	if scope == "" {
		return "<span>none</span>"
	}
	scopes := strings.Split(scope, " ")
	result := ""
	for _, s := range scopes {
		result += "<span>" + s + "</span>"
	}
	return result
}

