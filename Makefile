# Brainchild V4 Makefile
# One-command operations for development and deployment

.PHONY: help inception install docker-up db-init agents-load health-check dev test clean deploy

# Default target
.DEFAULT_GOAL := help

# Variables
PYTHON := python3
PIP := $(PYTHON) -m pip
DOCKER := docker
DOCKER_COMPOSE := docker-compose

# Colors for output
RED := \033[0;31m
GREEN := \033[0;32m
YELLOW := \033[0;33m
BLUE := \033[0;34m
NC := \033[0m # No Color

## help: Display this help message
help:
	@echo "$(BLUE)Brainchild V4 - Makefile Commands$(NC)"
	@echo ""
	@echo "$(GREEN)Quick Start:$(NC)"
	@echo "  make inception    - Complete setup (recommended)"
	@echo ""
	@echo "$(GREEN)Development:$(NC)"
	@echo "  make dev          - Start development server"
	@echo "  make test         - Run test suite"
	@echo "  make clean        - Clean up build artifacts"
	@echo ""
	@echo "$(GREEN)Individual Steps:$(NC)"
	@echo "  make install      - Install Python dependencies"
	@echo "  make docker-up    - Start Docker containers"
	@echo "  make db-init      - Initialize database"
	@echo "  make agents-load  - Load all agents"
	@echo "  make health-check - Run system health checks"
	@echo ""
	@echo "$(GREEN)Deployment:$(NC)"
	@echo "  make deploy       - Deploy to production"
	@echo ""

## inception: Complete setup (one command)
inception:
	@echo "$(BLUE)🧬 Brainchild V4 - Inception Sequence$(NC)"
	@echo ""
	@echo "$(YELLOW)This will:$(NC)"
	@echo "  ✓ Check constitutional compliance"
	@echo "  ✓ Install dependencies"
	@echo "  ✓ Start Docker containers"
	@echo "  ✓ Initialize database"
	@echo "  ✓ Load all 35+ agents"
	@echo "  ✓ Run health checks"
	@echo "  ✓ Start development server"
	@echo ""
	@$(MAKE) --no-print-directory constitutional-check
	@$(MAKE) --no-print-directory install
	@$(MAKE) --no-print-directory docker-up
	@$(MAKE) --no-print-directory db-init
	@$(MAKE) --no-print-directory agents-load
	@$(MAKE) --no-print-directory health-check
	@echo ""
	@echo "$(GREEN)✓ Inception complete! System ready.$(NC)"
	@echo ""
	@echo "$(BLUE)Next steps:$(NC)"
	@echo "  inception ship \"Build a todo app\" --validate"
	@echo "  make dev (to start development server)"
	@echo ""

## constitutional-check: Verify constitutional compliance
constitutional-check:
	@echo "$(YELLOW)⚖️  Checking constitutional compliance...$(NC)"
	@if [ ! -f CORE_FOUNDATION/AGENT_CONSTITUTION.md ]; then \
		echo "$(RED)✗ Agent Constitution not found!$(NC)"; \
		exit 1; \
	fi
	@echo "$(GREEN)✓ Constitutional compliance verified$(NC)"

## install: Install Python dependencies
install:
	@echo "$(YELLOW)📦 Installing dependencies...$(NC)"
	@$(PIP) install --upgrade pip
	@$(PIP) install -r inception_engine/requirements.txt
	@echo "$(GREEN)✓ Dependencies installed$(NC)"

## docker-up: Start Docker containers
docker-up:
	@echo "$(YELLOW)🐳 Starting Docker containers...$(NC)"
	@$(DOCKER_COMPOSE) up -d postgres redis
	@echo "$(YELLOW)Waiting for containers to be healthy...$(NC)"
	@sleep 5
	@echo "$(GREEN)✓ Docker containers running$(NC)"

## db-init: Initialize database
db-init:
	@echo "$(YELLOW)🗄️  Initializing database...$(NC)"
	@$(PYTHON) inception_engine/scripts/init_db.py
	@echo "$(GREEN)✓ Database initialized$(NC)"

## agents-load: Load all agents
agents-load:
	@echo "$(YELLOW)🤖 Loading agents...$(NC)"
	@$(PYTHON) inception_engine/scripts/load_agents.py
	@echo "$(GREEN)✓ All 35+ agents loaded$(NC)"

## health-check: Run system health checks
health-check:
	@echo "$(YELLOW)🏥 Running health checks...$(NC)"
	@$(PYTHON) inception_engine/scripts/health_check.py
	@echo "$(GREEN)✓ All systems operational$(NC)"

## dev: Start development server
dev:
	@echo "$(BLUE)🚀 Starting development server...$(NC)"
	@$(PYTHON) inception_engine/main.py

## test: Run test suite
test:
	@echo "$(YELLOW)🧪 Running tests...$(NC)"
	@$(PYTHON) -m pytest tests/ -v

## clean: Clean up build artifacts
clean:
	@echo "$(YELLOW)🧹 Cleaning up...$(NC)"
	@find . -type d -name "__pycache__" -exec rm -rf {} + 2>/dev/null || true
	@find . -type f -name "*.pyc" -delete
	@find . -type f -name "*.pyo" -delete
	@find . -type d -name "*.egg-info" -exec rm -rf {} + 2>/dev/null || true
	@rm -rf build/ dist/ .pytest_cache/ .coverage htmlcov/
	@echo "$(GREEN)✓ Cleanup complete$(NC)"

## docker-down: Stop Docker containers
docker-down:
	@echo "$(YELLOW)🐳 Stopping Docker containers...$(NC)"
	@$(DOCKER_COMPOSE) down
	@echo "$(GREEN)✓ Docker containers stopped$(NC)"

## deploy: Deploy to production
deploy:
	@echo "$(BLUE)🚀 Deploying to production...$(NC)"
	@echo "$(YELLOW)Running pre-deployment checks...$(NC)"
	@$(MAKE) --no-print-directory test
	@$(MAKE) --no-print-directory constitutional-check
	@echo "$(YELLOW)Building Docker image...$(NC)"
	@$(DOCKER) build -t brainchild-v4:latest .
	@echo "$(GREEN)✓ Deployment ready$(NC)"
	@echo "$(BLUE)Next: Push to container registry and deploy to K8s$(NC)"

## logs: View system logs
logs:
	@echo "$(BLUE)📋 Viewing logs...$(NC)"
	@tail -f logs/inception_engine.log

## status: Check system status
status:
	@echo "$(BLUE)📊 System Status$(NC)"
	@echo ""
	@echo "$(YELLOW)Docker Containers:$(NC)"
	@$(DOCKER_COMPOSE) ps
	@echo ""
	@echo "$(YELLOW)Agents:$(NC)"
	@$(PYTHON) inception_engine/cli/commands/status.py

## modes: List available modes
modes:
	@echo "$(BLUE)🎭 Available Modes$(NC)"
	@echo ""
	@echo "$(GREEN)1. IDEATE 🌟$(NC) - Strategic alignment (all agents)"
	@echo "$(GREEN)2. PLAN 📋$(NC)   - Technical specification (8-15 agents)"
	@echo "$(GREEN)3. SHIP 🚀$(NC)   - Implementation → Production (5-10 agents)"
	@echo "$(GREEN)4. VALIDATE 🔍$(NC) - Independent review (5-8 agents)"
	@echo ""
	@echo "$(YELLOW)Learn more:$(NC) ./docs/modes/understanding_modes.md"
