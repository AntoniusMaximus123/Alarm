# Trade-Alarm – Schritte für morgen (mit ntfy.sh, kostenlos)

## Fertig gebaut und getestet
- Code komplett geschrieben, Syntax geprüft
- JSON-Auswertung der Fehlererkennung getestet – funktioniert
- ntfy.sh-Alarm eingebaut (kostenlos, kein Konto/Kreditkarte nötig)

## Wichtiger ehrlicher Punkt zu ntfy.sh
ntfy.sh hat KEINE eingebaute "wiederhole bis bestätigt"-Funktion wie die bezahlte Pushover-App.
Als Ersatz: Solange der Fehler weiterbesteht, wird bei jedem Check (alle 60 Sek.) erneut alarmiert.
Das nervt zwar mehr, kostet aber nichts, und wiederholt sich trotzdem automatisch.

## NICHT testbar ohne deine Zugangsdaten (ehrlich gesagt)
- Echter Login bei Tradovate
- Echte ntfy-Benachrichtigung (ntfy.sh ist in meiner Testumgebung nicht erreichbar)
- Echter Claude-Bildcheck

## Deine Schritte (in dieser Reihenfolge)

1. **ntfy-App installieren**: App Store oder Google Play, "ntfy" suchen, kostenlos installieren.
2. **Eigenes "Thema" (Topic) ausdenken**: In der App auf "+" klicken, einen eigenen, einzigartigen Namen eingeben, z. B. "antonius-trade-alarm-7392" (muss einzigartig sein, sonst kann jeder mitlesen - keine Leerzeichen, keine Umlaute).
3. **Priorität/Ton einstellen**: In der App bei diesem Topic auf die Einstellungen gehen → Priorität "Urgent"/"Notfall" auswählen → eigenen Ton zuweisen.
4. **Nicht-Stören überschreiben erlauben** (Android): Handy-Einstellungen → Apps → ntfy → Benachrichtigungen → "Nicht stören überschreiben" oder "Wichtige Benachrichtigungen" aktivieren.
5. **Render.com-Konto** (kostenlos): render.com → registrieren.
6. **Neuen Worker anlegen**: dashboard.render.com → "New +" → "Background Worker" → Code-Ordner hochladen bzw. per GitHub verbinden.
7. **Zugangsdaten eintragen**: bei Render unter "Environment" die Werte aus `.env.example` eintragen (dein ntfy-Topic-Name aus Schritt 2, deinen Anthropic-API-Key, Tradovate-Link).
8. **Tradovate-Login einrichten**: der einzige Punkt, der nicht Copy-Paste ist – dafür kommst du hier im Chat zurück, dann richten wir das gemeinsam einmalig ein.
9. Worker starten.

## Ehrlicher Punkt
Schritt 8 ist der einzige Teil, der noch echte Arbeit braucht. Alles andere ist vorbereitet.
