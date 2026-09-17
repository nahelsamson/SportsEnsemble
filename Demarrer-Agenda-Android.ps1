$ErrorActionPreference = 'Stop'
Push-Location $PSScriptRoot
try { node scripts/mobile-remote.cjs } finally { Pop-Location }
