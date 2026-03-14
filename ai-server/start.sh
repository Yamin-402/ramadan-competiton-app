#!/bin/sh
set -e

echo "[ai-server] Starting Ollama..."
ollama serve &

echo "[ai-server] Waiting for Ollama..."
sleep 2

if [ -n "$OLLAMA_MODEL" ]; then
  echo "[ai-server] Pulling model: $OLLAMA_MODEL"
  ollama pull "$OLLAMA_MODEL" || true
fi

wait -n
