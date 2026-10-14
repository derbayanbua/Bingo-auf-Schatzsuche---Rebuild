# Bingo auf Schatzsuche – Web-Neuentwicklung

Eigenständige Neuprogrammierung des Director-7-Spiels „Bingo auf Schatzsuche“ (Outline Multimedia / more software, 2001)
als statisches Browserspiel (HTML5 + TypeScript + SVG, kein Emulator, keine Originalgrafiken/-sounds).

Originale (nur lesen, niemals ändern): `D:\Workspace_D\bingo\installed\Schatzsuche` (installiert), `D:\Workspace_D\bingo\bingo` (CD, zusätzlich `Video\*.smk`).

## Befehle

```bash
npm install          # einmalig
npm run dev          # Entwicklungsserver (http://localhost:5173, --host = im LAN erreichbar)
npm test             # Vitest: Brettlogik, Pfadsuche, Spielstände
npm run build        # Typecheck + Produktionsbuild nach dist/
npm run preview      # gebautes dist/ lokal ausliefern
```

Die Vorschau im Claude-Desktop-Browser startet über `D:\Workspace_D\.claude\launch.json` (Name `schatzsuche-dev`).

## Architektur

```
src/
  main.ts              Einstieg: registriert Szenen, startet App
  app.ts               Controller: Menüs, Spielbildschirm, HUD, Zugablauf, Hand-Gegenstand, Speichern
  game/
    types.ts           Datentypen (CHn-Info, Brettpunkte, GameState)
    data.ts            Bretter (aus data/boards.json) + Startzustand = Original Data/Default.cxt
    logic.ts           Regeln 1:1 aus Lingo portiert (Pfadsuche, Würfel, NPC-Autopilot, Rocco, Witzfelder)
    exchange.ts        Tauschregeln (Exchange.dxr)
    rng.ts             deterministischer PRNG (Zustand im Spielstand)
  save/save.ts         Spielstandformat, Validierung, Migration, localStorage, Download/Upload
  scenes/
    engine.ts          generische Szenen-Engine (Two-State, Blocker, Hotspot-AS/SP/GS, Inventar im Adventurescreen …)
    generic.ts         erzeugt alle 91 AS/GS-Szenen aus data/scenes.json + prozedurale Hintergründe
    handwritten.ts     handportierte szenenspezifische Lingo-Logik (Patches auf generische Szenen)
    meta.ts            Szenentitel, Themen, Kapiteltexte
  ui/                  boardView (SVG-Brett), exchangeView, art (eigene Vektorgrafik), audio (WebAudio-Synth), dom
  data/                generierte JSON-Daten (nicht von Hand ändern, siehe Werkzeuge)
tests/                 Vitest
```

Grafik: SVG (Brett 800×448 wie Original, Szenen 800×448). Keine Laufzeitabhängigkeiten, nur Dev-Dependencies (vite, typescript, vitest, jsdom).
`vite.config.ts` nutzt `base: './'` → Build läuft unter beliebigem Unterverzeichnis.

## Reverse Engineering – Werkzeuge & Daten (`D:\Workspace_D\bingo\`)

| Werkzeug | Zweck |
|---|---|
| `tools/projectorrays.exe` (v0.2.0) | Lingo-Dekompilierung + Chunk-Dumps. Pro Datei aufrufen: `projectorrays.exe decompile <file> -o <dir> --dump-scripts` bzw. `--dump-chunks --dump-json` |
| `tools/extract_text.py` | Textfelder (STXT) → `analysis/text/<Dir>_<Movie>/*.txt` |
| `tools/extract_bitmaps.py` | Bitmaps → `analysis/img/…` (nur Referenz, wird **nicht** ausgeliefert) |
| `tools/parse_score.py` | Director-Score (VWSC) → `analysis/score/*.json` (Sprites, Positionen, Behaviors + Parameter). Mit `python -P` starten (Pillow im User-Site) |
| `tools/build_boards.py` | `analysis/text/Data_Default` → `src/data/boards.json` (Brettgraph + Szenen-Startzustände) |
| `tools/gen_scenes.py` | `analysis/score` → `src/data/scenes.json` (generische Szenenobjekte) |
| `tools/scene_exits.py`, `tools/score_summary.py` | Hilfen (Szenenausgänge, kompakte Score-Übersicht) |

