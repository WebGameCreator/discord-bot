# 🍴 Discord Canteen Menu Bot

## 📖 Projektbeschreibung

Dies ist ein maßgeschneiderter Discord-Bot, der mit Node.js entwickelt wurde. Er ruft täglich die aktuellen Mittagsmenüs von Kantinen ab, formatiert sie und stellt sie direkt auf einem Discord-Server bereit. Der Bot fungiert dabei sowohl als On-Demand-Menüanzeige als auch als automatischer täglicher Nachrichtendienst.

Der Bot zieht Live-Daten aus dem Kantinenportal einer Schule oder eines Unternehmens, kategorisiert die angebotenen Speisen (Vegetarisch, Vegan, Grill, Pizza usw.) und stellt sie in einem übersichtlichen Discord-Embed dar. Zudem enthält er interaktive Dropdown-Menüs, mit denen man ganz einfach zwischen verschiedenen Essbereichen (wie dem Hauptrestaurant oder der Cafeteria) wechseln kann. Ach ja, und er hängt automatisch ein bestimmtes GIF an, wenn „Quinoa“ auf dem Speiseplan steht!

## ⚙️ Funktionsweise

Im Hintergrund basiert der Bot auf drei Hauptprozessen:

1. **Web Scraping:** Mithilfe von `cheerio` sendet der Bot eine Fetch-Anfrage an die Website der Kantine (unter Verwendung eines bestimmten Restaurant-ID-Cookies) und scannt das HTML des Menüs. Er steuert den spezifischen Container für den aktuellen Wochentag an und filtert die einzelnen Gänge sowie Produkte heraus.
2. **Datentransformation:** Die unstrukturierten Scraping-Daten werden bereinigt und intelligent kategorisiert. Beispielsweise filtert der Bot überschneidende Ernährungs-Tags heraus, isoliert einzelne Grill- oder Pizza-Gerichte und führt unter bestimmten Bedingungen Elemente zu einem „Menu du jour“ zusammen.
3. **Discord-Integration & Terminierung:** * **Slash-Befehle:** Benutzer können `/menu` eingeben, um das heutige Menü sofort abzurufen.
   * **Nachrichten-Komponenten:** Nutzt Action Rows und String Select Menus von `discord.js`, damit Benutzer interaktiv zwischen den Kantinen-Optionen wechseln können.
   * **Automatisierung:** Verwendet `node-cron`, um den Speiseplan jeden Tag um 07:30 Uhr (Zeitzone Europe/Luxembourg) automatisch in einen dafür vorgesehenen Channel zu posten.

## 💻 Hardware-Anforderungen

Da es sich hierbei um eine hochgradig optimierte, schlanke Node.js-Anwendung handelt, **läuft sie praktisch auf jedem System.** Egal, ob Sie den Bot auf einem kleinen VPS, einer Cloud-Instanz für 5 $ im Monat, einem lokalen Raspberry Pi auf Ihrem Schreibtisch oder Ihrem Hauptrechner laufen lassen möchten: Solange eine Internetverbindung besteht und Node.js ausgeführt werden kann, läuft die Anwendung einwandfrei.

## 🔑 Umgebungsvariablen

Um dieses Projekt auszuführen, müssen Sie eine `.env`-Datei im Stammverzeichnis (Root-Verzeichnis) Ihres Projekts erstellen.

Fügen Sie der `.env`-Datei den folgenden erforderlichen Schlüssel hinzu:

```env
DISCORD_API_KEY=dein_discord_bot_token_hier

```

> **Hinweis:** Der Bot benötigt außerdem eine fest im Code hinterlegte Channel-ID, um die automatischen täglichen Nachrichten zu senden. Bevor Sie den Bot für Ihren eigenen Server starten, stellen Sie sicher, dass Sie `SUBSCRIBED_CHANNEL_ID` ganz oben in der Datei `main.js` so anpassen, dass sie mit der ID Ihres Ziel-Discord-Channels übereinstimmt!

## 🚀 Installation & Start

### Voraussetzungen

* **Node.js**: Version 20.6.0 oder höher ist erforderlich (das Projekt nutzt nativ das mit neueren Node-Versionen eingeführte `--env-file`-Flag).
* **NPM**: Wird automatisch mit Node.js installiert.

### Installationsschritte

1. Klonen Sie dieses Repository auf Ihren lokalen Rechner.
2. Öffnen Sie ein Terminal im Projektverzeichnis.
3. Installieren Sie die erforderlichen Abhängigkeiten:

```bash
npm install

```

4. Stellen Sie sicher, dass Ihre `.env`-Datei eingerichtet ist und sich die Datei `quinoa.gif` im Stammverzeichnis befindet.

### Bot starten

Um den Bot ganz normal über die Befehlszeile zu starten, führen Sie einfach Folgendes aus:

```bash
npm start

```

### Für Entwickler (VS Code)

Wenn Sie Visual Studio Code verwenden, ist bereits eine `launch.json`-Konfiguration vorhanden. Sie können den Bot direkt aus der Entwicklungsumgebung (IDE) heraus ausführen und debuggen:

1. Öffnen Sie in VS Code die Ansicht **Ausführen und Debuggen** (oder drücken Sie `Strg+Umschalt+D`).
2. Wählen Sie **Launch via NPM** aus dem Dropdown-Menü aus.
3. Klicken Sie auf den grünen Start-Button (oder drücken Sie `F5`), um das Debugging zu starten.
