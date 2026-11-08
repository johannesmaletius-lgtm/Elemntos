# Elementos – Himmelsinseln

Ein 2D-Jump'n'Run im Browser für **bis zu 4 Spieler**, gebaut fürs Handy (Querformat) und den PC.
Vier Figuren, vier Elemente, jede mit eigener Fähigkeit:

| Figur | Fähigkeit | Wofür |
|---|---|---|
| 🌪️ **Luft** | Doppelsprung, Sprung halten = gleiten | hohe Plattformen, weite Strecken |
| 🌊 **Wasser** | Wasser-Dash (Sprint durch die Luft) | weite Lücken |
| 🪨 **Erde** | Stampfer (in der Luft nach unten) | rissige Steine zerbrechen, auf Pilzen Mega-Sprung |
| 🔥 **Feuer** | Feuerball | Rankenwände verbrennen, Mumien besiegen |

Es gibt **Welt 1 „Himmelsinseln“ mit 10 Leveln** – von der Morgenwiese bis zum Polarlicht. Auf der
**Weltkarte** wählst du, was du spielen willst; jedes geschaffte Level schaltet das nächste frei.

## Kristalle: mit jeder Figur einmal spielen

Jedes Level hat **5 Kristalle**: 4 **Element-Kristalle** (in der Farbe ihres Elements) und einen
lila **Geschick-Kristall**. Der Hauptweg ist mit jeder Figur ohne Fähigkeit schaffbar, aber jeder
Element-Kristall ist **nur mit seiner Fähigkeit** erreichbar:

| Kristall | Typisches Versteck |
|---|---|
| 🌪️ Luft | Wolke/Steg hoch über allem – nur mit Doppelsprung, manchmal nur im Gleitflug |
| 🌊 Wasser | Tunnel mit Dornendecke und Lücken im Boden – nur der Wasser-Dash kommt rüber (und zurück) |
| 🪨 Erde | Gewölbe unter rissigem Stein – stampfen, und unten wieder raus |
| 🔥 Feuer | Höhle oder Käfig aus Ranken – verbrennen |
| 💜 Geschick | für alle, aber knifflig (Bröckeltreppen, Räder, Speier …) |

Gefundene Kristalle bleiben gespeichert. **Allein** braucht man also jede Figur einmal, **in der Truppe**
mit allen vier Elementen gibt es alles in einem Lauf – Kristalle zählen für die ganze Truppe.
Fortschritt (geschaffte Level, Bestzeit, Kristalle) liegt im Browser (localStorage).

## Die 10 Level

Jedes Level hat sein **eigenes Biom** – eigene Farben für Gras, Erde und Stein, eigene Bäume und
Pflanzen, eigene Silhouetten am Horizont und eigene schwebende Partikel. Jedes Level dauert wie Level 1:
ein perfekter Lauf **ca. 1 Minute**, ein normaler erster Durchgang mit Fehlversuchen **3–5 Minuten**.

| # | Name | Tageszeit | Biom | Neu / Schwerpunkt |
|---|---|---|---|---|
| 1 | Der Aufbruch | Mittag | Blumenwiese – Eichen, Gänseblümchen, Schmetterlinge | Grundlagen, Pilze, Fähren, Ruinenturm |
| 2 | Wolkenpfad | Morgen | Kirschblüten – rosa Bäume und Hügel, Blütenregen | **Wolken**, Wolkentreppen, Blütenbrücke, Wolkenbrücke |
| 3 | Pilzhain | Mittag | Pilzwald – Riesenpilze, lila Erde, leuchtende Sporen | Pilz-Ketten, Sporen-Schlucht, Riesenpilz-Stufen |
| 4 | Sturmbrücken | Nachmittag | Sturmhöhen – Schiefer, Wind-Kiefern, Windmühlen | **Seitenwind**, Windmühlen-Grat, Sturmgipfel |
| 5 | Ruinenstadt | Nachmittag | Sandstein – Sand, Palmen, Stadt-Silhouette | **Feuerspeier**, Turmhaus, Marktdächer, Palasthof |
| 6 | Uhrwerk-Inseln | Goldene Stunde | Messing – Messingplatten, goldene Bäume, drehende Zahnräder | **Riesenräder**, **Geister**, Zahnrad-Schlucht, Glockenturm |
| 7 | Abendrot-Klippen | Abendrot | Rote Klippen – Gesteinsschichten, Ahorn, Herbstlaub | Wasserfälle, Aufwinde, Wasserfall-Pendel, Abendrot-Grat |
| 8 | Dornenlabyrinth | Dämmerung | Dornendickicht – tote Dornenbäume, Glühwürmchen | Dornengänge, Speier-Klamm, Dornenkrone |
| 9 | Sternennacht | Nacht | Mondkristalle – Kristallbäume, leuchtendes Gras | Leuchtwolken, Mondräder, Sternwarte, viele Geister |
| 10 | Das Himmelstor | Polarlicht | Eisgipfel – Schnee, Eiszapfen, Schneetannen, Schneefall | Finale – alles zusammen, Eisfall-Kaskade |

## Figuren

