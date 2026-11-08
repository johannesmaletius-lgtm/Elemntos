# Elementos – Himmelsinseln

Ein 2D-Jump'n'Run im Browser für **bis zu 4 Spieler**, gebaut fürs Handy (Querformat) und den PC.
Vier Figuren, vier Elemente, jede mit eigener Fähigkeit:

| Figur | Fähigkeit | Wofür |
|---|---|---|
| 🌪️ **Luft** | Doppelsprung, Sprung halten = gleiten | hohe Plattformen, weite Strecken |
| 🌊 **Wasser** | Wasser-Dash (Sprint durch die Luft) | weite Lücken |
| 🪨 **Erde** | Stampfer (in der Luft nach unten) | rissige Steine zerbrechen, auf Pilzen Mega-Sprung |
| 🔥 **Feuer** | Feuerball | Rankenwände verbrennen, Mumien besiegen |

Aktuell gibt es **Welt 1 „Himmelsinseln“** mit der Map **„Der Aufbruch“** (605 Kacheln lang, 5 Checkpoints,
5 Kristalle, ~240 Münzen, 21 Mumien). Weitere Maps und Welten kommen später.

## Gegner: Mumien

| Gegner | Verhalten | Besiegen |
|---|---|---|
| **Kleine Mumie** | watschelt auf ihrer Plattform hin und her | 1× draufspringen |
| **Große Mumie** | langsam und groß; nach dem ersten Treffer wird sie wütend und schnell | 2× draufspringen |

Von der Seite berühren = zurück zum Checkpoint. Feuerball, Erd-Stampfer und Wasser-Dash besiegen jede Mumie sofort.
Mumien drehen an Wänden, Kanten, Dornen, Pilzen, Säulen und Felsen um. Ihre Bewegung hängt nur von der
gemeinsamen Spielzeit ab, darum stehen sie bei allen Mitspielern an derselben Stelle.

## Spielen

### Als Web-App über GitHub Pages (empfohlen)
1. Im Repository auf GitHub: **Settings → Pages → Build and deployment → Source: „GitHub Actions“** wählen.
2. Unter **Actions** läuft dann der Workflow „GitHub Pages“ (falls nicht: „Run workflow“ drücken).
3. Nach ca. 1 Minute ist das Spiel online unter
   **https://johannesmaletius-lgtm.github.io/Elemntos/**
4. Am Handy öffnen und über das Teilen-Menü **„Zum Home-Bildschirm“** hinzufügen – dann startet es wie eine App
   im Vollbild.

Jede Änderung, die auf `main` landet, wird automatisch neu veröffentlicht.

**Mehrspieler auf GitHub Pages:** Pages liefert nur Dateien aus, es gibt keinen eigenen Server. Darum verbinden
sich die Geräte direkt miteinander (Peer-to-Peer per WebRTC, über den kostenlosen PeerJS-Vermittlungsdienst).
Das Gerät, das den Raum erstellt, ist der Raum: **Gastgeber bitte die Seite offen lassen.** Verlässt der
Gastgeber das Spiel, endet die Runde für alle. In sehr strengen Netzwerken (z. B. manche Firmen-WLANs) kann
die direkte Verbindung scheitern – dann hilft der Node-Server (siehe unten).

### Mit Freunden spielen
1. Spiel öffnen → **Mit Freunden spielen** → Figur wählen → **Raum erstellen**.
2. **Link teilen** (WhatsApp usw.) – Freunde tippen den Link an, wählen ein freies Element.
3. Gastgeber drückt **Spiel starten**. Bis zu 4 Spieler, später Dazukommende steigen am Checkpoint ein.

