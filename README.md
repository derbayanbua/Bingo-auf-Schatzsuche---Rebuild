# Bingo auf Schatzsuche – Rebuild (Development Build)

Ein **Spaßprojekt**, um ein altes Kinderspiel wieder zum Leben zu erwecken:
eine Neuprogrammierung des Brett- und Abenteuerspiels **„Bingo auf Schatzsuche“** (2001) für moderne Browser –
auf Windows, macOS, Android und iOS, ohne Shockwave, Flash oder Emulator.

> **Status: Development Build.** Das Spiel ist in Arbeit. Es kann Fehler enthalten, Spielstände können zwischen Versionen ungültig werden.

▶ **Im Browser spielen:** über die GitHub-Pages-Seite dieses Repositories (Link oben rechts unter „About“ / „Deployments“).
Öffentliche Version mit neu gezeichneten Ersatzgrafiken, ohne Originalmedien – siehe unten.

---

## Was ist das?

Die Spielregeln, die 33 Spielbretter, die Wege- und Würfellogik, die Figuren-Steuerung (inklusive Pirat Rocco, der Gegenstände klaut),
das Tauschen mit Launen-System und die Abläufe der Szenen und Minispiele wurden aus den Dateien des Originals
**rekonstruiert und in TypeScript neu geschrieben**. Es wird **kein** Originalcode ausgeführt.

* Brettspiel mit zwei Würfeln, Witzfeldern, Schranken, Tauschen und Rocco
* Abenteuer-Szenen und Minispiele der drei Kapitel
* Automatisches Speichern im Browser, **Spielstand herunterladen / laden** (JSON, geräteübergreifend)
* Maus, Tastatur und Touch; Hoch- und Querformat

## Originalmedien (nicht enthalten)

Grafiken, Filme, Musik und Sprachaufnahmen des Originals sind urheberrechtlich geschützt und **nicht** in diesem Repository.
Wer eine eigene Kopie des Originalspiels besitzt, kann sie für den **privaten Gebrauch** lokal importieren:

```bash
python -P tools/import_original_assets.py   # Videos, Musik, Stimmen  -> public/orig/
python -P tools/export_graphics.py          # Grafiken                -> public/orig/gfx/
```

(Die Werkzeuge liegen im übergeordneten Arbeitsordner und benötigen ProjectorRays + ffmpeg; Details in `CLAUDE.md`.)
Ohne diese Dateien läuft das Spiel mit eigenen Vektorgrafiken und synthetischen Klängen.

## Starten

**Fertigen Build spielen (Windows, ohne Installation):** `dist/Spiel starten.cmd` doppelklicken –
startet einen kleinen lokalen Webserver (nur Windows-PowerShell) und öffnet den Browser.
Mit `"Spiel starten.cmd" -Lan` ist das Spiel auch für andere Geräte im (W)LAN erreichbar.

Ein direktes Öffnen der `index.html` per Doppelklick (`file://`) funktioniert nicht, weil Browser dort das Nachladen der Spieldaten blockieren.

**Entwickeln:**

```bash
npm install
npm run dev      # http://localhost:5173  (oder "Entwicklung starten.cmd")
npm test
npm run build    # -> dist/ (statisch, beliebiger Webserver oder Unterordner)
```

## Hosting

`dist/` ist eine rein statische Website (kein Server-Code, keine Datenbank) und läuft auf jedem Webspace, NAS oder GitHub Pages,
auch in Unterverzeichnissen. Die GitHub-Pages-Version wird automatisch per GitHub Actions gebaut (`.github/workflows/pages.yml`).

---

## Rechtliches / Rechteinhaber

* **„Bingo auf Schatzsuche“**, die Figuren **Bingo** und **Puck** sowie alle Originalinhalte sind Eigentum der jeweiligen Rechteinhaber
  (Originalspiel: Outline Multimedia GmbH / more software Mediengesellschaft mbH, 2001; Titellizenz: Ensslin-Verlag; Figurenvorlagen: Michael Grunwald).
  Dieses Projekt steht in **keiner Verbindung** zu ihnen und ist nicht von ihnen autorisiert.
