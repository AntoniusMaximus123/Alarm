require('dotenv').config();
const puppeteer = require('puppeteer');
const http = require('http');

const {
  NTFY_TOPIC,
  TRADOVATE_URL,
  TRADOVATE_USERNAME,
  TRADOVATE_PASSWORD,
  CHECK_INTERVAL_MS,
  PORT,
} = process.env;

const INTERVAL = parseInt(CHECK_INTERVAL_MS || '60000', 10);

const FEHLER_STICHWOERTER = [
  'Rejected',
  'rejected',
  'Execution Stopped',
  'execution stopped',
  'Error',
  'Fehler',
];

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

async function login(page) {
  console.log('Versuche Login...');
  await page.goto(TRADOVATE_URL, { waitUntil: 'networkidle2', timeout: 60000 });

  await page.waitForSelector('input[type="email"], input[name="email"], input[type="text"]', { timeout: 20000 });

  const emailSelector = await page.$('input[type="email"]') ? 'input[type="email"]'
    : await page.$('input[name="email"]') ? 'input[name="email"]'
    : 'input[type="text"]';

  await page.type(emailSelector, TRADOVATE_USERNAME, { delay: 50 });
  await page.type('input[type="password"]', TRADOVATE_PASSWORD, { delay: 50 });

  await Promise.all([
    page.keyboard.press('Enter'),
    page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 30000 }).catch(() => {}),
  ]);

  console.log('Login-Versuch abgeschlossen.');
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
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 1400, height: 900 });

  await login(page);

  console.log('Monitor gestartet. Pruefintervall (ms):', INTERVAL);

  setInterval(() => {
    checkOnce(page).catch((e) => console.error('Fehler bei Pruefung:', e.message));
  }, INTERVAL);
}

main().catch((e) => {
  console.error('Fataler Fehler:', e);
  process.exit(1);
});
