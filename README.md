# MMM-SchoolMenu

Ein hochgradig anpassbares, elegantes **MagicMirror²** Modul für das Schulessen der Stadt Tamm (`https://tamm.inetmenue.de/fs/menu/week`), mit automatischer KI-Bildgenerierung über die **Antigravity CLI (`agy`)**.

## Features

- 📅 **Flexible Tagesanzeige (`daysToShow`)**:
  - `daysToShow: 1` *(Standard)*: Zeigt nur den aktuellen Schultag („Heute“).
  - `daysToShow: 2..5`: Zeigt mehrere Tage oder die komplette Schulwoche (Mo–Fr).
- 🔄 **Automatischer Wochenwechsel am Samstag**:
  - Samstags und sonntags wird automatisch der Speiseplan für die **kommende Woche** geladen.
  - Am Wochenende zeigt `daysToShow: 1` automatisch den kommenden Montag an.
- 📱 **Adaptives Layout**:
  - **Breite Leiste (`bottom_bar`, `top_bar`, `middle_center`)**:
    - Bei `daysToShow: 1` werden Menü A und Menü B nebeneinander dargestellt.
    - Bei mehreren Tagen werden die Tage als Spalten nebeneinander dargestellt.
  - **Kompakte Seitenleiste (`top_right`, `top_left`, `bottom_right`, `bottom_left`)**:
    - Automatischer Umbruch in eine vertikale Stapelansicht, perfekt passend für die MagicMirror-Spaltenbreite.
- 📏 **Konfigurierbare Höhen & MagicMirror-Standards**:
  - Bildhöhe frei einstellbar über `imageHeight` (z. B. `"120px"`, `"100px"`, `"140px"`).
  - Maximale Modulhöhe über `maxHeight` mit automatischem Scrollen bei Bedarf.
  - Verwendet native MagicMirror CSS-Tokens (`--font-primary`, `--font-size-*`, `--gap-modules`).
- 🚫 **Filterung**: Zeilen wie `Snack` und `Pastabuffet` werden strikt ignoriert.
- 🎨 **KI-Bilder per `agy`**: Appetitanregende KI-Fotos für jedes Gericht, generiert via Antigravity CLI.
- 🔄 **Intelligenter Cache & Wiederverwendung**:
  - Bilder werden im Unterordner `pics/` mit sprechenden Dateinamen (z.B. `spaghetti_tomatensosse_beilagensalat.jpg`) gespeichert.
  - Bereits vorhandene Bilder wiederkehrender Gerichte werden sofort wiederverwendet und nicht neu erzeugt.
- 🏷️ **Dietary Badges**: Automatische Erkennung und Anzeige von Abzeichen wie 🌱 Veggie, 🍗 Geflügel und 🐟 Fisch.

## Installation

```bash
cd /Users/christianstengel/dev/MagicMirror/modules
ln -s /Users/christianstengel/dev/MMM-SchoolMenu MMM-SchoolMenu
```

## Konfiguration (`config/config.js`)

```javascript
{
  module: "MMM-SchoolMenu",
  position: "bottom_bar", // oder "top_right", "top_left", "top_bar", etc.
  config: {
    daysToShow: 1,        // Anzahl anzuzeigender Tage (1 = nur heute, bis zu 5)
    imageHeight: "120px", // Höhe der Speisenfotos
    maxHeight: "none",    // Optionale Maximalhöhe des Containers (z.B. "400px")
    updateInterval: 60 * 60 * 1000, // Stündliche Aktualisierung
    highlightToday: true, // Hebt heutigen Tag mit goldenem Glow hervor
    showBadges: true,     // Badges für Veggie, Geflügel, Fisch
    showAllergens: false, // Allergene im Untertitel anzeigen
    headerTitle: "Schulmenü Tamm"
  }
}
```

## Lizenz

MIT