Analyseberichte: `analysis/RULES_exchange_inventory.md` (Tauschen, Inventar, Speichern, Einstellungen, Tipps, Ende),
`analysis/STORY_scenes.md` (alle Szenen, Questgraph, Minispiele, generische Behaviors). Dekompilierte Skripte: `analysis/dec/`.
REA-MCP: für Director-Dateien nicht geeignet (kein Director-Format-Support); ProjectorRays ist das passende Werkzeug.
Hinweis: Bash (Git-Bash) konnte in dieser Umgebung nicht forken → PowerShell verwenden. Dateien **nicht** mit `Get-Content -Raw | Set-Content` bearbeiten (zerstört UTF-8) – Edit-Tool oder Python nutzen.

## Rekonstruierte Spiellogik (belegt)

* **Dateiformat**: alle `.dxr/.cxt` sind ungeschützte RIFX/„XFIR“ Director-7-Filme (Bühne 800×600, Szenen 800×448 ab y=45, Interfaceleiste unten).
* **Spielstand des Originals** = Cast „Active“ (Kopie von `Data/Default.cxt`): Textfelder `CHn-Info`, `SPxxx` (Bretter), `ASxxx-yy`/`GSxxx-yy` (Szenenzustand), `currentCharacter`, `playerCharacter`, `cubePoints`, `gameData`.
* **Brett**: Zeile `nr,x,y,oben,rechts,unten,links,boden,zustand,ziel`. Zustand `___`/`JOK`/`BLK`/`CHn`; Ziel = AS/GS-Szene. 37 Felder-Tabellen (SP007/017/036/037 sind 1-Punkt-Stummel). Zwei Inseln ohne Brettverbindung (SP001–019, SP031–048).
* **Würfel**: `random(2,12)` (Anzeige: Würfel1 = 1 bzw. 6, Würfel2 = Rest). Ziele = alle Punkte mit 1..N Schritten (keine direkte Umkehr, besetzte/BLK gesperrt) inkl. Startpunkt. Erneut auf Becher = Aussetzen.
* **Bewegung**: `searchTrack` = Tiefensuche (Richtungsreihenfolge oben, rechts, unten, links). Witzfelder auf dem Weg: Spieler +1 Witz, NPC Laune +40, Rocco nichts; Feld wird wieder blau. Spieler auf AS/GS-Ziel → Szene betreten.
* **Zugreihenfolge**: Spieler (CH1 Bingo oder CH2 Puck) → CH3 … CH9 → Spieler. Bingo/Puck jederzeit umschaltbar (Würfelwert bleibt).
* **NPCs** CH3–CH8 (`searchRandomTargets`, 2–6 Schritte, bevorzugt rechts→geradeaus→links→zurück; Umkehr kostet 5 Laune). CH4 = Alfred, CH7 = Arnold (belegt); CH3/5/6/8 vermutlich Tim/Ben/Magnus/Reeling **[Prüfung erforderlich]**.
* **Rocco (CH9)**: Laune 1 + leere Tasche → jagt Bingo/Puck (Suche ≤6 Schritte, zieht 1–5), stiehlt bei Kontakt einen zufälligen Gegenstand, verkauft ihn an eine NPC mit freiem Platz. Quirks des Originals werden bewusst mitportiert (siehe Kommentare `original:` in `logic.ts`).
* **Tauschen** (Exchange.dxr): nur mit direkt benachbarter NPC; Laune 1–10/11–20/21–30 → Kauf für 20/10/5 Münzen, 31–60 → Tausch 1:1, 61–90 → Geschenk; ein Geschäft pro Besuch.
* **Witzkarten**: Witz-Stapel → Karte in die Hand → auf blaues Feld legen = Witzfeld. Witzomat (AS006-02/AS048-02) gibt Karten; gesperrt ab 5 Witzen der aktuellen Figur (Original-Quirk `getJokes(#CH1)+getJokes(#CH2)` liest zweimal die aktuelle Figur).
* **Szenen**: generische Behaviors mit Parametern aus dem Score (siehe `analysis/STORY_scenes.md` §1). Zustandsschlüssel `OHn` (state1/state2/blocked), `HSn` (activ/passiv), `OS<sprite>` (activ/passiv/wait/locked), `BOX0..8`, `OS101+` (benötigte Gegenstände in Spielen).
* **Kapitel**: 1 Heimatinsel → 2 Schiff (AS020-xx, ohne Brett, Inventare werden geleert) → 3 Schatzinsel → Ende AS050-02 („Heimfahrt“) → Abspann AS060-01.

