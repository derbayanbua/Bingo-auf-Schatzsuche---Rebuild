<#
.SYNOPSIS
  Lädt die ORIGINAL-Medien von „Bingo auf Schatzsuche“ (Videos, Musik, Sprache/Effekte, Grafiken,
  optional Untertitel) aus der eigenen CD bzw. Installation in die Browser-Neuentwicklung.

.DESCRIPTION
  NUR FÜR DEN PRIVATEN GEBRAUCH durch Besitzer des Originalspiels.
  Die Originaldateien sind urheberrechtlich geschützt. Die erzeugten Dateien (Ordner "orig")
  dürfen NICHT weitergegeben, hochgeladen oder veröffentlicht werden.

  Der Quellordner (CD oder Installation) wird nur gelesen, niemals verändert.
  Benötigt: Python 3.8+ (https://www.python.org/downloads/). Pillow wird bei Bedarf per
  "pip install --user pillow" installiert. ProjectorRays v0.2.0 und ffmpeg werden beim ersten
  Lauf nach tools\.cache\ heruntergeladen.
  Mehrfaches Ausführen ist unbedenklich: bereits erzeugte Dateien werden übersprungen.

.PARAMETER Quelle
  CD-Laufwerk oder Installationsordner (enthält Software\ und Shared\ bzw. Setup\Shared\).
  Ohne Angabe wird auf allen Laufwerken gesucht bzw. nachgefragt.
.PARAMETER Video
  Ordner mit den Videos (*.smk), falls die Quelle (Installation) keinen Video-Ordner hat –
  normalerweise <CD>\Video.
.PARAMETER Ziel
  Zielordner "orig". Standard: <Repo>\public\orig bzw. <dist>\orig, wenn das Skript in einem
  gebauten dist\tools liegt.
.PARAMETER Untertitel
  Zusätzlich Untertitel per Spracherkennung (faster-whisper, lokal, dauert lange) erzeugen.
.PARAMETER Arbeitsordner
  Temporärer Ordner für Zwischenergebnisse (Standard: %TEMP%\bingo-schatzsuche-import).
.PARAMETER Behalten
  Arbeitsordner am Ende nicht löschen.
.PARAMETER WerkzeugOrdner
  Ordner mit vorhandenem projectorrays.exe und ffmpeg\ffmpeg.exe (statt Download).
.PARAMETER Neu
  Alles neu erzeugen (vorhandene Ausgaben überschreiben).

.EXAMPLE
  .\Originaldateien-importieren.ps1 -Quelle E:\
.EXAMPLE
  .\Originaldateien-importieren.ps1 -Quelle "C:\Spiele\Schatzsuche" -Video E:\Video
#>
[CmdletBinding()]
param(
    [string]$Quelle,
    [string]$Video,
    [string]$Ziel,
    [switch]$Untertitel,
    [string]$Arbeitsordner,
    [switch]$Behalten,
    [string]$WerkzeugOrdner,
    [switch]$Neu
)

$ErrorActionPreference = 'Stop'
$ProgressPreference = 'SilentlyContinue'   # beschleunigt Invoke-WebRequest in PowerShell 5.1
[Net.ServicePointManager]::SecurityProtocol = [Net.ServicePointManager]::SecurityProtocol -bor [Net.SecurityProtocolType]::Tls12

$PR_URL    = 'https://github.com/ProjectorRays/ProjectorRays/releases/download/v0.2.0/projectorrays-0.2.0.exe'
$PR_SHA256 = 'E9814428EE503CF129B6F5CFF54524177B7BDD63201A9095D8D19433535C70DB'
$FF_URL    = 'https://github.com/BtbN/FFmpeg-Builds/releases/download/latest/ffmpeg-master-latest-win64-gpl.zip'

$ToolsDir = $PSScriptRoot
$PyDir    = Join-Path $ToolsDir 'originalimport'
$CacheDir = Join-Path $ToolsDir '.cache'
$script:Schritt = 0
$Start = Get-Date

function Schritt($text) {
    $script:Schritt++
    Write-Host ''
    Write-Host ("[{0}/9] {1}" -f $script:Schritt, $text) -ForegroundColor Cyan
}
function Info($text) { Write-Host "      $text" }
function Warnung($text) { Write-Host "      WARNUNG: $text" -ForegroundColor Yellow }
function Abbruch($text) {
    Write-Host ''
    Write-Host "FEHLER: $text" -ForegroundColor Red
    exit 1
}
function GroesseText([double]$b) {
    if ($b -ge 1GB) { return '{0:N2} GB' -f ($b / 1GB) }
    if ($b -ge 1MB) { return '{0:N1} MB' -f ($b / 1MB) }
    return '{0:N0} KB' -f ($b / 1KB)
}
function OrdnerGroesse($p) {
    if (-not (Test-Path -LiteralPath $p)) { return 0 }
    $s = (Get-ChildItem -LiteralPath $p -Recurse -File -ErrorAction SilentlyContinue | Measure-Object Length -Sum).Sum
    if ($s) { return [double]$s } else { return 0 }
}
# Native Programme ausführen, ohne dass Ausgaben auf stderr in PowerShell 5.1 als Fehler gelten.
function Starte {
    param([string]$Exe, [string[]]$Argumente, [switch]$Leise)
    $alt = $ErrorActionPreference
    $ErrorActionPreference = 'Continue'
    try {
        if ($Leise) { & $Exe @Argumente 2>&1 | Out-Null } else { & $Exe @Argumente | Out-Host }
        return $LASTEXITCODE
    } finally { $ErrorActionPreference = $alt }
}

Write-Host '================================================================' -ForegroundColor Green
Write-Host ' Bingo auf Schatzsuche - Originaldateien für das Heimspiel laden' -ForegroundColor Green
Write-Host '================================================================' -ForegroundColor Green
Write-Host ' Nur für den privaten Gebrauch mit dem eigenen Originalspiel.'
Write-Host ' Die Dateien sind urheberrechtlich geschützt - niemals hochladen'
Write-Host ' oder weitergeben!'

# ------------------------------------------------------------------ 1. Quelle
Schritt 'Originalspiel suchen'

function Spielwurzel($p) {
    if (-not $p) { return $null }
    foreach ($c in @($p, (Split-Path $p -Parent))) {
        if (-not $c) { continue }
        if ((Test-Path -LiteralPath (Join-Path $c 'Software\Adventure')) -and
            ((Test-Path -LiteralPath (Join-Path $c 'Shared')) -or (Test-Path -LiteralPath (Join-Path $c 'Setup\Shared')))) {
            $r = (Resolve-Path -LiteralPath $c).Path.TrimEnd('\')
            if ($r.EndsWith(':')) { $r += '\.' }   # Laufwerkswurzel ohne abschließenden Backslash (Quoting nativer Aufrufe)
            return $r
        }
    }
    return $null
}
function Laufwerke { Get-PSDrive -PSProvider FileSystem | ForEach-Object { $_.Root } }

if (-not $Quelle) {
    foreach ($d in Laufwerke) {
        try { if (Spielwurzel $d) { $Quelle = $d; Info "Gefunden auf Laufwerk $d"; break } } catch {}
    }
}
if (-not $Quelle) {
    $Quelle = Read-Host '      Pfad zur CD oder zum Installationsordner (z. B. E:\ oder C:\Spiele\Schatzsuche)'
}
$Root = Spielwurzel $Quelle
if (-not $Root) {
    Abbruch "In '$Quelle' wurde das Spiel nicht gefunden (erwartet: Ordner Software\ und Shared\ bzw. Setup\Shared\)."
}
$SharedDir = if (Test-Path -LiteralPath "$Root\Shared") { "$Root\Shared" } else { "$Root\Setup\Shared" }
$DataDir   = if (Test-Path -LiteralPath "$Root\Data") { "$Root\Data" } elseif (Test-Path -LiteralPath "$Root\Setup\Data") { "$Root\Setup\Data" } else { $null }
Info "Spiel:  $Root"

function HatVideos($p) { $p -and (Test-Path -LiteralPath $p) -and @(Get-ChildItem -LiteralPath $p -Filter *.smk -ErrorAction SilentlyContinue).Count -gt 0 }
if ($Video) {
    if (Test-Path -LiteralPath (Join-Path $Video 'Video')) { $Video = Join-Path $Video 'Video' }
} elseif (HatVideos "$Root\Video") {
    $Video = "$Root\Video"
} else {
    foreach ($d in Laufwerke) {
        try { if (HatVideos (Join-Path $d 'Video')) { $Video = Join-Path $d 'Video'; break } } catch {}
    }
    if (-not $Video) {
        Warnung 'Die Installation enthält keine Videos (die liegen nur auf der CD im Ordner Video).'
        $Video = Read-Host '      Pfad zum Video-Ordner der CD (leer lassen = ohne Videos)'
    }
}
$OhneVideo = -not (HatVideos $Video)
if ($OhneVideo) { Warnung 'Keine Videos gefunden - es werden keine Videos importiert.' } else { Info "Videos: $Video" }

# ------------------------------------------------------------------ Ziel / Arbeitsordner
$Basis = Split-Path $ToolsDir -Parent
$IstDist = $false
if (-not $Ziel) {
    if (Test-Path -LiteralPath (Join-Path $Basis 'package.json')) { $Ziel = Join-Path $Basis 'public\orig' }
    elseif (Test-Path -LiteralPath (Join-Path $Basis 'index.html')) { $Ziel = Join-Path $Basis 'orig'; $IstDist = $true }
    else { Abbruch 'Zielordner unbekannt - bitte mit -Ziel angeben.' }
} elseif (-not (Test-Path -LiteralPath (Join-Path $Basis 'package.json')) -and (Test-Path -LiteralPath (Join-Path $Basis 'index.html'))) {
    $IstDist = $true
}
New-Item -ItemType Directory -Force -Path $Ziel | Out-Null
$Ziel = (Resolve-Path -LiteralPath $Ziel).Path
if ($Ziel.StartsWith($Root, [StringComparison]::OrdinalIgnoreCase)) { Abbruch 'Das Ziel darf nicht im Spielordner liegen.' }
if (-not $Arbeitsordner) { $Arbeitsordner = Join-Path $env:TEMP 'bingo-schatzsuche-import' }
New-Item -ItemType Directory -Force -Path $Arbeitsordner | Out-Null
$Work = (Resolve-Path -LiteralPath $Arbeitsordner).Path
if ($Work.StartsWith($Root, [StringComparison]::OrdinalIgnoreCase)) { Abbruch 'Der Arbeitsordner darf nicht im Spielordner liegen.' }
Info "Ziel:   $Ziel"
Info "Arbeitsordner: $Work"

# ------------------------------------------------------------------ 2. Python
Schritt 'Python prüfen'
$Py = $null; $PyArgs = @()
foreach ($k in @(@('py', '-3'), @('python'), @('python3'))) {
    $cmd = Get-Command $k[0] -ErrorAction SilentlyContinue
    if (-not $cmd) { continue }
    $a = @($k | Select-Object -Skip 1)
    $alt = $ErrorActionPreference; $ErrorActionPreference = 'Continue'
    # (keine Anführungszeichen im Code: PowerShell 5.1 entfernt sie bei nativen Aufrufen)
    $v = & $cmd.Source @a -c 'import sys; print(sys.version_info[0], sys.version_info[1], sep=chr(46))' 2>$null
    $ErrorActionPreference = $alt
    if ($LASTEXITCODE -eq 0 -and "$v" -match '^3\.(\d+)$' -and [int]$Matches[1] -ge 8) { $Py = $cmd.Source; $PyArgs = $a; break }
}
if (-not $Py) {
    Abbruch ("Python 3 (ab 3.8) wurde nicht gefunden.`n       Bitte installieren: https://www.python.org/downloads/ " +
             "(beim Setup 'Add python.exe to PATH' anhaken)`n       und dieses Skript danach erneut starten.")
}
Info "Python $v ($Py)"
function Python([string[]]$a) { return (Starte $Py ($PyArgs + $a)) }
if ((Starte $Py ($PyArgs + @('-c', 'import PIL')) -Leise) -ne 0) {
    Info 'Installiere Pillow (pip install --user pillow) ...'
    if ((Python @('-m', 'pip', 'install', '--user', '--disable-pip-version-check', 'pillow')) -ne 0 -or
        (Starte $Py ($PyArgs + @('-c', 'import PIL')) -Leise) -ne 0) {
        Abbruch 'Pillow konnte nicht installiert werden.'
    }
}
Info 'Pillow vorhanden.'

# ------------------------------------------------------------------ 3. Werkzeuge
Schritt 'Werkzeuge bereitstellen (ProjectorRays, ffmpeg)'
New-Item -ItemType Directory -Force -Path $CacheDir | Out-Null
function Lade($url, $datei) {
    Info "Lade herunter: $url"
    $tmp = "$datei.part"
    try { Invoke-WebRequest -Uri $url -OutFile $tmp -UseBasicParsing }
    catch { Abbruch "Download fehlgeschlagen: $url`n       $($_.Exception.Message)" }
    if (-not (Test-Path -LiteralPath $tmp) -or (Get-Item -LiteralPath $tmp).Length -lt 100KB) { Abbruch "Download unvollständig: $url" }
    Move-Item -Force -LiteralPath $tmp -Destination $datei
    Info ('  -> {0} ({1})' -f $datei, (GroesseText (Get-Item -LiteralPath $datei).Length))
}

$PR = $null
if ($WerkzeugOrdner -and (Test-Path -LiteralPath (Join-Path $WerkzeugOrdner 'projectorrays.exe'))) { $PR = Join-Path $WerkzeugOrdner 'projectorrays.exe' }
else {
    $PR = Join-Path $CacheDir 'projectorrays-0.2.0.exe'
    if (-not (Test-Path -LiteralPath $PR) -or (Get-FileHash -LiteralPath $PR -Algorithm SHA256).Hash -ne $PR_SHA256) {
        Lade $PR_URL $PR
        if ((Get-FileHash -LiteralPath $PR -Algorithm SHA256).Hash -ne $PR_SHA256) {
            Remove-Item -LiteralPath $PR -Force
            Abbruch 'Prüfsumme von ProjectorRays stimmt nicht - Download verworfen.'
        }
        Info '  Prüfsumme (SHA-256) ok.'
    }
}
Info "ProjectorRays: $PR"

$FF = $null
if ($WerkzeugOrdner) {
    foreach ($c in @('ffmpeg\ffmpeg.exe', 'ffmpeg\bin\ffmpeg.exe', 'ffmpeg.exe')) {
        if (Test-Path -LiteralPath (Join-Path $WerkzeugOrdner $c)) { $FF = Join-Path $WerkzeugOrdner $c; break }
    }
}
if (-not $FF) {
    $FF = Join-Path $CacheDir 'ffmpeg\ffmpeg.exe'
    if (-not (Test-Path -LiteralPath $FF)) {
        $zip = Join-Path $CacheDir 'ffmpeg.zip'
        Lade $FF_URL $zip
        $tmp = Join-Path $CacheDir 'ffmpeg-entpackt'
        if (Test-Path -LiteralPath $tmp) { Remove-Item -Recurse -Force -LiteralPath $tmp }
        Info '  Entpacke ...'
        Expand-Archive -LiteralPath $zip -DestinationPath $tmp -Force
        $exe = Get-ChildItem -LiteralPath $tmp -Recurse -Filter ffmpeg.exe | Select-Object -First 1
        if (-not $exe) { Abbruch 'ffmpeg.exe nicht im Download gefunden.' }
        New-Item -ItemType Directory -Force -Path (Split-Path $FF) | Out-Null
        Move-Item -Force -LiteralPath $exe.FullName -Destination $FF
        Remove-Item -Recurse -Force -LiteralPath $tmp, $zip
    }
}
if ((Starte $FF @('-hide_banner', '-version') -Leise) -ne 0) { Abbruch "ffmpeg lässt sich nicht starten: $FF" }
Info "ffmpeg: $FF"

# ------------------------------------------------------------------ 4. Director-Dateien zerlegen
Schritt 'Director-Dateien zerlegen (ProjectorRays)'
$Chunks = Join-Path $Work 'chunks'
New-Item -ItemType Directory -Force -Path $Chunks | Out-Null
$Dateien = @()
foreach ($sub in Get-ChildItem -LiteralPath "$Root\Software" -Directory) {
    foreach ($f in Get-ChildItem -LiteralPath $sub.FullName -File | Where-Object { $_.Extension -in '.dxr', '.cxt', '.dir', '.cst' }) {
        $Dateien += [pscustomobject]@{ Datei = $f.FullName; Name = "$($sub.Name)_$($f.BaseName)" }
    }
}
foreach ($pair in @(@($SharedDir, 'Shared'), @($DataDir, 'Data'))) {
    if (-not $pair[0]) { continue }
    foreach ($f in Get-ChildItem -LiteralPath $pair[0] -File | Where-Object { $_.Extension -in '.cxt', '.cst', '.dxr', '.dir' }) {
        $Dateien += [pscustomobject]@{ Datei = $f.FullName; Name = "$($pair[1])_$($f.BaseName)" }
    }
}
if ($Dateien.Count -lt 50) { Abbruch "Nur $($Dateien.Count) Director-Dateien gefunden - ist die Quelle vollständig?" }
$i = 0; $anzahlNeu = 0; $fehler = @()
foreach ($d in $Dateien) {
    $i++
    $out = Join-Path $Chunks $d.Name
    $fertig = Join-Path $out '.fertig'
    if ((Test-Path -LiteralPath $fertig) -and -not $Neu) { continue }
    if (Test-Path -LiteralPath $out) { Remove-Item -Recurse -Force -LiteralPath $out }
    New-Item -ItemType Directory -Force -Path $out | Out-Null
    Write-Progress -Activity 'Director-Dateien zerlegen' -Status $d.Name -PercentComplete (100 * $i / $Dateien.Count)
    $rc = Starte $PR @('decompile', $d.Datei, '-o', $out, '--dump-chunks', '--dump-json') -Leise
    if ($rc -ne 0 -or -not (Get-ChildItem -LiteralPath $out -Recurse -Directory -Filter chunks)) { $fehler += $d.Name; continue }
    New-Item -ItemType File -Path $fertig | Out-Null
    $anzahlNeu++
    if ($anzahlNeu % 20 -eq 0) { Info "$i / $($Dateien.Count) ..." }
}
Write-Progress -Activity 'Director-Dateien zerlegen' -Completed
Info "$($Dateien.Count) Dateien ($anzahlNeu neu zerlegt)"
if ($fehler) { Warnung ("Nicht zerlegbar: " + ($fehler -join ', ')) }

# ------------------------------------------------------------------ 5.-7. Grafik
$Img = Join-Path $Work 'img'
Schritt 'Bitmaps dekodieren'
if ($Neu -or -not (Test-Path -LiteralPath (Join-Path $Img '.fertig'))) {
    if ((Python @((Join-Path $PyDir 'extract_bitmaps.py'), '--all', $Chunks, $Img)) -ne 0) { Abbruch 'Bitmaps konnten nicht dekodiert werden.' }
    New-Item -ItemType File -Force -Path (Join-Path $Img '.fertig') | Out-Null
} else { Info 'bereits erledigt' }

Schritt 'Drehbücher (Score) auslesen'
if ((Python @((Join-Path $PyDir 'parse_score.py'), '--work', $Work)) -ne 0) { Abbruch 'Score konnte nicht gelesen werden.' }

Schritt 'Grafiken für den Browser umwandeln (WebP)'
$ga = @((Join-Path $PyDir 'export_graphics.py'), '--work', $Work, '--out', $Ziel)
if ($Neu) { $ga += '--force' }
if ((Python $ga) -ne 0) { Abbruch 'Grafikexport fehlgeschlagen.' }

# ------------------------------------------------------------------ 8. Ton / Musik / Video
Schritt 'Sprache, Effekte, Musik und Videos umwandeln (dauert einige Minuten)'
$ia = @((Join-Path $PyDir 'import_original_assets.py'), '--game', $Root, '--work', $Work, '--out', $Ziel, '--ffmpeg', $FF)
if ($OhneVideo) { $ia += '--skip-video' } else { $ia += @('--video', $Video) }
if ($Neu) { $ia += '--force' }
if ((Python $ia) -ne 0) { Abbruch 'Import von Ton/Musik/Video fehlgeschlagen.' }

# ------------------------------------------------------------------ 9. Untertitel (optional)
Schritt 'Untertitel'
if ($Untertitel) {
    if ((Starte $Py ($PyArgs + @('-c', 'import faster_whisper, numpy')) -Leise) -ne 0) {
        Info 'Installiere faster-whisper (pip install --user faster-whisper numpy) ...'
        if ((Python @('-m', 'pip', 'install', '--user', '--disable-pip-version-check', 'faster-whisper', 'numpy')) -ne 0) {
            Abbruch 'faster-whisper konnte nicht installiert werden.'
        }
    }
    Info 'Spracherkennung läuft (lokal, kann über eine Stunde dauern; Abbruch und Fortsetzen sind möglich) ...'
    if ((Python @((Join-Path $PyDir 'transcribe_voices.py'), '--out', $Ziel, '--ffmpeg', $FF)) -ne 0) { Warnung 'Untertitel unvollständig.' }
} else {
    Info 'übersprungen (mit -Untertitel erzeugen)'
}

# ------------------------------------------------------------------ Aufräumen + Zusammenfassung
if ($Behalten) { Info "Arbeitsordner bleibt erhalten: $Work" }
else {
    Remove-Item -Recurse -Force -LiteralPath $Work -ErrorAction SilentlyContinue
    if (Test-Path -LiteralPath $Work) { Warnung "Arbeitsordner konnte nicht vollständig gelöscht werden: $Work" }
}

Write-Host ''
Write-Host '================================================================' -ForegroundColor Green
Write-Host ' Fertig!' -ForegroundColor Green
$zeilen = @(
    @('Videos', 'video', '*.mp4'), @('Musik', 'music', '*.mp3'), @('Sprache/Effekte', 'audio', '*.mp3'), @('Grafiken', 'gfx', '*.webp')
)
foreach ($z in $zeilen) {
    $p = Join-Path $Ziel $z[1]
    $n = if (Test-Path -LiteralPath $p) { @(Get-ChildItem -LiteralPath $p -Recurse -File -Filter $z[2]).Count } else { 0 }
    Write-Host ('   {0,-16} {1,6} Dateien  {2,10}' -f $z[0], $n, (GroesseText (OrdnerGroesse $p)))
}
$tr = Join-Path $Ziel 'audio\transcripts.json'
Write-Host ('   {0,-16} {1}' -f 'Untertitel', $(if (Test-Path -LiteralPath $tr) { 'vorhanden' } else { 'keine' }))
Write-Host ('   {0,-16} {1,26}' -f 'Gesamt', (GroesseText (OrdnerGroesse $Ziel)))
Write-Host ("   Ziel: $Ziel  (Dauer {0:N0} min)" -f ((Get-Date) - $Start).TotalMinutes)
Write-Host ''
if ($IstDist) {
    Write-Host ' Spiel starten: "Spiel starten.cmd" im Spielordner doppelklicken.'
} else {
    Write-Host ' Spiel starten: im Projektordner "npm run dev" ausführen'
    Write-Host ' (oder nach "npm run build" dist\Spiel starten.cmd).'
}
Write-Host ' Erinnerung: Die Dateien im Ordner "orig" nur privat nutzen - nicht weitergeben!'
Write-Host '================================================================' -ForegroundColor Green
