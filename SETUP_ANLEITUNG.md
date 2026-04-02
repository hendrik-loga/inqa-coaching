# INQA Coaching Plattform — Setup-Anleitung
# =====================================================
# Folge diese Schritte in der angegebenen Reihenfolge

## SCHRITT 1: Supabase Datenbank einrichten (5 Min)

1. Gehe zu: https://supabase.com → dein Projekt
2. Klicke links auf: **SQL Editor** → **New Query**
3. Öffne die Datei `supabase_setup.sql` aus diesem Paket
4. Kopiere den gesamten Inhalt und füge ihn ins SQL-Fenster ein
5. Klicke auf **Run** (grüner Button)
   → Du siehst "Success" wenn alles geklappt hat

## SCHRITT 2: Supabase Auth konfigurieren (2 Min)

1. Im Supabase Dashboard: **Authentication → Settings**
2. Unter "Site URL" eintragen: `https://deine-app.vercel.app`
   (die URL bekommst du nach dem Vercel-Deploy — vorerst leer lassen)
3. Unter "Redirect URLs" dieselbe URL eintragen
4. E-Mail-Bestätigung: kann auf "OFF" gestellt werden für schnellen Start

## SCHRITT 3: Supabase Anon Key holen (1 Min)

1. Supabase Dashboard → **Settings → API**
2. Kopiere den Wert unter **anon / public**
   (Sieht aus wie: eyJhbGciOiJIUzI1NiIs...)
3. Bewahre ihn sicher auf — du brauchst ihn in Schritt 4

## SCHRITT 4: App auf Vercel deployen (5 Min)

### Option A: Via GitHub (empfohlen)
1. Erstelle ein Repository auf github.com
2. Lade alle Dateien dieses Pakets hoch
3. Gehe zu vercel.com → **Add New → Project**
4. Wähle dein GitHub Repository
5. Vercel erkennt Vite automatisch

### Option B: Via Vercel CLI
```bash
npm install -g vercel
cd /pfad/zum/projektordner
vercel
```

## SCHRITT 5: Environment Variables in Vercel (2 Min)

1. Vercel Dashboard → dein Projekt → **Settings → Environment Variables**
2. Füge folgende Variablen hinzu:

| Name                    | Wert                                          |
|-------------------------|-----------------------------------------------|
| VITE_SUPABASE_URL       | https://ulswzqzffxrpaqsxkujg.supabase.co     |
| VITE_SUPABASE_ANON_KEY  | (dein anon key aus Schritt 3)                 |

3. Klicke **Save** und dann **Redeploy**

## SCHRITT 6: Supabase Site URL aktualisieren

1. Kopiere deine Vercel-URL (z.B. https://inqa-coaching.vercel.app)
2. Supabase → Authentication → Settings → Site URL → eintragen
3. Speichern

## FERTIG! 🎉

Deine App ist jetzt live unter deiner Vercel-URL.

---

## Erste Schritte in der App

1. **Registriere dich** als erster Nutzer (du wirst automatisch Admin)
2. **Lege einen Kunden an** → Phasen werden automatisch erstellt
3. **Lade Teammitglieder ein** → Tab "Team" → Einladungslink generieren
4. Das eingeladene Teammitglied muss sich erst registrieren,
   dann den Einladungslink aufrufen

## Dateistruktur des Projekts

```
/
├── index.html
├── package.json
├── vite.config.js
├── .env.example          ← Vorlage für Keys
├── supabase_setup.sql    ← Einmalig in Supabase ausführen
└── src/
    ├── main.jsx
    ├── App.jsx            ← Gesamte Frontend-Logik
    └── lib/
        └── supabase.js    ← Alle Datenbankzugriffe
```

## Wo liegen die Daten?

- **Alle Daten** liegen in deiner Supabase-Datenbank (PostgreSQL)
- **Server-Standort**: wählbar bei Supabase-Projekterstellung
  → Für DSGVO: Frankfurt (eu-central-1) wählen
- **Zugriff**: Nur eingeloggte Nutzer sehen Daten
- **Mandantentrennung**: Jeder Nutzer sieht nur seine Kunden (Row Level Security)

## Support & Erweiterungen

Neue Module, Felder oder Funktionen können jederzeit ergänzt werden.
Schreibe einfach Claude an — der Code ist so strukturiert,
dass Erweiterungen einfach einzubauen sind.