## Umsetzungsstand

Fertig (Meilenstein 1):
* Hauptmenü, Kapitel-/Storykarten, Anleitung, Einstellungen (Effektlautstärke, Turbo-Sprung).
* Komplettes Brettspiel aller 33 Bretter mit Original-Graphen, Würfeln, Zielhervorhebung, Sprunganimation, Brett-Browsing (Pfeile/Pfeiltasten), NPC-Autopilot, Rocco, Witzfelder, Witzkarten legen.
* Tauschen mit NPCs (alle Launen-Modi).
* Alle 91 Szenen navigierbar über generische Objekte (Türen/Fenster, Schlüssel-Blocker, Ausgänge, Gegenstände inkl. versteckter, Brett-Ausgänge, Spiel-Eingänge, benötigte Gegenstände).
  Handportiert: AS001-02 (Fenster schließt sich), Witzomat AS006/AS048.
* Spielstand: Autosave (localStorage), Download `bingo-schatzsuche-spielstand.json`, Upload mit Validierung/Bestätigung, Versionsfeld + Migration.
* Responsive: Desktop, Smartphone hoch (scrollbares großes Brett, zweizeiliges HUD), Smartphone quer (HUD als Seitenleiste). Maus, Touch, Tastatur.
* Gegenstandsmodell wie im Original (Sprite 110, `app.ts` hand/`HandFrom`): Aufnehmen legt in die Hand (folgt dem Zeiger, Touch: über dem Finger + HUD-Chip),
  Ablegen per Drag&Drop oder Tippen-Tippen; nicht angenommen → fliegt zur Quelle zurück. Rücklegen auf den eigenen (unsichtbaren) Platz,
  Taschenplätze (belegt → zurück), Geben an Bingo/Puck/NPCs (nicht Münzen/Witzkarten), Kisten-Ansicht (Box + 8 Plätze, Originalgrafik),
  Spiel-Voraussetzungen (`prefSlot`), Szenen-API `putInHand/returnHand/refresh` (siehe `src/orig/README.md`). Abweichung: Witzkarte aus dem
  Witzomaten geht nicht verloren, wenn sie woanders abgelegt wird (landet auf dem Witzstapel).

Fertig (Meilenstein 2, mit Originaldaten in `public/orig`):
* Alle Kapitel portiert (`src/orig/scenes/*`): Kapitel 1 (Haus, Villa, Strand, Kneipe, Leuchtturm, Wrack), Kapitel 2 (Schiff),
  Kapitel 3 (Schatzinsel bis Schatzhalle), Ende AS050-xx, Abspann AS060-01 → danach automatisch Hauptmenü (`scene.toMainMenu()`).
* Kapitelwechsel zentral in `app.startChapter(n)`: Kapitelkarte, CH1+CH2 → AS020-01 bzw. AS030-01, Taschen leer (Münzen/Witze bleiben) –
  wie `Chapter\Chapter-2/3` (Taster.mouseUp); Szenen-Ports rufen nur `startChapter(n)` auf.
