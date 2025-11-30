# Protocol Soup 🍜

A sandbox for exploring authentication and identity protocols. Run real flows against a local MockIdP, inspect HTTP traffic, decode tokens.

Currently serving: **OAuth 2.0** and **OpenID Connect**

More protocols coming soon.

## Quick Start

```bash
cd ProtocolLens
docker-compose -f docker/docker-compose.yml up --build

# Frontend: http://localhost:3000
# Backend:  http://localhost:8080
```

## What's Here

- **Looking Glass** — Execute protocol flows and inspect every HTTP request/response
- **Token Inspector** — Decode JWTs, examine claims, check signatures
- **Mock IdP** — Self-contained identity provider with test users

## Test Credentials

| User | Email | Password | Role |
|------|-------|----------|------|
| Alice | alice@example.com | password123 | user |
| Bob | bob@example.com | password123 | user |
| Admin | admin@example.com | admin123 | admin |

## Registered Clients

| client_id | Type | Secret |
|-----------|------|--------|
| public-app | public | — |
| demo-app | confidential | demo-secret |
| machine-client | confidential | machine-secret |

## Endpoints

### OAuth 2.0
```
GET  /oauth2/authorize
POST /oauth2/token
POST /oauth2/introspect
POST /oauth2/revoke
```

### OpenID Connect
```
GET  /oidc/.well-known/openid-configuration
GET  /oidc/.well-known/jwks.json
GET  /oidc/authorize
POST /oidc/token
GET  /oidc/userinfo
```

### API
```
GET  /api/protocols
POST /api/lookingglass/decode
```

## Project Structure

```
ProtocolLens/
├── backend/
│   ├── cmd/server/           # Entry point
│   ├── internal/
│   │   ├── core/             # HTTP server
│   │   ├── crypto/           # JWT/JWK
│   │   ├── lookingglass/     # Protocol inspection
│   │   ├── mockidp/          # Mock identity provider
│   │   ├── plugin/           # Plugin interfaces
│   │   └── protocols/        # Protocol implementations
│   │       ├── oauth2/
│   │       └── oidc/
│   └── pkg/models/
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   ├── lookingglass/     # Flow executors
│   │   └── pages/
│   └── public/
└── docker/
    ├── docker-compose.yml
    └── Dockerfile.*
```

## Tech Stack

**Backend:** Go 1.21+, stdlib HTTP, RS256/ES256 JWT  
**Frontend:** React 18, TypeScript, Vite, Tailwind  
**Infra:** Docker, Nginx

## Adding Protocols

See [docs/ADDING_PROTOCOLS.md](docs/ADDING_PROTOCOLS.md)

## License

MIT
