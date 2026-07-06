# Query.AI — RAG Document Assistant

> **Upload a PDF. Ask a question. Get a grounded AI answer.**

Query.AI is a Retrieval-Augmented Generation (RAG) chatbot that lets you have a conversation with any PDF document. It uses Google Gemini for both embeddings and language generation, and Qdrant as the vector database for semantic search.

---

## Screenshots

| Document indexed & answer generated | Source chunks revealed |
|---|---|
| ![Answer view](sample/example2.png) | ![Source chunks](sample/example1.png) |

---

## Architecture

### High-Level Request Flow

```mermaid
flowchart LR
    User(["👤 User"])
    FE["⚛️ Frontend\n(React / Bun)"]
    BE["🟢 Backend\n(Express / Bun)"]
    QD[("🗄️ Qdrant\nVector DB")]
    GM["✨ Gemini API\n(Google)"]

    User -->|"Upload PDF\n+ Query"| FE
    FE -->|"POST /uploads\nmultipart/form-data"| BE
    BE -->|"Embed query\n& chunks"| GM
    BE -->|"Upsert vectors\n& search"| QD
    QD -->|"Top-k chunks"| BE
    GM -->|"Generated answer"| BE
    BE -->|"JSON: answer\n+ context"| FE
    FE -->|"Renders\nchat bubble"| User
```

---

### RAG Pipeline (Backend Detail)

```mermaid
sequenceDiagram
    participant C as Client (React)
    participant S as Express Server
    participant P as PDF Parser
    participant E as Embeddings (Gemini)
    participant Q as Qdrant
    participant L as LLM (Gemini)

    C->>S: POST /uploads {pdf, query}
    S->>P: Parse PDF → raw text
    P-->>S: Extracted text

    loop For each chunk
        S->>E: createEmbedding(chunk)
        E-->>S: vector[3072]
    end

    S->>Q: upsert(vectors + payloads)
    Q-->>S: ack

    S->>E: createEmbedding(query)
    E-->>S: queryVector[3072]

    S->>Q: search(queryVector, limit=3)
    Q-->>S: top-k chunks + scores

    S->>L: generateContent(prompt + context)
    L-->>S: answer text

    S-->>C: { answer, context, meta }
```

---

### Monorepo Structure

```mermaid
graph TD
    Root["query.ai (Turborepo)"]
    Root --> Apps
    Root --> Packages

    Apps --> Frontend["apps/frontend\nBun + React + Tailwind"]
    Apps --> Backend["apps/backend\nExpress + Gemini + Qdrant"]

    Frontend --> FE_API["src/api/ragClient.ts"]
    Frontend --> FE_Comp["src/components/\n├── ChatInterface.tsx\n├── FileUpload.tsx\n└── QueryInput.tsx"]
    Frontend --> FE_App["src/App.tsx"]

    Backend --> BE_Config["src/config.ts"]
    Backend --> BE_Embed["src/embeddings.ts"]
    Backend --> BE_RAG["src/rag.ts"]
    Backend --> BE_Routes["src/routes/\n├── upload.ts\n└── collection.ts"]
    Backend --> BE_Utils["src/utils.ts"]

    Packages --> ESLint["eslint-config"]
    Packages --> TSConfig["typescript-config"]
    Packages --> UI["ui"]
```

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 19, Bun, Tailwind CSS v4 |
| Backend | Express 5, Bun runtime |
| Embeddings | Gemini `gemini-embedding-exp-03-07` (3072-dim) |
| LLM | Gemini `gemini-2.5-flash-lite` |
| Vector DB | Qdrant (managed cloud) |
| Monorepo | Turborepo |

---

## Getting Started

### Prerequisites

- [Bun](https://bun.sh) ≥ 1.3
- A [Google AI Studio](https://aistudio.google.com/app/apikey) API key (Gemini)
- A [Qdrant Cloud](https://cloud.qdrant.io) cluster

### 1 — Clone & Install

```bash
git clone https://github.com/your-username/query.ai.git
cd query.ai
bun install
```

### 2 — Configure Environment

```bash
cp apps/backend/.env.example apps/backend/.env
```

Fill in your values in `apps/backend/.env`:

```env
GEMINI_API_KEY=your_gemini_api_key
QUADRANT_API_KEY=your_qdrant_api_key
CLUSTER_ENDPOINT=https://your-cluster.qdrant.io
```

### 3 — Create the Qdrant Collection (one-time)

Once the backend is running, call this endpoint once to create the vector collection:

```bash
curl http://localhost:3001/create-collection
```

### 4 — Run in Development

```bash
# From the repo root — starts both frontend and backend via Turborepo
bun run dev

# Or run individually:
cd apps/backend  && bun --hot index.ts    # → http://localhost:3001
cd apps/frontend && bun run dev           # → http://localhost:3000
```

## License

MIT
