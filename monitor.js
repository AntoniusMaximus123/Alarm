require('dotenv').config();
const puppeteer = require('puppeteer');
const http = require('http');

const {
  NTFY_TOPIC,
  TRADOVATE_URL,
  CHECK_INTERVAL_MS,
  PORT,
} = process.env;

const INTERVAL = parseInt(CHECK_INTERVAL_MS || '60000', 10);
const USER_DATA_DIR = '/data/chrome-profile'; // persistenter Login-Speicher (Render Persistent Disk)

// Fehler-Stichwörter im reinen Text der Seite - komplett kostenlos, keine KI noetig.
const FEHLER_STICHWOERTER = [
  'Rejected',
  'rejected',
  'Execution Stopped',
  'execution stopped',
  'Error',
  'Fehler',
];

// Winziger Webserver, NUR damit Render das als kostenlosen "Web Service" akzeptiert
// und ein externer Ping-Dienst (z.B. cron-job.org) die App wachhalten kann.
http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/plain' });
  res.end('Trade-Alarm laeuft.');
}).listen(PORT || 3000, () => {
  console.log('Health-Check-Server laeuft auf Port', PORT || 3000);
});

async function sendAlert(grund) {
  const message = `Grund: ${grund}\nZu tun: Pruefe das Tradovate Aktivitaetsprotokoll und den offenen Trade manuell.`;

  const res = await fetch(`https://ntfy.sh/${NTFY_TOPIC}`, {
    method: 'POST',
    headers: {
      'Title': 'TRADE ALARM - Eingriff noetig',
      'Priority': 'urgent',
      'Tags': 'rotating_light',
    },
    body: message,
  });

  console.log('ALARM gesendet:', message, res.status);
}

async function checkOnce(page) {
  await page.reload({ waitUntil: 'networkidle2', timeout: 30000 });
  const pageText = await page.evaluate(() => document.body.innerText);

  const gefundenesStichwort = FEHLER_STICHWOERTER.find((wort) => pageText.includes(wort));

  console.log(new Date().toISOString(), gefundenesStichwort ? `Fehler gefunden: ${gefundenesStichwort}` : 'Alles ok');

  if (gefundenesStichwort) {
    await sendAlert(`Auf der Seite wurde das Stichwort "${gefundenesStichwort}" gefunden.`);
  }
}

async function main() {
  const browser = await puppeteer.launch({
    headless: true,
    userDataDir: USER_DATA_DIR,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 1400, height: 900 });
  await page.goto(TRADOVATE_URL, { waitUntil: 'networkidle2', timeout: 60000 });

  console.log('Monitor gestartet. Pruefintervall (ms):', INTERVAL);

  setInterval(() => {
    checkOnce(page).catch((e) => console.error('Fehler bei Pruefung:', e.message));
  }, INTERVAL);
}

main().catch((e) => {
  console.error('Fataler Fehler:', e);
  process.exit(1);
});
