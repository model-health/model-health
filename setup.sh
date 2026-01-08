#!/usr/bin/env bash
# ModelHealth SDK - Complete Development Environment Setup
# 
# This script installs required tools and dependencies for:
# - Rust core development (always installed)
# - iOS/macOS SDK (Swift + XCFramework) - optional
# - Web SDK (TypeScript + WASM) - optional
# - Android SDK (Kotlin + JNI) - optional [coming soon]
#
# Usage:
#   ./setup.sh              # Auto-detect platform and install appropriate tools
#   ./setup.sh rust         # Install only Rust core (minimal)
#   ./setup.sh swift        # Install Rust + iOS/macOS toolchain
#   ./setup.sh wasm         # Install Rust + Web toolchain
#   ./setup.sh kotlin       # Install Rust + Android toolchain [coming soon]
#   ./setup.sh swift wasm   # Install multiple platforms (chaining)
#   ./setup.sh all          # Install everything (CI/release builds)
#   ./setup.sh --help       # Show detailed help
#
# Supports: macOS, Linux

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Helper functions
info() {
    echo -e "${BLUE}ℹ${NC} $1"
}

success() {
    echo -e "${GREEN}✅${NC} $1"
}

warning() {
    echo -e "${YELLOW}⚠${NC} $1"
}

error() {
    echo -e "${RED}❌${NC} $1"
}

command_exists() {
    command -v "$1" >/dev/null 2>&1
}

show_help() {
    cat << 'EOF'
ModelHealth SDK - Development Environment Setup

USAGE:
    ./setup.sh [MODE]...

MODES:
    (none)          Auto-detect platform and install appropriate tools
                    • macOS: Installs Rust + Swift + WASM
                    • Linux: Installs Rust + WASM

    rust            Install only Rust core toolchain (minimal)
                    • Rust compiler and Cargo
                    • No platform-specific tools

    swift           Install Rust + iOS/macOS toolchain
                    • iOS targets (aarch64, x86_64, simulator)
                    • cbindgen for FFI
                    • Requires Xcode (macOS only)

    typescript      Install Rust + Web/TypeScript toolchain
                    • wasm32-unknown-unknown target
                    • wasm-pack
                    • Requires Node.js 18+

    kotlin          Install Rust + Android toolchain [COMING SOON]
                    • Android targets
                    • JNI bindings

    all             Install everything (for CI/release builds)
                    • All platforms and tools

CHAINING:
    Multiple modes can be combined:
        ./setup.sh swift wasm       # iOS + Web development
        ./setup.sh swift kotlin     # iOS + Android development (future)

OPTIONS:
    -h, --help      Show this help message

EXAMPLES:
    # Auto-detect platform (recommended for most users)
    ./setup.sh

    # iOS developer setup
    ./setup.sh swift

    # Web developer setup
    ./setup.sh wasm

    # Mobile developer (iOS + Android in future)
    ./setup.sh swift kotlin

    # Full-stack developer (all platforms)
    ./setup.sh all

    # CI/CD pipeline (everything)
    ./setup.sh all

    # Minimal Rust-only setup
    ./setup.sh rust

ENVIRONMENT:
    The script will gracefully handle missing prerequisites:
    • Missing Xcode → Warning, skip iOS toolchain
    • Missing Node.js → Warning, skip Web toolchain
    • Missing Rust → Install automatically

    Only Rust installation is required; other tools are optional.

MORE INFO:
    • Architecture:  docs/ARCHITECTURE.md
    • TypeScript:    docs/TYPESCRIPT_SETUP.md
    • Token Storage: docs/WEB_TOKEN_STORAGE.md

EOF
}

# Parse arguments
INSTALL_MODE="auto"
INSTALL_RUST=true
INSTALL_SWIFT=false
INSTALL_WASM=false
INSTALL_KOTLIN=false

if [ $# -eq 0 ]; then
    INSTALL_MODE="auto"
else
    # Process all arguments
    for arg in "$@"; do
        case "$arg" in
            -h|--help|help)
                show_help
                exit 0
                ;;
            rust)
                INSTALL_MODE="explicit"
                # Rust is always installed, no flag needed
                ;;
            swift)
                INSTALL_MODE="explicit"
                INSTALL_SWIFT=true
                ;;
            typescript)
                INSTALL_MODE="explicit"
                INSTALL_WASM=true
                ;;
            kotlin)
                INSTALL_MODE="explicit"
                INSTALL_KOTLIN=true
                ;;
            all)
                INSTALL_MODE="explicit"
                INSTALL_SWIFT=true
                INSTALL_WASM=true
                INSTALL_KOTLIN=true
                ;;
            *)
                error "Unknown mode: $arg"
                echo "Run '$0 --help' for usage information"
                exit 1
                ;;
        esac
    done
