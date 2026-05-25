# AI Worker (Phase 2A)

Python FastAPI service for CitiGoo product generation: design image, print file, mockup, and copy (DeepSeek + Fal).

## Environment


| Item             | Detail                                                                                                                                                                                                |
| ---------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Python**       | **3.13** for local dev (see Setup). Minimum **3.10+** if you use another interpreter.                                                                                                                 |
| **Dependencies** | Pinned in `[requirements.txt](requirements.txt)`; install with `pip install -r requirements.txt` inside this directory.                                                                               |
| **Isolation**    | Recommended: `python3.13 -m venv citigooapi` (below). Alternatives: Conda `python=3.13`, `uv`, etc.                                                                                                   |
| **Config file**  | Reads `**apps/medusa-backend/.env`** only (monorepo convention). Do not rely on a repo-root `.env`. Copy from `[../medusa-backend/.env.example](../medusa-backend/.env.example)`.                     |
| **Medusa**       | Runs as a **separate Node process** in `[apps/medusa-backend](../medusa-backend)` (default `http://localhost:9000`). For `generate-and-draft` and e2e scripts, start Medusa and this worker together. |


## Setup

Requires **Python 3.13** on your PATH (`python3.13`). Install via [python.org](https://www.python.org/downloads/) or `brew install python@3.13` (macOS).

```bash
cd apps/ai-worker
python3.13 -m venv citigooapi
source citigooapi/bin/activate     # Windows: citigooapi\Scripts\activate
python -m pip install --upgrade pip
pip install -r requirements.txt
```

Windows (PowerShell), if `python3.13` is not on PATH:

```powershell
cd apps\ai-worker
py -3.13 -m venv citigooapi
.\citigooapi\Scripts\activate
python -m pip install --upgrade pip
pip install -r requirements.txt
```

Configure keys in `[apps/medusa-backend/.env](../medusa-backend/.env)` (copy from `[../medusa-backend/.env.example](../medusa-backend/.env.example)`):

- `FAL_KEY` — image generation
- `DEEPSEEK_API_KEY` — product copy
- `PUBLISHABLE_API_KEY` — optional, to load supplier specs from Medusa
- `AI_WORKER_MOCK_GENERATION=true` — skip external APIs (local dev without keys)

## Run

```bash
cd apps/ai-worker
source citigooapi/bin/activate
uvicorn app.main:app --host 127.0.0.1 --port 8001
```

Browser: open `http://127.0.0.1:8001/` (JSON index) or **`http://127.0.0.1:8001/docs`** (Swagger UI).  
Health: `GET http://localhost:8001/health`  
Generate: `POST http://localhost:8001/ai/generate-product`

Static assets: `http://localhost:8001/static/<filename>`

> `GET /favicon.ico` 等 404 是浏览器自动请求，可忽略。

## Example

```bash
curl -sS -X POST http://localhost:8001/ai/generate-product \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "minimal geometric cat",
    "platform_product_id": "pp_tshirt",
    "supplier_product_id": "sp_tshirt",
    "supplier_variant_id": "spv_tshirt_black_m",
    "print_position": "front"
  }' | jq .
```

Then create a Medusa draft with the response fields, or use `POST /admin/ai/generate-and-draft` on the Medusa backend.

## Tests

```bash
cd apps/ai-worker
AI_WORKER_MOCK_GENERATION=true pytest -q
```

