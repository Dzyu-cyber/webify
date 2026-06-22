# Webify — Product Requirements Document

## What It Is
Webify is a specialized design tokenizer and context generator that transforms any website URL into a precise, LLM-ready design.md file. Designed for developers and AI agents, it bypasses the noise of raw source CSS by capturing resolved computed styles, clustering colors via Delta-E distance, and mapping typography. This allows for highly accurate, zero-hallucination replication of web interfaces.

## Tech Stack
Frontend: React (Vite) + TypeScript + Tailwind CSS

Backend API: Express.js + Node.js

Worker Queue: BullMQ + Redis + Playwright

Database/Auth: Supabase (PostgreSQL & Auth)

AI Integration: Claude API

Deployment: Render/Railway (Backend/Worker) + Vercel (Frontend)

## MVP Features (In Build Order)
Headless Extraction Engine (Worker) — Uses Playwright to wait for full hydration, intercept stylesheets, and extract computed styles. This is the foundation; without accurate DOM data, the pipeline fails.

Style Distiller & Tokenizer (Worker) — Runs clustering algorithms to group raw hex codes and normalize typography/spacing into a clean design system. Depends on the extraction engine to reduce the massive signal-to-noise ratio.

LLM Formatter Pipeline (Worker) — Feeds the distilled token JSON to the Claude API to reliably format the output. Depends on the tokenizer to prevent LLM hallucinations.

Async API & Job Queue (Backend) — Implements Express and BullMQ to manage long-running Playwright tasks. Crucial because synchronous HTTP requests will time out during a scrape.

Web Interface (Frontend) — A minimal React SPA to input URLs, poll the backend for job status updates, and view/download the resulting design.md.

## Atomic Tasks Breakdown (For Agent Implementation)
### Feature 1: Headless Extraction Engine
├── Task 1.1: Initialize worker Node.js project, install Playwright, and write a basic script to visit a hardcoded URL.
├── Task 1.2: Implement advanced wait conditions (networkidle, custom script for document.fonts.ready, and DOM stabilization).
├── Task 1.3: Implement logic to detect and completely strip/ignore iframes before extraction begins.
├── Task 1.4: Write the DOM injection script to collect getComputedStyle() for up to 1,000 sampled UI elements.
└── Task 1.5: Create a filtering function to discard default browser styles by comparing against a baseline user-agent stylesheet.

### Feature 2: Style Distiller & Tokenizer
├── Task 2.1: Write a utility function to calculate Delta-E color distance between two HEX/RGB values.
├── Task 2.2: Implement the color clustering algorithm to reduce hundreds of extracted raw colors into a core palette of <15 tokens.
├── Task 2.3: Implement logic to extract the base spacing unit (calculating the GCD of collected padding/margin values).
├── Task 2.4: Implement logic to sort and group extracted font families and sizes into a standardized type scale.
└── Task 2.5: Compile the distilled colors, spacing, and typography into a standardized, structured JSON schema.

### Feature 3: LLM Formatter Pipeline
├── Task 3.1: Set up the Claude API SDK and securely load environment variables.
├── Task 3.2: Draft the strict System Prompt instructing Claude to act solely as a formatter (no guessing/hallucination) and defining the design.md output structure.
├── Task 3.3: Write the function that sends the distilled JSON schema and prompt to Claude and captures the response.
└── Task 3.4: Implement API error handling, rate-limit backoff, and retry logic for the Claude request.

### Feature 4: Async API & Job Queue
├── Task 4.1: Initialize the Express server, configure CORS, and set up basic error handling middleware.
├── Task 4.2: Connect to Redis and initialize the BullMQ queue (extraction-queue).
├── Task 4.3: Create POST /api/extract route to accept a URL, validate it, push a job to BullMQ, and return a jobId.
├── Task 4.4: Create GET /api/jobs/:id route for the frontend to poll job status (pending, processing, completed, failed) and retrieve the final markdown.
└── Task 4.5: Wire up Features 1-3 inside a BullMQ worker processor so it executes sequentially when a job is picked up.

### Feature 5: Web Interface
├── Task 5.1: Initialize the Vite React app, configure Tailwind CSS, and set up basic routing.
├── Task 5.2: Build the Landing Page UI with a prominent URL input field and format validation.
├── Task 5.3: Implement API client logic to POST the URL and start polling the GET /api/jobs/:id endpoint on an interval.
├── Task 5.4: Build a dynamic Loading View that shows real-time phase updates (e.g., "Extracting DOM...", "Distilling Tokens...").
├── Task 5.5: Build the Results View to render the generated design.md using a markdown renderer with syntax highlighting.
└── Task 5.6: Implement "Copy to Clipboard" and "Download as .md" utility buttons for the final output.

## Out of Scope (NOT in MVP)
Terminal/CLI integration (focusing purely on the web application first)

Bypassing enterprise bot protection (e.g., Cloudflare Turnstile) via residential proxies

Extracting interactive pseudo-states (:hover, :focus-visible, :active)

Extracting complex keyframe animations

Downloading or packaging raw image assets and font files

## Technical Risks
The Dynamic SPA & Hydration Wall: Single-page apps often render empty DOMs initially. Handled by injecting custom scripts in Playwright that wait for networkidle, document.fonts.ready, and DOM stabilization before sampling styles (Task 1.2).

The Computed Style Data Avalanche: Browsers apply hundreds of default styles to every element, overwhelming the LLM context window. Handled by strictly filtering styles against a baseline browser user-agent stylesheet and only passing custom deltas (Task 1.5).

Iframes and Shadow DOM Pollution: Third-party embeds (like customer support chats or ads) introduce rogue colors and fonts. Handled by explicitly ignoring or stripping iframe content prior to the extraction phase (Task 1.3).

## Success Criteria
A user can input a valid, unprotected URL and receive a fully formatted design.md file in under 60 seconds.

The color clustering algorithm successfully reduces a raw scrape of 1,000+ computed element colors into a cohesive palette of fewer than 15 core design tokens.
