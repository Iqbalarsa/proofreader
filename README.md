# Proofreader — Non-AI Academic Grammar & Style Linter

A distraction-free, zero-AI academic proofreading and grammar checking assistant designed with Apple-inspired Liquid Glass aesthetics. Built strictly on deterministic rule-based NLP to protect authentic author voice and ensure 100% academic integrity against AI detectors.

---

## Highlights & Features

- **Pure Non-AI Linter:** Powered by LanguageTool's deterministic rule-based engine. Zero generative paraphrasing or rewriting — preserving the authenticity and original style of academic manuscripts, theses, and essays.
- **Apple Liquid Glass Aesthetic:** Clean frosted-glass translucent UI with fluid backdrop blurs, soft ambient lighting, minimal pill buttons, and zero clutter or decorative icon distractions.
- **Real-Time Split-Screen Workspace:**
  - **Writing Canvas (Left):** Comfortable ~75ch reading width, dual **Write** and **Review** modes, interactive cursor tracking that syncs with correction cards.
  - **Suggestions Feed (Right):** Categorized rule cards (*Subject-Verb Agreement*, *Article Usage*, *Punctuation*, *Spelling*), before/after diff pills, educational grammar feedback, and one-click *Accept*, *Dismiss*, or *Accept All*.
- **Integrated Draft History:** Automatic background saves as you type, plus manual snapshots with relative timestamps (`just now`, `5m ago`), word counts, preview snippets, `.txt` download, and JSON backup export.
- **Custom Academic Jargon Whitelist:** Add specialized terminology, field abbreviations, or scientific notation (*CRISPR-Cas9*, *heteroscedasticity*, *p-value*) to avoid false-positive spelling alerts.
- **Confidentiality / Docker Ready:** Use the default official public LanguageTool API with zero registration, or switch to a private local Docker container (`http://localhost:8010/v2/check`) via Engine Settings for 100% offline data privacy.

---

## Tech Stack

- **Framework:** Next.js 14 (App Router)
- **Styling:** Tailwind CSS (Custom Liquid Glassmorphism)
- **Engine:** LanguageTool HTTP API (Public / Local Docker)
- **State & Storage:** React 18, HTML5 LocalStorage
- **Language:** TypeScript

---

## Getting Started

### 1. Prerequisites
- Node.js 18+ (tested on Node.js v24)
- npm or yarn / pnpm

### 2. Installation
```bash
# Clone the repository
git clone https://github.com/Iqbalarsa/proofreader.git
cd proofreader

# Install dependencies
npm install
```

### 3. Running Locally
```bash
# Development mode
npm run dev

# Or build and start production server
npm run build
npm run start
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## License

MIT License. Open source and free for academic and personal use.
