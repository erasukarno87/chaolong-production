#!/bin/bash

# Regenerate Supabase Types Script
# This script regenerates TypeScript types from your Supabase database schema

set -e

echo "🔄 Regenerating Supabase types..."

# Check if Supabase CLI is installed
if ! command -v supabase &> /dev/null; then
    echo "❌ Supabase CLI not found. Installing..."
    npm install -g supabase
fi

# Check if logged in
echo "📝 Checking Supabase authentication..."
if ! supabase projects list &> /dev/null; then
    echo "🔐 Please login to Supabase:"
    supabase login
fi

# Generate types
echo "⚙️  Generating types from database schema..."
supabase gen types typescript --local > src/integrations/supabase/types.ts

if [ $? -eq 0 ]; then
    echo "✅ Types generated successfully!"
    echo "📁 File: src/integrations/supabase/types.ts"
    
    # Show summary
    echo ""
    echo "📊 Summary:"
    wc -l src/integrations/supabase/types.ts
    
    echo ""
    echo "🔍 Next steps:"
    echo "1. Review the generated types"
    echo "2. Run: npm run lint"
    echo "3. Run: npm run build"
    echo "4. Replace 'as any' casts with typed queries"
else
    echo "❌ Failed to generate types"
    exit 1
fi
