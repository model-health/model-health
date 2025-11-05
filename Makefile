.PHONY: help docs docs-preview docs-build docs-export docs-markdown clean test build

help:
	@echo "ModelHealth SDK - Available Commands"
	@echo ""
	@echo "Documentation:"
	@echo "  make docs-preview    - Preview documentation at http://localhost:3000"
	@echo "  make docs-build      - Generate documentation archive"
	@echo "  make docs-export     - Export documentation for web hosting"
	@echo "  make docs-markdown   - Generate markdown reference for repository"
	@echo ""
	@echo "Development:"
	@echo "  make build           - Build the package"
	@echo "  make test            - Run tests"
	@echo "  make clean           - Clean build artifacts"
	@echo ""
	@echo "Shortcuts:"
	@echo "  make docs            - Build all documentation formats"

docs: docs-markdown docs-preview

docs-markdown docs-preview: docs-build

docs-preview:
	@echo "Starting documentation preview on http://localhost:3000"
	@echo "Press Ctrl+C to stop"
	@(sleep 2 && open http://localhost:3000/documentation/modelhealth) & \
	swift package --disable-sandbox preview-documentation \
		--target ModelHealth \
		--port 3000

docs-build:
	@echo "Building documentation archive..."
	swift package generate-documentation --target ModelHealth
	@echo "Documentation built at: .build/plugins/Swift-DocC/outputs/ModelHealth.doccarchive"

docs-export: docs-build
	@echo "Exporting documentation for web hosting..."
	swift package --disable-sandbox \
		generate-documentation \
		--target ModelHealth \
		--output-path ./docs \
		--transform-for-static-hosting \
		--hosting-base-path model-health
	@echo "Documentation exported to: ./docs"
	@echo ""
	@echo "To deploy to web server:"
	@echo "  1. Upload contents of ./docs directory to your web server"
	@echo "  2. Configure server to serve at: https://modelhealth.io/developer/"

docs-markdown:
	@echo "Generating markdown documentation..."
	@mkdir -p docs
	@chmod +x scripts/extract_docs.py
	@python3 scripts/extract_docs.py Sources/ModelHealth docs/SDK_REFERENCE.md
	@echo "Markdown reference generated at: docs/SDK_REFERENCE.md"

build:
	@echo "Building ModelHealth SDK..."
	swift build

test:
	@echo "Running tests..."
	swift test

clean:
	@echo "Cleaning build artifacts..."
	rm -rf .build
	@echo "Clean complete"
