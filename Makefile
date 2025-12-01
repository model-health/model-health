.PHONY: help docs docs-preview docs-build docs-export docs-markdown docs-zip docs-tar docs-package clean test build

help:
	@echo "ModelHealth SDK - Available Commands"
	@echo ""
	@echo "Documentation:"
	@echo "  make docs-preview    - Preview documentation at http://localhost:3000"
	@echo "  make docs-build      - Generate documentation archive"
	@echo "  make docs-export     - Export documentation for web hosting"
	@echo "  make docs-markdown   - Generate markdown reference for repository"
	@echo "  make docs-zip        - Create zip archive of documentation"
	@echo "  make docs-tar        - Create tar.gz archive of documentation"
	@echo "  make docs-package    - Create both zip and tar.gz archives"
	@echo ""
	@echo "Development:"
	@echo "  make build           - Build the package"
	@echo "  make test            - Run tests"
	@echo "  make clean           - Clean build artifacts"
	@echo ""
	@echo "Shortcuts:"
	@echo "  make docs            - Build all documentation formats and package"

docs: docs-markdown docs-preview docs-package

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
	@echo "Exporting documentation..."
	swift package --disable-sandbox \
		generate-documentation \
		--target ModelHealth \
		--output-path ./sdk-docs \
		--transform-for-static-hosting
	@echo "Adding documentation viewer scripts..."
	@cp view-docs.py sdk-docs/
	@cp view-docs.bat sdk-docs/
	@chmod +x sdk-docs/view-docs.py
	@echo "Documentation exported to: ./sdk-docs"
	@echo ""
	@echo "To view documentation:"
	@echo "  cd sdk-docs && python3 view-docs.py"

docs-markdown:
	@echo "Generating markdown documentation..."
	@mkdir -p sdk-docs
	@chmod +x scripts/extract_docs.py
	@python3 scripts/extract_docs.py Sources/ModelHealth sdk-docs/SDK_REFERENCE.md
	@echo "Markdown reference generated at: sdk-docs/SDK_REFERENCE.md"

docs-zip: docs-export docs-markdown
	@echo "Creating zip archive..."
	@rm -f ModelHealth-Documentation.zip
	@cp README-CLIENT.md sdk-docs/README.md
	@zip -r ModelHealth-Documentation.zip sdk-docs/
	@echo ""
	@echo "Documentation packaged successfully:"
	@echo "  - ModelHealth-Documentation.zip"

docs-tar: docs-export docs-markdown
	@echo "Creating tar.gz archive..."
	@rm -f ModelHealth-Documentation.tar.gz
	@cp README-CLIENT.md sdk-docs/README.md
	@tar -czf ModelHealth-Documentation.tar.gz sdk-docs/
	@echo ""
	@echo "Documentation packaged successfully:"
	@echo "  - ModelHealth-Documentation.tar.gz"

docs-package: docs-zip docs-tar
	@echo ""
	@echo "Both archives created successfully:"
	@echo "  - ModelHealth-Documentation.zip"
	@echo "  - ModelHealth-Documentation.tar.gz"
	@echo ""
	@echo "Client instructions:"
	@echo "  1. Extract archive"
	@echo "  2. Run view-docs.py (Mac/Linux) or view-docs.bat (Windows)"
	@echo "  3. Documentation opens in browser automatically"

build:
	@echo "Building ModelHealth SDK..."
	swift build

test:
	@echo "Running tests..."
	swift test

clean:
	@echo "Cleaning build artifacts..."
	rm -rf .build sdk-docs
	rm -f ModelHealth-Documentation.zip ModelHealth-Documentation.tar.gz
	@echo "Clean complete"
