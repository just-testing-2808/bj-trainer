# Blackjack Live – Trainings- & Simulations-App

Eine hochwertige, vollständig statische Blackjack-Webapp im Live-Casino-Stil.
Lern- und Trainings-Tool – kein echtes Geld, kein Backend, kein Login.

---

## Lokal starten

**Empfohlen (ES6 Modules brauchen HTTP):**
```bash
cd /pfad/zum/projekt
python -m http.server 8000
# dann: http://localhost:8000
```

Oder mit Node.js: `npx serve .`

---

## Deploy auf Tiiny.host / Netlify

1. Alle Dateien als ZIP packen (index.html muss im Root liegen)
2. ZIP auf tiiny.host oder netlify.com/drop hochladen
3. Fertig – läuft direkt im Browser

---

## Dateistruktur

```
blackjack-app/
├── index.html              # Casino-UI (HTML + SVG-Dealer)
├── README.md
└── static/
    ├── css/
    │   └── style.css       # Vollständiges Design (Casino-Atmosphäre, responsive)
    ├── js/
    │   ├── main.js         # Bootstrap + Event-Listener
    │   ├── deck.js         # Karten, Shoe, Handwert
    │   ├── game.js         # Zentraler State + Spiellogik
    │   ├── ui.js           # DOM-Rendering
    │   ├── betting.js      # Einsatzstrategien
    │   ├── counting.js     # Hi-Lo Card Counting
    │   ├── strategy.js     # Basic Strategy + EV-Stubs
    │   ├── probabilities.js# Wahrscheinlichkeiten
    │   └── sidebets.js     # Side-Bet-Auswertung
    └── assets/
        └── optional-generated-assets.txt
```

---

## Features

- 6-Deck-Shoe, echte Blackjack-Regeln (3:2, Dealer steht auf 17)
- Hit, Stand, Double, Split (bis 4 Hände)
- Side Bets: Perfect Pairs, 21+3, Crazy 7, Bust Bonus
- Hi-Lo Card Counting (Running Count + True Count)
- Wahrscheinlichkeiten aus echtem Restdeck
- Basic-Strategy-Lernmodus
- Einsatzstrategien: Manuell, Flat Bet, Martingale, True Count Betting
- Responsive: Desktop 16:9, Tablet, Handy-Querformat
- Hochformat-Overlay, Settings-Panel, Hilfe-Panel

---

## Offene TODOs

- Sound (Web Audio API)
- Insurance / Surrender
- Vollständige EV-Berechnung (deck-basiert)
- Rundenstatistiken / Session-Analyse
- Lokaler Speicher (Balance/Settings persistent)