* Generischer Klick auf ein Engine-Objekt feuert auf Nicht-Frame-1 (Spiel-Frames) nicht mehr, wenn der Port selbst einen
  `mouseUp`-Handler auf dem Kanal registriert hat (kein Doppel-Handling; `scene.off`-Workarounds entfernt).
* Gesamttest 10/2026 (Produktionsbuild, synthetische Events): Neues Spiel → Intro → Kapitel 1 komplett → Kapitel 2 → Kapitel 3 →
  Abspann → Hauptmenü. Per UI gespielt: GS001-01, GS005-01/02/03/04/05, GS008-01, GS009-01/02, GS016-01, GS020-01/02/05/06,
  GS032-01/02, GS042-01, GS044-01/02, GS050-01/02 und alle Quest-Aktionen. Brett (Würfeln, NPC-Züge, Rocco stiehlt/verkauft,
  Tauschen in allen Launen-Modi, Witzkarten, Hindernisse, Brett-Browsing in alle 4 Richtungen, Bingo/Puck-Wechsel),
  Gegenstände (Drag&Drop, Tippen-Tippen, Zurücklegen, Geben, Kisten), Spielstand (Download, Löschen, Import, Weiterspielen,
  ungültige Datei abgelehnt), Fallback ohne `public/orig` (Menü/Brett/Szenen), Smartphone hoch/quer.
  Nicht per UI gewonnen: GS005-06 (Tauchen) und GS020-04 (Segeln; Autopilot schaffte Teile von Screen 1) – Fortsetzung über
  Spielstand bzw. `startChapter(3)` (gleicher Codepfad wie nach dem Sieg) geprüft.

Offen / nächste Schritte:
1. Ohne Originaldaten (Vektoransicht) fehlen die Szenen-Ports: Quest-Logik/Kapitelwechsel nur generisch, Minispiele sind Platzhalter
   (Kapitel 2/3 ohne Originale nicht erreichbar).
2. Tipps (5 Münzen; eigene Texte), Story-„Videos“ ohne Originale durch eigene Bildfolgen ersetzen, eigene Musik/Sprache.
3. Ins Spielfeld verschobene Statusleisten-Knöpfe (Taster 109, Pfeiltasten, Lexikon …) skalieren mit der Szene: auf Smartphones
   klein (~30 px); GS042-01-Pfeilfeld liegt über der linken unteren Uferecke (unkritisch).

Bekannte Abweichungen / Fehler:
* Mit Originaldaten: `[Prüfung erforderlich]`-Stellen in den Ports (Kommentare) sind Best-Guess-Rekonstruktionen.
* GS005-04: Streichholz wird per Doppelklick/-tippen genommen und bis zum nächsten Druck gehalten (Original: rechte Maustaste).
* Gegenstände in Vorbereitungsplätzen (z. B. OI040 in GS005-06, OI065 in GS042-01) bleiben nach dem Spiel dort liegen
  [Prüfung erforderlich: Verhalten des Originals].
* Ohne Originalgrafik (Vektoransicht) nimmt ein Klick auf die Kiste den ersten Gegenstand heraus bzw. legt den gehaltenen in den ersten freien Platz.
* Figurennamen CH3/5/6/8 unbekannt.

## Original-Assets (optional, nur private Nutzung)

Endnutzer-Weg: Release-ZIP (`tools/make-release-zip.ps1`, `.github/workflows/release.yml` bei Tag `v*`) → `Originaldateien importieren.cmd`
(Importer aus `tools/`, per Vite-Plugin neben `index.html` nach `dist/` kopiert; Pages-Build mit `BINGO_OHNE_IMPORTER=1`). Im `.ps1` keine
typografischen Anführungszeichen „“ verwenden (PowerShell wertet sie als `"`) – stattdessen »«.
Der Besitzer des Originals kann dessen Grafiken lokal einspielen. Sie liegen in `public/orig/` (gitignored, **nicht weitergeben/veröffentlichen**); ohne den Ordner läuft das Spiel unverändert mit eigener Vektorgrafik.

