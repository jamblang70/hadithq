# Implementation Plan: Production Deployment

## Overview

Make the Semantic Hadith Search application production-ready by adding Docker configuration, deployment configs (Vercel/Railway), CI/CD pipeline, structured logging, graceful shutdown, comprehensive health checks, security hardening, SEO meta tags, error boundary, and performance optimizations. All tasks modify or extend the existing TypeScript codebase.

## Tasks

- [x] 1. Backend utilities — Logger and environment validation
  - [x] 1.1 Create `backend/src/utils/logger.ts` — structured logger module
    - Export a `Logger` object with `info`, `warn`, `error` methods
    - In production (`NODE_ENV=production`): output JSON with `timestamp`, `level`, `message`, `requestId`, and spread `meta`
    - In development: output human-readable text format
    - Accept optional `meta` object including `requestId`
    - _Requirements: 2.2, 2.3_

  - [ ]* 1.2 Write property test for logger format (`backend/src/utils/logger.test.ts`)
    - **Property 1: Format log ditentukan oleh NODE_ENV**
    - Use `fast-check` to generate arbitrary log messages and meta objects
    - Assert JSON output with required fields when `NODE_ENV=production`
    - Assert non-JSON text output when `NODE_ENV=development`
    - **Validates: Requirements 2.2, 2.3**

  - [x] 1.3 Create `backend/src/utils/validateEnv.ts` — environment variable validator
    - Export `validateEnv()` function that checks `DATABASE_URL`, `QDRANT_URL`, `OPENAI_API_KEY`
    - If any are missing, log which ones are missing and call `process.exit(1)`
    - If all present, return void silently
    - _Requirements: 11.1, 11.2_

  - [ ]* 1.4 Write property test for env validation (`backend/src/utils/validateEnv.test.ts`)
    - **Property 9: Validasi environment variable saat startup**
    - Use `fast-check` to generate subsets of required env vars
    - Assert error mentions each missing variable name
    - Assert success when all variables are set
    - **Validates: Requirements 11.1, 11.2**

- [x] 2. Backend middleware — Request ID, request logger, CORS, error handler
  - [x] 2.1 Create `backend/src/middleware/requestId.ts`
    - Generate UUID v4 per request using `crypto.randomUUID()`
    - Store in `res.locals.requestId`
    - Set `X-Request-Id` response header
    - _Requirements: 5.2, 11.4_

  - [ ]* 2.2 Write property test for request ID (`backend/src/middleware/requestId.test.ts`)
    - **Property 5: Request ID berformat UUID v4 dan unik**
    - Generate multiple requests, assert each ID matches UUID v4 regex
    - Assert all IDs are unique across requests
    - **Validates: Requirements 5.2**

  - [x] 2.3 Create `backend/src/middleware/requestLogger.ts`
    - Log each request on response finish: method, path, statusCode, responseTimeMs, requestId
    - Use the logger from `utils/logger.ts`
    - Calculate response time using `Date.now()` or `process.hrtime`
    - _Requirements: 5.1, 10.4, 11.4_

  - [ ]* 2.4 Write property test for request logger (`backend/src/middleware/requestLogger.test.ts`)
    - **Property 4: Kelengkapan field log request**
    - Assert log entries contain `method`, `path`, `statusCode`, `responseTimeMs` (number >= 0), `requestId` (non-empty string)
    - **Validates: Requirements 5.1, 10.4, 11.4**

  - [x] 2.5 Create `backend/src/middleware/errorHandler.ts` — global error handler
    - Return consistent format: `{ error, requestId, statusCode }`
    - In production: sanitize error messages (no stack traces, file paths, env var names)
    - In development: include more detail for debugging
    - _Requirements: 5.3, 5.4, 11.3_

  - [ ]* 2.6 Write property tests for error handler (`backend/src/middleware/errorHandler.test.ts`)
    - **Property 6: Format error response konsisten**
    - Assert response body has exactly `error` (string), `requestId` (UUID v4), `statusCode` (number matching HTTP status)
    - **Property 7: Sanitasi error di production**
    - Assert production error responses contain no stack traces, file paths, or env var patterns
    - **Validates: Requirements 5.3, 5.4, 11.3**

  - [x] 2.7 Update CORS configuration in `backend/src/index.ts`
    - Read `ALLOWED_ORIGINS` env var (comma-separated)
    - In development without `ALLOWED_ORIGINS`: default to `http://localhost:5173`
    - Reject disallowed origins with 403
    - _Requirements: 6.1, 6.2, 6.3_

  - [ ]* 2.8 Write property test for CORS (`backend/src/middleware/cors.test.ts`)
    - **Property 8: Validasi CORS origin**
    - Use `fast-check` to generate origin strings
    - Assert allowed origins pass, disallowed origins get 403
    - Assert localhost default in development
    - **Validates: Requirements 6.1, 6.2, 6.3**

- [x] 3. Checkpoint — Middleware and utilities
  - Ensure all tests pass, ask the user if questions arise.