fi

# Detect OS
OS="unknown"
if [[ "$OSTYPE" == "darwin"* ]]; then
    OS="macos"
elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
    OS="linux"
else
    error "Unsupported operating system: $OSTYPE"
    exit 1
fi

# Auto-detect mode: determine what to install based on platform
if [ "$INSTALL_MODE" = "auto" ]; then
    info "Auto-detecting platform: $OS"
    if [ "$OS" = "macos" ]; then
        INSTALL_SWIFT=true
        INSTALL_WASM=true
    else
        INSTALL_WASM=true
    fi
fi

# Show what will be installed
echo ""
info "Installation plan:"
echo "  • Rust Core: ✅ Always installed"
if [ "$INSTALL_SWIFT" = true ]; then
    echo "  • Swift/iOS: ✅ Requested"
fi
if [ "$INSTALL_WASM" = true ]; then
    echo "  • WASM/Web:  ✅ Requested"
fi
if [ "$INSTALL_KOTLIN" = true ]; then
    echo "  • Kotlin:    🚧 Coming soon"
fi
echo ""

# =============================================================================
# SECTION 1: RUST TOOLCHAIN
# =============================================================================

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  1. Rust Toolchain"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Check for Rust
if ! command_exists rustc; then
    info "Rust not found. Installing rustup..."
    curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y
    source "$HOME/.cargo/env"
    success "Rust installed"
else
    RUST_VERSION=$(rustc --version | cut -d' ' -f2)
    success "Rust already installed (version $RUST_VERSION)"
fi

# Update Rust
info "Updating Rust toolchain..."
rustup update stable
rustup default stable

# Install required targets
info "Installing Rust compilation targets..."

# Core target (should already exist)
rustup target add x86_64-unknown-linux-gnu 2>/dev/null || true

if [ "$INSTALL_SWIFT" = true ] && [ "$OS" = "macos" ]; then
    # iOS targets
    info "Installing iOS targets..."
    rustup target add aarch64-apple-ios          # iOS devices (ARM64)
    rustup target add aarch64-apple-ios-sim      # iOS Simulator (Apple Silicon Macs)
    rustup target add x86_64-apple-ios           # iOS Simulator (Intel Macs)
    
    # macOS targets (optional, for native Mac apps)
    rustup target add aarch64-apple-darwin       # Apple Silicon Macs
    rustup target add x86_64-apple-darwin        # Intel Macs
    
    success "iOS targets installed"
fi

if [ "$INSTALL_WASM" = true ]; then
    # WASM target (all platforms)
    info "Installing WASM target..."
    rustup target add wasm32-unknown-unknown
    success "WASM target installed"
fi

# Install cargo tools
info "Installing Cargo tools..."

if [ "$INSTALL_SWIFT" = true ]; then
    # cbindgen - Generate C headers for FFI
    if ! command_exists cbindgen; then
        info "Installing cbindgen (for iOS FFI bindings)..."
        cargo install cbindgen
        success "cbindgen installed"
    else
        success "cbindgen already installed"
    fi
fi

if [ "$INSTALL_WASM" = true ]; then
    # wasm-pack - Build WASM packages
    if ! command_exists wasm-pack; then
        info "Installing wasm-pack (for WASM builds)..."
        cargo install wasm-pack
        success "wasm-pack installed"
    else
        success "wasm-pack already installed"
    fi
fi

# Optional but useful tools
info "Installing optional development tools..."

# cargo-watch - Auto-rebuild on file changes
if ! command_exists cargo-watch; then
    cargo install cargo-watch --quiet 2>/dev/null || warning "cargo-watch installation skipped"
fi

# cargo-expand - Expand macros (useful for debugging)
if ! command_exists cargo-expand; then
    cargo install cargo-expand --quiet 2>/dev/null || warning "cargo-expand installation skipped"
fi

success "Rust toolchain setup complete"
echo ""

# =============================================================================
# SECTION 2: iOS/MACOS DEVELOPMENT (macOS only)
# =============================================================================

