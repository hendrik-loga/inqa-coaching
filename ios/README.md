# Visitenkarten Scanner – iOS App

iPhone-App zum Scannen von Visitenkarten. Erkennt Text per OCR (Apple Vision), extrahiert Kontaktdaten und speichert sie direkt in den iPhone-Kontakten.

## Funktionen

- Live-Kamera-Vorschau mit Visitenkarten-Hilfsrahmen
- OCR-Texterkennung (Apple Vision, Deutsch + Englisch)
- Automatische Erkennung von Name, Firma, Position, Telefon, Mobil, E-Mail, Website, Adresse
- Bearbeitungsmaske zum Korrigieren der erkannten Daten
- Direktes Speichern in die iPhone-Kontakte (CNContactStore)

## Voraussetzungen

- **Xcode 15+**
- **iOS 16+** Zielgerät oder Simulator
- **XcodeGen** (zum Generieren des Xcode-Projekts)

## Einrichtung

### 1. XcodeGen installieren

```bash
brew install xcodegen
```

### 2. Xcode-Projekt generieren

```bash
cd ios/
xcodegen generate
```

Dies erstellt `BusinessCardScanner.xcodeproj`.

### 3. Projekt öffnen

```bash
open BusinessCardScanner.xcodeproj
```

### 4. Signing konfigurieren

In Xcode unter **Signing & Capabilities** das eigene Development Team eintragen.

### 5. App auf iPhone ausführen

Gerät verbinden → Ziel auswählen → **Run** (⌘R).

> Die Kamera funktioniert nur auf einem echten Gerät, nicht im Simulator.

## Projektstruktur

```
ios/
├── project.yml                        # XcodeGen-Konfiguration
└── BusinessCardScanner/
    ├── BusinessCardScannerApp.swift   # @main Einstiegspunkt
    ├── ContentView.swift              # Root-View
    ├── ScannerView.swift              # Kamera + Auslöser
    ├── CameraViewController.swift    # AVFoundation Kamera-Wrapper
    ├── CardScannerViewModel.swift     # Hauptlogik (Vision OCR)
    ├── BusinessCardParser.swift       # Text → Kontaktfelder
    ├── ParsedContact.swift            # Datenmodell
    ├── ContactPreviewView.swift       # Bearbeitungsmaske
    └── ContactManager.swift          # CNContactStore Speicherung
```

## Technologien

| Framework   | Verwendung |
|-------------|-----------|
| SwiftUI     | Benutzeroberfläche |
| AVFoundation | Kamera & Foto-Aufnahme |
| Vision      | OCR-Texterkennung |
| Contacts    | Kontakte speichern |
