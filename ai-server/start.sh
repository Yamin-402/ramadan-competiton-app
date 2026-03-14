#!/bin/sh
set -e

echo "[ai-server] Starting Ollama..."
ollama serve &
OLLAMA_PID=$!

echo "[ai-server] Waiting for Ollama to be ready..."
READY=0
for i in $(seq 1 30); do
  if ollama list >/dev/null 2>&1; then
    READY=1
    break
  fi
  sleep 1
done

if [ "$READY" -ne 1 ]; then
  echo "[ai-server] Ollama did not become ready in time, continuing anyway."
fi

if [ -n "$OLLAMA_MODEL" ]; then
  echo "[ai-server] Pulling model: $OLLAMA_MODEL"
  ollama pull "$OLLAMA_MODEL" || true
fi

wait "$OLLAMA_PID"
