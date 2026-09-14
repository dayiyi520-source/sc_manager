param(
    [Parameter(Mandatory = $true)][string]$HistoricalMigrationDirectory
)
$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path $PSScriptRoot -Parent
$historicalRoot = (Resolve-Path -LiteralPath $HistoricalMigrationDirectory).Path
$sourceRoot = Join-Path $projectRoot 'backend/src/main/resources/db/migration'
$outputRoot = Join-Path $projectRoot '.enterprise-app-factory/runtime/local-migrations'
$mapping = @{
    'V1.0.28__product_line_activity.sql' = 'V1.0.35__product_line_activity.sql'
    'V1.0.29__product_version_owner.sql' = 'V1.0.36__product_version_owner.sql'
    'V1.0.30__product_line_visibility.sql' = 'V1.0.37__product_line_visibility.sql'
    'V1.0.31__product_line_work_item_types.sql' = 'V1.0.38__product_line_work_item_types.sql'
    'V20260914.1__unified_work_item_storage.sql' = 'V20260914.1__unified_work_item_storage.sql'
    'V20260914.2__work_item_relations.sql' = 'V20260914.2__work_item_relations.sql'
}
$files = @{}
foreach ($file in Get-ChildItem -LiteralPath $historicalRoot -Filter 'V*.sql') {
    if ($file.Name -match '^V1\.0\.(\d+)__' -and [int]$Matches[1] -le 34) {
        $files[$file.Name] = $file.FullName
    }
}
if ($files.Count -ne 35 -or !$files.ContainsKey('V1.0.34__workbench_unique_constraints.sql')) {
    throw 'Expected the complete historical V1.0.0 through V1.0.34 migration set.'
}
foreach ($entry in $mapping.GetEnumerator()) {
    $files[$entry.Value] = (Resolve-Path -LiteralPath (Join-Path $sourceRoot $entry.Key)).Path
}
New-Item -ItemType Directory -Force -Path $outputRoot | Out-Null
foreach ($existing in Get-ChildItem -LiteralPath $outputRoot -File) {
    if (!$files.ContainsKey($existing.Name)) { throw "Unexpected file in migration directory: $($existing.Name)" }
}
foreach ($entry in $files.GetEnumerator()) {
    $destination = Join-Path $outputRoot $entry.Key
    if (Test-Path -LiteralPath $destination) {
        if ((Get-FileHash -LiteralPath $destination).Hash -ne (Get-FileHash -LiteralPath $entry.Value).Hash) {
            throw "Migration already exists with different contents: $($entry.Key)"
        }
    } else {
        Copy-Item -LiteralPath $entry.Value -Destination $destination
    }
}
Write-Output "Prepared $($files.Count) migrations in $outputRoot. Flyway validation must remain enabled."
