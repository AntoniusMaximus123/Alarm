require('dotenv').config();
const puppeteer = require('puppeteer');
const fs = require('fs');
const http = require('http');

const {
  NTFY_TOPIC,
  ANTHROPIC_API_KEY,
  TRADOVATE_URL,
  CHECK_INTERVAL_MS,
  PORT,
} = process.env;

const INTERVAL = parseInt(CHECK_INTERVAL_MS || '60000', 10);
const USER_DATA_DIR = '/data/chrome-profile';

http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/plain' });
  res.end('Trade-Alarm laeuft.');
}).listen(PORT || 3000, () => {
  console.log('Health-Check-Server laeuft auf Port', PORT || 3000);
});

async function askClaudeIfActionNeeded(base64Image) {
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-6',
      max_tokens: 300,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'image',
              source: { type: 'base64', media_type: 'image/png', data: base64Image },
            },
            {
              type: 'text',
              text: `Das ist ein Screenshot des Tradovate Aktivitätsprotokolls / Panels eines Trading-Bots.
Antworte NUR mit reinem JSON, kein Markdown, kein Fließtext davor oder danach:
{"eingriff_noetig": true/false, "grund": "kurze Erklärung was passiert ist", "handlung": "was der Nutzer konkret jetzt tun soll, sehr knapp und konkret"}

Eingriff ist NUR nötig bei: abgelehnter Order ("Rejected"), fehlendem Stop-Loss bei offener Position, Fehlermeldung, oder wenn der Bot-Status auf einen Fehlerzustand hindeutet.
Eingriff ist NICHT nötig bei: normalem Trade-Ablauf, "FERTIG", "RANGE LÄUFT", "WARTE AUF BREAKOUT-CLOSE", "IM TRADE" mit korrekt gesetztem Stop/Ziel.`,
            },
          ],
        },
      ],
    }),
  });
  const data = await res.json();
  const text = data?.content?.find((b) => b.type === 'text')?.text || '{}';
  const clean = text.replace(/```json|```/g, '').trim();
  try {
    return JSON.parse(clean);
  } catch (e) {
    console.error('Konnte Claude-Antwort nicht parsen:', text);
    return { eingriff_noetig: false, grund: 'Parse-Fehler', handlung: '' };
  }
}

async function sendAlert(grund, handlung) {
  const message = `Grund: ${grund}\nZu tun: ${handlung}`;

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
  const screenshotPath = '/tmp/check.png';
  await page.screenshot({ path: screenshotPath, fullPage: false });
  const base64Image = fs.readFileSync(screenshotPath).toString('base64');

  const result = await askClaudeIfActionNeeded(base64Image);
  console.log(new Date().toISOString(), result);

  if (result.eingriff_noetig) {
    await sendAlert(result.grund, result.handlung);
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

  console.log('Monitor gestartet. Prüfintervall (ms):', INTERVAL);

  setInterval(() => {
    checkOnce(page).catch((e) => console.error('Fehler bei Prüfung:', e.message));
  }, INTERVAL);
}

main().catch((e) => {
  console.error('Fataler Fehler:', e);
  process.exit(1);
});