Die vier Figuren haben einen dunklen **Umriss**, damit sie sich von jedem Hintergrund abheben, und einen
**Schatten**, der auch beim Springen auf dem Boden darunter liegt. Jede Figur hat eigene **Element-Effekte**:
Luft zieht kleine Windwirbel hinter sich her (beim Gleiten Luftstreifen an den Armen), Wasser verspritzt
Tropfen und lässt Bläschen aufsteigen, Erde wirbelt Kiesel und Blätter auf, und aus der Flammenhand der
Feuer-Figur steigt Glut. Auch Landungen sehen je Element anders aus. Nachts leuchten die Figuren in ihrer
Elementfarbe und bekommen ein Randlicht.

### Animationen

Die Figuren sind aus Einzelteilen gebaut (Rumpf, Ober- und Unterschenkel, Unterarme, Schal) und werden
in `js/anim.js` animiert:

- **Bodenkontakt:** Das Rig rechnet aus den Beinwinkeln aus, wo die Sohlen sind, und setzt die tiefste Sohle
  genau auf den Boden. Gespreizte Beine senken die Hüfte, ein gestrecktes Standbein hebt sie – nichts schwebt
  oder versinkt.
- **Gehen und Rennen** laufen über Keyframe-Zyklen (Fersenaufsatz, Abfedern, Abdruck, Durchschwung, beim Rennen
  mit Flugphase). Die Schrittphase hängt an der zurückgelegten Strecke; Gehen geht stufenlos ins Rennen über.
- **Sprung:** stufenlos von Steigen über Scheitel bis Fallen; aus vollem Lauf wird ein Weitsprung daraus.
  Die Landung federt (staucht mit gebeugten Knien und schwingt nach), der Absprung streckt.
- **Gewicht:** beim Beschleunigen nach vorn, beim Bremsen nach hinten lehnen; bei Seitenwind dagegen lehnen.
- **Wende:** beim Bremsen schaut die Figur noch in die alte Richtung und stemmt sich dagegen, dann klappt sie um.
- Außerdem: gegen Wände **schieben**, **Feuerball-Wurf** mit Ausholen, Atmen und Gewicht verlagern im Stand
  (nach ein paar Sekunden ab und zu Wippen), **Jubeln** im Ziel und ein Rückwärts-Sturz beim **Tod**.

## Gegner: Mumien

| Gegner | Verhalten | Besiegen |
|---|---|---|
| **Kleine Mumie** | watschelt auf ihrer Plattform hin und her | 1× draufspringen |
| **Große Mumie** | langsam und groß; nach dem ersten Treffer wird sie wütend und schnell | 2× draufspringen |
| **Geister-Mumie** | schwebt hin und her, auch über Abgründen | 1× draufspringen (gibt Schwung) |

**Feuerspeier** sind Steinköpfe, die im Takt Flammen spucken (die Augen glühen kurz vorher) – drüberspringen.
Die Feuer-Figur ist gegen Flammen immun.

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

### Mit Freunden spielen (Truppe)
1. Spiel öffnen → **Truppe gründen** → Figur wählen.
2. Auf der Karte erscheint die Truppe mit Code. **🔗 Einladen** teilt den Link (WhatsApp usw.) –
   oder Freunde tippen den Code (4 Zeichen) auf dem Startbildschirm bei **Truppe beitreten** ein
   (ein eingefügter Einladungslink wird automatisch zum Code).
3. Jeder sieht, wer in der Truppe ist, und kann vor jedem Level sein Element wechseln (jedes nur einmal).
4. Der Gastgeber wählt das Level auf der Karte und drückt **Los!** – alle spielen es zusammen.
5. Danach: Gastgeber wählt **Zur Karte**, **Nochmal** oder **Nächstes Level**. Bis zu 4 Spieler;
   wer später dazukommt, steigt beim vordersten Mitspieler ein.

**Gemeinsame Kamera:** Im Mehrspieler zeigt die Kamera alle Spieler und zoomt dafür etwas raus.
Niemand kann aus dem Bild laufen: läuft der Erste zu weit vor, werden die Hinteren vom Bildrand
**nachgezogen**; wer irgendwo festhängt (oder abstürzt), taucht beim vordersten Mitspieler wieder auf.
Mitspieler werden mit einer an die Verbindung angepassten Pufferzeit flüssig dargestellt; Positionen
laufen über einen eigenen, ungeordneten Kanal, damit verlorene Pakete nichts aufhalten.

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
· auf der Karte ← → Level wählen, Enter starten

Bewegungsgefühl: Beschleunigung statt Sofort-Tempo, Rutschen beim Richtungswechsel, kurzer/langer Sprung
je nach Tastendruck, „Coyote-Time“ (Sprung kurz nach der Kante zählt noch) und Sprungpuffer.

## Level 1 „Der Aufbruch“

