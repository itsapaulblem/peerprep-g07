<!--
AI Assistance Disclosure:
Tool: GitHub Copilot (model: Claude Opus 4.6), date: 2026-04-12
Scope: Generated initial README content based on existing codebase analysis.
Author review: Validated correctness against source code, verified all screens, services, and config values.
-->

# Frontend

PeerPrep's single-page application built with React, served via Nginx. Provides the user interface for authentication, peer matching, collaborative coding, code execution, and question management.

---

## What This Service Does

- Authenticates users (login, signup, password recovery).
- Allows users to select preferences (difficulty, topic, language) and find a peer match via WebSocket.
- Hosts a real-time collaborative coding workspace with a shared Monaco code editor (powered by Yjs CRDT).
- Provides in-workspace code execution with a console output tab and test case runner.
- Displays question library and attempt history.
- Supports role-based access: admins can manage questions, root-admins can manage users.

---

## Tech Stack

- **Framework**: React 18 + TypeScript
- **Build Tool**: Vite 6
- **Styling**: Tailwind CSS 4, shadcn/ui components, Radix UI primitives
- **Code Editor**: Monaco Editor (`@monaco-editor/react`)
- **Real-time Collaboration**: Yjs + y-monaco + y-websocket
- **HTTP Client**: Axios
- **Routing**: React Router DOM 7
- **Production Server**: Nginx (Alpine)
- **Containerisation**: Docker (multi-stage build)

---

## Project Structure

```
frontend/
├── Dockerfile                  # Multi-stage build: Node (build) → Nginx (serve)
├── nginx.conf                  # Nginx config with API/WS reverse proxy
├── index.html                  # SPA entry point
├── vite.config.ts              # Vite config with path aliases and dev proxy
├── tsconfig.json
├── package.json
└── src/
    ├── main.tsx                # React root – BrowserRouter + Toaster
    ├── vite-env.d.ts
    ├── app/
    │   ├── App.tsx             # Routing, nav bar, screen switching
    │   ├── components/
    │   │   ├── LoginScreen.tsx
    │   │   ├── SignupScreen.tsx
    │   │   ├── ForgotPasswordScreen.tsx
    │   │   ├── MatchingDashboard.tsx
    │   │   ├── QuestionLibrary.tsx
    │   │   ├── AddQuestionScreen.tsx
    │   │   ├── EditQuestionScreen.tsx
    │   │   ├── UserProfileScreen.tsx
    │   │   ├── AdminPanel.tsx
    │   │   ├── SoloWorkspace.tsx
    │   │   ├── AttemptHistoryPanel.tsx
    │   │   ├── SciFiBackground.tsx
    │   │   ├── collaboration_page/
    │   │   │   ├── CollaborationWorkspace.tsx
    │   │   │   ├── Editor.tsx
    │   │   │   └── Chatbox.tsx
    │   │   └── ui/             # shadcn/ui component library
    │   ├── services/
    │   │   ├── apiClient.ts    # Axios instance with JWT interceptor
    │   │   ├── authService.ts
    │   │   ├── questionService.ts
    │   │   └── attemptHistoryService.ts
    │   └── utils/
    │       ├── apiError.ts
    │       └── titleCase.ts
    └── styles/
        ├── index.css
        ├── tailwind.css
        ├── theme.css
        └── fonts.css
```

---

## Screens

| Screen | Description | Access |
|--------|-------------|--------|
| Login / Signup | Authentication pages | Public |
| Matching Dashboard | Select preferences and find a peer match | All users |
| Collaboration Workspace | Shared code editor, chat, code execution, test runner | Matched users |
| Solo Workspace | Individual coding practice | All users |
| Question Library | Browse and manage questions | Admin / Root Admin |
| User Profile | View and edit profile | All users |
| Attempt History | View past coding attempts | All users |
| Admin Panel | User management | Root Admin only |

---

## Environment Variables

Build-time variables (injected during `vite build`):

| Variable | Description | Default |
|----------|-------------|---------|
| `VITE_API_URL` | API Gateway base URL | `http://localhost:3004/api` |
| `VITE_YJS_WS_URL` | Yjs WebSocket URL for collaborative editing | — |
| `VITE_CHAT_WS_URL` | Chat WebSocket URL | — |

---

## Nginx Configuration

In production, Nginx serves the built SPA and reverse-proxies backend traffic:

| Path | Target | Notes |
|------|--------|-------|
| `/` | Static files | SPA fallback (`try_files $uri $uri/ /index.html`) |
| `/api/` | `http://api-gateway:3004/api/` | REST API proxy |
| `/ws/` | `http://api-gateway:3004` | WebSocket proxy (matching, Yjs, chat) |

Listens on port **3038**.

---

## How To Run

### With Docker Compose (recommended)

From the project root:

```bash
docker compose up --build
```

The frontend will be available at `http://localhost:3038`.

### Local Development (without Docker)

```bash
cd frontend
npm install
npm run dev
```

Vite dev server starts on `http://localhost:3038` with automatic proxy to the API Gateway at `localhost:3004`.
