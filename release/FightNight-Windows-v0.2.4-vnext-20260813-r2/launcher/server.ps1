param(
    [Parameter(Mandatory = $true)]
    [string] $GameRoot,

    [int] $Port = 0,

    [switch] $NoBrowser
)

$ErrorActionPreference = 'Stop'

function Get-ContentType {
    param([string] $Path)

    switch ([System.IO.Path]::GetExtension($Path).ToLowerInvariant()) {
        '.html' { 'text/html; charset=utf-8' }
        '.js' { 'text/javascript; charset=utf-8' }
        '.css' { 'text/css; charset=utf-8' }
        '.json' { 'application/json; charset=utf-8' }
        '.webmanifest' { 'application/manifest+json; charset=utf-8' }
        '.svg' { 'image/svg+xml' }
        '.png' { 'image/png' }
        '.webp' { 'image/webp' }
        '.jpg' { 'image/jpeg' }
        '.jpeg' { 'image/jpeg' }
        '.ico' { 'image/x-icon' }
        '.woff' { 'font/woff' }
        '.woff2' { 'font/woff2' }
        default { 'application/octet-stream' }
    }
}

function Send-Response {
    param(
        [System.Net.Sockets.NetworkStream] $Stream,
        [int] $StatusCode,
        [string] $StatusText,
        [byte[]] $Body,
        [string] $ContentType,
        [bool] $HeadOnly = $false
    )

    $headers = @(
        "HTTP/1.1 $StatusCode $StatusText"
        "Content-Length: $($Body.Length)"
        "Content-Type: $ContentType"
        'Cache-Control: no-cache'
        'Service-Worker-Allowed: /'
        'X-Content-Type-Options: nosniff'
        'Connection: close'
        ''
        ''
    ) -join "`r`n"

    $headerBytes = [System.Text.Encoding]::ASCII.GetBytes($headers)
    $Stream.Write($headerBytes, 0, $headerBytes.Length)
    if (-not $HeadOnly -and $Body.Length -gt 0) {
        $Stream.Write($Body, 0, $Body.Length)
    }
    $Stream.Flush()
}

$root = [System.IO.Path]::GetFullPath($GameRoot).TrimEnd('\', '/')
$rootPrefix = $root + [System.IO.Path]::DirectorySeparatorChar
$indexPath = Join-Path $root 'index.html'

if (-not (Test-Path -LiteralPath $indexPath -PathType Leaf)) {
    throw "Game file not found: $indexPath"
}

$listener = [System.Net.Sockets.TcpListener]::new([System.Net.IPAddress]::Loopback, $Port)
$listener.Start()
$port = ([System.Net.IPEndPoint] $listener.LocalEndpoint).Port
$gameUrl = "http://127.0.0.1:$port/"

Write-Host ''
Write-Host '  FIGHT NIGHT: ASHEN RING' -ForegroundColor Yellow
Write-Host "  Game address: $gameUrl"
Write-Host '  Keep this window open while you are playing.'
Write-Host '  Close this window or press Ctrl+C to stop.'
Write-Host ''

try {
    if (-not $NoBrowser) {
        Start-Process $gameUrl
    }

    while ($true) {
        $client = $listener.AcceptTcpClient()
        try {
            $stream = $client.GetStream()
            $reader = [System.IO.StreamReader]::new(
                $stream,
                [System.Text.Encoding]::ASCII,
                $false,
                4096,
                $true
            )

            $requestLine = $reader.ReadLine()
            if ([string]::IsNullOrWhiteSpace($requestLine)) {
                continue
            }

            while ($true) {
                $headerLine = $reader.ReadLine()
                if ([string]::IsNullOrEmpty($headerLine)) {
                    break
                }
            }

            $requestParts = $requestLine.Split(' ')
            if ($requestParts.Length -lt 2 -or $requestParts[0] -notin @('GET', 'HEAD')) {
                $message = [System.Text.Encoding]::UTF8.GetBytes('Method not allowed')
                Send-Response $stream 405 'Method Not Allowed' $message 'text/plain; charset=utf-8'
                continue
            }

            $headOnly = $requestParts[0] -eq 'HEAD'
            $rawPath = ($requestParts[1] -split '\?', 2)[0]
            $decodedPath = [System.Uri]::UnescapeDataString($rawPath).Replace('/', [System.IO.Path]::DirectorySeparatorChar).TrimStart('\', '/')
            if ([string]::IsNullOrWhiteSpace($decodedPath)) {
                $decodedPath = 'index.html'
            }

            $candidatePath = [System.IO.Path]::GetFullPath((Join-Path $root $decodedPath))
            $insideRoot = $candidatePath.StartsWith($rootPrefix, [System.StringComparison]::OrdinalIgnoreCase)

            if (-not $insideRoot -or -not (Test-Path -LiteralPath $candidatePath -PathType Leaf)) {
                $message = [System.Text.Encoding]::UTF8.GetBytes('Not found')
                Send-Response $stream 404 'Not Found' $message 'text/plain; charset=utf-8' $headOnly
                continue
            }

            $body = [System.IO.File]::ReadAllBytes($candidatePath)
            Send-Response $stream 200 'OK' $body (Get-ContentType $candidatePath) $headOnly
        }
        catch {
            if ($null -ne $stream -and $stream.CanWrite) {
                $message = [System.Text.Encoding]::UTF8.GetBytes('Internal server error')
                Send-Response $stream 500 'Internal Server Error' $message 'text/plain; charset=utf-8'
            }
        }
        finally {
            if ($null -ne $reader) { $reader.Dispose() }
            if ($null -ne $stream) { $stream.Dispose() }
            $client.Dispose()
            $reader = $null
            $stream = $null
        }
    }
}
finally {
    $listener.Stop()
}
