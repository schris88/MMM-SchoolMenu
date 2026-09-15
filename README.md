# MMM-SchoolMenu

Ein elegantes **MagicMirror²** Modul für das Schulessen der Stadt Tamm (`https://tamm.inetmenue.de/fs/menu/week`), mit automatischer KI-Bildgenerierung über die **Antigravity CLI (`agy`)**.

## Features

- 📅 **Wochenübersicht (Mo–Fr)**: Automatischer Abruf des aktuellen Speiseplans.
- 🚫 **Filterung**: Zeilen wie `Snack` und `Pastabuffet` werden strikt ignoriert.
- 🎨 **KI-Bilder per `agy`**: Appetitanregende KI-Fotos für jedes Gericht, generiert via Antigravity CLI.
- 🔄 **Intelligenter Cache & Wiederverwendung**:
  - Bilder werden im Unterordner `pics/` mit sprechenden Dateinamen (z.B. `spaghetti_tomatensosse_beilagensalat.jpg`) gespeichert.
  - Bereits vorhandene Bilder wiederkehrender Gerichte werden sofort wiederverwendet und nicht neu erzeugt.
- 🏷️ **Dietary Badges**: Automatische Erkennung und Anzeige von Abzeichen wie 🌱 Veggie, 🍗 Geflügel und 🐟 Fisch.
- 🌟 **Heute-Hervorhebung**: Der aktuelle Wochentag wird mit einem goldenen Rahmen und `HEUTE`-Badge hervorgehoben.
- 💻 **Cross-Platform**: Entwickelt für macOS und Raspberry Pi (wo `agy` installiert ist).

## Installation

Das Modul liegt in `/Users/christianstengel/dev/MMM-SchoolMenu` und ist per Symlink in MagicMirror eingebunden:

```bash
cd /Users/christianstengel/dev/MagicMirror/modules
ln -s /Users/christianstengel/dev/MMM-SchoolMenu MMM-SchoolMenu
```

## Konfiguration (`config/config.js`)

Füge das Modul in die `modules`-Sektion deiner `config.js` ein:

```javascript
{
  module: "MMM-SchoolMenu",
  position: "top_right",
  config: {
    updateInterval: 60 * 60 * 1000, // Stündliche Menüprüfung (in ms)
    showAllWeek: true,              // true = ganze Schulwoche, false = nur heute
    highlightToday: true,           // Aktuellen Wochentag optisch hervorheben
    showBadges: true,               // Badges für Veggie, Geflügel, Fisch
    showAllergens: false,           // Allergene im Untertitel anzeigen
    headerTitle: "Schulmenü Tamm"
  }
}
```

## Ordnerstruktur

```
MMM-SchoolMenu/
├── MMM-SchoolMenu.js   # MagicMirror Frontend-Komponente
├── MMM-SchoolMenu.css  # Modernes Glassmorphism-Styling
├── node_helper.js      # Backend-Scraper, Parser & agy-Bildgenerator
├── package.json
├── README.md
└── pics/               # Gespeicherte & wiederverwendete Gerichte-Bilder
```
