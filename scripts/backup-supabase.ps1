param(
    [Parameter(Mandatory = $true)]
    [ValidatePattern('^[a-z0-9]{20}$')]
    [string] $ProjectRef,

    [Parameter(Mandatory = $true)]
    [string] $OutputPath
)

$ErrorActionPreference = 'Stop'
$resolvedParent = [System.IO.Path]::GetFullPath((Split-Path -Parent $OutputPath))
$resolvedOutput = [System.IO.Path]::GetFullPath($OutputPath)

if (-not (Test-Path -LiteralPath $resolvedParent -PathType Container)) {
    throw "Output directory does not exist: $resolvedParent"
}
if (Test-Path -LiteralPath $resolvedOutput) {
    throw "Refusing to overwrite existing backup: $resolvedOutput"
}
if ([System.IO.Path]::GetExtension($resolvedOutput) -ne '.sql') {
    throw 'Backup output must use the .sql extension.'
}
if (-not (Get-Command supabase -ErrorAction SilentlyContinue)) {
    throw 'Supabase CLI is not installed or not available on PATH.'
}

Write-Host "Creating schema backup for project $ProjectRef"
& supabase link --project-ref $ProjectRef
if ($LASTEXITCODE -ne 0) { throw 'Supabase project link failed.' }
& supabase db dump --linked --schema public --file $resolvedOutput
if ($LASTEXITCODE -ne 0) { throw 'Supabase schema dump failed.' }

$hash = Get-FileHash -Algorithm SHA256 -LiteralPath $resolvedOutput
Write-Output "Created $resolvedOutput"
Write-Output "SHA256=$($hash.Hash)"
