# ProtocolLens

An interactive demonstration platform for OAuth 2.0 and OpenID Connect authentication protocols. Built with a modular plugin architecture to showcase security engineering expertise.

## Features

- **Live Protocol Demos** — Interactive OAuth 2.0 and OIDC flows you can execute in real-time
- **Looking Glass** — Real-time protocol inspection with decoded tokens and annotated security insights
- **Token Inspector** — Decode and analyze JWTs with claim explanations and validation status
- **Sequence Diagrams** — UML-style visualizations showing protocol flows step-by-step
- **PKCE Support** — Full Proof Key for Code Exchange implementation for public clients
- **Mock Identity Provider** — Built-in IdP with demo users for self-contained demonstrations

## Quick Start

### Docker Compose (Recommended)

```bash
cd ProtocolLens

# Start backend and frontend
docker-compose -f docker/docker-compose.yml up --build

# Access the application
# Frontend: http://localhost:3000
# Backend API: http://localhost:8080
```

### Manual Setup

**Backend (Go 1.21+)**

```bash
cd backend
go mod download
go run ./cmd/server
# Server runs on http://localhost:8080
```

**Frontend (Node 18+)**

```bash
cd frontend
npm install
npm run dev
# Frontend runs on http://localhost:3000
```

## Project Structure

```
ProtocolLens/
├── backend/
│   ├── cmd/server/           # Application entry point
│   ├── internal/
│   │   ├── core/             # HTTP server, config, middleware
│   │   ├── crypto/           # JWT/JWK cryptographic utilities
│   │   ├── lookingglass/     # Protocol inspection engine
│   │   ├── mockidp/          # Mock identity provider
│   │   ├── plugin/           # Plugin architecture interfaces
│   │   └── protocols/        # Protocol implementations
│   │       ├── oauth2/       # OAuth 2.0 plugin
│   │       └── oidc/         # OpenID Connect plugin
│   └── pkg/models/           # Shared data models
├── frontend/
│   ├── src/
│   │   ├── components/       # React components
│   │   │   ├── common/       # Layout, navigation
│   │   │   └── lookingglass/ # Token inspector, flow diagrams
│   │   ├── pages/            # Route pages
│   │   ├── protocols/        # Protocol registry and hooks
│   │   └── hooks/            # Custom React hooks
│   └── public/               # Static assets
├── docker/
│   ├── docker-compose.yml    # Production compose
│   ├── docker-compose.dev.yml # Development compose with hot reload
│   ├── Dockerfile.backend    # Multi-stage backend build
│   ├── Dockerfile.frontend   # Multi-stage frontend build
│   └── nginx.conf            # Nginx reverse proxy config
└── docs/
    ├── ARCHITECTURE.md       # Architecture documentation
    └── ADDING_PROTOCOLS.md   # Guide for adding protocols
```

## Demo Credentials

**Mock Users**

| User  | Email              | Password    | Role          |
|-------|--------------------|-------------|---------------|
| Alice | alice@example.com  | password123 | Standard User |
| Bob   | bob@example.com    | password123 | Standard User |
| Admin | admin@example.com  | admin123    | Administrator |

**OAuth Clients**

| Client ID      | Type              | Secret         |
|----------------|-------------------|----------------|
| demo-app       | Confidential      | demo-secret    |
| public-app     | Public (PKCE)     | —              |
| machine-client | Machine-to-Machine| machine-secret |

## Available Protocol Flows

### OAuth 2.0

| Flow | Description |
|------|-------------|
| Authorization Code | Standard flow for server-side apps |
| Authorization Code + PKCE | Secure flow for public clients (SPAs, mobile) |
| Client Credentials | Machine-to-machine authentication |
| Refresh Token | Obtain new access tokens without re-authentication |
| Token Introspection | Validate and inspect token metadata |
| Token Revocation | Invalidate tokens |

### OpenID Connect

| Flow | Description |
|------|-------------|
| Authorization Code | OAuth 2.0 + ID Token for identity |
| ID Token Validation | Verify identity claims and signatures |
| UserInfo | Retrieve user profile information |
| Discovery | Auto-configuration via well-known endpoint |
| JWKS | Public key retrieval for signature validation |

## API Reference

### Core API

| Endpoint | Description |
|----------|-------------|
| `GET /health` | Health check |
| `GET /api/protocols` | List available protocols |
| `GET /api/protocols/{id}` | Protocol details |
| `GET /api/protocols/{id}/flows` | Available flows for protocol |
| `POST /api/protocols/{id}/demo/{flow}` | Start demo session |

### Looking Glass

| Endpoint | Description |
|----------|-------------|
| `POST /api/lookingglass/decode` | Decode JWT token |
| `GET /api/lookingglass/sessions` | List active sessions |
| `WS /ws/lookingglass/{session}` | Real-time event stream |

### OAuth 2.0 Endpoints

| Endpoint | Description |
|----------|-------------|
| `GET /oauth2/authorize` | Authorization endpoint |
| `POST /oauth2/token` | Token endpoint |
| `POST /oauth2/introspect` | Token introspection |
| `POST /oauth2/revoke` | Token revocation |

### OIDC Endpoints

| Endpoint | Description |
|----------|-------------|
| `GET /oidc/.well-known/openid-configuration` | Discovery document |
| `GET /oidc/.well-known/jwks.json` | JSON Web Key Set |
| `GET /oidc/authorize` | Authorization endpoint |
| `POST /oidc/token` | Token endpoint |
| `GET /oidc/userinfo` | UserInfo endpoint |

## Architecture

- **Plugin Architecture** — Each protocol is a self-contained module implementing a common interface
- **Looking Glass Engine** — Real-time WebSocket streaming for protocol event inspection
- **Security-First** — PKCE, CSRF protection, redirect URI validation, XSS prevention
- **Production Patterns** — Rate limiting, CORS, security headers, graceful shutdown

## Documentation

- [Architecture Overview](docs/ARCHITECTURE.md)
- [Adding New Protocols](docs/ADDING_PROTOCOLS.md)

## Tech Stack

**Backend**
- Go 1.21+
- Standard library HTTP server
- RS256/ES256 JWT signing

**Frontend**
- React 18 + TypeScript
- Vite
- Tailwind CSS
- Framer Motion

**Infrastructure**
- Docker + Docker Compose
- Nginx reverse proxy
- Multi-stage builds

## License

MIT — See [LICENSE](LICENSE) for details.
