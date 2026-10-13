# Bingo auf Schatzsuche - minimaler lokaler Webserver (nur Windows-Bordmittel, keine Installation noetig)
# Startet einen HTTP-Server fuer diesen Ordner und oeffnet das Spiel im Standardbrowser.
# Parameter: -Port 8080  -Lan (auch fuer andere Geraete im Netzwerk erreichbar, braucht ggf. Admin-Rechte)
param([int]$Port = 8080, [switch]$Lan)

$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$types = @{
  '.html'='text/html; charset=utf-8'; '.js'='text/javascript; charset=utf-8'; '.css'='text/css; charset=utf-8';
  '.json'='application/json; charset=utf-8'; '.svg'='image/svg+xml'; '.png'='image/png'; '.webp'='image/webp';
  '.jpg'='image/jpeg'; '.mp3'='audio/mpeg'; '.m4a'='audio/mp4'; '.wav'='audio/wav'; '.mp4'='video/mp4';
  '.webm'='video/webm'; '.ico'='image/x-icon'; '.txt'='text/plain; charset=utf-8'; '.woff2'='font/woff2'
}

$listener = New-Object System.Net.HttpListener
$prefixHost = if ($Lan) { '+' } else { 'localhost' }
for ($p = $Port; $p -lt $Port + 20; $p++) {
  $listener.Prefixes.Clear()
  $listener.Prefixes.Add("http://${prefixHost}:$p/")
  try { $listener.Start(); $Port = $p; break } catch { if ($Lan) { Write-Host "LAN-Modus braucht evtl. Administratorrechte." } }
}
if (-not $listener.IsListening) { Write-Host 'Kein freier Port gefunden.'; Read-Host 'Enter zum Beenden'; exit 1 }

$url = "http://localhost:$Port/"
Write-Host ''
Write-Host "  Bingo auf Schatzsuche laeuft unter $url"
if ($Lan) {
  $ips = (Get-NetIPAddress -AddressFamily IPv4 -ErrorAction SilentlyContinue | Where-Object { $_.IPAddress -notlike '127.*' -and $_.IPAddress -notlike '169.*' }).IPAddress
  foreach ($ip in $ips) { Write-Host "  Im Netzwerk: http://${ip}:$Port/" }
}
Write-Host '  Dieses Fenster offen lassen. Beenden: Fenster schliessen oder Strg+C.'
Write-Host ''
Start-Process $url

while ($listener.IsListening) {
  try { $ctx = $listener.GetContext() } catch { break }
  $res = $ctx.Response
  try {
    $rel = [Uri]::UnescapeDataString($ctx.Request.Url.AbsolutePath).TrimStart('/')
    if ($rel -eq '' -or $rel.EndsWith('/')) { $rel += 'index.html' }
    $path = [IO.Path]::GetFullPath((Join-Path $root $rel))
    if (-not $path.StartsWith($root, [StringComparison]::OrdinalIgnoreCase) -or -not (Test-Path $path -PathType Leaf)) {
      $res.StatusCode = 404
      $b = [Text.Encoding]::UTF8.GetBytes('Nicht gefunden')
      $res.OutputStream.Write($b, 0, $b.Length)
    } else {
      $ext = [IO.Path]::GetExtension($path).ToLower()
      $res.ContentType = if ($types.ContainsKey($ext)) { $types[$ext] } else { 'application/octet-stream' }
      $res.Headers['Accept-Ranges'] = 'bytes'
      $fs = [IO.File]::OpenRead($path)
      try {
        $len = $fs.Length; $start = 0; $end = $len - 1
        $range = $ctx.Request.Headers['Range']
        if ($range -match 'bytes=(\d*)-(\d*)') {
          if ($matches[1]) { $start = [int64]$matches[1] }
          if ($matches[2]) { $end = [Math]::Min([int64]$matches[2], $len - 1) }
          $res.StatusCode = 206
          $res.Headers['Content-Range'] = "bytes $start-$end/$len"
        }
        $res.ContentLength64 = $end - $start + 1
        $fs.Seek($start, 'Begin') | Out-Null
        $buf = New-Object byte[] 65536; $left = $end - $start + 1
        while ($left -gt 0) {
          $n = $fs.Read($buf, 0, [Math]::Min($buf.Length, $left)); if ($n -le 0) { break }
          $res.OutputStream.Write($buf, 0, $n); $left -= $n
        }
      } finally { $fs.Close() }
    }
  } catch { } finally { try { $res.Close() } catch { } }
}
