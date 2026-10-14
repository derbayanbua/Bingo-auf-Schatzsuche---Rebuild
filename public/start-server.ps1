# Bongo auf Schatzsuche - minimaler lokaler Webserver (nur Windows-Bordmittel, keine Installation noetig)
# Startet einen HTTP-Server fuer diesen Ordner und oeffnet das Spiel im Standardbrowser.
#   -Port 8080   Startport (sucht bei Bedarf den naechsten freien)
#   -Lan         auch fuer andere Geraete im Netzwerk (Handy, Tablet) erreichbar
# Hinweis: Der Server nutzt einen TCP-Socket und braucht deshalb KEINE Administratorrechte und keine URL-Reservierung.
# Im LAN-Modus fragt die Windows-Firewall beim ersten Start evtl. nach - dort "Zugriff zulassen" (privates Netzwerk) waehlen.
param([int]$Port = 8080, [switch]$Lan)

$ErrorActionPreference = 'Stop'
$root = [IO.Path]::GetFullPath((Split-Path -Parent $MyInvocation.MyCommand.Path))
# Das Spiel (index.html) muss im selben Ordner liegen. Wurde das Skript aus dem Quellcode-Ordner "public"
# gestartet, wird automatisch der fertige Build "dist" daneben verwendet.
if (-not (Test-Path (Join-Path $root 'index.html'))) {
  $dist = [IO.Path]::GetFullPath((Join-Path $root '..\dist'))
  if (Test-Path (Join-Path $dist 'index.html')) {
    Write-Host "  Hinweis: Hier liegt kein fertiges Spiel - verwende den Build-Ordner $dist"
    $root = $dist
  } else {
    Write-Host ''
    Write-Host '  Fehler: In diesem Ordner liegt kein fertiges Spiel (index.html fehlt).'
    Write-Host '  Bitte "Spiel starten.cmd" im entpackten Spiel-Ordner (Release-ZIP) bzw. im Ordner "dist" starten.'
    Write-Host '  Entwickler: zuerst "npm run build" ausfuehren.'
    Read-Host 'Enter zum Beenden'
    exit 1
  }
}
$types = @{
  '.html'='text/html; charset=utf-8'; '.js'='text/javascript; charset=utf-8'; '.css'='text/css; charset=utf-8';
  '.json'='application/json; charset=utf-8'; '.svg'='image/svg+xml'; '.png'='image/png'; '.webp'='image/webp';
  '.jpg'='image/jpeg'; '.mp3'='audio/mpeg'; '.m4a'='audio/mp4'; '.wav'='audio/wav'; '.mp4'='video/mp4';
  '.webm'='video/webm'; '.ico'='image/x-icon'; '.txt'='text/plain; charset=utf-8'; '.woff2'='font/woff2'
}

$bind = if ($Lan) { [Net.IPAddress]::Any } else { [Net.IPAddress]::Loopback }
$listener = $null
for ($p = $Port; $p -lt $Port + 20; $p++) {
  try {
    $l = New-Object Net.Sockets.TcpListener($bind, $p)
    $l.Start()
    $listener = $l; $Port = $p; break
  } catch { }
}
if (-not $listener) { Write-Host 'Kein freier Port gefunden.'; Read-Host 'Enter zum Beenden'; exit 1 }

# Firewall-Regel (nur wenn als Administrator gestartet und LAN gewuenscht; sonst fragt Windows selbst nach)
if ($Lan) {
  $isAdmin = ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
  if ($isAdmin) {
    try {
      $name = "Bongo auf Schatzsuche ($Port)"
      if (-not (Get-NetFirewallRule -DisplayName $name -ErrorAction SilentlyContinue)) {
        New-NetFirewallRule -DisplayName $name -Direction Inbound -Protocol TCP -LocalPort $Port -Action Allow -Profile Private | Out-Null
        Write-Host "  Firewall-Regel fuer Port $Port (privates Netzwerk) angelegt."
      }
    } catch { Write-Host '  Firewall-Regel konnte nicht angelegt werden - ggf. in der Windows-Firewall freigeben.' }
  }
}

$url = "http://localhost:$Port/"
Write-Host ''
Write-Host "  Bongo auf Schatzsuche laeuft unter $url"
if ($Lan) {
  $ips = @()
  try { $ips = (Get-NetIPAddress -AddressFamily IPv4 -ErrorAction Stop | Where-Object { $_.IPAddress -notlike '127.*' -and $_.IPAddress -notlike '169.254.*' }).IPAddress } catch {
    $ips = [Net.Dns]::GetHostAddresses([Net.Dns]::GetHostName()) | Where-Object { $_.AddressFamily -eq 'InterNetwork' -and -not $_.ToString().StartsWith('127.') } | ForEach-Object { $_.ToString() }
  }
  foreach ($ip in $ips) { Write-Host "  Im Netzwerk (Handy/Tablet): http://${ip}:$Port/" }
}
Write-Host '  Dieses Fenster offen lassen. Beenden: Fenster schliessen oder Strg+C.'
Write-Host ''
Start-Process $url