### Lokal am PC / mit eigenem Server (optional)
```bash
npm install
npm start
```
Dann `http://localhost:3000` öffnen (im WLAN zeigt das Terminal auch die Adresse fürs Handy).
Mit dem Node-Server laufen die Räume über den Server statt Peer-to-Peer – das ist am robustesten.
Für dauerhaftes Hosting liegt eine `render.yaml` für [Render](https://render.com) bei
(„New Blueprint“ → Repository wählen). Jeder andere Node-Hoster mit WebSocket-Unterstützung geht auch.

## Steuerung

**Handy:** linke Bildschirmhälfte = Stick (leicht ziehen = gehen, weit ziehen = rennen),
rechts großer Knopf = springen (halten = höher), kleiner Knopf = Element-Fähigkeit.

**Tastatur:** ← → / A D laufen · Shift rennen · Leertaste / W / ↑ springen · E Fähigkeit · Esc Pause

Bewegungsgefühl: Beschleunigung statt Sofort-Tempo, Rutschen beim Richtungswechsel, kurzer/langer Sprung
je nach Tastendruck, „Coyote-Time“ (Sprung kurz nach der Kante zählt noch) und Sprungpuffer.

## Die Map „Der Aufbruch“

1. **Startwiese** – laufen, springen, erster Pilz-Trampolin
2. **Erste Inseln** – Lücken und Höhenwechsel (Luft-Geheimnis)
3. **Pilzsprünge** – Pilz-Kette über dem Abgrund, erste Dornen
4. **Fähren** – bewegliche Plattformen über dem Wolkenmeer (Wasser-Geheimnis)
5. **Bröckelbrücke & Dornenfeld** – nicht stehen bleiben!
6. **Ruinenturm** – Klettern (Erde-Geheimnis unter rissigem Stein)
7. **Aufwind-Schlucht** – Aufwinde tragen dich über Schluchten
8. **Dornenhain** – präzise Sprünge (Feuer-Geheimnis hinter Ranken)
9. **Wasserfall-Klippen** – Aufzüge, Fähren, Bröckeltreppe (Geschick-Kristall)
10. **Himmelstreppe** – Plattformen über einem Dornenbett
11. **Sturmkante** – Aufwind, Bröckelkette, Fähre, Pilz
12. **Ruinen-Tor** – Ziel

Der Hauptweg ist **mit jeder Figur ohne Fähigkeit** schaffbar; vier Kristalle brauchen die passende Fähigkeit,
einer nur Geschick. Im Mehrspieler zählen Münzen, Kristalle und Checkpoints fürs ganze Team.
Ein perfekter Lauf dauert ca. 1 Minute, ein normaler erster Durchgang mit Wartezeiten und Fehlversuchen 3–5 Minuten.

## Projektaufbau

```
public/                 Das Spiel (reines HTML/JS, keine Build-Schritte)
  index.html, css/
  js/main.js            Menüs, Lobby, Spielstart
  js/game.js            Spielschleife, Kamera, Ereignisse, Rendering
  js/player.js          Physik + Fähigkeiten
  js/anim.js, rig.js    Animationen (Figuren aus Einzelteilen: Beine, Arme, Schal)
  js/level.js           Level-Format + MapBuilder
  js/levels/world1.js   Welt 1 mit ihren Maps
  js/tiles.js, background.js, entities.js   Prozedurale Pixel-Grafik
  js/net.js             Mehrspieler-Client (WebSocket-Server oder Peer-to-Peer)
  js/room.js            Raum-Logik (vom Server und vom Gastgeber-Gerät benutzt)
  js/enemies.js         Mumien-Gegner
  vendor/peerjs.min.js  PeerJS (MIT-Lizenz) für Peer-to-Peer
  assets/chars/         Figuren-Atlanten (aus tools/build_sprites.py)
server/server.js        Optionaler Webserver + Mehrspieler-Räume (WebSocket)
.github/workflows/      Automatische Veröffentlichung auf GitHub Pages
assets/src/             Original-Bilder (Figuren, Hintergrund-Vorlage)
tools/                  Hilfsprogramme (siehe unten)
```

### Neue Map oder Welt hinzufügen
In `public/js/levels/world1.js` eine weitere Funktion wie `map1()` schreiben und in `maps` eintragen.
Für eine neue Welt eine Datei `world2.js` nach demselben Muster anlegen und in `main.js` bei `WORLDS` ergänzen.
Der `MapBuilder` hat Befehle wie `ground`, `island`, `plank`, `thorns`, `crumble`, `mover`, `spring`,
`updraft`, `coins`, `arc`, `gem`, `checkpoint`, `goal`, `mummy`, `mummyTall`
(Koordinaten in Kacheln, Zeile 0 = oben, Höhe 24; Gegner in die Zeile direkt über dem Boden).

### Hilfsprogramme
```bash
node tools/check_level.mjs fire            # Ist die Map ohne Fähigkeit schaffbar? (echte Spielphysik)
node tools/check_level.mjs water --ability # ...mit Fähigkeit; zeigt erreichbare Kristalle + Bestzeit
python3 tools/build_sprites.py             # Figuren neu zerlegen (nach Änderung der Bilder)
node tools/build_preview.mjs               # Einzeldatei-Vorschau (nur Einzelspieler) nach dist/
                                           # braucht esbuild (npm i -g esbuild oder ESBUILD=/pfad/esbuild)
```
Im Browser (bei laufendem Server): `/dev/overview.html` zeigt die ganze Map als Übersicht,
`/dev/rigtest.html` alle Animations-Posen der Figuren.
