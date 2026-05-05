# Regenerate Supabase Types
Write-Host 'Regenerating Supabase types...' -ForegroundColor Cyan
try {
    Get-Command supabase -ErrorAction Stop | Out-Null
    Write-Host 'Supabase CLI found' -ForegroundColor Green
} catch {
    Write-Host 'Installing Supabase CLI...' -ForegroundColor Yellow
    npm install -g supabase
}
supabase gen types typescript --local | Out-File -FilePath 'src/integrations/supabase/types.ts' -Encoding utf8
Write-Host 'Types generated successfully!' -ForegroundColor Green
