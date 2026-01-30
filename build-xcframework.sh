#!/bin/bash
set -e

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Clean old XCFramework
echo -e "${BLUE}Cleaning old XCFramework...${NC}"
rm -rf model-health-swift/ModelHealthFFI.xcframework

# Default to production and release build
FEATURES="production"
BUILD_PROFILE="release"
PROFILE_DIR="release"

# Parse arguments
for arg in "$@"; do
    case $arg in
        dev|development)
            FEATURES="development"
            echo -e "${YELLOW}Building for DEVELOPMENT environment${NC}"
            ;;
        debug)
            FEATURES="development"
            BUILD_PROFILE="debug"
            PROFILE_DIR="debug"
            echo -e "${YELLOW}Building with DEBUG profile (full symbols, no optimization)${NC}"
            ;;
        *)
            ;;
    esac
done

if [ "$FEATURES" = "production" ]; then
    echo "Building for PRODUCTION environment"
fi

echo -e "${BLUE}Building Rust libraries for all iOS targets...${NC}"

cd model-health-ffi

# Build command based on profile
if [ "$BUILD_PROFILE" = "debug" ]; then
    # Debug builds - full symbols, no optimization
    cargo build --no-default-features --features "$FEATURES" --target aarch64-apple-ios
    cargo build --no-default-features --features "$FEATURES" --target aarch64-apple-ios-sim
    cargo build --no-default-features --features "$FEATURES" --target x86_64-apple-ios
else
    # Release builds - optimized, no debug symbols
    cargo build --release --no-default-features --features "$FEATURES" --target aarch64-apple-ios
    cargo build --release --no-default-features --features "$FEATURES" --target aarch64-apple-ios-sim
    cargo build --release --no-default-features --features "$FEATURES" --target x86_64-apple-ios
fi

echo -e "${GREEN}✓ Rust builds complete${NC}"

cd ..

# Create directories
mkdir -p model-health-swift/ModelHealthFFI.xcframework

echo -e "${BLUE}Creating fat library for simulator...${NC}"

# Combine simulator architectures into a fat binary
lipo -create \
    target/aarch64-apple-ios-sim/$PROFILE_DIR/libmodel_health_ffi.a \
    target/x86_64-apple-ios/$PROFILE_DIR/libmodel_health_ffi.a \
    -output model-health-swift/libmodel_health_ffi_sim.a

echo -e "${GREEN}✓ Simulator fat library created${NC}"

echo -e "${BLUE}Creating XCFramework...${NC}"

# Create XCFramework
xcodebuild -create-xcframework \
    -library target/aarch64-apple-ios/$PROFILE_DIR/libmodel_health_ffi.a \
    -library model-health-swift/libmodel_health_ffi_sim.a \
    -output model-health-swift/ModelHealthFFI.xcframework

echo -e "${GREEN}✓ XCFramework created at model-health-swift/ModelHealthFFI.xcframework${NC}"

# Clean up temporary file
rm model-health-swift/libmodel_health_ffi_sim.a

echo -e "${BLUE}Generating C header...${NC}"

# Generate header file
cd model-health-ffi
cbindgen --config cbindgen.toml --crate model-health-ffi --output ../model-health-swift/ModelHealthFFI.xcframework/Headers/model_health.h

echo -e "${GREEN}✓ Header file generated${NC}"
echo -e "${GREEN}✓ Build complete!${NC}"
