param(
    [string] $Version = ''
)

$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
$package = Get-Content (Join-Path $root 'package.json') -Raw | ConvertFrom-Json
if (-not $Version) { $Version = $package.version }
$dist = Join-Path $root 'dist'
$packaging = Join-Path $root 'packaging'
$releaseRoot = Join-Path $root 'release'
$folderName = "FightNight-Windows-v$Version"
$stage = Join-Path $releaseRoot $folderName
$zip = Join-Path $releaseRoot "$folderName.zip"

if (-not (Test-Path (Join-Path $dist 'index.html'))) { throw 'dist is missing. Run npm run build first.' }
if (Test-Path $stage) { throw "Refusing to overwrite existing release folder: $stage" }
if (Test-Path $zip) { throw "Refusing to overwrite existing release archive: $zip" }

New-Item -ItemType Directory -Force -Path $stage | Out-Null
Copy-Item -Recurse -Path (Join-Path $packaging '*') -Destination $stage
foreach ($document in @('ASSET_CREDITS.md', 'PRIVACY.md', 'KNOWN_ISSUES.md', 'RELEASE_NOTES_0.2.4_VNEXT.md')) {
    $source = Join-Path $root $document
    if (-not (Test-Path -LiteralPath $source -PathType Leaf)) { throw "Release document is missing: $source" }
    Copy-Item -LiteralPath $source -Destination $stage
}
New-Item -ItemType Directory -Path (Join-Path $stage 'game') | Out-Null
Copy-Item -Recurse -Path (Join-Path $dist '*') -Destination (Join-Path $stage 'game')
Compress-Archive -Path $stage -DestinationPath $zip -CompressionLevel Optimal

Write-Output "Created $zip"
