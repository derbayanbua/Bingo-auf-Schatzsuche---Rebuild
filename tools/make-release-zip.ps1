# Packt das fertige Heimspiel-Paket "Bingo-Schatzsuche-Spiel.zip" aus dist\ (wird auch von
# .github/workflows/release.yml benutzt). Originalmedien (orig\) werden NIE mit eingepackt.
#   .\tools\make-release-zip.ps1              # baut vorher (npm run build)
#   .\tools\make-release-zip.ps1 -OhneBuild   # nimmt das vorhandene dist\
param(
    [switch]$OhneBuild,
    [string]$Ausgabe
)
$ErrorActionPreference = 'Stop'
$repo = Split-Path $PSScriptRoot -Parent
$dist = Join-Path $repo 'dist'
if (-not $Ausgabe) { $Ausgabe = Join-Path $repo 'release\Bingo-Schatzsuche-Spiel.zip' }

if (-not $OhneBuild) {
    Push-Location $repo
    try {
        $env:BINGO_OHNE_IMPORTER = ''
        npm run build
        if ($LASTEXITCODE -ne 0) { throw 'npm run build fehlgeschlagen' }
    } finally { Pop-Location }
}

$pflicht = @('index.html', 'Spiel starten.cmd', 'start-server.ps1', 'Originaldateien importieren.cmd',
             'Originaldateien-importieren.ps1', 'LIESMICH.txt', 'originalimport\import_original_assets.py')
foreach ($p in $pflicht) {
    if (-not (Test-Path -LiteralPath (Join-Path $dist $p))) { throw "dist\$p fehlt - Build unvollständig?" }
}

Add-Type -AssemblyName System.IO.Compression
Add-Type -AssemblyName System.IO.Compression.FileSystem
$Ausgabe = [IO.Path]::GetFullPath($Ausgabe)
New-Item -ItemType Directory -Force -Path (Split-Path $Ausgabe) | Out-Null
if (Test-Path -LiteralPath $Ausgabe) { Remove-Item -LiteralPath $Ausgabe -Force }

$distVoll = (Resolve-Path -LiteralPath $dist).Path.TrimEnd('\', '/')
$zip = [IO.Compression.ZipFile]::Open($Ausgabe, 'Create')
$n = 0
try {
    foreach ($f in Get-ChildItem -LiteralPath $distVoll -Recurse -File -Force) {
        $rel = $f.FullName.Substring($distVoll.Length + 1).Replace('\', '/')
        # niemals Originalmedien, Caches oder Python-Bytecode einpacken
        if ($rel -match '^(orig|\.cache)/' -or $rel -match '(^|/)__pycache__/') { continue }
        [void][IO.Compression.ZipFileExtensions]::CreateEntryFromFile($zip, $f.FullName, $rel, 'Optimal')
        $n++
    }
} finally { $zip.Dispose() }

$z = [IO.Compression.ZipFile]::OpenRead($Ausgabe)
try { $orig = @($z.Entries | Where-Object { $_.FullName -like 'orig/*' }).Count } finally { $z.Dispose() }
if ($orig) { Remove-Item -LiteralPath $Ausgabe; throw 'orig/ ist im ZIP gelandet - abgebrochen.' }
Write-Host ("{0}: {1} Dateien, {2:N1} MB" -f $Ausgabe, $n, ((Get-Item -LiteralPath $Ausgabe).Length / 1MB))