if [ "$INSTALL_SWIFT" = true ]; then
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "  2. iOS/macOS Development (Swift)"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo ""
    
    if [ "$OS" != "macos" ]; then
        warning "iOS/macOS development requires macOS"
        warning "Skipping Swift toolchain setup"
        INSTALL_SWIFT=false
    else
        # Check for Xcode
        if ! command_exists xcodebuild; then
            warning "Xcode not found - iOS/macOS builds will not be available"
            echo ""
            echo "  To enable iOS/macOS development:"
            echo "    1. Install Xcode from the Mac App Store"
            echo "    2. Run: sudo xcode-select --install"
            echo "    3. Run: sudo xcodebuild -license accept"
            echo "    4. Re-run this setup script"
            echo ""
            INSTALL_SWIFT=false
        else
            XCODE_VERSION=$(xcodebuild -version | head -n1 | cut -d' ' -f2)
            success "Xcode installed (version $XCODE_VERSION)"
            
            # Check command line tools
            if ! xcode-select -p &>/dev/null; then
                info "Installing Xcode Command Line Tools..."
                xcode-select --install || warning "Command Line Tools installation may require manual confirmation"
            else
                success "Xcode Command Line Tools installed"
            fi
            
            # Check for Swift
            if command_exists swift; then
                SWIFT_VERSION=$(swift --version | head -n1 | grep -oE '[0-9]+\.[0-9]+' | head -n1)
                success "Swift installed (version $SWIFT_VERSION)"
            else
                warning "Swift compiler not found (should come with Xcode)"
            fi
            
            # Check for lipo (required for fat binaries)
            if command_exists lipo; then
                success "lipo available (for creating fat binaries)"
            else
                warning "lipo not found (required for XCFramework creation)"
            fi
            
            success "iOS/macOS development ready"
        fi
    fi
    echo ""
else
    info "Skipping iOS/macOS setup (not requested)"
    echo ""
fi

# =============================================================================
# SECTION 3: WEB DEVELOPMENT (TypeScript + WASM)
# =============================================================================

if [ "$INSTALL_WASM" = true ]; then
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "  3. Web Development (TypeScript + WASM)"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo ""

    # Check for Node.js
    MIN_NODE_VERSION="18"
    if ! command_exists node; then
        warning "Node.js not found - Web builds will not be available"
        echo ""
        echo "  To enable Web development, install Node.js 18+:"
        if [ "$OS" = "macos" ]; then
            echo "    brew install node"
        elif [ "$OS" = "linux" ]; then
            echo "    # Ubuntu/Debian:"
            echo "    curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -"
            echo "    sudo apt-get install -y nodejs"
            echo ""
            echo "    # Or using nvm (recommended):"
            echo "    curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash"
            echo "    nvm install 20"
        fi
        echo ""
        echo "  Then re-run: $0 wasm"
        echo ""
        INSTALL_WASM=false
    else
        NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
        if [ "$NODE_VERSION" -lt "$MIN_NODE_VERSION" ]; then
            warning "Node.js version $NODE_VERSION found, but version $MIN_NODE_VERSION+ required"
            warning "Web builds may not work correctly"
            echo ""
            echo "  Please update Node.js to version $MIN_NODE_VERSION or higher"
            echo ""
            INSTALL_WASM=false
        else
            success "Node.js installed (version $(node -v))"
            
            # Check npm
            if command_exists npm; then
                NPM_VERSION=$(npm -v)
                success "npm installed (version $NPM_VERSION)"
            else
                warning "npm not found (should come with Node.js)"
            fi
            
            # Optional: Check for yarn
            if command_exists yarn; then
                success "yarn installed (version $(yarn -v))"
            else
                info "yarn not found (optional, npm works fine)"
            fi
            
            success "Web development tools ready"
        fi
    fi
    echo ""
else
    info "Skipping Web development setup (not requested)"
    echo ""
fi

# =============================================================================
# SECTION 4: ANDROID DEVELOPMENT (Kotlin + JNI) - COMING SOON
# =============================================================================

if [ "$INSTALL_KOTLIN" = true ]; then
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "  4. Android Development (Kotlin + JNI)"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo ""
    
    warning "Android/Kotlin SDK is not yet implemented"
    echo ""
    echo "  Coming soon! This will include:"
    echo "    • Android targets (aarch64-linux-android, armv7-linux-androideabi)"
    echo "    • JNI bindings generation"
    echo "    • Kotlin wrapper library"
    echo ""
    echo "  For now, use the iOS or Web SDK"
    echo ""
    
    INSTALL_KOTLIN=false
else
    info "Skipping Android development setup (not requested)"
    echo ""
fi

# =============================================================================
# SECTION 5: ADDITIONAL TOOLS
# =============================================================================

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  5. Additional Tools"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Git
if command_exists git; then
    success "Git installed (version $(git --version | cut -d' ' -f3))"
else
    warning "Git not found (required for version control)"
fi

# Make
if command_exists make; then
    success "Make installed"
else
    warning "Make not found (optional, but Makefile won't work)"
fi

# Python (for documentation scripts)
if command_exists python3; then
    PYTHON_VERSION=$(python3 --version | cut -d' ' -f2)
    success "Python installed (version $PYTHON_VERSION)"
