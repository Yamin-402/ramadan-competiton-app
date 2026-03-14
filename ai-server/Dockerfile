FROM ollama/ollama:latest

ENV OLLAMA_HOST=0.0.0.0:11434
ENV OLLAMA_MODELS=/models
ENV OLLAMA_MODEL=qwen2.5:3b-instruct

WORKDIR /
COPY start.sh /start.sh
RUN chmod +x /start.sh

VOLUME ["/models"]
EXPOSE 11434

ENTRYPOINT ["/bin/sh", "/start.sh"]
