.PHONY: help docs docs-preview docs-build docs-export docs-zip docs-tar docs-package clean test
.PHONY: swift swift-dev wasm wasm-dev kotlin kotlin-dev build-all build-all-dev
.PHONY: docs-swift docs-swift-build docs-swift-export docs-swift-preview
.PHONY: docs-typescript docs-typescript-build docs-typescript-preview

help:
	@echo "ModelHealth SDK - Available Commands"
	@echo ""
	@echo "Platform Builds (Production):"
	@echo "  make swift           - Build Swift SDK (iOS, macOS, tvOS, watchOS)"
	@echo "  make wasm            - Build WebAssembly SDK (TypeScript)"
	@echo "  make kotlin          - Build Kotlin SDK (Android, JVM - coming soon)"
	@echo "  make build-all       - Build all platform SDKs (production)"
	@echo ""
	@echo "Platform Builds (Development - faster, larger):"
	@echo "  make swift-dev       - Build Swift SDK (development mode)"
	@echo "  make wasm-dev        - Build WebAssembly SDK (development mode)"
	@echo "  make kotlin-dev      - Build Kotlin SDK (development mode - coming soon)"
	@echo "  make build-all-dev   - Build all platform SDKs (development)"
	@echo ""
	@echo "Documentation - Combined:"
	@echo "  make docs            - Build all documentation (Swift + TypeScript)"
	@echo "  make docs-package    - Create documentation archives (zip + tar.gz)"
	@echo ""
	@echo "Documentation - Swift:"
	@echo "  make docs-swift-preview   - Preview Swift docs at http://localhost:3000"
	@echo "  make docs-swift-build     - Build Swift documentation"
	@echo "  make docs-swift-export    - Export Swift docs for web hosting"
	@echo ""
	@echo "Documentation - TypeScript:"
	@echo "  make docs-typescript-preview  - Preview TypeScript docs at http://localhost:8080"
	@echo "  make docs-typescript-build    - Build TypeScript documentation"
	@echo ""
	@echo "Development:"
	@echo "  make test            - Run tests"
	@echo "  make clean           - Clean build artifacts"

# Platform-specific builds - Production

swift:
	@echo "Building Swift SDK (production)..."
	@./build-xcframework.sh

wasm:
	@echo "Building WebAssembly SDK (production)..."
	@./build-wasm.sh

kotlin:
	@echo "Kotlin SDK not yet implemented"
	@echo "Coming soon!"
	@exit 1

build-all: swift wasm
	@echo ""
	@echo "✅ All SDKs built successfully (production)!"
	@echo "  - Swift: model-health-swift/ModelHealth.xcframework"
	@echo "  - WASM:  model-health-ts/wasm/ + model-health-ts/dist/"

# Platform-specific builds - Development

swift-dev:
	@echo "Building Swift SDK (development mode)..."
	@./build-xcframework.sh dev

wasm-dev:
	@echo "Building WebAssembly SDK (development mode)..."
	@./build-wasm.sh dev

kotlin-dev:
	@echo "Kotlin SDK not yet implemented"
	@echo "Coming soon!"
	@exit 1

build-all-dev: swift-dev wasm-dev
	@echo ""
	@echo "✅ All SDKs built successfully (development)!"
	@echo "  - Swift: model-health-swift/ModelHealth.xcframework"
	@echo "  - WASM:  model-health-ts/wasm/ + model-health-ts/dist/"

# Documentation - Combined

docs: docs-swift docs-typescript docs-package

# Documentation - Swift

docs-swift: docs-swift-build

