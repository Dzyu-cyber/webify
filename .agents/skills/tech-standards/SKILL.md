---
name: tech-standards
description: Defines coding guidelines, tech standards, and conventions for Webify.
---

# Webify Technical Standards

## Frontend Standards
- React 18+ with Vite and TypeScript.
- Tailwind CSS for all styling (avoid custom inline styles unless computed dynamically).
- Clean component structure: focus on reusability, responsiveness, and premium dark-mode aesthetics.
- Strict type definitions.

## Backend & Worker Standards
- Express.js and Node.js with TypeScript.
- BullMQ for queue management.
- Playwright for scraping. Ensure wait-for-stabilization and iframe stripping are implemented correctly.
- Use environment variables via `.env` for secrets (e.g., Supabase key, Claude API key, Redis host).
