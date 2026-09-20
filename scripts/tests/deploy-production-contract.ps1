$ErrorActionPreference = 'Stop'

$scriptPath = Join-Path (Split-Path -Parent (Split-Path -Parent $PSScriptRoot)) 'scripts/deploy-production.sh'
$content = Get-Content -Raw -LiteralPath $scriptPath

$requiredPatterns = @(
    'DEPLOY_MODE="application"',
    '--replace-database',
    'if [[ "${DEPLOY_MODE}" == "replace-database" ]]',
    'release_database_dump="${release_dir}/database.sql.gz"',
    'if [[ "${deploy_mode}" == "replace-database" ]]'
)

foreach ($pattern in $requiredPatterns) {
    if (-not $content.Contains($pattern)) {
        throw "Deployment contract missing: $pattern"
    }
}

if ($content -match 'required_commands=\(docker gzip mvn npm ssh scp curl tar\)') {
    throw 'Default deployment still requires database-export tooling.'
}

if ($content -match 'run_scp\s+\\\s*\n\s*"\$\{FRONTEND_ARCHIVE\}"\s+\\\s*\n\s*"\$\{BACKEND_JAR\}"\s+\\\s*\n\s*"\$\{DATABASE_DUMP\}"') {
    throw 'Default upload still unconditionally includes the database dump.'
}

Write-Output 'Deployment contract passed.'
