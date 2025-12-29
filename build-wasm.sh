#!/usr/bin/env bash
# Build the WASM module and TypeScript package

set -e

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${BLUE}🦀 Building WASM module...${NC}"
cd model-health-wasm

# Build with wasm-pack
if [ "$1" = "dev" ] || [ "$1" = "development" ] || [ "$1" = "--dev" ]; then
    echo -e "${YELLOW}Building in DEVELOPMENT mode${NC}"
    wasm-pack build --target web --out-dir ../model-health-ts/wasm --dev --features development
else
    echo "Building in PRODUCTION mode"
    wasm-pack build --target web --out-dir ../model-health-ts/wasm
fi

echo -e "${GREEN}✓ WASM build complete${NC}"

echo -e "${BLUE}📦 Building TypeScript package...${NC}"
cd ../model-health-ts
npm install
npm run build:ts

echo -e "${GREEN}✓ TypeScript build complete${NC}"
echo -e "${GREEN}✅ Build complete!${NC}"
echo ""
echo "📁 Output locations:"
echo "  - WASM: model-health-ts/wasm/"
echo "  - TypeScript: model-health-ts/dist/"