---
name: project-context
description: Provides full context about Webify — its architecture, conventions, and current state. Always load this at the start of any session.
---

# Project: Webify

## Architecture
Webify is split into a separated Frontend (React SPA) and Backend (Express API + Background Workers). Because web scraping with Playwright is blocking and slow, synchronous API routes are not used. Instead, the Express API pushes jobs to a Redis-backed BullMQ queue, which are then processed by headless worker scripts that interact with the Claude API.

## File Structure Conventions
- `/client/src/components` — Reusable React UI components
- `/client/src/hooks` — Custom React hooks (e.g., polling job status)
- `/server/src/routes` — Express API endpoints (controllers for job creation/fetching)
- `/server/src/workers` — BullMQ queue processors and Playwright extraction logic
- `/server/src/services` — Claude API integrations and core clustering algorithms
- `/shared/types` — Shared TypeScript interfaces (e.g., `design.md` schema, Job status payloads)

## Current Status
- **Phase:** MVP Build
- **Completed:**
  - ✅ Setup Git & Core Configurations
  - ✅ Scaffold Frontend (Vite + React + TS + Tailwind)
  - ✅ Scaffold Backend (Node + TS + Express)
  - ✅ Feature 1: Headless Extraction Engine (Playwright DOM style extraction, stabilization, iframe stripping, and baseline filtering)
- **In Progress:**
  - 🔄 Feature 2: Style Distiller & Tokenizer
- **Next Up:** Feature 2, Task 2.1 — Delta-E color distance calculation utility.

## Environment Variables Needed
*(Note: Frontend vars use `VITE_` prefix, Backend vars do not)*
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- `VITE_API_BASE_URL` (For pointing the frontend to the Express backend)
- `SUPABASE_SERVICE_ROLE_KEY`
- `REDIS_URL` (For BullMQ)
- `CLAUDE_API_KEY` (Anthropic)

## Naming Conventions
- React Components: PascalCase (`JobStatusTracker.tsx`)
- Hooks: camelCase with 'use' prefix (`useJobPolling.ts`)
- Backend Services/Utils: camelCase (`colorDistiller.ts`, `domExtractor.ts`)
- API Routes: kebab-case (`/api/v1/extract-job`)
- Interfaces/Types: Prefix with 'I' or use PascalCase (`IExtractionJob`, `DesignTokenConfig`)

## Do Not Touch
- Do not modify the Playwright DOM evaluation scripts (`window.getComputedStyle` logic) without explicitly detailing the expected browser side-effects, as this is the most fragile part of the extraction pipeline.
- Do not convert the frontend to Server-Side Rendering (SSR) frameworks; maintain the Vite SPA architecture.
