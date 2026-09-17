$ErrorActionPreference = 'Stop'
Push-Location $PSScriptRoot
try {
    Write-Host 'Partage HTTPS de SportsEnsemble. Garder le PC allume et cette fenetre ouverte.'
    npm run site:remote
} finally { Pop-Location }