docs-swift-preview:
	@echo "Generating and serving Swift documentation..."
	@which jazzy > /dev/null || gem install jazzy --no-document
	@mkdir -p sdk-docs/swift
	jazzy \
		--clean \
		--author "ModelHealth" \
		--author_url "https://docs.modelhealth.io" \
		--module ModelHealth \
		--output sdk-docs/swift \
		--source-directory model-health-swift/Sources/ModelHealth \
		--readme README.md
	@echo "Starting documentation server on http://localhost:8000"
	@echo "Press Ctrl+C to stop"
	@(sleep 2 && open http://localhost:8000) & \
	cd sdk-docs/swift && python3 -m http.server 8000

docs-swift-build:
	@echo "Building Swift documentation archive..."
	cd model-health-swift && swift package generate-documentation --target ModelHealth
	@echo "Swift documentation built at: model-health-swift/.build/plugins/Swift-DocC/outputs/ModelHealth.doccarchive"

docs-swift-export: docs-swift-build
	@echo "Exporting Swift documentation..."
	cd model-health-swift && \
		swift package --disable-sandbox \
			generate-documentation \
			--target ModelHealth \
			--output-path ../sdk-docs/swift \
			--transform-for-static-hosting
	@echo "Adding documentation viewer scripts..."
	@mkdir -p sdk-docs
	@cp view-docs.py sdk-docs/
	@cp view-docs.bat sdk-docs/
	@chmod +x sdk-docs/view-docs.py
	@echo "Swift documentation exported to: ./sdk-docs/swift"

# Documentation - TypeScript

docs-typescript: docs-typescript-build

docs-typescript-build:
	@echo "Building TypeScript documentation..."
	@if [ ! -d "model-health-ts/node_modules" ]; then \
		echo "Installing TypeScript dependencies..."; \
		cd model-health-ts && npm install; \
	fi
	@if [ ! -d "model-health-ts/node_modules/typedoc" ]; then \
		echo "Installing TypeDoc..."; \
		cd model-health-ts && npm install --save-dev typedoc; \
	fi
	@echo "Generating TypeScript docs with TypeDoc..."
	@mkdir -p sdk-docs
	@cd model-health-ts && npx typedoc src/index.ts --out ../sdk-docs/typescript
	@echo "TypeScript documentation built at: sdk-docs/typescript"

docs-typescript-preview: docs-typescript-build
	@echo "Starting TypeScript documentation preview on http://localhost:8080"
	@echo "Press Ctrl+C to stop"
	@(sleep 2 && open http://localhost:8080) & \
	cd sdk-docs/typescript && python3 -m http.server 8080

# Documentation - Packaging

docs-zip: docs-swift-export docs-typescript-build
	@echo "Creating zip archive..."
	@rm -f ModelHealth-Documentation.zip
	@cp README-CLIENT.md sdk-docs/README.md
	@echo "Creating index.html for documentation..."
	@echo '<!DOCTYPE html><html><head><title>ModelHealth Documentation</title></head><body>' > sdk-docs/index.html
	@echo '<h1>ModelHealth SDK Documentation</h1>' >> sdk-docs/index.html
	@echo '<ul>' >> sdk-docs/index.html
	@echo '<li><a href="swift/documentation/modelhealth/">Swift Documentation</a></li>' >> sdk-docs/index.html
	@echo '<li><a href="typescript/">TypeScript Documentation</a></li>' >> sdk-docs/index.html
	@echo '</ul></body></html>' >> sdk-docs/index.html
	@zip -r ModelHealth-Documentation.zip sdk-docs/
	@echo ""
	@echo "Documentation packaged successfully:"
	@echo "  - ModelHealth-Documentation.zip"

docs-tar: docs-swift-export docs-typescript-build
	@echo "Creating tar.gz archive..."
	@rm -f ModelHealth-Documentation.tar.gz
	@cp README-CLIENT.md sdk-docs/README.md
	@echo "Creating index.html for documentation..."
	@echo '<!DOCTYPE html><html><head><title>ModelHealth Documentation</title></head><body>' > sdk-docs/index.html
	@echo '<h1>ModelHealth SDK Documentation</h1>' >> sdk-docs/index.html
	@echo '<ul>' >> sdk-docs/index.html
	@echo '<li><a href="swift/documentation/modelhealth/">Swift Documentation</a></li>' >> sdk-docs/index.html
	@echo '<li><a href="typescript/">TypeScript Documentation</a></li>' >> sdk-docs/index.html
	@echo '</ul></body></html>' >> sdk-docs/index.html
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
	@echo "Contents:"
	@echo "  - Swift documentation (interactive)"
	@echo "  - TypeScript documentation (interactive)"
	@echo "  - README with instructions"
	@echo ""
	@echo "Client instructions:"
	@echo "  1. Extract archive"
	@echo "  2. Open index.html in browser"
	@echo "  3. Or run view-docs.py (Mac/Linux) or view-docs.bat (Windows)"

# Development

test:
	@echo "Running Rust core tests..."
	cd model-health-core && cargo test
	@echo ""
	@echo "Running Swift tests..."
	swift test

clean:
	@echo "Cleaning build artifacts..."
	rm -rf .build sdk-docs
	rm -f ModelHealth-Documentation.zip ModelHealth-Documentation.tar.gz
	@echo "Cleaning Rust build artifacts..."
	cargo clean
	@echo "Cleaning WASM build artifacts..."
	rm -rf model-health-ts/wasm model-health-ts/dist model-health-ts/node_modules
	@echo "Cleaning example app..."
	rm -rf examples/vite-react/node_modules examples/vite-react/dist
	@echo "Clean complete"