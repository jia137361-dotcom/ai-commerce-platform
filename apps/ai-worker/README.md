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

### Image generation providers

| Variable | Provider | Description |
| -------- | -------- | ----------- |
| `IMAGE_GEN_PROVIDER` | all | `fal`, `openai`, `dashscope`, or `mock` |
| `AI_WORKER_MOCK_GENERATION` | all | `true` skips external APIs entirely |
| `DASHSCOPE_API_KEY` | dashscope | Alibaba Bailian API key |
| `DASHSCOPE_IMAGE_MODEL` | dashscope | e.g. `wan2.7-image-pro` (HTTP sync API) |
| `DASHSCOPE_IMAGE_SIZE` | dashscope | e.g. `2K` |
| `COPY_GEN_PROVIDER` | copy | `deepseek` or `dashscope` |
| `DASHSCOPE_CHAT_BASE_URL` | dashscope copy | `https://dashscope.aliyuncs.com/compatible-mode/v1` |
| `DASHSCOPE_CHAT_MODEL` | dashscope copy | e.g. `qwen-plus`, `qwen-max` |
| `FAL_KEY` | fal | Fal.ai API key — [fal.ai](https://fal.ai) |
| `FAL_MODEL` | fal | Endpoint, default `fal-ai/flux-2-pro` |
| `FAL_UPSCALE_MODEL` | fal | Upscale endpoint, default `fal-ai/esrgan` |
| `OPENAI_API_KEY` | openai | OpenAI API key |
| `OPENAI_IMAGE_MODEL` | openai | e.g. `dall-e-3` |
| `OPENAI_IMAGE_SIZE` | openai | e.g. `1024x1024` |

### Copy generation

- `COPY_GEN_PROVIDER=deepseek` + `DEEPSEEK_API_KEY` — DeepSeek chat
- `COPY_GEN_PROVIDER=dashscope` + `DASHSCOPE_API_KEY` — Qwen via OpenAI-compatible `/compatible-mode/v1`

### Other

- `PUBLISHABLE_API_KEY` — optional, to load supplier specs from Medusa
- `AI_WORKER_MOCK_GENERATION=true` — skip external APIs (local dev without keys)

If `AI_WORKER_MOCK_GENERATION=false` but the selected provider key is missing, the worker auto-falls back to mock and logs a warning.

### Real generation checklist

1. Set `AI_WORKER_MOCK_GENERATION=false`
2. **DashScope (Qwen + 万相):** `IMAGE_GEN_PROVIDER=dashscope`, `DASHSCOPE_API_KEY=...`, `COPY_GEN_PROVIDER=dashscope`, `DASHSCOPE_CHAT_MODEL=qwen-plus`
3. **Or Fal:** `IMAGE_GEN_PROVIDER=fal` and `FAL_KEY=...`
4. **Or OpenAI images:** `IMAGE_GEN_PROVIDER=openai` and `OPENAI_API_KEY=...`
5. Start ai-worker: `uvicorn app.main:app --port 8001`
6. Verify: `curl -X POST localhost:8001/ai/generate-product ...` → `"mock_mode": false`

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

