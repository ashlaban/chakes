FROM python:3.11-slim

WORKDIR /app

COPY pyproject.toml uv.lock ./
RUN pip install uv && uv sync --frozen --no-dev

COPY chakes ./chakes

EXPOSE 8080
CMD ["uv", "run", "uvicorn", "chakes.server.app:app", "--host", "0.0.0.0", "--port", "8080"]
