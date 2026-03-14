# AI Server (Ollama) for Ramadan App

This folder deploys a lightweight Ollama server so the backend AI features work without paid APIs.

## What it provides
- Ollama `POST /api/generate`
- Compatible with the existing backend AI client

## Model
Default: `qwen2.5:3b-instruct`

If memory is tight, use a smaller model:
`qwen2.5:1.5b-instruct`
(fly secrets set OLLAMA_MODEL=qwen2.5:1.5b-instruct
fly deploy)
## Deploy to Fly
1. Create a Fly app and volume (one time):
   ```sh
   fly apps create ramadan-ai
   fly volumes create ollama_models --region ams --size 30
   ```

2. Deploy:
   ```sh
   fly deploy
   ```

3. Update backend AI settings:
   - `enabled: true`
   - `baseUrl: https://ramadan-ai.fly.dev`
   - `model: qwen2.5:3b-instruct`

## Optional: change model
Set env on Fly:
```
fly secrets set OLLAMA_MODEL=qwen2.5:1.5b-instruct
```

Restart:
```
fly deploy
```
