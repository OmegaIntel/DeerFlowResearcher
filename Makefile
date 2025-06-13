.PHONY: lint format install-dev serve test coverage dev

install-dev:
	uv pip install -e ".[dev]" && uv pip install -e ".[test]"

format:
	uv run black --preview .

lint:
	uv run black --check .

serve:
	uv run server.py --reload

test:
	uv run pytest tests/

langgraph-dev:
	uvx --refresh --from "langgraph-cli[inmem]" --with-editable . --python 3.12 langgraph dev --allow-blocking

coverage:
	uv run pytest --cov=src tests/ --cov-report=term-missing

dev:
	# Run tests, rebuild Docker images without cache, and restart services
	make test
	docker-compose down
	docker-compose build --no-cache
	docker-compose up -d
