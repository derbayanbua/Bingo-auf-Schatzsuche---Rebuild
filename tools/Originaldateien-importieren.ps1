<#
.SYNOPSIS
  Lädt die ORIGINAL-Medien von »Bingo auf Schatzsuche« (Videos, Musik, Sprache/Effekte, Grafiken,
  optional Untertitel) aus der eigenen CD bzw. Installation in die Browser-Neuentwicklung.

.DESCRIPTION
  NUR FÜR DEN PRIVATEN GEBRAUCH durch Besitzer des Originalspiels.
  Die Originaldateien sind urheberrechtlich geschützt. Die erzeugten Dateien (Ordner "orig")
  dürfen NICHT weitergegeben, hochgeladen oder veröffentlicht werden.

  Normalerweise einfach "Originaldateien importieren.cmd" doppelklicken: Das Skript sucht die CD
  (auch eingebundene ISO-Dateien) bzw. die Installation selbst, bietet bei fehlendem Python dessen
  Installation an (winget) und lädt die übrigen Werkzeuge beim ersten Lauf herunter.

  Der Quellordner (CD oder Installation) wird nur gelesen, niemals verändert.
  Benötigt: Windows 10/11, Python 3.8+ (wird auf Wunsch installiert), Internet beim ersten Lauf.
  Pillow wird per "pip install --user pillow" installiert. ProjectorRays v0.2.0 (SHA-256-geprüft)
  und ffmpeg werden einmalig heruntergeladen (Repository: tools\.cache\, fertiges Spielpaket:
  %LOCALAPPDATA%\Bingo-Schatzsuche\Werkzeuge\).
  Mehrfaches Ausführen ist unbedenklich: bereits erzeugte Dateien werden übersprungen.

.PARAMETER Quelle
  CD-Laufwerk oder Installationsordner (enthält Software\ und Shared\ bzw. Setup\Shared\).
  Ohne Angabe wird automatisch gesucht (CD/DVD-Laufwerke, ISO, übliche Installationsordner)
  und nötigenfalls ein Ordner-Auswahlfenster gezeigt.
.PARAMETER Video
  Ordner mit den Videos (*.smk), falls die Quelle (Installation) keinen Video-Ordner hat –
  normalerweise <CD>\Video. Ohne Angabe wird die CD automatisch danach durchsucht.
.PARAMETER Ziel
  Zielordner "orig". Standard: <Ordner dieses Skripts>\orig im fertigen Spielpaket,
  <Repo>\public\orig im Repository.
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
.PARAMETER NurPruefen
  Nur suchen und prüfen (Quelle, Videos, Ziel, Python, Speicherplatz) und anzeigen, was passieren
  würde – nichts installieren, herunterladen oder schreiben.
.PARAMETER OhneFragen
  Keine Fenster und Rückfragen (für Skripte): bei mehreren Fundstellen wird die beste genommen,
  Python wird nicht automatisch installiert, das Spiel am Ende nicht gestartet.

.EXAMPLE
  .\Originaldateien-importieren.ps1
.EXAMPLE
  .\Originaldateien-importieren.ps1 -Quelle E:\
.EXAMPLE
  .\Originaldateien-importieren.ps1 -Quelle "C:\Spiele\Schatzsuche" -Video E:\Video
.EXAMPLE
  .\Originaldateien-importieren.ps1 -NurPruefen
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
    [switch]$Neu,
    [switch]$NurPruefen,
    [switch]$OhneFragen
)

$ErrorActionPreference = 'Stop'
$ProgressPreference = 'SilentlyContinue'   # beschleunigt Invoke-WebRequest in PowerShell 5.1
[Net.ServicePointManager]::SecurityProtocol = [Net.ServicePointManager]::SecurityProtocol -bor [Net.SecurityProtocolType]::Tls12

$PR_URL    = 'https://github.com/ProjectorRays/ProjectorRays/releases/download/v0.2.0/projectorrays-0.2.0.exe'
$PR_SHA256 = 'E9814428EE503CF129B6F5CFF54524177B7BDD63201A9095D8D19433535C70DB'
$FF_URL    = 'https://github.com/BtbN/FFmpeg-Builds/releases/download/latest/ffmpeg-master-latest-win64-gpl.zip'
$PY_WINGET = 'Python.Python.3.12'
$PY_SEITE  = 'https://www.python.org/downloads/windows/'

$SkriptDir = $PSScriptRoot
$PyDir     = Join-Path $SkriptDir 'originalimport'
$Schritte  = 9
$script:Schritt = 0
$Start = Get-Date
$Fenster = -not $OhneFragen -and [Environment]::UserInteractive