function Send-Head($stream, [int]$code, [string]$status, [hashtable]$headers) {
  $sb = New-Object Text.StringBuilder
  [void]$sb.Append("HTTP/1.1 $code $status`r`n")
  foreach ($k in $headers.Keys) { [void]$sb.Append("${k}: $($headers[$k])`r`n") }
  [void]$sb.Append("Connection: close`r`n`r`n")
  $b = [Text.Encoding]::ASCII.GetBytes($sb.ToString())
  $stream.Write($b, 0, $b.Length)
}

function Handle-Client($client) {
  $client.ReceiveTimeout = 10000
  $client.SendTimeout = 30000
  $stream = $client.GetStream()
  try {
    # read request head
    $buf = New-Object byte[] 16384; $len = 0
    while ($len -lt $buf.Length) {
      $n = $stream.Read($buf, $len, $buf.Length - $len)
      if ($n -le 0) { break }
      $len += $n
      $head = [Text.Encoding]::ASCII.GetString($buf, 0, $len)
      if ($head.Contains("`r`n`r`n")) { break }
    }
    if ($len -eq 0) { return }
    $lines = [Text.Encoding]::ASCII.GetString($buf, 0, $len).Split("`n") | ForEach-Object { $_.TrimEnd("`r") }
    $parts = $lines[0].Split(' ')
    if ($parts.Count -lt 2) { return }
    $method = $parts[0]; $target = $parts[1]
    $range = $null
    foreach ($ln in $lines) { if ($ln -match '^(?i)range:\s*(.+)$') { $range = $matches[1] } }

    if ($method -ne 'GET' -and $method -ne 'HEAD') { Send-Head $stream 405 'Method Not Allowed' @{ 'Content-Length' = '0' }; return }
    $rel = [Uri]::UnescapeDataString(($target.Split('?')[0])).TrimStart('/')
    if ($rel -eq '' -or $rel.EndsWith('/')) { $rel += 'index.html' }
    $path = [IO.Path]::GetFullPath((Join-Path $root $rel))
    if (-not $path.StartsWith($root, [StringComparison]::OrdinalIgnoreCase) -or -not (Test-Path -LiteralPath $path -PathType Leaf)) {
      $body = [Text.Encoding]::UTF8.GetBytes('Nicht gefunden')
      Send-Head $stream 404 'Not Found' @{ 'Content-Type' = 'text/plain; charset=utf-8'; 'Content-Length' = "$($body.Length)" }
      if ($method -eq 'GET') { $stream.Write($body, 0, $body.Length) }
      return
    }
    $ext = [IO.Path]::GetExtension($path).ToLower()
    $ctype = if ($types.ContainsKey($ext)) { $types[$ext] } else { 'application/octet-stream' }
    $fs = [IO.File]::Open($path, 'Open', 'Read', 'ReadWrite')
    try {
      $total = $fs.Length; $start = [int64]0; $end = $total - 1; $code = 200; $status = 'OK'
      $h = @{ 'Content-Type' = $ctype; 'Accept-Ranges' = 'bytes'; 'Cache-Control' = 'no-cache' }
      if ($range -and $range -match 'bytes=(\d*)-(\d*)') {
        if ($matches[1]) { $start = [int64]$matches[1]; if ($matches[2]) { $end = [Math]::Min([int64]$matches[2], $total - 1) } }
        elseif ($matches[2]) { $start = [Math]::Max([int64]0, $total - [int64]$matches[2]) }
        if ($start -gt $end -or $start -ge $total) {
          Send-Head $stream 416 'Range Not Satisfiable' @{ 'Content-Range' = "bytes */$total"; 'Content-Length' = '0' }; return
        }
        $code = 206; $status = 'Partial Content'; $h['Content-Range'] = "bytes $start-$end/$total"
      }
      $h['Content-Length'] = "$($end - $start + 1)"
      Send-Head $stream $code $status $h
      if ($method -eq 'GET') {
        [void]$fs.Seek($start, 'Begin')
        $chunk = New-Object byte[] 65536; $left = $end - $start + 1
        while ($left -gt 0) {
          $n = $fs.Read($chunk, 0, [int][Math]::Min($chunk.Length, $left)); if ($n -le 0) { break }
          $stream.Write($chunk, 0, $n); $left -= $n
        }
      }
    } finally { $fs.Close() }
  } catch { } finally { try { $stream.Close() } catch { }; try { $client.Close() } catch { } }
}

try {
  while ($true) {
    $client = $listener.AcceptTcpClient()
    Handle-Client $client
  }
} finally { $listener.Stop() }
