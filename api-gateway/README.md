<!--
AI Assistance Disclosure:
Tool: GitHub Copilot (model: Claude Opus 4.6), date: 2026-04-12
Scope: Generated initial README content based on existing codebase analysis.
Author review: Validated correctness against source code, verified all route mappings, WebSocket paths, and env vars.
-->

# API Gateway

The API Gateway is the single entry point for all client requests in PeerPrep. It routes HTTP and WebSocket traffic to the appropriate backend microservices, handles JWT authentication, and enforces role-based access control.

---

## What This Service Does

- Routes all frontend requests to the correct backend service.
- Proxies WebSocket connections for matching, collaborative editing (Yjs), and chat.
- Verifies JWT tokens and attaches user identity to requests.
- Enforces admin/root-admin role checks for protected endpoints.
- Forwards auth tokens to backend services that require them.

---

## Tech Stack

- **Runtime**: Node.js 20 (Express)
- **Proxy**: http-proxy-middleware (WebSocket + streaming HTTP)
- **Auth**: JSON Web Tokens (jsonwebtoken)
- **HTTP Client**: Axios
- **Containerisation**: Docker + Docker Compose
- **Module System**: ES Modules (`import`/`export`)

---

## Project Structure

```
api-gateway/
├── Dockerfile
├── package.json
└── src/
    ├── index.js                    # Entry point – Express setup, WS proxy, route mounting
    ├── middleware/
    │   └── authMiddleware.js       # verifyToken + verifyAdmin middleware
    └── routes/
        ├── authRoutes.js           # /api/auth   → User Service
        ├── userRoutes.js           # /api/users  → User Service
        ├── questionRoutes.js       # /api/questions → Question Service
        ├── matchingRoutes.js       # /api/match  → Matching Service
        ├── collaborationRoutes.js  # /api/collab → Collaboration Service
        ├── executionRoutes.js      # /api/execute → Code Execution Service
        └── attemptHistoryRoutes.js # /api/attempt-history → Attempt History Service
```

---

## Services Proxied To

| Service | Environment Variable | Default |
|---------|---------------------|---------|
| User Service | `USER_SERVICE_URL` | `http://localhost:3000` |
| Question Service | `QUESTION_SERVICE_URL` | `http://localhost:3001` |
| Matching Service | `MATCHING_SERVICE_URL` | `http://localhost:3002` |
| Collaboration Service | `COLLAB_SERVICE_URL` | `http://localhost:3003` |
| Collaboration WebSocket | `COLLAB_WS_URL` | `ws://localhost:8081` |
| Code Execution Service | `CODE_EXECUTION_SERVICE_URL` | `http://localhost:3005` |
| Attempt History Service | `ATTEMPT_HISTORY_SERVICE_URL` | `http://localhost:3005` |

---

## Route Mapping

### Authentication (`/api/auth`)

| Method | Path | Target | Auth |
|--------|------|--------|------|
| `POST` | `/api/auth/signup` | User Service `/users/` | None |
| `POST` | `/api/auth/login` | User Service `/auth/login` | None |

### Users (`/api/users`)

| Method | Path | Target | Auth |
|--------|------|--------|------|
| `GET` | `/api/users/me` | User Service `/users/me` | Token |
| `PATCH` | `/api/users/me` | User Service `/users/me` | Token |
| `PATCH` | `/api/users/me/password` | User Service `/users/me/password` | Token |
| `GET` | `/api/users/by-username/:username` | User Service `/users/by-username/:username` | Token |
| `GET` | `/api/users/all` | User Service `/users/all` | Token |
| `PATCH` | `/api/users/:email/role` | User Service `/users/:email/role` | Token |
| `DELETE` | `/api/users/me` | User Service `/users/me` | Token |

### Questions (`/api/questions`)

| Method | Path | Target | Auth |
|--------|------|--------|------|
| `GET` | `/api/questions` | Question Service `/questions` | None |
| `GET` | `/api/questions/topics` | Question Service `/questions/topics` | None |
| `GET` | `/api/questions/random` | Question Service `/questions/random` | None |
| `GET` | `/api/questions/:id` | Question Service `/questions/:id` | None |
| `POST` | `/api/questions` | Question Service `/questions` | Token + Admin |
| `PUT` | `/api/questions/:id` | Question Service `/questions/:id` | Token + Admin |
| `DELETE` | `/api/questions/:id` | Question Service `/questions/:id` | Token + Admin |

### Matching (`/api/match`)

| Method | Path | Target | Auth |
|--------|------|--------|------|
| `POST` | `/api/match/queue` | Matching Service `/match/queue` | Token |
| `POST` | `/api/match/cancel` | Matching Service `/match/cancel` | Token |
| `GET` | `/api/match/status` | Matching Service `/match/:userId` | Token |

### Collaboration (`/api/collab`)

| Method | Path | Target | Auth |
|--------|------|--------|------|
| `GET` | `/api/collab/my-room` | Collaboration Service `/room/by-user/:username` | Token |
| `GET` | `/api/collab/room/:roomId` | Collaboration Service `/room/:roomId` | Token |
| `DELETE` | `/api/collab/room/:roomId/leave` | Collaboration Service `/room/:roomId/user/:username/mapping` | Token |

### Code Execution (`/api/execute`)

| Method | Path | Target | Auth |
|--------|------|--------|------|
| `POST` | `/api/execute` | Code Execution Service `/execute` | Token |

### Attempt History (`/api/attempt-history`)

| Method | Path | Target | Auth |
|--------|------|--------|------|
| `GET` | `/api/attempt-history/me` | Attempt History Service `/attempts/me` | Token |
| `POST` | `/api/attempt-history` | Attempt History Service `/attempts` | Token |

---

## WebSocket Paths

| Gateway Path | Target Service | Path Rewrite |
|-------------|---------------|--------------|
| `/ws/match` | Matching Service | None |
| `/ws/yjs/:roomId` | Collaboration Service | `/ws/yjs` → `/yjs` |
| `/ws/chat/:roomId` | Collaboration Service | `/ws/chat` → `/chat` |

---

## Middleware

| Middleware | Description |
|-----------|-------------|
| `verifyToken` | Extracts and verifies JWT from `Authorization: Bearer <token>` header. Attaches decoded user to `req.user` and raw token to `req.token`. |
| `verifyAdmin` | Calls User Service `/auth/internal/role-check` to verify `admin` or `root-admin` role. Must be used after `verifyToken`. |

---

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `PORT` | Port the gateway listens on | `3004` |
| `JWT_SECRET` | Secret key for JWT verification | *(required)* |
| `USER_SERVICE_URL` | User Service URL | `http://localhost:3000` |
| `QUESTION_SERVICE_URL` | Question Service URL | `http://localhost:3001` |
| `MATCHING_SERVICE_URL` | Matching Service URL | `http://localhost:3002` |
| `COLLAB_SERVICE_URL` | Collaboration Service URL | `http://localhost:3003` |
| `COLLAB_WS_URL` | Collaboration WebSocket URL | `ws://localhost:8081` |
| `CODE_EXECUTION_SERVICE_URL` | Code Execution Service URL | `http://localhost:3005` |
| `ATTEMPT_HISTORY_SERVICE_URL` | Attempt History Service URL | `http://localhost:3005` |

---

## How To Run

### With Docker Compose (recommended)

From the project root:

```bash
docker compose up --build
```

The API Gateway will be available at `http://localhost:3004`.

### Local Development (without Docker)

```bash
cd api-gateway
npm install
npm run dev
```

Requires all backend services to be running at their default ports.