* Grafik-Export: `python -P D:\Workspace_D\bingo\tools\export_graphics.py [--force] [Filter]` (benötigt `analysis/img` + `analysis/score`) →
  `public/orig/gfx/<Dir>_<Movie>/<Member-Nr>.webp` (Transparenz aus Ink gebacken: matte = Weiß-Flutfüllung vom Rand, backgroundTransparent = alles Weiß),
  `gfx/index.json` (`{dir:{member:[w,h,regX,regY,name]}}`), `gfx/score/<Dir>_<Movie>.json` (Laufzeit-Score: libs, labels, Frames mit Sprites `[ch,castLib,member,left,top,w,h,ink,blend,behaviors,name]`, Behavior-Parameter als JSON). ~50 MB.
* Laufzeit: `src/orig/gfx.ts` (Index, `hasOriginalGfx()`, Item-Icons, Cursor), `src/orig/stage.ts` (Director-artige Sprite-Bühne: `loadMovie`, `Movie.member/frame/sequence`, `Stage.sprite(ch)`, Alpha-Hit-Test, `on(ch,'mouseUp',fn)`, `playSequence`, `onTick`),
  `src/orig/sceneView.ts` (Original-Szenenansicht über der generischen Engine; szenenspezifische Ports per `registerOrigScene(id, scene => …)`). `app.ts` nutzt sie automatisch, wenn `public/orig/gfx/index.json` existiert.
* Audio/Video/Frames: `sound.ts` (Kanäle), `voice.ts` (talk + Mund + Untertitel aus `audio/transcripts.json`), `media.ts` (`playSmacker`),
  `movieAudio.ts` (Music/Ambient Controller), `score.ts` (Frame-Wiedergabe), `screens.ts` (Kapitelkarten, Intro, Hauptmenü-Stimme, `startChapter`).
  API für Szenen-Ports: **`src/orig/README.md`**; Ports liegen in `src/orig/scenes/*.ts` (automatisch registriert).

## Spielstandformat (Version 1)

```json
{ "format": "bingo-schatzsuche-save", "version": 1, "savedAt": "ISO-Datum",
  "game": { "playerCharacter": "Bingo|Puck", "currentCharacter": "CH1", "chars": { "CH1": { "screen", "position", "direction", "mode",
            "referenceCharacter", "targetPosition", "inventory": ["OI000",…], "coins", "jokes", "mood" }, … "CH9" },
            "boardState": { "SP001": ["___","JOK","BLK",…] }, "sceneState": { "AS001-01": { "OH1": "state1" } },
            "cubePoints": 0, "rng": 123, "round": 0, "lastBoardPoint": {} },
  "session": { "view": "board", "settings": { "voiceVolume": 150, "effectVolume": 150, "musicVolume": 150, "turboJump": false } } }
```
Validierung in `save.ts` (`parseSave`): Format/Version, Wertebereiche, Regex für IDs, Größenlimits; neue Versionen in `migrate()` ergänzen.
localStorage-Schlüssel: `bingo-schatzsuche.autosave.v1`.

## Hosting

* **Lokal / NAS**: `npm run build`, dann `dist/` mit beliebigem Webserver ausliefern, z. B. `python -m http.server 8080 --directory dist`
  (andere Geräte: `http://<IP-des-PCs>:8080/`). Oder `npm run preview` bzw. `npm run dev` (beide mit `--host`).
* **Webhosting (Apache/Nginx)**: Inhalt von `dist/` in ein beliebiges (Unter-)Verzeichnis kopieren. Keine Server-Logik, keine Datenbank, kein Node nötig.
  Getestet: Auslieferung unter `/spiele/schatzsuche/` per statischem Server.
