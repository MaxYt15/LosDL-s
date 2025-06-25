const express = require('express');
const path = require('path');
const puppeteer = require('puppeteer');
const http = require('http');
const WebSocket = require('ws');

const app = express();
const server = http.createServer(app);
const PORT = 3100;

// Serve static files from the public directory
app.use(express.static(path.join(__dirname, 'public')));

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Ruta amigable para la sala
app.get('/sala', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'sala.html'));
});

// Redirigir /sala.html a /sala
app.get('/sala.html', (req, res) => {
  res.redirect('/sala');
});

// --- INICIO DEL BOT ANFITRIÓN JITSI ---
const JITSI_URL = 'https://meet.jit.si/LosDLsSalaVoz2024_TuClaveUnica'; // Usa el mismo nombre de sala que tu frontend
const GOOGLE_EMAIL = 'sunlev52@gmail.com';
const GOOGLE_PASS = 'Sunkovv19';

(async () => {
  try {
    const browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--use-fake-ui-for-media-stream']
    });
    const page = await browser.newPage();
    await page.goto(JITSI_URL);

    // Espera a que aparezca el botón de "Soy el anfitrión"
    await page.waitForSelector('button[aria-label="Soy el anfitrión"]', {timeout: 60000});
    await page.click('button[aria-label="Soy el anfitrión"]');

    // Espera a que aparezca el botón de Google
    await page.waitForSelector('button[aria-label="Iniciar sesión con Google"]', {timeout: 60000});
    await page.click('button[aria-label="Iniciar sesión con Google"]');

    // Login de Google
    await page.waitForSelector('input[type="email"]', {timeout: 60000});
    await page.type('input[type="email"]', GOOGLE_EMAIL);
    await page.keyboard.press('Enter');
    await page.waitForTimeout(2000);
    await page.waitForSelector('input[type="password"]', {timeout: 60000});
    await page.type('input[type="password"]', GOOGLE_PASS);
    await page.keyboard.press('Enter');

    // Espera a que la sala esté activa
    await page.waitForSelector('button[aria-label="microphone"]', {timeout: 60000});
    console.log('¡Bot anfitrión activo en la sala!');

    // Mantén el bot en la sala
    await new Promise(() => {});
  } catch (err) {
    console.error('Error iniciando el bot anfitrión Jitsi:', err);
  }
})();

// --- Servidor WebSocket para señalización WebRTC en el mismo puerto ---
const wss = new WebSocket.Server({ server });

let clients = {};

wss.on('connection', function connection(ws) {
  let userId = null;

  ws.on('message', function incoming(message) {
    let data;
    try {
      data = JSON.parse(message);
    } catch (e) {
      return;
    }
    if (data.type === 'register') {
      userId = data.userId;
      clients[userId] = ws;
    } else if (data.type === 'signal' && data.to && clients[data.to]) {
      // Reenvía la señalización al destinatario
      clients[data.to].send(JSON.stringify({
        from: userId,
        signal: data.signal
      }));
    }
  });

  ws.on('close', function() {
    if (userId && clients[userId]) {
      delete clients[userId];
    }
  });
});

server.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
