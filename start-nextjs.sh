#!/bin/bash

echo "🚀 Starting Deutsch Shadowing - Next.js Version"
echo "================================================"

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm install
fi

# Check if Next.js is installed
if ! npm list next > /dev/null 2>&1; then
    echo "❌ Next.js not found. Installing..."
    npm install next@latest react@latest react-dom@latest
fi

echo "🔧 Starting development server..."
echo "🌐 Open http://localhost:3000 in your browser"
echo ""

# Start Next.js development server
npm run dev