1. **Startwiese** – laufen, springen, erster Pilz-Trampolin
2. **Erste Inseln** – Lücken und Höhenwechsel (Luft-Geheimnis)
3. **Pilzsprünge** – Pilz-Kette über dem Abgrund, erste Dornen
4. **Fähren** – bewegliche Plattformen über dem Wolkenmeer
5. **Bröckelbrücke & Dornenfeld** – nicht stehen bleiben! (Wasser-Geheimnis im Dornentunnel darüber)
6. **Ruinenturm** – Klettern (Erde-Geheimnis unter rissigem Stein)
7. **Aufwind-Schlucht** – Aufwinde tragen dich über Schluchten
8. **Dornenhain** – präzise Sprünge (Feuer-Geheimnis hinter Ranken)
9. **Wasserfall-Klippen** – Aufzüge, Fähren, Bröckeltreppe (Geschick-Kristall)
10. **Himmelstreppe** – Plattformen über einem Dornenbett
11. **Sturmkante** – Aufwind, Bröckelkette, Fähre, Pilz
12. **Ruinen-Tor** – Ziel

Im Mehrspieler zählen Münzen, Kristalle und Checkpoints fürs ganze Team.
Ein perfekter Lauf dauert in jedem Level ca. 1 Minute, ein normaler erster Durchgang 3–5 Minuten.

## Projektaufbau

```
public/                 Das Spiel (reines HTML/JS, keine Build-Schritte)
  index.html, css/
  js/main.js            Menüs, Weltkarte, Truppe, Spielstart, Ergebnis
  js/worldmap.js        Weltkarte (Inseln, Pfad, Kristall-Anzeige)
  js/progress.js        Spielstand (geschafft, Bestzeit, Kristalle) im Browser
  js/game.js            Spielschleife, Kamera (Mehrspieler: gemeinsam + nachziehen), Ereignisse, Rendering
  js/player.js          Physik + Fähigkeiten
  js/anim.js, rig.js    Animationen (Figuren aus Einzelteilen: Beine, Arme, Schal)
  js/level.js           Level-Format + MapBuilder
  js/levels/world1.js   Welt 1: Liste der 10 Level mit Tageszeit
  js/levels/w1/l01..l10.js   die Level
  js/levels/parts.js    Bausteine (Wasser-Tunnel, Erd-Gewölbe, Feuer-Höhle, Luft-Wolke, Dornengrube)
  js/biomes.js          Die 10 Biome (Farben, Bäume, Pflanzen, Silhouetten, Partikel)
  js/tiles.js, background.js, entities.js   Prozedurale Pixel-Grafik, Tageszeiten, Wasserfälle, Speier
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

### Neues Level oder neue Welt hinzufügen
Eine Datei wie `public/js/levels/w1/l02.js` anlegen und in `world1.js` eintragen (mit Tageszeit:
`day`, `morning`, `noon`, `afternoon`, `golden`, `sunset`, `dusk`, `night`, `aurora`, und Biom:
`meadow`, `blossom`, `mushroom`, `storm`, `ruins`, `clockwork`, `canyon`, `thorn`, `starlit`, `aurora`).
Ein neues Biom ist ein Eintrag in `biomes.js`.
Für eine neue Welt eine Datei `world2.js` nach demselben Muster anlegen und in `main.js` bei `WORLD` ergänzen.
Der `MapBuilder` hat Befehle wie `ground`, `island`, `plank`, `cloud`, `thorns`, `crumble`, `mover`, `wheel`,
`circle`, `spring`, `updraft`, `wind`, `spitter`, `ghost`, `coins`, `arc`, `gem(x, y, element)`, `checkpoint`, `goal`,
`mummy`, `mummyTall` (Koordinaten in Kacheln, Zeile 0 = oben, Höhe 24; Gegner in die Zeile direkt über dem Boden).
Die Element-Geheimnisse gibt es fertig in `parts.js`. Mit `splice(x, n)` lässt sich mitten in ein
Level ein neuer Abschnitt von `n` Kacheln einschieben – alles rechts davon rutscht mit (so wurden die
Level 2–10 verlängert).

### Hilfsprogramme
```bash
node tools/check_level.mjs --matrix        # alle Level: Ziel ohne Fähigkeit erreichbar? Jeder Element-
                                           # Kristall NUR mit seinem Element? (echte Spielphysik)
node tools/check_level.mjs water --ability --map 3   # einzelne Figur/Level; zeigt Kristalle + Bestzeit
node tools/ascii.mjs 3 200 300             # Level 4, Spalten 200-300 als Text (Plattformen, Speier, Geister)
python3 tools/build_sprites.py             # Figuren neu zerlegen (nach Änderung der Bilder)
node tools/build_preview.mjs               # Einzeldatei-Vorschau (nur Einzelspieler) nach dist/
                                           # braucht esbuild (npm i -g esbuild oder ESBUILD=/pfad/esbuild)
```
Im Browser (bei laufendem Server): `/dev/overview.html?m=3` zeigt Level 4 als Übersicht,
`/dev/rigtest.html` alle Animations-Posen der Figuren, `/dev/rigtest.html?film=jump` einen Ablauf als
Filmstreifen (auch `start`, `runjump`, `turn`, `stop`, `land`, `throw`, `dead`, `double`, `push`) und
`/dev/rigtest.html?live=1` alle Abläufe als laufende Animation.