else
    warning "Python 3 not found (needed for documentation generation)"
fi

# wasm-opt (optional, for WASM optimization)
if command_exists wasm-opt; then
    success "wasm-opt installed (WASM optimization available)"
else
    info "wasm-opt not found (optional)"
    if [ "$OS" = "macos" ]; then
        echo "    Install via: brew install binaryen"
    elif [ "$OS" = "linux" ]; then
        echo "    Install via: sudo apt install binaryen"
    fi
fi

echo ""

# =============================================================================
# SECTION 6: VERIFICATION
# =============================================================================

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  6. Verification"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

info "Verifying Rust targets..."
TARGETS=$(rustup target list --installed)

check_target() {
    if echo "$TARGETS" | grep -q "^$1$"; then
        success "$1"
        return 0
    else
        warning "$1 not installed"
        return 1
    fi
}

# Check installed targets based on what was requested
if [ "$INSTALL_WASM" = true ]; then
    check_target "wasm32-unknown-unknown"
fi

if [ "$INSTALL_SWIFT" = true ] && [ "$OS" = "macos" ]; then
    check_target "aarch64-apple-ios"
    check_target "aarch64-apple-ios-sim"
    check_target "x86_64-apple-ios"
fi

echo ""

# =============================================================================
# SUMMARY
# =============================================================================

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  Setup Complete!"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

echo "Installed Components:"
echo ""
echo "  ✅ Rust Core Development"
echo "      • cargo build / cargo test"
echo ""

if [ "$INSTALL_SWIFT" = true ] && [ "$OS" = "macos" ] && command_exists xcodebuild; then
    echo "  ✅ iOS/macOS SDK (Swift)"
    echo "      • make swift (production)"
    echo "      • make swift-dev (development)"
    echo "      • ./build-xcframework.sh"
    echo ""
elif [ "$INSTALL_SWIFT" = true ]; then
    echo "  ⚠️  iOS/macOS SDK (unavailable)"
    echo "      • Missing Xcode or not on macOS"
    echo "      • Run: $0 swift (after installing Xcode)"
    echo ""
fi

if [ "$INSTALL_WASM" = true ] && command_exists node; then
    echo "  ✅ Web SDK (TypeScript + WASM)"
    echo "      • make wasm (production)"
    echo "      • make wasm-dev (development)"
    echo "      • ./build-wasm.sh"
    echo ""
elif [ "$INSTALL_WASM" = true ]; then
    echo "  ⚠️  Web SDK (unavailable)"
    echo "      • Missing Node.js 18+"
    echo "      • Run: $0 wasm (after installing Node.js)"
    echo ""
fi

if [ "$INSTALL_SWIFT" = true ] && [ "$INSTALL_WASM" = true ] && command_exists xcodebuild && command_exists node; then
    echo "Quick Start:"
    echo ""
    echo "  1. Build everything:"
    echo "     make build-all"
    echo ""
    echo "  2. Run tests:"
    echo "     make test"
    echo ""
    echo "  3. Try example app:"
    echo "     cd examples/vite-react"
    echo "     npm install"
    echo "     npm run dev"
    echo ""
elif [ "$INSTALL_SWIFT" = true ] && command_exists xcodebuild; then
    echo "Quick Start (iOS Development):"
    echo ""
    echo "  1. Build Swift SDK:"
    echo "     make swift"
    echo ""
    echo "  2. Run tests:"
    echo "     cargo test"
    echo "     swift test"
    echo ""
elif [ "$INSTALL_WASM" = true ] && command_exists node; then
    echo "Quick Start (Web Development):"
    echo ""
    echo "  1. Build WASM SDK:"
    echo "     make wasm"
    echo ""
    echo "  2. Try example app:"
    echo "     cd examples/vite-react"
    echo "     npm install"
    echo "     npm run dev"
    echo ""
else
    echo "Quick Start (Rust Core):"
    echo ""
    echo "  1. Build Rust core:"
    echo "     cargo build"
    echo ""
    echo "  2. Run tests:"
    echo "     cargo test"
    echo ""
    echo "To enable platform SDKs:"
    echo "  • iOS/macOS: $0 swift"
    echo "  • Web:       $0 wasm"
    echo "  • Both:      $0 all"
    echo ""
fi

echo "Documentation:"
echo "  • Architecture:  docs/ARCHITECTURE.md"
echo "  • TypeScript:    docs/TYPESCRIPT_SETUP.md"
echo "  • Token Storage: docs/WEB_TOKEN_STORAGE.md"
echo ""

success "Environment ready! 🚀"
