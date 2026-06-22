---
name: project-context
description: Provides context about the Webify project, features, goals, and monorepo structure.
---

# Webify Project Context

Webify is a specialized design tokenizer and context generator that transforms any website URL into a precise, LLM-ready `design.md` file.

## Repository Layout
- `frontend/`: Single Page Application built with React, TypeScript, Vite, and Tailwind CSS.
- `backend/`: Server application containing the Express API and the BullMQ worker processor.
- `PRD.md`: The Product Requirements Document.

## Key Goals
1. Extract computed styles using Playwright.
2. Group and cluster colors via Delta-E color distance.
3. Distill typography and spacing.
4. Format output using Claude API.
5. Manage scraping jobs asynchronously via BullMQ and Redis.