# ------------------------------------------------------------------ Hilfsfunktionen
$script:GuiOk = $false
if ($Fenster) {
    try { Add-Type -AssemblyName System.Windows.Forms; Add-Type -AssemblyName System.Drawing; $script:GuiOk = $true } catch {}
}
function NeuesFormular {
    $f = New-Object System.Windows.Forms.Form
    $f.TopMost = $true; $f.ShowInTaskbar = $false; $f.StartPosition = 'CenterScreen'
    $f.Size = New-Object System.Drawing.Size(1, 1); $f.Opacity = 0
    $f.Show(); $f.Activate()
    return $f
}
# Meldungsfenster (Typ: Info, Fehler, Warnung, Frage). Gibt bei Frage $true für "Ja" zurück.
function Meldung([string]$Text, [string]$Typ = 'Info') {
    if (-not $script:GuiOk) { return $false }
    $knopf = if ($Typ -eq 'Frage') { 'YesNo' } else { 'OK' }
    $bild = @{ Info = 'Information'; Fehler = 'Error'; Warnung = 'Warning'; Frage = 'Question' }[$Typ]
    $f = NeuesFormular
    try { $r = [System.Windows.Forms.MessageBox]::Show($f, $Text, 'Bingo auf Schatzsuche – Originaldateien', $knopf, $bild) }
    finally { $f.Close(); $f.Dispose() }
    return ($r -eq 'Yes')
}
function OrdnerWaehlen([string]$Text) {
    if (-not $script:GuiOk) { return $null }
    $d = New-Object System.Windows.Forms.FolderBrowserDialog
    $d.Description = $Text
    $d.ShowNewFolderButton = $false
    $d.RootFolder = 'MyComputer'
    $f = NeuesFormular
    try { $r = $d.ShowDialog($f) } finally { $f.Close(); $f.Dispose() }
    if ($r -eq 'OK') { return $d.SelectedPath }
    return $null
}

