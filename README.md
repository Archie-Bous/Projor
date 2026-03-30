# 🗺️ Projor

> AI-powered project visualisation and roadmap builder.

Chat with an AI assistant to create beautiful, informative project roadmaps and export them as self-contained HTML files to share with your whole team — no account, no cloud dependency.

![Projor chat UI](https://github.com/user-attachments/assets/de5566cc-6e58-4bad-9922-d8d433d0209d)
![Roadmap preview](https://github.com/user-attachments/assets/07877d15-04ff-46bb-925d-a46d206be722)

---

## Features

- **Conversational roadmap builder** — the AI assistant asks the right questions (project name, phases, milestones, team, dates, theme) and builds the roadmap as you chat.
- **Live split-pane preview** — see the roadmap update in real-time on the right while you chat on the left.
- **Beautiful Gantt chart** — timeline with month labels, colour-coded phase bars, and milestone diamonds.
- **Phase & milestone cards** — each phase has a detail card showing dates, description, milestones, and assignees.
- **Team member section** — avatar initials, names, and roles.
- **5 built-in themes** — `blue` (default), `green`, `purple`, `orange`, `dark`.
- **One-click HTML export** — generates a fully self-contained HTML file (no external dependencies) ready to share by email, Slack, or Confluence.
- **Print-friendly** — the exported HTML includes `@media print` styles so it looks great on paper too.

---

## Quick start

### Prerequisites

- Node.js 18+
- An [OpenAI API key](https://platform.openai.com/api-keys)

### 1. Install dependencies

```bash
npm install
```

### 2. Configure your API key

```bash
cp .env.example .env
# Edit .env and add your OPENAI_API_KEY
```

`.env` options:

| Variable | Default | Description |
|---|---|---|
| `OPENAI_API_KEY` | *(required)* | Your OpenAI API key |
| `PORT` | `3000` | Port the server listens on |
| `OPENAI_MODEL` | `gpt-4o` | OpenAI model to use |

### 3. Start the server

```bash
npm start
# or for development with auto-reload:
npm run dev
```

Open **http://localhost:3000** in your browser.

---

## How it works

1. **Chat** — describe your project to the AI. It will guide you through phases, milestones, team members, dates, and colour theme.
2. **Preview** — the roadmap preview panel updates automatically after each AI response.
3. **Download** — click **⬇ Download HTML** to save a self-contained HTML roadmap file.
4. **Share** — email the file to team members, drop it in Slack, or attach it to a ticket — no internet connection required to view it.

---

## Project structure

```
projor/
├── server.js               # Express server (chat & generate endpoints)
├── lib/
│   └── roadmapGenerator.js # Self-contained HTML roadmap generator
├── public/
│   ├── index.html          # Split-pane app shell
│   ├── style.css           # Dark-theme UI styles
│   └── app.js              # Frontend chat & preview logic
├── tests/
│   └── roadmapGenerator.test.js
├── .env.example
└── package.json
```

## API

| Method | Path | Description |
|---|---|---|
| `GET` | `/` | Serves the app UI |
| `POST` | `/api/chat` | Sends messages to OpenAI; returns `{ message, roadmap }` |
| `POST` | `/api/generate` | Accepts a `roadmap` object; returns a self-contained HTML file |
| `GET` | `/api/health` | Health check |

---

## Running tests

```bash
npm test
```
