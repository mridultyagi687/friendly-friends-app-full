#!/bin/bash
# Build script for desktop applications (.exe and .app)

set -e

echo "🚀 Building Friendly Friends Desktop Application"
echo "================================================"

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Step 1: Build frontend
echo -e "\n${YELLOW}Step 1: Building frontend...${NC}"
cd frontend
npm install
npm run build
cd ..

# Step 2: Build backend executable
echo -e "\n${YELLOW}Step 2: Building backend executable...${NC}"
cd backend
python3 build_exe.py
cd ..

# Step 3: Build Electron app
echo -e "\n${YELLOW}Step 3: Building Electron desktop app...${NC}"
cd electron
npm install

# Determine platform and build accordingly
if [[ "$OSTYPE" == "darwin"* ]]; then
    echo "Building for macOS..."
    npm run build:mac
elif [[ "$OSTYPE" == "msys" || "$OSTYPE" == "win32" ]]; then
    echo "Building for Windows..."
    npm run build:win
else
    echo "Building for Linux..."
    npm run build:linux
fi

cd ..

echo -e "\n${GREEN}✅ Build complete!${NC}"
echo "Check the 'electron/dist-electron' directory for the built application."