* Es ist ein **nicht-kommerzielles Fan- und Erhaltungsprojekt**. Es werden keine Originaldateien verbreitet.
* **Takedown:** Wenn Rechteinhaber oder sonst jemand ein Problem mit diesem Projekt hat, genügt eine Nachricht (GitHub-Issue oder Kontakt zum Repository-Inhaber) –
  **wir löschen das gesamte Projekt umgehend.**
* Der neu geschriebene Programmcode steht unter der MIT-Lizenz (siehe [LICENSE](LICENSE)); diese Lizenz gilt **nicht** für Marken, Figuren oder Originalinhalte.
  Soweit Rechte an Beiträgen zu diesem Projekt bestehen, werden sie den Rechteinhabern des Originals auf Anfrage vollständig überlassen.

## KI-Hinweis (AI Disclaimer)

Große Teile dieses Projekts – Analyse der Originaldateien, Rekonstruktion der Spiellogik, Programmcode, Texte und Grafiken –
wurden mit Hilfe von KI (Claude von Anthropic) erstellt und nur teilweise von Menschen geprüft.
Die maschinell erstellten Untertitel und Rekonstruktionen können Fehler enthalten.

## Haftungsausschluss – Nutzung auf eigene Gefahr

Die Software wird **ohne jede Gewährleistung** bereitgestellt („as is“). Nutzung **auf eigene Gefahr**.
Die Autoren haften nicht für Schäden, Datenverlust oder Rechtsfolgen, die aus der Nutzung entstehen.
Spielstände werden nur lokal im Browser bzw. in heruntergeladenen Dateien gespeichert; es werden keine Daten an einen Server übertragen.

## Originaldateien für Heimspiel laden

Wer die Original-CD (oder eine Installation) von „Bingo auf Schatzsuche“ besitzt, kann deren Videos, Musik, Sprache/Effekte
und Grafiken **für das private Spielen zu Hause** in diese Neuentwicklung laden. Ohne diese Dateien läuft das Spiel mit eigener Grafik.

**Nur für den privaten Gebrauch:** Die Originaldateien sind urheberrechtlich geschützt. Der erzeugte Ordner `orig`
darf **nicht** weitergegeben, hochgeladen oder öffentlich gehostet werden (er ist per `.gitignore` ausgeschlossen).

Voraussetzung: Windows und [Python 3](https://www.python.org/downloads/) (ab 3.8). Pillow, ProjectorRays (v0.2.0) und ffmpeg
lädt das Skript beim ersten Lauf selbst (nach `tools\.cache\`). Die CD bzw. der Installationsordner wird nur gelesen.

1. CD einlegen.
2. `tools\Originaldateien importieren.cmd` doppelklicken (sucht die CD selbst) oder in PowerShell:
   ```powershell
   .\tools\Originaldateien-importieren.ps1 -Quelle E:\
   # Installation ohne Video-Ordner: Videos von der CD dazunehmen
   .\tools\Originaldateien-importieren.ps1 -Quelle "C:\Programme\Schatzsuche" -Video E:\Video
   ```
3. Spiel starten: `npm run dev` (bzw. nach `npm run build` → `dist\Spiel starten.cmd`).

Ziel ist `public\orig` (im Repository) bzw. `orig\` neben `index.html`, wenn das Skript in einem gebauten `dist\tools\` liegt; abweichend mit `-Ziel`.
Weitere Optionen: `-Untertitel` (Untertitel per lokaler Spracherkennung, dauert lange), `-Neu` (alles neu erzeugen),
`-Arbeitsordner`/`-Behalten` (Zwischendateien). Dauer ca. 10–20 Minuten, Ergebnis ca. 190 MB. Erneutes Ausführen ist unbedenklich.
