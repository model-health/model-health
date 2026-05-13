.PHONY: help install dev build preview clean

help:
	@echo "Model Health SDK Demo"
	@echo ""
	@echo "Available commands:"
	@echo "  make install - Install npm dependencies"
	@echo "  make dev     - Start dev server (accessible on network)"
	@echo "  make build   - Build for production"
	@echo "  make preview - Preview production build"
	@echo "  make clean   - Clean build artifacts"
	@echo ""

install:
	@echo "Installing dependencies..."
	npm install

dev:
	@echo "Starting Vite dev server on network..."
	@echo ""
	@echo "Server will be accessible at:"
	@echo "  • http://localhost:5173 (local only)"
	@echo "  • http://192.168.x.x:5173 (from network)"
	@echo ""
	@echo "To find your IP: ifconfig | grep 'inet ' | grep -v 127.0.0.1"
	@echo ""
	@echo "Press Ctrl+C to stop"
	@echo ""
	npm run dev

build:
	@echo "Building for production..."
	npm run build

preview:
	@echo "Starting preview server..."
	npm run preview

clean:
	@echo "Cleaning build artifacts..."
	rm -rf dist node_modules
	@echo "Done"
