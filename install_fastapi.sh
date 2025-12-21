#!/bin/bash

# FastAPI Installation Script for Puppeteer MCP Server
# Uses uv for virtual environment management per CLAUDE.md requirements

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
FASTAPI_DIR="$SCRIPT_DIR/fastapi_server"
VENV_PATH="$FASTAPI_DIR/venv"

print_header() {
    echo -e "${BLUE}"
    echo "=================================================================="
    echo "  🤖 Puppeteer MCP FastAPI Installation"
    echo "  Installing Python dependencies with uv"
    echo "=================================================================="
    echo -e "${NC}"
}

print_status() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

check_dependencies() {
    print_status "Checking dependencies..."

    # Check Python 3
    if ! command -v python3 &> /dev/null; then
        print_error "Python 3 is required but not installed"
        return 1
    fi
    print_status "✓ Python 3: $(python3 --version)"

    # Check uv
    if ! command -v uv &> /dev/null; then
        print_error "uv is required but not installed"
        print_error "Install with: curl -LsSf https://astral.sh/uv/install.sh | sh"
        return 1
    fi
    print_status "✓ uv: $(uv --version)"

    # Check Node.js
    if ! command -v node &> /dev/null; then
        print_error "Node.js is required but not installed"
        return 1
    fi
    print_status "✓ Node.js: $(node --version)"

    # Check npx
    if ! command -v npx &> /dev/null; then
        print_error "npx is required but not installed (comes with Node.js)"
        return 1
    fi
    print_status "✓ npx available"

    # Check if fastapi_server directory exists
    if [ ! -d "$FASTAPI_DIR" ]; then
        print_error "FastAPI server directory not found: $FASTAPI_DIR"
        return 1
    fi
    print_status "✓ FastAPI server directory: $FASTAPI_DIR"

    return 0
}

create_virtual_environment() {
    print_status "Creating virtual environment with uv..."

    # Remove old venv if it exists
    if [ -d "$VENV_PATH" ]; then
        print_warning "Removing existing virtual environment..."
        rm -rf "$VENV_PATH"
    fi

    # Create new virtual environment using uv
    cd "$FASTAPI_DIR"
    uv venv venv

    if [ ! -d "$VENV_PATH" ]; then
        print_error "Failed to create virtual environment"
        return 1
    fi

    print_status "✓ Virtual environment created: $VENV_PATH"
    return 0
}

install_python_dependencies() {
    print_status "Installing Python dependencies with uv..."

    cd "$FASTAPI_DIR"

    # Install dependencies using uv with the venv python
    uv pip install --python venv/bin/python -r requirements.txt

    print_status "✓ Python dependencies installed"
    return 0
}

build_typescript_server() {
    print_status "Building TypeScript MCP server..."

    cd "$SCRIPT_DIR"

    # Install Node.js dependencies if needed
    if [ ! -d "node_modules" ]; then
        print_status "Installing Node.js dependencies..."
        npm install
    fi

    # Build TypeScript
    print_status "Building TypeScript..."
    npm run build

    if [ ! -f "dist/index.js" ]; then
        print_error "TypeScript build failed - dist/index.js not found"
        return 1
    fi

    print_status "✓ TypeScript server built successfully"
    return 0
}

verify_installation() {
    print_status "Verifying installation..."

    # Check Python modules using venv python directly
    cd "$FASTAPI_DIR"

    ./venv/bin/python3 -c "import fastapi, uvicorn, pydantic" 2>/dev/null
    if [ $? -ne 0 ]; then
        print_error "Python dependencies verification failed"
        return 1
    fi

    print_status "✓ Python dependencies verified"

    # Check TypeScript build
    if [ ! -f "$SCRIPT_DIR/dist/index.js" ]; then
        print_error "TypeScript build verification failed"
        return 1
    fi
    print_status "✓ TypeScript build verified"

    return 0
}

print_success() {
    echo -e "${GREEN}"
    echo "=================================================================="
    echo "  🎉 Installation Complete!"
    echo "=================================================================="
    echo -e "${NC}"
    echo ""
    echo "📦 Installation Summary:"
    echo "  • Python virtual environment: $VENV_PATH"
    echo "  • FastAPI application: $FASTAPI_DIR/main.py"
    echo "  • TypeScript MCP server: $SCRIPT_DIR/dist/index.js"
    echo ""
    echo "🚀 Next Steps:"
    echo "  • Start the server: $SCRIPT_DIR/../start-puppeteer-mcpo.sh"
    echo "  • Or run manually:"
    echo "      cd $FASTAPI_DIR"
    echo "      source venv/bin/activate"
    echo "      python -m uvicorn main:app --host 0.0.0.0 --port 9136"
    echo ""
    echo "📖 API Documentation:"
    echo "  • Once started: http://localhost:9136/docs"
    echo "  • Health check: http://localhost:9136/health"
    echo ""
}

main() {
    print_header

    # Check dependencies
    if ! check_dependencies; then
        print_error "Dependency check failed"
        exit 1
    fi

    # Create virtual environment
    if ! create_virtual_environment; then
        print_error "Failed to create virtual environment"
        exit 1
    fi

    # Install Python dependencies
    if ! install_python_dependencies; then
        print_error "Failed to install Python dependencies"
        exit 1
    fi

    # Build TypeScript server
    if ! build_typescript_server; then
        print_error "Failed to build TypeScript server"
        exit 1
    fi

    # Verify installation
    if ! verify_installation; then
        print_error "Installation verification failed"
        exit 1
    fi

    # Success
    print_success
}

# Run main function
main