function Schritt($text, [string]$dauer) {
    $script:Schritt++
    Write-Host ''
    $z = "Schritt {0} von {1}: {2}" -f $script:Schritt, $Schritte, $text
    if ($dauer) { $z += "  (ca. $dauer)" }
    Write-Host $z -ForegroundColor Cyan
    $ProgressPreference = 'Continue'
    Write-Progress -Id 1 -Activity 'Originaldateien importieren' -Status ("Schritt {0} von {1}: {2}" -f $script:Schritt, $Schritte, $text) `
        -PercentComplete ([int](100 * ($script:Schritt - 1) / $Schritte))
}
function Info($text) { Write-Host "      $text" }
function Warnung($text) { Write-Host "      ACHTUNG: $text" -ForegroundColor Yellow }
function Abbruch([string]$text, [string]$tipp) {
    Write-Progress -Id 1 -Activity 'Originaldateien importieren' -Completed
    Write-Host ''
    Write-Host "FEHLER: $text" -ForegroundColor Red
    if ($tipp) { Write-Host ''; Write-Host "Was Sie tun können:`n$tipp" -ForegroundColor Yellow }
    Write-Host ''
    Write-Host 'Hilfe: Abschnitt "Mit Originalgrafik und -ton spielen" > "Probleme lösen" in der Anleitung (LIESMICH.txt / README).'
    $m = "Leider hat es nicht geklappt.`n`n$text"
    if ($tipp) { $m += "`n`nWas Sie tun können:`n$tipp" }
    $m += "`n`nSie können das Programm danach einfach noch einmal starten – bereits Erledigtes wird übersprungen."
    Meldung $m 'Fehler' | Out-Null
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
function FreierPlatz($p) {
    try {
        $q = [IO.Path]::GetPathRoot((Resolve-Path -LiteralPath $p).Path)
        return [double](New-Object IO.DriveInfo($q)).AvailableFreeSpace
    } catch { return -1 }
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

trap {
    Abbruch ("Unerwarteter Fehler: " + $_.Exception.Message) `
        " - Programm erneut starten.`n - Falls es wieder passiert: Rechner neu starten und die CD neu einlegen."
}

Write-Host '================================================================' -ForegroundColor Green
Write-Host ' Bingo auf Schatzsuche - Originaldateien für das Heimspiel laden' -ForegroundColor Green
Write-Host '================================================================' -ForegroundColor Green
Write-Host ' Nur für den privaten Gebrauch mit dem eigenen Originalspiel.'
Write-Host ' Die Dateien sind urheberrechtlich geschützt - niemals hochladen'
Write-Host ' oder weitergeben!'
Write-Host ' Gesamtdauer: meist 10-20 Minuten. Das Fenster bitte offen lassen.'
if ($NurPruefen) { Write-Host ' PRÜFMODUS: Es wird nichts installiert, heruntergeladen oder geschrieben.' -ForegroundColor Yellow }

# ------------------------------------------------------------------ 1. Quelle
Schritt 'Originalspiel suchen (CD, ISO oder Installation)'

function Spielwurzel($p) {
    if (-not $p) { return $null }
    foreach ($c in @($p, (Split-Path $p -Parent))) {
        if (-not $c) { continue }
        try {
            if ((Test-Path -LiteralPath (Join-Path $c 'Software\Adventure')) -and
                ((Test-Path -LiteralPath (Join-Path $c 'Shared')) -or (Test-Path -LiteralPath (Join-Path $c 'Setup\Shared')))) {
                $r = (Resolve-Path -LiteralPath $c).Path.TrimEnd('\')
                if ($r.EndsWith(':')) { $r += '\.' }   # Laufwerkswurzel ohne abschließenden Backslash (Quoting nativer Aufrufe)
                return $r
            }
        } catch {}
    }
    return $null
}
function HatVideos($p) {
    try { return [bool]($p -and (Test-Path -LiteralPath $p) -and @(Get-ChildItem -LiteralPath $p -Filter *.smk -ErrorAction SilentlyContinue).Count -gt 0) }
    catch { return $false }
}
function CdLaufwerke {
    $l = @()
    try { $l = @(Get-CimInstance Win32_LogicalDisk -Filter 'DriveType=5' -ErrorAction Stop | Where-Object { $_.Size } | ForEach-Object { $_.DeviceID + '\' }) } catch {}
    return $l
}
# Liefert alle gefundenen Spielordner: [pscustomobject]@{ Pfad; Art ('CD'|'Ordner'); Videos }
function Fundstellen {
    $kand = New-Object System.Collections.Generic.List[string]
    $cds = CdLaufwerke
    foreach ($d in $cds) { $kand.Add($d) }
    # alle übrigen Laufwerke (z. B. kopierte CD auf USB-Stick) nur in der Wurzel
    foreach ($d in (Get-PSDrive -PSProvider FileSystem -ErrorAction SilentlyContinue | ForEach-Object { $_.Root })) { $kand.Add($d) }
    # übliche Installationsorte
    $basen = @($env:ProgramFiles, ${env:ProgramFiles(x86)}, 'C:\Programme', 'C:\Programme (x86)', 'C:\Spiele', 'C:\Games', (Join-Path $env:SystemDrive '\'))
    foreach ($b in $basen | Where-Object { $_ } | Select-Object -Unique) {
        if (-not (Test-Path -LiteralPath $b)) { continue }
        foreach ($k in @(Get-ChildItem -LiteralPath $b -Directory -ErrorAction SilentlyContinue | Where-Object { $_.Name -match 'Schatz|Bingo|more|Outline' })) {
            $kand.Add($k.FullName)
            foreach ($k2 in @(Get-ChildItem -LiteralPath $k.FullName -Directory -ErrorAction SilentlyContinue)) { $kand.Add($k2.FullName) }
        }
    }
    # Ordner rund um dieses Skript (z. B. Spielpaket direkt neben/in einer Kopie der CD entpackt)
    $p = $SkriptDir
    for ($n = 0; $n -lt 3 -and $p; $n++) {
        $p = Split-Path $p -Parent
        if (-not $p) { break }
        $kand.Add($p)
        foreach ($k in @(Get-ChildItem -LiteralPath $p -Directory -ErrorAction SilentlyContinue | Where-Object { $_.Name -match 'Schatz|Bingo' })) { $kand.Add($k.FullName) }
    }
    $gesehen = @{}
    $res = @()
    foreach ($k in $kand) {
        $w = Spielwurzel $k
        if (-not $w -or $gesehen.ContainsKey($w.ToLower())) { continue }
        $gesehen[$w.ToLower()] = $true
        $istCd = [bool]($cds | Where-Object { $w.StartsWith($_.TrimEnd('\'), [StringComparison]::OrdinalIgnoreCase) })
        $res += [pscustomobject]@{ Pfad = $w; Art = $(if ($istCd) { 'CD' } else { 'Ordner' }); Videos = (HatVideos (Join-Path $w 'Video')) }
    }
    return , $res
}

$Funde = @()
if (-not $Quelle) {
    Info 'Suche auf CD-/DVD-Laufwerken, eingebundenen ISO-Dateien und in üblichen Installationsordnern ...'
    $Funde = Fundstellen
    foreach ($f in $Funde) { Info ("gefunden: {0}  ({1}{2})" -f $f.Pfad, $f.Art, $(if ($f.Videos) { ', mit Videos' } else { ', ohne Videos' })) }
    $mitVideo = @($Funde | Where-Object { $_.Videos })
    if ($Funde.Count -eq 1) { $Quelle = $Funde[0].Pfad }
    elseif ($mitVideo.Count -eq 1) { $Quelle = $mitVideo[0].Pfad; Info 'Nehme die Fundstelle mit Videos (vollständige CD).' }
    elseif ($Funde.Count -gt 1 -and -not $script:GuiOk) { $Quelle = ($Funde | Sort-Object { -not $_.Videos })[0].Pfad }
    if (-not $Quelle) {
        if ($Funde.Count -eq 0) { Info 'Das Spiel wurde nicht automatisch gefunden.' } else { Info 'Mehrere Fundstellen - bitte auswählen.' }
        $txt = if ($Funde.Count -eq 0) {
            "Die Original-CD von »Bingo auf Schatzsuche« wurde nicht automatisch gefunden.`n`nBitte legen Sie die CD ein (oder öffnen Sie die ISO-Datei per Doppelklick) und wählen Sie hier das CD-Laufwerk. Alternativ wählen Sie den Ordner, in dem das Spiel installiert ist (darin liegen die Ordner »Software« und »Shared«)."
        } else { "Das Spiel wurde mehrfach gefunden. Bitte wählen Sie die Original-CD (empfohlen, enthält auch die Videos) oder den Installationsordner." }
        if ($Fenster) { $Quelle = OrdnerWaehlen $txt }
        elseif (-not $OhneFragen) { $Quelle = Read-Host '      Pfad zur CD oder zum Installationsordner (z. B. E:\ oder C:\Spiele\Schatzsuche)' }
        if (-not $Quelle) {
            Abbruch 'Es wurde kein Spielordner ausgewählt.' (" - Original-CD einlegen bzw. die ISO-Datei per Doppelklick öffnen`n" +
                " - kurz warten, bis Windows die CD erkannt hat`n - dann das Programm erneut starten")
        }
    }
}
$Root = Spielwurzel $Quelle
if (-not $Root) {
    Abbruch "In '$Quelle' wurde das Spiel nicht gefunden (erwartet: die Ordner Software\ und Shared\ bzw. Setup\Shared\)." `
        " - Bitte das CD-Laufwerk selbst bzw. den Installationsordner wählen (nicht einen Unterordner).`n - Ist es wirklich die CD »Bingo auf Schatzsuche«?"
}
$SharedDir = if (Test-Path -LiteralPath "$Root\Shared") { "$Root\Shared" } else { "$Root\Setup\Shared" }
$DataDir   = if (Test-Path -LiteralPath "$Root\Data") { "$Root\Data" } elseif (Test-Path -LiteralPath "$Root\Setup\Data") { "$Root\Setup\Data" } else { $null }
Info "Spiel:  $Root"

# Videos: liegen nur auf der CD. Bei einer Installation automatisch auf der CD suchen.
if ($Video) {
    if (Test-Path -LiteralPath (Join-Path $Video 'Video')) { $Video = Join-Path $Video 'Video' }
} elseif (HatVideos "$Root\Video") {
    $Video = "$Root\Video"
} else {
    if (-not $Funde) { $Funde = Fundstellen }
    $cdV = @($Funde | Where-Object { $_.Videos } | Select-Object -First 1)
    if ($cdV) { $Video = Join-Path $cdV[0].Pfad 'Video' }
    else {
        foreach ($d in (@(CdLaufwerke) + @(Get-PSDrive -PSProvider FileSystem | ForEach-Object { $_.Root }))) {
            if (HatVideos (Join-Path $d 'Video')) { $Video = Join-Path $d 'Video'; break }
        }
    }
    if ($Video) { Info 'Die Installation enthält keine Videos - nehme sie automatisch von der CD.' }
    else {
        Warnung 'Die Installation enthält keine Videos (die liegen nur auf der CD im Ordner »Video«).'
        if ($Fenster -and (Meldung ("Die Videos des Spiels liegen nur auf der Original-CD (Ordner »Video«), nicht in der Installation.`n`n" +
                    "Möchten Sie den Video-Ordner jetzt auswählen? (Vorher ggf. die CD einlegen.)`n`n»Nein« = ohne Videos weitermachen.") 'Frage')) {
            $Video = OrdnerWaehlen 'Bitte den Ordner »Video« auf der Original-CD auswählen (oder das CD-Laufwerk selbst).'
            if ($Video -and (Test-Path -LiteralPath (Join-Path $Video 'Video'))) { $Video = Join-Path $Video 'Video' }
        } elseif (-not $Fenster -and -not $OhneFragen) {
            $Video = Read-Host '      Pfad zum Video-Ordner der CD (leer lassen = ohne Videos)'
        }
    }
}
$OhneVideo = -not (HatVideos $Video)
if ($OhneVideo) { Warnung 'Keine Videos gefunden - es werden keine Videos importiert (alles andere schon).' } else { Info "Videos: $Video" }

# ------------------------------------------------------------------ Ziel / Arbeitsordner / Werkzeug-Cache
$Basis = Split-Path $SkriptDir -Parent
$IstDist = $false
if (-not $Ziel) {
    if (Test-Path -LiteralPath (Join-Path $SkriptDir 'index.html')) { $Ziel = Join-Path $SkriptDir 'orig'; $IstDist = $true }   # fertiges Spielpaket
    elseif (Test-Path -LiteralPath (Join-Path $Basis 'package.json')) { $Ziel = Join-Path $Basis 'public\orig' }            # Repository (tools\)
    elseif (Test-Path -LiteralPath (Join-Path $Basis 'index.html')) { $Ziel = Join-Path $Basis 'orig'; $IstDist = $true }   # älteres Layout dist\tools
    else { Abbruch 'Zielordner unbekannt.' " - Das Programm muss im entpackten Spielordner (neben index.html) liegen,`n   oder den Zielordner mit -Ziel angeben." }
} else {
    $IstDist = (Test-Path -LiteralPath (Join-Path $SkriptDir 'index.html')) -or
               (-not (Test-Path -LiteralPath (Join-Path $Basis 'package.json')) -and (Test-Path -LiteralPath (Join-Path $Basis 'index.html')))
}
$SpielDir = if (Test-Path -LiteralPath (Join-Path $SkriptDir 'index.html')) { $SkriptDir } elseif ($IstDist) { $Basis } else { $null }
$CacheDir = if (Test-Path -LiteralPath (Join-Path $Basis 'package.json')) { Join-Path $SkriptDir '.cache' }
            else { Join-Path $env:LOCALAPPDATA 'Bingo-Schatzsuche\Werkzeuge' }
$ZielVoll = [IO.Path]::GetFullPath($Ziel)
# (eine Laufwerkswurzel wie E:\ ist meist die schreibgeschützte CD - dort wird ohnehin nichts geschrieben)
$RootCmp = if ($Root -match '^[A-Za-z]:\\\.$') { '?' } else { $Root + '\' }
if (($ZielVoll + '\').StartsWith($RootCmp, [StringComparison]::OrdinalIgnoreCase)) {
    Abbruch 'Das Ziel darf nicht im Spielordner bzw. auf der CD liegen.' ' - Den Spielordner (dieses Programm) z. B. nach »Dokumente« entpacken.'
}
if (-not $Arbeitsordner) { $Arbeitsordner = Join-Path $env:TEMP 'bingo-schatzsuche-import' }
$WorkVoll = [IO.Path]::GetFullPath($Arbeitsordner)
if (($WorkVoll + '\').StartsWith($RootCmp, [StringComparison]::OrdinalIgnoreCase)) { Abbruch 'Der Arbeitsordner darf nicht im Spielordner liegen.' }
Info "Ziel:   $ZielVoll"
Info "Zwischendateien: $WorkVoll (werden am Ende gelöscht)"

# Speicherplatz: Ziel ~200 MB, Zwischendateien ~300 MB, Werkzeuge ~200 MB
$pruefOrt = $ZielVoll; while ($pruefOrt -and -not (Test-Path -LiteralPath $pruefOrt)) { $pruefOrt = Split-Path $pruefOrt -Parent }
$frei = FreierPlatz $pruefOrt
if ($frei -ge 0) {
    Info ("Freier Speicher am Ziel: {0}" -f (GroesseText $frei))
    if ($frei -lt 500MB -and -not $NurPruefen) {
        Abbruch ("Zu wenig freier Speicherplatz ({0}). Benötigt werden etwa 500 MB." -f (GroesseText $frei)) ' - Platz schaffen (z. B. Papierkorb leeren) oder den Spielordner auf ein anderes Laufwerk entpacken.'
    }
}

# ------------------------------------------------------------------ 2. Python
Schritt 'Python prüfen'
function SuchePython {
    $kands = @(@('py', '-3'), @('python'), @('python3'))
    $lokal = @(Get-ChildItem -Path (Join-Path $env:LOCALAPPDATA 'Programs\Python\Python3*\python.exe') -ErrorAction SilentlyContinue) +
             @(Get-ChildItem -Path (Join-Path $env:ProgramFiles 'Python3*\python.exe') -ErrorAction SilentlyContinue)
    foreach ($l in $lokal | Sort-Object FullName -Descending) { $kands += , @($l.FullName) }
    foreach ($k in $kands) {
        $cmd = Get-Command $k[0] -ErrorAction SilentlyContinue
        if (-not $cmd) { continue }
        $a = @($k | Select-Object -Skip 1)
        $alt = $ErrorActionPreference; $ErrorActionPreference = 'Continue'
        # (keine Anführungszeichen im Code: PowerShell 5.1 entfernt sie bei nativen Aufrufen)
        $v = & $cmd.Source @a -c 'import sys; print(sys.version_info[0], sys.version_info[1], sep=chr(46))' 2>$null
        $rc = $LASTEXITCODE
        $ErrorActionPreference = $alt
        if ($rc -eq 0 -and "$v" -match '^3\.(\d+)$' -and [int]$Matches[1] -ge 8) {
            return [pscustomobject]@{ Exe = $cmd.Source; Args = $a; Version = "$v" }
        }
    }
    return $null
}
function PfadNeuLaden {
    $env:Path = [Environment]::GetEnvironmentVariable('Path', 'Machine') + ';' + [Environment]::GetEnvironmentVariable('Path', 'User')
}
$PyInfo = SuchePython
if (-not $PyInfo -and -not $NurPruefen) {
    Info 'Python 3 ist nicht installiert. Es wird nur für die einmalige Umwandlung der Dateien gebraucht.'
    $winget = Get-Command winget -ErrorAction SilentlyContinue
    $installieren = $false
    if ($winget -and $Fenster) {
        $installieren = Meldung ("Für die Umwandlung der Originaldateien wird das kostenlose Programm »Python« benötigt. Es ist auf diesem Computer noch nicht installiert.`n`n" +
            "Soll Python jetzt automatisch installiert werden?`n(nur für Ihr Benutzerkonto, ca. 30 MB Download, 1–3 Minuten, keine Administratorrechte nötig)`n`n" +
            "»Nein« = Sie installieren Python selbst von python.org.") 'Frage'
    }
    if ($installieren) {
        Info "Installiere Python über winget ($PY_WINGET, nur für diesen Benutzer) - bitte warten, das dauert 1-3 Minuten ..."
        $rc = Starte $winget.Source @('install', '-e', '--id', $PY_WINGET, '--scope', 'user', '--silent',
                                     '--accept-package-agreements', '--accept-source-agreements', '--disable-interactivity')
        PfadNeuLaden
        $PyInfo = SuchePython
        if (-not $PyInfo) { Warnung "Die automatische Installation hat nicht geklappt (winget-Rückgabe $rc)." }
    }
    if (-not $PyInfo) {
        $tipp = (" 1. Die Python-Downloadseite öffnet sich gleich ($PY_SEITE).`n" +
                 " 2. »Download Windows installer (64-bit)« der neuesten Python-3-Version laden und starten.`n" +
                 " 3. WICHTIG: unten im Installationsfenster »Add python.exe to PATH« anhaken, dann »Install Now«.`n" +
                 " 4. Danach »Originaldateien importieren.cmd« erneut doppelklicken.")
        if ($Fenster) { try { Start-Process $PY_SEITE } catch {} }
        Abbruch 'Python 3 (ab Version 3.8) wurde nicht gefunden.' $tipp
    }
}
if ($PyInfo) {
    $Py = $PyInfo.Exe; $PyArgs = $PyInfo.Args
    Info "Python $($PyInfo.Version) gefunden ($Py)"
    function Python([string[]]$a) { return (Starte $Py ($PyArgs + $a)) }
    if ((Starte $Py ($PyArgs + @('-c', 'import PIL')) -Leise) -ne 0) {
        if ($NurPruefen) { Info 'Pillow (Bildbibliothek) fehlt noch - würde installiert.' }
        else {
            Info 'Installiere die Bildbibliothek Pillow (pip install --user pillow) ...'
            if ((Python @('-m', 'pip', 'install', '--user', '--disable-pip-version-check', 'pillow')) -ne 0 -or
                (Starte $Py ($PyArgs + @('-c', 'import PIL')) -Leise) -ne 0) {
                Abbruch 'Die Bildbibliothek Pillow konnte nicht installiert werden.' " - Internetverbindung prüfen und erneut starten.`n - Ggf. Virenschutz kurz prüfen (blockiert evtl. pip)."
            }
            Info 'Pillow installiert.'
        }
    } else { Info 'Pillow vorhanden.' }
} else {
    Info 'Python 3 fehlt - würde installiert (winget) bzw. python.org geöffnet.'
}

if ($NurPruefen) {
    Write-Progress -Id 1 -Activity 'Originaldateien importieren' -Completed
    Write-Host ''
    Write-Host 'Prüfung abgeschlossen:' -ForegroundColor Green
    Write-Host "   Quelle:     $Root"
    Write-Host ("   Videos:     {0}" -f $(if ($OhneVideo) { 'keine' } else { $Video }))
    Write-Host "   Ziel:       $ZielVoll"
    Write-Host "   Werkzeuge:  $CacheDir"
    Write-Host ("   Python:     {0}" -f $(if ($PyInfo) { "$($PyInfo.Version) ($($PyInfo.Exe))" } else { 'fehlt' }))
    exit 0
}

# ------------------------------------------------------------------ 3. Werkzeuge
Schritt 'Hilfsprogramme bereitstellen (ProjectorRays, ffmpeg)' 'beim ersten Mal 1-3 Minuten'
New-Item -ItemType Directory -Force -Path $CacheDir | Out-Null
function Lade($url, $datei) {
    Info "Lade herunter: $url"
    $tmp = "$datei.part"
    try { Invoke-WebRequest -Uri $url -OutFile $tmp -UseBasicParsing }
    catch {
        Abbruch "Download fehlgeschlagen: $url`n$($_.Exception.Message)" (" - Internetverbindung prüfen.`n" +
            " - Virenschutz/Firewall blockiert evtl. den Download - kurz prüfen.`n - Später erneut starten.")
    }
    if (-not (Test-Path -LiteralPath $tmp) -or (Get-Item -LiteralPath $tmp).Length -lt 100KB) { Abbruch "Download unvollständig: $url" ' - Erneut starten.' }
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
            Abbruch 'Prüfsumme von ProjectorRays stimmt nicht - Download aus Sicherheitsgründen verworfen.' ' - Später erneut versuchen.'
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
        Info 'ffmpeg wird einmalig geladen (ca. 150 MB) ...'
        Lade $FF_URL $zip
        $tmp = Join-Path $CacheDir 'ffmpeg-entpackt'
        if (Test-Path -LiteralPath $tmp) { Remove-Item -Recurse -Force -LiteralPath $tmp }
        Info '  Entpacke ...'
        Expand-Archive -LiteralPath $zip -DestinationPath $tmp -Force
        $exe = Get-ChildItem -LiteralPath $tmp -Recurse -Filter ffmpeg.exe | Select-Object -First 1
        if (-not $exe) { Abbruch 'ffmpeg.exe nicht im Download gefunden.' ' - Erneut starten.' }
        New-Item -ItemType Directory -Force -Path (Split-Path $FF) | Out-Null
        Move-Item -Force -LiteralPath $exe.FullName -Destination $FF
        Remove-Item -Recurse -Force -LiteralPath $tmp, $zip
    }
}
if ((Starte $FF @('-hide_banner', '-version') -Leise) -ne 0) {
    Abbruch "ffmpeg lässt sich nicht starten: $FF" " - Virenschutz prüfen (Programm evtl. in Quarantäne).`n - Ordner $(Split-Path $FF) löschen und erneut starten."
}
Info "ffmpeg: $FF"

New-Item -ItemType Directory -Force -Path $Ziel | Out-Null
$Ziel = (Resolve-Path -LiteralPath $Ziel).Path
New-Item -ItemType Directory -Force -Path $Arbeitsordner | Out-Null
$Work = (Resolve-Path -LiteralPath $Arbeitsordner).Path

# ------------------------------------------------------------------ 4. Director-Dateien zerlegen
Schritt 'Spieldateien zerlegen (ProjectorRays)' '2-5 Minuten'
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
if ($Dateien.Count -lt 50) { Abbruch "Nur $($Dateien.Count) Spieldateien gefunden - ist die Quelle vollständig?" ' - Bitte die Original-CD verwenden.' }
$i = 0; $anzahlNeu = 0; $fehler = @(); $t0 = Get-Date; $letzte = -1
foreach ($d in $Dateien) {
    $i++
    $out = Join-Path $Chunks $d.Name
    $fertig = Join-Path $out '.fertig'
    if ((Test-Path -LiteralPath $fertig) -and -not $Neu) { continue }
    if (Test-Path -LiteralPath $out) { Remove-Item -Recurse -Force -LiteralPath $out }
    New-Item -ItemType Directory -Force -Path $out | Out-Null
    $proz = [int](100 * $i / $Dateien.Count)
    $rest = ''
    if ($anzahlNeu -ge 5) {
        $sek = ((Get-Date) - $t0).TotalSeconds / $anzahlNeu * ($Dateien.Count - $i)
        $rest = ', noch ca. {0:N0} min' -f [Math]::Max(1, [Math]::Ceiling($sek / 60))
    }
    $ProgressPreference = 'Continue'
    Write-Progress -Id 2 -ParentId 1 -Activity 'Spieldateien zerlegen' -Status ("{0} von {1} ({2}%){3}" -f $i, $Dateien.Count, $proz, $rest) -PercentComplete $proz
    if ([int]($proz / 10) -ne $letzte) { $letzte = [int]($proz / 10); Info ("{0,3}%  ({1} von {2}{3})" -f $proz, $i, $Dateien.Count, $rest) }
    $rc = Starte $PR @('decompile', $d.Datei, '-o', $out, '--dump-chunks', '--dump-json') -Leise
    if ($rc -ne 0 -or -not (Get-ChildItem -LiteralPath $out -Recurse -Directory -Filter chunks)) { $fehler += $d.Name; continue }
    New-Item -ItemType File -Path $fertig | Out-Null
    $anzahlNeu++
}
Write-Progress -Id 2 -Activity 'Spieldateien zerlegen' -Completed
Info "$($Dateien.Count) Dateien ($anzahlNeu neu zerlegt, Rest war schon erledigt)"
if ($fehler) { Warnung ("Nicht zerlegbar: " + ($fehler -join ', ')) }

# ------------------------------------------------------------------ 5.-7. Grafik
$Img = Join-Path $Work 'img'
Schritt 'Bilder auslesen' '1-3 Minuten'
if ($Neu -or -not (Test-Path -LiteralPath (Join-Path $Img '.fertig'))) {
    if ((Python @((Join-Path $PyDir 'extract_bitmaps.py'), '--all', $Chunks, $Img)) -ne 0) { Abbruch 'Die Bilder konnten nicht ausgelesen werden.' ' - Erneut starten; ggf. mit der CD statt der Installation.' }
    New-Item -ItemType File -Force -Path (Join-Path $Img '.fertig') | Out-Null
} else { Info 'bereits erledigt' }

Schritt 'Szenenabläufe (Drehbücher) auslesen' 'unter 1 Minute'
if ((Python @((Join-Path $PyDir 'parse_score.py'), '--work', $Work)) -ne 0) { Abbruch 'Die Szenenabläufe konnten nicht gelesen werden.' ' - Erneut starten.' }

Schritt 'Grafiken für den Browser umwandeln (WebP)' '2-5 Minuten'
$ga = @((Join-Path $PyDir 'export_graphics.py'), '--work', $Work, '--out', $Ziel)
if ($Neu) { $ga += '--force' }
if ((Python $ga) -ne 0) { Abbruch 'Die Grafiken konnten nicht umgewandelt werden.' ' - Erneut starten.' }

# ------------------------------------------------------------------ 8. Ton / Musik / Video
Schritt 'Sprache, Effekte, Musik und Videos umwandeln' '3-8 Minuten'
$ia = @((Join-Path $PyDir 'import_original_assets.py'), '--game', $Root, '--work', $Work, '--out', $Ziel, '--ffmpeg', $FF)
if ($OhneVideo) { $ia += '--skip-video' } else { $ia += @('--video', $Video) }
if ($Neu) { $ia += '--force' }
if ((Python $ia) -ne 0) { Abbruch 'Ton, Musik oder Videos konnten nicht umgewandelt werden.' ' - CD noch eingelegt? Dann erneut starten.' }

# ------------------------------------------------------------------ 9. Untertitel (optional)
Schritt 'Untertitel (optional)'
if ($Untertitel) {
    if ((Starte $Py ($PyArgs + @('-c', 'import faster_whisper, numpy')) -Leise) -ne 0) {
        Info 'Installiere faster-whisper (pip install --user faster-whisper numpy) ...'
        if ((Python @('-m', 'pip', 'install', '--user', '--disable-pip-version-check', 'faster-whisper', 'numpy')) -ne 0) {
            Abbruch 'faster-whisper konnte nicht installiert werden.' ' - Ohne -Untertitel starten (Untertitel sind optional).'
        }
    }
    Info 'Spracherkennung läuft (lokal, kann über eine Stunde dauern; Abbruch und Fortsetzen sind möglich) ...'
    if ((Python @((Join-Path $PyDir 'transcribe_voices.py'), '--out', $Ziel, '--ffmpeg', $FF)) -ne 0) { Warnung 'Untertitel unvollständig.' }
} else {
    Info 'übersprungen (für Fortgeschrittene: mit -Untertitel erzeugen)'
}

# ------------------------------------------------------------------ Aufräumen + Zusammenfassung
if ($Behalten) { Info "Arbeitsordner bleibt erhalten: $Work" }
else {
    Remove-Item -Recurse -Force -LiteralPath $Work -ErrorAction SilentlyContinue
    if (Test-Path -LiteralPath $Work) { Warnung "Arbeitsordner konnte nicht vollständig gelöscht werden: $Work" }
}
Write-Progress -Id 1 -Activity 'Originaldateien importieren' -Completed

Write-Host ''
Write-Host '================================================================' -ForegroundColor Green
Write-Host ' Fertig!' -ForegroundColor Green
$zeilen = @(
    @('Videos', 'video', '*.mp4'), @('Musik', 'music', '*.mp3'), @('Sprache/Effekte', 'audio', '*.mp3'), @('Grafiken', 'gfx', '*.webp')
)
$zusammen = @()
foreach ($z in $zeilen) {
    $p = Join-Path $Ziel $z[1]
    $n = if (Test-Path -LiteralPath $p) { @(Get-ChildItem -LiteralPath $p -Recurse -File -Filter $z[2]).Count } else { 0 }
    Write-Host ('   {0,-16} {1,6} Dateien  {2,10}' -f $z[0], $n, (GroesseText (OrdnerGroesse $p)))
    $zusammen += ('{0}: {1}' -f $z[0], $n)
}
$tr = Join-Path $Ziel 'audio\transcripts.json'
Write-Host ('   {0,-16} {1}' -f 'Untertitel', $(if (Test-Path -LiteralPath $tr) { 'vorhanden' } else { 'keine' }))
Write-Host ('   {0,-16} {1,26}' -f 'Gesamt', (GroesseText (OrdnerGroesse $Ziel)))
$min = ((Get-Date) - $Start).TotalMinutes
Write-Host ("   Ziel: $Ziel  (Dauer {0:N0} min)" -f $min)
Write-Host ''
$Starter = if ($SpielDir) { Join-Path $SpielDir 'Spiel starten.cmd' } else { $null }
if ($IstDist) {
    Write-Host ' Spiel starten: "Spiel starten.cmd" im Spielordner doppelklicken.'
} else {
    Write-Host ' Spiel starten: im Projektordner "npm run dev" ausführen'
    Write-Host ' (oder nach "npm run build" dist\Spiel starten.cmd).'
}
Write-Host ' Erinnerung: Die Dateien im Ordner "orig" nur privat nutzen - nicht weitergeben!'
Write-Host '================================================================' -ForegroundColor Green

if ($Fenster) {
    $m = "Die Originaldateien wurden erfolgreich geladen!`n`n" + ($zusammen -join "`n") + "`n`n" +
         "Erinnerung: Die Dateien im Ordner »orig« sind nur für den privaten Gebrauch – bitte niemals hochladen oder weitergeben.`n`n"
    if ($Starter -and (Test-Path -LiteralPath $Starter)) {
        if (Meldung ($m + 'Möchten Sie das Spiel jetzt starten?') 'Frage') {
            Start-Process -FilePath $Starter -WorkingDirectory $SpielDir
        }
    } else { Meldung $m 'Info' | Out-Null }
}
exit 0
