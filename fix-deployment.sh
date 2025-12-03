#!/bin/bash

echo "🔧 Fixing deployment configuration..."

# Clear any cached builds
rm -rf frontend/dist
rm -rf frontend/node_modules/.vite

# Rebuild with correct configuration
cd frontend
npm run build

echo "✅ Build completed with correct backend URL"
echo "📁 Deploy the contents of frontend/dist/ to GitHub Pages"