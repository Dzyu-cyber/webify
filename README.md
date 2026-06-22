#  Webify: Visual & Structural Web Design Tokenizer

Webify is a specialized design tokenizer and context generator that transforms any public website URL into a precise, LLM-ready `design.md` file. 

Designed for developers, designers, and AI agents, it bypasses the noise of raw source CSS files by capturing resolved computed styles, clustering colors perceptually using Delta-E distance, mapping typography scales, and capturing viewport screenshots. This prevents LLM styling hallucinations and enables zero-guesswork visual replication of web interfaces.

---

## 🚀 Key Features

*   **Multimodal Visual Tokenizer**: Captures **5 viewport screenshots** as Playwright scrolls through the page, converting them to compressed JPEGs to provide layout, alignment, and hierarchical context to the LLM.
*   **Headless Extraction Engine**: Employs Playwright to wait for full document font loading, hydration, and DOM stabilization, completely stripping out iframes to prevent widget noise.
*   **Dynamic Baseline stylesheet Exclusion**: Automatically calculates baseline browser default styles (User-Agent sheets) on a blank tab and filters them out of the extracted element styles to keep payloads minimal.
*   **Perceptual Color Clustering**: Converts RGB/HEX values to the Lab color space and applies the **CIE76 Delta-E formula** to group visually identical colors into a unified palette of up to 15 tokens.
*   **Grid & Spacing Distillation**: Runs mathematical Greatest Common Divisor (GCD) algorithms on padding/margin metrics to distill the page's base grid unit (e.g., 4px, 8px) and layout spacing scale.
*   **Type Scale Mapping**: Groups and sorts font-sizes and font-families by frequency, filtering out single-occurrence style outliers.
*   **Interactive UI Gallery**: Features real-time status trackers, a responsive markdown document viewer, and individual download buttons for the captured viewport screenshots.

---

## 📐 Pipeline Architecture

```mermaid
flowchart TD
    A["User Input: Website URL"] --> B["Playwright Headless Browser"]
    B --> C["DOM Stabilization & Iframe Removal"]
    B --> D["Capture 5 Viewport Screenshots (JPEG base64)"]
    B --> E["Extract Computed CSS Styles (1000 Elements)"]
    
    E --> F["Filter browser baseline defaults"]
    F --> G["Style Distiller / Tokenizer"]
    
    G --> H["Perceptual CIE76 Delta-E Color Clustering"]
    G --> I["Calculate Spacing GCD (Base Grid)"]
    G --> J["Map Typography Families & Scales"]
    
    H & I & J & D --> K["Gemini 2.5 Flash API (Multimodal)"]
    K --> L["Generate LLM-Ready design.md"]
    
    L --> M["Vite React UI Render"]
    M --> N["Download: design.md + Screenshots"]
```

---

## 🛠️ Technology Stack

| Layer | Technologies |
| :--- | :--- |
| **Frontend UI** | React 19 (Vite), TypeScript, Tailwind CSS, Lucide Icons, React Markdown |
| **Backend API** | Node.js, Express.js |
| **Worker Queue** | BullMQ, Redis |
| **Scraper** | Playwright (Chromium headless) |
| **AI Processing** | Google Gemini Developer API (`gemini-2.5-flash`) |
| **Deployment** | Vercel (Frontend), Render (Backend + Worker), Upstash (Serverless Redis) |

---

## ⚙️ Getting Started

### Prerequisites
*   Node.js (v18+)
*   Redis (v5+ for BullMQ streams compatibility)

### Installation

1.  **Clone the repository**:
    ```bash
    git clone https://github.com/Dzyu-cyber/webify.git
    cd webify
    ```

2.  **Configure Environment Variables**:
    Create a `.env` file in the `backend/` folder:
    ```env
    PORT=3000
    REDIS_URL=redis://127.0.0.1:6379
    GEMINI_API_KEY=your_gemini_api_key_here
    ```

3.  **Install dependencies**:
    ```bash
    # Install backend dependencies & Playwright browsers
    cd backend
    npm install
    npx playwright install chromium

    # Install frontend dependencies
    cd ../frontend
    npm install
    ```

### Running Locally

1.  **Start your local Redis Server**:
    Ensure Redis is running on port `6379`.

2.  **Start the Backend server and worker**:
    In the `backend/` folder, run:
    ```bash
    npm run dev:server
    ```
    *(For local convenience, both the server and worker run concurrently in this command).*

3.  **Start the Frontend app**:
    In the `frontend/` folder, run:
    ```bash
    npm run dev
    ```
    Open **[http://localhost:5173/](http://localhost:5173/)** in your browser.

---

## ☁️ Production Deployment

### 1. Queue Database (Upstash)
*   Deploy a serverless Redis database on [Upstash](https://upstash.com/).
*   Copy your database's connection string (e.g. `rediss://default:password@hostname:port`).

### 2. Backend (Render Web Service)
Deploy a **Web Service** on [Render](https://render.com/) pointing to the `backend/` folder:
*   **Build Command**: `npm install && npm run build && npx playwright install chromium`
*   **Start Command**: `npm run start`
*   **Environment Variables**:
    *   `PORT`: `3000`
    *   `REDIS_URL`: `[Your Upstash Connection String]`
    *   `GEMINI_API_KEY`: `[Your Gemini API Key]`

### 3. Frontend (Vercel)
Deploy a static project on [Vercel](https://vercel.com/) pointing to the `frontend/` folder:
*   **Framework Preset**: `Vite`
*   **Environment Variables**:
    *   `VITE_API_BASE_URL`: `[URL of your deployed Render Web Service]`

---

## 📄 License
This project is open-source and licensed under the MIT License.
