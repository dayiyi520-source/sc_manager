$ErrorActionPreference = "Stop"

$projectRoot = Split-Path -Parent $PSScriptRoot
$maven = Join-Path $projectRoot ".tools\apache-maven-3.9.11\bin\mvn.cmd"
$port = if ($args.Count -gt 0) { $args[0] } else { "8080" }

if (-not (Test-Path -LiteralPath $maven)) {
    throw "Project Maven runtime not found: $maven"
}

Set-Location (Join-Path $projectRoot "backend")
& $maven spring-boot:run '-Dspring-boot.run.profiles=local' "-Dspring-boot.run.arguments=--server.port=$port --spring.flyway.out-of-order=true"
exit $LASTEXITCODE
