# ProtocolSoup

An interactive sandbox for exploring authentication and identity protocols. Execute **real** protocol flows against a local Mock IdP, inspect HTTP traffic in real-time, decode tokens, and understand security protocols hands-on.

> Real flows against real infrastructure

**Protocols:** OAuth 2.0 • OpenID Connect • SAML 2.0 • SPIFFE/SPIRE

## Live Website

**[protocolsoup.com](https://protocolsoup.com)**

---

## Quick Start

### Full Stack (with SPIFFE/SPIRE)

```bash
cd ProtocolSoup/docker
docker compose up -d
```

This starts:
- **SPIRE Server** — Certificate authority and identity registry
- **SPIRE Agent** — Workload attestation and SVID issuance
- **Backend** — Go API with embedded agent for real X.509/JWT SVIDs
- **Frontend** — React UI at `http://localhost:3000`
- **Backend API** — Available at `http://localhost:8080`

### Lightweight Stack (without SPIFFE)

```bash
cd ProtocolLens/docker
docker compose -f docker-compose.simple.yml up -d
```

Use this for OAuth 2.0, OIDC, and SAML demos without the SPIFFE/SPIRE infrastructure.

---

## Features

| Feature | Description |
|---------|-------------|
| **Looking Glass** | Execute protocol flows and inspect every HTTP request/response in real-time via WebSocket |
| **Token Inspector** | Decode JWTs (access, ID, refresh tokens), examine claims, verify signatures, view SAML assertions |
| **Mock IdP** | Self-contained identity provider with preconfigured test users and clients |
| **Flow Visualizer** | Step-by-step animated protocol flow diagrams |
| **Plugin Architecture** | Add new protocols without modifying core infrastructure |

---

## Supported Flows

### OAuth 2.0

| Flow | RFC | Description |
|------|-----|-------------|
| Authorization Code | RFC 6749 | Standard web app flow with PKCE support |
| Client Credentials | RFC 6749 | Machine-to-machine authentication |
| Implicit | RFC 6749 | Legacy browser-based flow (not recommended) |
| Device Code | RFC 8628 | Input-constrained device flow |
| Resource Owner Password | RFC 6749 | Direct username/password (legacy) |
| Refresh Token | RFC 6749 | Token renewal flow |

### OpenID Connect

| Flow | Spec | Description |
|------|------|-------------|
| Authorization Code | OIDC Core | OAuth 2.0 + ID token for identity |
| Hybrid Flow | OIDC Core | Immediate ID token + code exchange |

### SAML 2.0

| Flow | Binding | Description |
|------|---------|-------------|
| SP-Initiated SSO | POST / Redirect | Service Provider starts authentication |
| IdP-Initiated SSO | POST | Identity Provider starts authentication |
| Single Logout (SLO) | POST / Redirect | Federated logout |

### SPIFFE/SPIRE

| Flow | Description |
|------|-------------|
| X.509-SVID | Acquire X.509 certificate via Workload API |
| JWT-SVID | Acquire JWT identity token |
| mTLS Configuration | Automatic certificate rotation |
| Trust Bundle | CA certificate distribution |

> SPIFFE flows execute against real SPIRE infrastructure both locally and on [protocolsoup.com](https://protocolsoup.com).

---

## Test Credentials

### Users

| User | Email | Password | Role |
|------|-------|----------|------|
| Alice | alice@example.com | password123 | user |
| Bob | bob@example.com | password123 | user |
| Admin | admin@example.com | admin123 | admin |

### Registered Clients

| client_id | Type | Secret |
|-----------|------|--------|
| `public-app` | Public | — |
| `demo-app` | Confidential | `demo-secret` |
| `machine-client` | Confidential | `machine-secret` |

---

## API Reference

### OAuth 2.0

```
GET  /oauth2/authorize          Authorization endpoint
POST /oauth2/token              Token endpoint
POST /oauth2/introspect         Token introspection
POST /oauth2/revoke             Token revocation
POST /oauth2/device             Device authorization
```

### OpenID Connect

```
GET  /oidc/.well-known/openid-configuration    Discovery document
GET  /oidc/.well-known/jwks.json               JSON Web Key Set
GET  /oidc/authorize                           Authorization endpoint
POST /oidc/token                               Token endpoint
GET  /oidc/userinfo                            UserInfo endpoint
```

### SAML 2.0

```
GET  /saml/metadata             IdP Metadata (XML)
GET  /saml/sso                  SSO Service (Redirect Binding)
POST /saml/sso                  SSO Service (POST Binding)
POST /saml/acs                  Assertion Consumer Service
GET  /saml/slo                  Single Logout (Redirect)
POST /saml/slo                  Single Logout (POST)
```

### SPIFFE/SPIRE

```
GET  /spiffe/status                            Workload API status
GET  /spiffe/svid/x509                         X.509-SVID certificate
GET  /spiffe/svid/x509/chain                   PEM certificate chain
GET  /spiffe/svid/jwt?audience=<aud>           JWT-SVID token
GET  /spiffe/.well-known/spiffe-bundle         SPIFFE bundle endpoint
GET  /spiffe/trust-bundle                      Trust bundle details
GET  /spiffe/workload                          Workload identity info
POST /spiffe/validate/jwt                      Validate JWT-SVID
POST /spiffe/validate/x509                     Validate X.509-SVID
```

### Internal API

```
GET  /api/protocols                            List available protocols
POST /api/lookingglass/decode                  Decode tokens
WS   /ws/lookingglass/{session}                Real-time event stream
GET  /health                                   Health check
```

---

## Project Structure

```
ProtocolLens/
├── backend/
│   ├── cmd/server/main.go         # Application entry point
│   └── internal/
│       ├── core/                   # HTTP server, config, middleware
│       ├── crypto/                 # JWT/JWK key management (RS256, ES256)
│       ├── lookingglass/           # Real-time protocol inspection engine
│       ├── mockidp/                # Mock identity provider (users, clients, sessions)
│       ├── plugin/                 # Plugin system interfaces & lifecycle
│       ├── spiffe/                 # SPIFFE Workload API client, mTLS utilities
│       └── protocols/
│           ├── oauth2/             # OAuth 2.0 implementation
│           ├── oidc/               # OpenID Connect (extends OAuth 2.0)
│           ├── saml/               # SAML 2.0 SSO & SLO
│           └── spiffe/             # SPIFFE/SPIRE handlers
├── frontend/
│   └── src/
│       ├── components/             # Shared UI components
│       │   ├── common/             # Layout, navigation
│       │   └── lookingglass/       # Token inspector, flow diagrams, timeline
│       ├── lookingglass/           # Flow executors & visualization
│       │   └── flows/              # Protocol-specific executors
│       ├── pages/                  # Route pages (Dashboard, LookingGlass, etc.)
│       ├── protocols/              # Protocol registry
│       └── hooks/                  # WebSocket, state management
├── docker/
│   ├── docker-compose.yml          # Full stack with SPIFFE/SPIRE
│   ├── docker-compose.simple.yml   # Lightweight (no SPIFFE)
│   ├── docker-compose.dev.yml      # Development configuration
│   ├── docker-compose.prod.yml     # Production configuration
│   ├── spire/                      # SPIRE server/agent configurations
│   └── Dockerfile.*                # Container definitions
├── docs/
│   ├── ARCHITECTURE.md             # System architecture overview
│   ├── ADDING_PROTOCOLS.md         # Guide for adding new protocols
│   └── SPIFFE.md                   # SPIFFE/SPIRE integration details
├── fly.toml                        # Fly.io deployment (main app)
└── fly.spire-server.toml           # Fly.io deployment (SPIRE server)
```

---

## Technology Stack

### Backend

| Technology | Version | Purpose |
|------------|---------|---------|
| Go | 1.22 | Core language |
| chi | 5.1 | HTTP router |
| golang-jwt | 5.2 | JWT creation/validation |
| gorilla/websocket | 1.5 | Real-time communication |
| go-spiffe | 2.2 | SPIFFE Workload API client |

### Frontend

| Technology | Version | Purpose |
|------------|---------|---------|
| React | 18.3 | UI framework |
| TypeScript | 5.6 | Type safety |
| Vite | 5.4 | Build tool |
| Tailwind CSS | 3.4 | Styling |
| Framer Motion | 11.5 | Animations |
| Zustand | 4.5 | State management |

### Infrastructure

| Technology | Purpose |
|------------|---------|
| Docker | Containerization |
| Nginx | Reverse proxy |
| SPIRE | Workload identity (local) |
| Fly.io | Production hosting |

---

## Documentation

- [Architecture Overview](docs/ARCHITECTURE.md) — System design and data flow
- [Adding Protocols](docs/ADDING_PROTOCOLS.md) — Plugin development guide
- [SPIFFE/SPIRE Integration](docs/SPIFFE.md) — Workload identity setup

---

## Development

### Prerequisites

- Go 1.22+
- Node.js 18+
- Docker & Docker Compose

### Running Locally (without Docker)

**Backend:**
```bash
cd backend
go run ./cmd/server
```

**Frontend:**
```bash
cd frontend
npm install
npm run dev
```

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `SHOWCASE_LISTEN_ADDR` | `:8080` | Server listen address |
| `SHOWCASE_BASE_URL` | `http://localhost:8080` | Public base URL |
| `SHOWCASE_CORS_ORIGINS` | `http://localhost:3000` | Allowed CORS origins |
| `SHOWCASE_SPIFFE_ENABLED` | `false` | Enable SPIFFE integration |
| `SHOWCASE_SPIFFE_SOCKET_PATH` | `unix:///run/spire/sockets/agent.sock` | Workload API socket |
| `SHOWCASE_SPIFFE_TRUST_DOMAIN` | `protocolsoup.com` | SPIFFE trust domain |

---

## Security Notes

This is an **educational tool** designed for learning and demonstration. The Mock IdP and test credentials are intentionally simple.


---

## Author

**[Mason Parle](https://www.linkedin.com/in/mason-parle/)** - Security engineer passionate about authentication protocols and identity systems.

More projects on [GitHub](https://github.com/ParleSec).

---

## License

MIT © 2024 Mason Parle

See [LICENSE](LICENSE) for details.