- [x] 4. Backend server hardening — Health check, compression, graceful shutdown
  - [x] 4.1 Enhance health check endpoint in `backend/src/index.ts`
    - Check PostgreSQL connection (`pool.query('SELECT 1')`)
    - Check Qdrant connection (e.g., `qdrantClient.getCollections()`)
    - Return `{ status, services: { database, vectorDb }, timestamp }`
    - Status logic: both connected → `ok`, one down → `degraded`, both down → `error`
    - _Requirements: 2.4, 5.5, 5.6_

  - [ ]* 4.2 Write property test for health check (`backend/src/routes/health.test.ts`)
    - **Property 2: Komputasi status health check**
    - Use `fast-check` to generate all combinations of db/qdrant connected/disconnected
    - Assert correct status computation
    - **Validates: Requirements 2.4, 5.5, 5.6**

  - [x] 4.3 Add compression middleware to `backend/src/index.ts`
    - Install and add `compression` middleware
    - Compress responses > 1KB when client accepts gzip
    - _Requirements: 10.1_

  - [ ]* 4.4 Write property test for compression (`backend/src/middleware/compression.test.ts`)
    - **Property 10: Kompresi response besar**
    - Use `supertest` to send requests with `Accept-Encoding: gzip`
    - Assert `Content-Encoding: gzip` header on responses > 1KB
    - **Validates: Requirements 10.1**

  - [x] 4.5 Implement graceful shutdown in `backend/src/index.ts`
    - Store `server` reference from `app.listen()`
    - Handle `SIGTERM` and `SIGINT` signals
    - Stop accepting new connections, close DB pool, close Qdrant client
    - Force exit after 10 second timeout
    - _Requirements: 2.5, 2.6_

  - [x] 4.6 Wire all new middleware into `backend/src/index.ts`
    - Import and use `validateEnv()` at startup (before server start)
    - Add `requestId` middleware early in chain
    - Add `requestLogger` middleware after requestId
    - Add `compression` middleware
    - Replace existing CORS config with new CORS logic
    - Replace existing error handler with new `errorHandler`
    - Export `server` reference for graceful shutdown
    - _Requirements: 2.1, 2.2, 2.3, 5.1, 5.2, 5.3, 6.1, 10.1, 11.1_

- [x] 5. Checkpoint — Backend hardening
  - Ensure all tests pass, ask the user if questions arise.

- [x] 6. Frontend production readiness — SEO, Error Boundary, PWA manifest
  - [x] 6.1 Update `frontend/index.html` with SEO and meta tags
    - Change `<html lang="en">` to `<html lang="id">`
    - Set descriptive `<title>`
    - Add meta `description` (max 160 chars)
    - Add Open Graph meta tags (`og:title`, `og:description`, `og:type`, `og:url`, `og:image`)
    - Add Twitter Card meta tags (`twitter:card`, `twitter:title`, `twitter:description`, `twitter:image`)
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5_

  - [x] 6.2 Create `frontend/src/components/ErrorBoundary.tsx`
    - Class-based React component with `componentDidCatch`
    - Render fallback UI with friendly error message and reload button
    - _Requirements: 4.4_

  - [ ]* 6.3 Write property test for ErrorBoundary (`frontend/src/components/ErrorBoundary.test.tsx`)
    - **Property 3: Error Boundary menangkap error child component**
    - Assert fallback UI renders on child error
    - Assert reload button is present
    - Assert error does not propagate outside boundary
    - **Validates: Requirements 4.4**

  - [x] 6.4 Wrap root app with ErrorBoundary in `frontend/src/main.tsx`
    - Import `ErrorBoundary` and wrap `<App />` inside it
    - _Requirements: 4.4_

  - [x] 6.5 Create `frontend/public/manifest.json` — PWA manifest
    - Include `name`, `short_name`, `description`, `start_url`, `display`, `theme_color`, `background_color`, icon references
    - Link manifest in `frontend/index.html`
    - _Requirements: 4.2_

- [x] 7. Deployment configuration — Docker, Railway, Vercel
  - [x] 7.1 Create `backend/Dockerfile` — multi-stage production build
    - Stage 1 (build): `node:22-alpine`, install deps, run `tsc`
    - Stage 2 (runtime): `node:22-alpine`, copy dist + prod deps, run as non-root `node` user
    - Entrypoint: `node dist/index.js`
    - Target image size < 300MB
    - _Requirements: 8.1, 8.4, 8.5_

  - [x] 7.2 Create `backend/.dockerignore`
    - Ignore `node_modules/`, `dist/`, `.env`, `*.test.ts`, `vitest.config.ts`
    - _Requirements: 8.2_

  - [x] 7.3 Create `backend/railway.json` — Railway deployment config
    - Configure Dockerfile builder and health check path `/api/health`
    - _Requirements: 8.3_

  - [x] 7.4 Create `frontend/vercel.json` — Vercel deployment config
    - Configure build command, output directory, SPA rewrite rules
    - _Requirements: 7.1_

- [x] 8. CI/CD and repository setup
  - [x] 8.1 Create `.github/workflows/ci.yml` — GitHub Actions CI pipeline
    - Trigger on pull requests to `main` and pushes to `main`
    - Steps: install deps (with cache), lint, type check, test, build for both backend and frontend
    - Fail fast on any step failure
    - _Requirements: 9.1, 9.2, 9.3, 9.4_

  - [x] 8.2 Create/update root `.gitignore`
    - Add patterns: `node_modules/`, `dist/`, `.env`, `.env.*`, `*.log`, `.DS_Store`, `Thumbs.db`
    - _Requirements: 1.1_

  - [x] 8.3 Create root `README.md`
    - Project description, architecture overview, prerequisites, local setup instructions, API endpoints, deployment instructions
    - _Requirements: 1.2_

  - [x] 8.4 Create root `LICENSE` — MIT license
    - _Requirements: 1.3_

- [x] 9. Final checkpoint — Full integration
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- All code is TypeScript (backend: Node.js/Express, frontend: React/Vite)
- Property tests use `fast-check` (already in backend devDependencies)
- Frontend tests require adding `@testing-library/react` and `vitest` to frontend devDependencies
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
