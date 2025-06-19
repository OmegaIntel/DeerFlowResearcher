.PHONY: help install start-dev start-prod build test clean

help:
	@echo "Available commands:"
	@echo "  make install      - Install all dependencies"
	@echo "  make start-dev    - Start development environment with Docker"
	@echo "  make start-prod   - Start production environment"
	@echo "  make build        - Build Docker images"
	@echo "  make test         - Run tests"
	@echo "  make clean        - Clean up containers and volumes"

install:
	cd openbb-frontend && npm install
	cd openbb-backend && pip install -r requirements.txt

start-dev:
	docker-compose up -d

start-prod:
	docker-compose -f docker-compose.yml -f docker-compose.prod.yml up -d

build:
	docker-compose build

test:
	cd openbb-frontend && npm test
	cd openbb-backend && pytest

clean:
	docker-compose down -v
	docker system prune -f

logs:
	docker-compose logs -f

logs-backend:
	docker-compose logs -f backend

logs-frontend:
	docker-compose logs -f frontend

restart:
	docker-compose restart

stop:
	docker-compose stop