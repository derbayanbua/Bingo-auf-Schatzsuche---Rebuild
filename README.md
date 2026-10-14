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
Wer eine eigene Original-CD besitzt, kann sie für den **privaten Gebrauch** zu Hause einlesen –
Schritt-für-Schritt-Anleitung: **[Mit Originalgrafik und -ton spielen](#mit-originalgrafik-und--ton-spielen)**.
Ohne diese Dateien läuft das Spiel mit eigenen Vektorgrafiken und synthetischen Klängen.

## Starten

**Fertiges Paket spielen (Windows, ohne Installation):** `Bingo-Schatzsuche-Spiel.zip` von der
[Releases-Seite](../../releases) laden, entpacken, `Spiel starten.cmd` doppelklicken (bzw. nach eigenem Build `dist/Spiel starten.cmd`) –
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

---

## Mit Originalgrafik und -ton spielen

Wer die **Original-CD** von „Bingo auf Schatzsuche“ besitzt, kann deren Grafiken, Videos, Musik und Stimmen
**für das private Spielen zu Hause** in diese Neuentwicklung laden. Dafür sind **keine Programmierkenntnisse** nötig –
nur ein paar Doppelklicks. Ohne diese Dateien läuft das Spiel mit eigener, einfacher Grafik.

> **Wichtig – nur für den privaten Gebrauch.** Die Originaldateien sind urheberrechtlich geschützt.
> Der dabei entstehende Ordner `orig` darf **niemals** weitergegeben, hochgeladen, per Cloud geteilt oder ins Internet gestellt werden.
> Er ist nur für Sie und Ihre eigene, rechtmäßig erworbene CD.

### Was Sie brauchen

* die **Original-CD** „Bingo auf Schatzsuche“ (2001) – oder eine ISO-Datei davon, oder das **installierte Spiel**
  (die Videos liegen allerdings nur auf der CD; ohne CD fehlen nur die Videos)
* einen PC mit **Windows 10 oder 11**
* **Internet** – nur beim ersten Mal, für die einmalige Installation der Hilfsprogramme (ca. 200 MB)
* ca. **500 MB freien Speicherplatz** (am Ende bleiben ca. 200 MB übrig)
* ca. **10–15 Minuten** Zeit (auf älteren PCs auch 20–30 Minuten)

Sie brauchen **kein** Node.js, keine Kommandozeile und keine Administratorrechte.

### Schritt für Schritt

1. **Spiel herunterladen:** Auf der [Releases-Seite](../../releases) dieses Projekts beim neuesten Eintrag unter „Assets“
   auf **`Bingo-Schatzsuche-Spiel.zip`** klicken.
2. **Entpacken:** Im Download-Ordner mit der rechten Maustaste auf die ZIP-Datei klicken → **„Alle extrahieren…“** →
   einen festen Ort wählen, z. B. `Dokumente\Bingo-Schatzsuche` → „Extrahieren“.
   *Bitte nicht direkt in der ZIP-Datei doppelklicken – vorher wirklich entpacken.*
3. **CD einlegen.** (Eine ISO-Datei einfach per Doppelklick öffnen – Windows bindet sie dann wie eine CD ein.)
   Falls Windows ein Fenster „Was soll mit der CD passieren?“ zeigt oder das alte Spiel starten will: einfach schließen.
4. **Im entpackten Ordner `Originaldateien importieren.cmd` doppelklicken.** Ein schwarzes Fenster öffnet sich und erklärt jeden Schritt.
   * Erscheint **„Der Computer wurde durch Windows geschützt“**: auf **„Weitere Informationen“** und dann **„Trotzdem ausführen“** klicken.
   * Das Programm **sucht die CD selbst** (auch ISO-Dateien und übliche Installationsordner). Findet es nichts oder mehrere Stellen,
     öffnet sich ein **Auswahlfenster**: dort das CD-Laufwerk (z. B. „DVD-Laufwerk (E:) Schatzsuche“) bzw. den Spielordner wählen → „OK“.
   * Ist **Python** (ein kostenloses Hilfsprogramm für die Umwandlung) noch nicht installiert, fragt das Programm, ob es Python
     installieren darf → **„Ja“**. Das dauert 1–3 Minuten und geschieht nur für Ihr Benutzerkonto.
5. **Warten.** Das Fenster zeigt „Schritt x von 9“, Prozentangaben und die geschätzte Restzeit. Beim ersten Mal werden
   zusätzlich die Hilfsprogramme ProjectorRays und ffmpeg geladen. Den PC in dieser Zeit nicht ausschalten, die CD nicht herausnehmen.
6. **Fertig:** Es erscheint die Meldung „Die Originaldateien wurden erfolgreich geladen!“ → **„Ja“** startet das Spiel sofort.
7. **Später spielen:** einfach **`Spiel starten.cmd`** im Ordner doppelklicken. Der Browser öffnet das Spiel – jetzt mit
   Originalgrafik, Videos, Musik und Stimmen. Das schwarze Fenster dabei offen lassen; Schließen beendet das Spiel.
   Die CD wird zum Spielen **nicht** mehr gebraucht.

### Was dabei passiert

* Die CD bzw. der Installationsordner wird **nur gelesen**, nie verändert.
* Die alten Director-Dateien des Spiels werden mit [ProjectorRays](https://github.com/ProjectorRays/ProjectorRays) (v0.2.0,
  Prüfsumme SHA-256 wird kontrolliert) zerlegt, Bilder werden in WebP, Ton in MP3 und die Smacker-Videos mit
  [ffmpeg](https://ffmpeg.org/) in MP4 umgewandelt. Das Ergebnis landet im Ordner **`orig`** neben `index.html`.
* Python (falls nötig) und die Bildbibliothek Pillow werden nur für Ihr Benutzerkonto installiert. ProjectorRays und ffmpeg
  liegen danach in `%LOCALAPPDATA%\Bingo-Schatzsuche\Werkzeuge` und werden bei einem erneuten Lauf wiederverwendet.
* Zwischendateien (in `%TEMP%`) werden am Ende gelöscht.
* **Erneut ausführen schadet nie**: Bereits Erledigtes wird übersprungen. Nach einem Abbruch also einfach noch einmal starten.
* Zum Entfernen: den Ordner `orig` löschen (bzw. den ganzen Spielordner). Python kann über „Apps & Features“ deinstalliert werden.

### Probleme lösen

| Problem | Lösung |
|---|---|
| **„Der Computer wurde durch Windows geschützt“** (SmartScreen) | „Weitere Informationen“ → „Trotzdem ausführen“. Das erscheint, weil die Datei aus dem Internet stammt. |
| Fenster geht sofort wieder zu / **„Ausführung von Skripts ist deaktiviert“** | Die `.cmd`-Datei startet PowerShell bereits mit `-ExecutionPolicy Bypass`. Wichtig ist, die **`.cmd`-Datei** doppelzuklicken, nicht die `.ps1`. Hilft das nicht: Rechtsklick auf die ZIP-Datei → Eigenschaften → „Zulassen“ anhaken → neu entpacken. |
| **CD wird nicht gefunden** | Kurz warten, bis Windows die CD anzeigt, dann neu starten. Im Auswahlfenster das CD-Laufwerk **selbst** wählen (nicht einen Unterordner). Bei einer installierten Version den Installationsordner wählen (darin liegen `Software` und `Shared`). |
| **Python-Installation klappt nicht** (z. B. ohne „winget“ / App-Installer) | Das Programm öffnet python.org. Dort „Download Windows installer (64-bit)“ laden, starten, unten **„Add python.exe to PATH“** anhaken → „Install Now“. Danach `Originaldateien importieren.cmd` erneut doppelklicken. |
| **Virenschutz** meldet oder blockiert etwas | ProjectorRays und ffmpeg werden von github.com geladen (ProjectorRays mit Prüfsumme). Ggf. im Virenschutz erlauben und erneut starten. |
| Download schlägt fehl | Internetverbindung prüfen, später erneut starten. Firmen-Proxys können Downloads blockieren. |
| **Videos fehlen** | Bei einer Installation ohne CD gibt es keine Videos. CD einlegen und den Import erneut starten – er ergänzt dann nur die Videos. |
| Spiel startet nicht / **„Kein freier Port“** | `Spiel starten.cmd` sucht selbst einen freien Port ab 8080. Alte schwarze Spielfenster schließen und erneut starten. |
| Browser zeigt die einfache Grafik | Prüfen, ob neben `index.html` der Ordner `orig` mit `manifest.json` liegt; Seite mit Strg+F5 neu laden. |
| **Auf iPad, Tablet oder Handy spielen** (im gleichen WLAN) | `Spiel im Netzwerk starten.cmd` doppelklicken und die angezeigte Adresse (z. B. `http://192.168.178.20:8080/`) auf dem Tablet öffnen. Keine Administratorrechte nötig. Fragt die Windows-Firewall nach: „Zugriff zulassen“ für private Netzwerke. Beide Geräte müssen im selben (W)LAN sein; Gäste-WLANs blockieren oft Verbindungen zwischen Geräten. |

**macOS / Linux:** Der Import ist derzeit **nur für Windows** gedacht und getestet (er nutzt Windows-Fenster, winget und
Windows-Programmdateien von ProjectorRays/ffmpeg). Am einfachsten importiert man einmal an einem Windows-PC und kopiert
den fertigen Spielordner (mit `orig`) auf das eigene Gerät – bitte nur auf eigene Geräte. Spielen lässt sich das Spiel dann mit
jedem Browser über einen beliebigen lokalen Webserver (z. B. `python3 -m http.server 8080` im Spielordner).

### Für Fortgeschrittene

`Originaldateien-importieren.ps1` kann auch direkt in PowerShell gestartet werden:

```powershell
.\Originaldateien-importieren.ps1 -NurPruefen              # nur suchen und prüfen, nichts verändern
.\Originaldateien-importieren.ps1 -Quelle E:\               # Quelle festlegen
.\Originaldateien-importieren.ps1 -Quelle "C:\Programme\Schatzsuche" -Video E:\Video
```

Weitere Optionen: `-Ziel` (anderer `orig`-Ordner), `-Untertitel` (Untertitel per lokaler Spracherkennung, dauert lange),
`-Neu` (alles neu erzeugen), `-Arbeitsordner`/`-Behalten` (Zwischendateien), `-WerkzeugOrdner` (vorhandenes `projectorrays.exe` und
`ffmpeg\ffmpeg.exe` statt Download), `-OhneFragen` (keine Fenster/Rückfragen).

---

## Für Entwickler

* Der Importer liegt im Repository unter `tools/` (`Originaldateien importieren.cmd`, `Originaldateien-importieren.ps1`,
  `originalimport/*.py`, `LIESMICH.txt`). `npm run build` kopiert ihn automatisch neben `index.html` nach `dist/`
  (Vite-Plugin in `vite.config.ts`), sodass `dist/` das komplette Heimspiel-Paket ist. Im Repository schreibt der Importer nach `public/orig`.
* Die GitHub-Pages-Version wird mit `BINGO_OHNE_IMPORTER=1` gebaut (ohne Importer); `public/orig` ist per `.gitignore` ausgeschlossen.
* `tools/make-release-zip.ps1` baut und packt `release/Bingo-Schatzsuche-Spiel.zip` (ohne `orig/`). Dasselbe Skript nutzt
  `.github/workflows/release.yml`, das bei einem Tag `v*` ein GitHub-Release mit der ZIP-Datei erstellt:
  ```powershell
  git tag v0.1.0
  git push origin v0.1.0
  ```
