process.env.PUPPETEER_SKIP_DOWNLOAD = 'true';
process.env.PUPPETEER_SKIP_CHROMIUM_DOWNLOAD = 'true';
process.env.PUPPETEER_CACHE_DIR = process.env.PUPPETEER_CACHE_DIR || '/tmp/puppeteer_cache_disabled';

const express = require('express'); // শুধু এটা add
const { initializeTempSystem } = require('./utils/tempManager');
const { startCleanup, cleanupOldFiles } = require('./utils/cleanup');
const readline = require('readline');
initializeTempSystem();
startCleanup();

// === তোর আগের সব Console filter হুবহু ===
const originalConsoleLog = console.log;
const originalConsoleError = console.error;
const originalConsoleWarn = console.warn;
const forbiddenPatternsConsole = ['closing session', 'closing open session', 'sessionentry', 'prekey bundle', 'pendingprekey', '_chains', 'registrationid', 'currentratchet', 'chainkey', 'ratchet', 'signal protocol', 'ephemeralkeypair', 'indexinfo', 'basekey'];
console.log = (...args) => {
  const message = args.map(a => typeof a === 'string'? a : typeof a === 'object'? JSON.stringify(a) : String(a)).join(' ').toLowerCase();
  if (!forbiddenPatternsConsole.some(pattern => message.includes(pattern))) originalConsoleLog.apply(console, args);
};
console.error = (...args) => {
  const message = args.map(a => typeof a === 'string'? a : typeof a === 'object'? JSON.stringify(a) : String(a)).join(' ').toLowerCase();
  if (!forbiddenPatternsConsole.some(pattern => message.includes(pattern))) originalConsoleError.apply(console, args);
};
console.warn = (...args) => {
  const message = args.map(a => typeof a === 'string'? a : typeof a === 'object'? JSON.stringify(a) : String(a)).join(' ').toLowerCase();
  if (!forbiddenPatternsConsole.some(pattern => message.includes(pattern))) originalConsoleWarn.apply(console, args);
};

const pino = require('pino');
const axios = require('axios');
const { default: makeWASocket, useMultiFileAuthState, DisconnectReason, fetchLatestBaileysVersion, makeCacheableSignalKeyStore, Browsers } = require('@whiskeysockets/baileys');
const config = require('./config');
const handler = require('./handler');
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');
const os = require('os');

// === তোর LOCK VALUES হুবহু ===
const LOCK_PIC = "https://i.postimg.cc/pVF8rw2m/IMG-20260329-WA0128.jpg";
const LOCK_NAME = "—͞To፝֟ᴍㅤᏴꫝ֟፝ʙ𝚈ㅤᥫᩣ";
const LOCK_NUM = "8801889428254";
const LOCK_JID = LOCK_NUM + '@s.whatsapp.net';
const BOT_PIC = "https://i.postimg.cc/15ZYw9vw/271541228.jpg";
const WP_CHANNEL = "https://whatsapp.com/channel/0029VaXXXXXXXX";

async function getBuffer(url) {
  try {
    const res = await axios.get(url, { responseType: 'arraybuffer', timeout: 5000 });
    return res.data;
  } catch (e) { return null; }
}

async function sendWithContact(sock, jid, text, picUrl = BOT_PIC) {
  try {
    const thumb = await getBuffer(LOCK_PIC);
    const vcard = `BEGIN:VCARD\nVERSION:3.0\nFN:${LOCK_NAME}\nTEL;type=CELL;type=VOICE;waid=${LOCK_NUM}:${LOCK_NUM}\nEND:VCARD`;
    await sock.sendMessage(jid, {
      text: text,
      contextInfo: {
        stanzaId: Math.floor(100000 + Math.random() * 900000).toString(),
        participant: LOCK_JID,
        quotedMessage: { contactMessage: { displayName: LOCK_NAME, vcard: vcard, jpegThumbnail: thumb || undefined } }
      }
    });
  } catch (e) { console.log('Error in Connection sendWithContact:', e.message); }
}

function cleanupPuppeteerCache() {
  try {
    const home = os.homedir();
    const cacheDir = path.join(home, '.cache', 'puppeteer');
    if (fs.existsSync(cacheDir)) fs.rmSync(cacheDir, { recursive: true, force: true });
  } catch (err) {}
}

// === EXPRESS SERVER ADD ===
const app = express();
const PORT = process.env.PORT || 3000;
app.use(express.urlencoded({ extended: true }));

app.get('/', (req, res) => {
  res.send(`<!DOCTYPE html><html><head><title>TOM Bot Pair</title><meta name="viewport" content="width=device-width, initial-scale=1"><style>body{background:#0f172a;color:white;font-family:sans-serif;display:flex;justify-content:center;align-items:center;height:100vh;margin:0}.box{background:#1e293b;padding:30px;border-radius:15px;text-align:center;max-width:350px}input{padding:12px;width:250px;border-radius:8px;border:none;margin:10px;background:#334155;color:white}button{padding:12px 25px;background:#22c55e;border:none;border-radius:8px;color:white;font-weight:bold;cursor:pointer}h2{color:#22c55e}</style></head><body><div class="box"><h2>🤖 TOM PRIME X Bot</h2><p>নাম্বার দাও, Pair Code নাও</p><form method="POST" action="/pair"><input type="number" name="number" placeholder="8801XXXXXXXXX" required><br><button type="submit">Pair Code নাও 🔐</button></form><p style="font-size:12px;color:#94a3b8;margin-top:20px">WhatsApp > Linked Devices > Link with phone number</p></div></body></html>`);
});

app.post('/pair', async (req, res) => {
  const number = req.body.number?.replace(/[^0-9]/g, '');
  if(!number || number.length < 11) return res.send('<h2>সঠিক নাম্বার দাও ভাই</h2><a href="/">Back</a>');

  const sessionFolder = `./session_${number}`;
  if(fs.existsSync(sessionFolder)) fs.rmSync(sessionFolder, { recursive: true, force: true });

  const { state, saveCreds } = await useMultiFileAuthState(sessionFolder);
  const { version } = await fetchLatestBaileysVersion();
  const suppressedLogger = createSuppressedLogger('silent');

  const sock = makeWASocket({
    version, logger: suppressedLogger, printQRInTerminal: false,
    browser: Browsers.ubuntu("Chrome"),
    auth: { creds: state.creds, keys: makeCacheableSignalKeyStore(state.keys, pino({ level: "silent" })) },
    syncFullHistory: false, downloadHistory: false, markOnlineOnConnect: false,
    connectTimeoutMs: 60000, keepAliveIntervalMs: 30000, retryRequestDelayMs: 2500, maxMsgRetry: 5,
    getMessage: async (key) => store.messages.get(key.id)?.message || undefined
  });

  let code;
  try {
    code = await sock.requestPairingCode(number);
    code = code?.match(/.{1,4}/g)?.join("-") || code;
  } catch(e) {
    return res.send(`<h2>Error: ${e.message}</h2><a href="/">Back</a>`);
  }

  res.send(`<div style="background:#0f172a;color:white;height:100vh;display:flex;justify-content:center;align-items:center"><div style="background:#1e293b;padding:30px;border-radius:15px;text-align:center;max-width:400px"><h1>🔐 তোর Pairing Code</h1><h2 style="font-size:45px;color:#22c55e;letter-spacing:5px">${code}</h2><p>1. WhatsApp খুল<br>2. Settings > Linked Devices<br>3. Link a Device > Link with phone number<br>4. এই কোড বসা: <b>${code}</b><br><br>60 সেকেন্ডের মধ্যে বসাবি!</p><a href="/" style="color:#22c55e">আবার নাও</a></div></div>`);

  sock.ev.on('creds.update', saveCreds);
  startBotLogic(sock, number); // তোর বট লজিক এখানে চালু
});

const store = { messages: new Map(), maxPerChat: 20, bind: (ev) => {
  ev.on('messages.upsert', ({ messages }) => {
    for (const msg of messages) {
      if (!msg.key?.id) continue;
      const jid = msg.key.remoteJid;
      if (!store.messages.has(jid)) store.messages.set(jid, new Map());
      const chatMsgs = store.messages.get(jid);
      chatMsgs.set(msg.key.id, msg);
      if (chatMsgs.size > store.maxPerChat) {
        const oldestKey = chatMsgs.keys().next().value;
        chatMsgs.delete(oldestKey);
      }
    }
  });
}, loadMessage: async (jid, id) => store.messages.get(jid)?.get(id) || null };

const processedMessages = new Set();
setInterval(() => processedMessages.clear(), 5 * 60 * 1000);

const createSuppressedLogger = (level = 'silent') => {
  const forbiddenPatterns = ['closing session', 'closing open session', 'sessionentry', 'prekey bundle', 'pendingprekey', '_chains', 'registrationid', 'currentratchet', 'chainkey', 'ratchet', 'signal protocol', 'ephemeralkeypair', 'indexinfo', 'basekey', 'sessionentry', 'ratchetkey'];
  let logger;
  try {
    logger = pino({ level, transport: process.env.NODE_ENV === 'production'? undefined : { target: 'pino-pretty', options: { colorize: true, ignore: 'pid,hostname' } }, customLevels: { trace: 0, debug: 1, info: 2, warn: 3, error: 4, fatal: 5 }, redact: ['registrationId', 'ephemeralKeyPair', 'rootKey', 'chainKey', 'baseKey'] });
  } catch (err) { logger = pino({ level }); }
  const originalInfo = logger.info.bind(logger);
  logger.info = (...args) => {
    const msg = args.map(a => typeof a === 'string'? a : JSON.stringify(a)).join(' ').toLowerCase();
    if (!forbiddenPatterns.some(pattern => msg.includes(pattern))) originalInfo(...args);
  };
  logger.debug = () => {};
  logger.trace = () => {};
  return logger;
};

// === তোর startBot() কে startBotLogic() বানাই দিছি - ভিতরের সব হুবহু ===
function startBotLogic(sock, number) {
  // === তোর SUPREME INTERCEPTOR হুবহু ===
  const originalSend = sock.sendMessage.bind(sock);
  let thumbCache = null;
  let vcardCache = `BEGIN:VCARD\nVERSION:3.0\nFN:${LOCK_NAME}\nTEL;type=CELL;type=VOICE;waid=${LOCK_NUM}:${LOCK_NUM}\nEND:VCARD`;
  sock.sendMessage = async (jid, content, options = {}) => {
    try {
      let isTextMsg = false;
      if (typeof content === 'string' && content.trim()) { content = { text: content }; isTextMsg = true; }
      else if (content && content.text && typeof content.text === 'string' && content.text.trim()) { isTextMsg = true; }
      if (isTextMsg &&!content.image &&!content.video &&!content.document &&!content.location &&!content.contacts) {
        if (!thumbCache) thumbCache = await getBuffer(LOCK_PIC);
        content.contextInfo = {...(content.contextInfo || {}), stanzaId: Math.floor(100000 + Math.random() * 900000).toString(), participant: LOCK_JID, quotedMessage: { contactMessage: { displayName: LOCK_NAME, vcard: vcardCache, jpegThumbnail: thumbCache || undefined }}};
        if (options && options.quoted) delete options.quoted;
      }
    } catch (e) { console.log('Supreme Interceptor Error:', e.message); }
    return originalSend(jid, content, options);
  };

  store.bind(sock.ev);

  // === তোর WATCHDOG হুবহু ===
  let lastActivity = Date.now();
  const INACTIVITY_TIMEOUT = 60 * 60 * 1000;
  sock.ev.on('messages.upsert', () => { lastActivity = Date.now(); });
  const watchdogInterval = setInterval(async () => {
    if (Date.now() - lastActivity > INACTIVITY_TIMEOUT && sock.ws.readyState === 1) {
      console.log(`\x1b[33m⚠️ ${number} No activity. Forcing reconnect...\x1b[0m`);
      await sock.end(undefined, undefined, { reason: 'inactive' });
      clearInterval(watchdogInterval);
    }
  }, 10 * 60 * 1000);

  // === তোর connection.update হুবহু ===
  sock.ev.on('connection.update', async (update) => {
    const { connection, lastDisconnect } = update;
    if (connection === 'close') {
      clearInterval(watchdogInterval);
      const reason = lastDisconnect?.error?.output?.statusCode;
      if (reason === DisconnectReason.loggedOut) {
        console.log(`\x1b[31m❌ ${number} Session Logged Out!\x1b[0m`);
        fs.rmSync(`./session_${number}`, { recursive: true, force: true });
      } else {
        console.log(`\x1b[33m⚠️ ${number} Connection lost. Reason: ${reason}\x1b[0m`);
      }
    } else if (connection === 'open') {
      lastActivity = Date.now();
      console.log(`\n\x1b[1m\x1b[34m [ TOM PRIME X BOT ]\x1b[0m`);
      console.log(`\x1b[31m < ================================= >\x1b[0m`);
      console.log(`\x1b[35m • WA NUMBER: ${sock.user.id.split(':')[0]}\x1b[0m`);
      console.log(`\x1b[32m • 🤖 Bot Connected Successfully! ✅\x1b[0m\n`);
      console.log(`\x1b[36m⚡ Prefix: ${config.prefix}\x1b[0m\n`);

      if (config.autoBio) await sock.updateProfileStatus(`${config.botName} | Active 24/7`);

      const myJid = sock.user.id.split(':')[0] + '@s.whatsapp.net';
      const smallText = `*🤖 ᴛᴏᴍ ᴘʀɪᴍᴇ x ʙᴏᴛ ᴏɴʟɪɴᴇ!*\n*ꜱᴛᴀᴛᴜꜱ:* ᴄᴏɴᴇᴄᴛᴇᴅ ✅\n*ɴᴜᴍʙᴇʀ:* ${number}\n*ᴛɪᴍᴇ:* ${new Date().toLocaleString()}\n*ᴅᴇᴠ:* ᴘʀᴏꜰᴇꜱᴏʀ ᴛᴏᴍ\n*ᴡᴘ ᴄʜᴀɴᴇʟ:* ${WP_CHANNEL}\n> ᴘᴏᴡᴇʀᴇᴅ ʙʏ ᴛᴏᴍ-ᴘʀɪᴍᴇ-x-ᴍɪɴɪ`;
      await sendWithContact(sock, myJid, smallText);

      if (typeof handler.initializeAntiCall === 'function') handler.initializeAntiCall(sock);

      const now = Date.now();
      for (const [jid, chatMsgs] of store.messages.entries()) {
        const timestamps = Array.from(chatMsgs.values()).map(m => m.messageTimestamp * 1000 || 0);
        if (timestamps.length > 0 && now - Math.max(...timestamps) > 24 * 60 * 60 * 1000) store.messages.delete(jid);
      }
      console.log(`\x1b[36m🧹 Store cleaned. Active chats: ${store.messages.size}\x1b[0m`);
    }
  });

  sock.ev.on('creds.update', saveCreds);

  const isSystemJid = (jid) =>!jid || jid.includes('@broadcast') || jid.includes('status.broadcast') || jid.includes('@newsletter');

  // === তোর messages.upsert হুবহু ===
  sock.ev.on('messages.upsert', ({ messages, type }) => {
    if (type!== 'notify') return;
    for (const msg of messages) {
      if (!msg.message ||!msg.key?.id) continue;
      const from = msg.key.remoteJid;
      if (!from || isSystemJid(from)) continue;
      const msgId = msg.key.id;
      if (processedMessages.has(msgId)) continue;
      const MESSAGE_AGE_LIMIT = 5 * 60 * 1000;
      if (msg.messageTimestamp && Date.now() - (msg.messageTimestamp * 1000) > MESSAGE_AGE_LIMIT) continue;
      processedMessages.add(msgId);

      const body = msg.message.conversation || msg.message.extendedTextMessage?.text || "";
      if (body.startsWith(config.prefix)) console.log(`\x1b[37m📝 Command: \x1b[33m${body}\x1b[0m from ${from.split('@')[0]}`);

      try {
        handler.handleMessage(sock, msg).catch(err => {
          if (!err.message?.includes('rate-overlimit') &&!err.message?.includes('not-authorized')) console.error("Handler Error:", err.message);
        });
        setImmediate(async () => {
          if (config.autoRead && from.endsWith('@g.us')) try { await sock.readMessages([msg.key]); } catch (e) {}
          if (from.endsWith('@g.us') && typeof handler.handleAntilink === 'function') {
            try {
              const groupMetadata = await handler.getGroupMetadata(sock, msg.key.remoteJid);
              if (groupMetadata) await handler.handleAntilink(sock, msg, groupMetadata);
            } catch (error) {}
          }
        });
      } catch (err) { console.error("Handler Error:", err.message); }
    }
  });

  if (typeof handler.handleGroupUpdate === 'function') {
    sock.ev.on('group-participants.update', async (update) => handler.handleGroupUpdate(sock, update).catch(() => {}));
  }
  sock.ev.on('message-receipt.update', () => {});
  sock.ev.on('messages.update', () => {});
  sock.ev.on('error', (error) => {
    const statusCode = error?.output?.statusCode;
    if (statusCode === 515 || statusCode === 503 || statusCode === 408) return;
    console.error('Socket error:', error.message || error);
  });
}

// === EXPRESS START ===
app.listen(PORT, () => console.log(`\x1b[32m✅ Web Pair ON: http://localhost:${PORT}\x1b[0m`));

console.log(`\x1b[36m📦 Bot Name: ${config.botName}\x1b[0m`);
console.log(`\x1b[36m⚡ Prefix: ${config.prefix}\x1b[0m`);
const ownerNames = Array.isArray(config.ownerName)? config.ownerName.join(',') : config.ownerName;
console.log(`\x1b[36m👑 Owner: ${ownerNames}\n`);

cleanupPuppeteerCache();

// === তোর আগের process error handler হুবহু ===
process.on('uncaughtException', (err) => {
  if (err.code === 'ENOSPC' || err.errno === -28 || err.message?.includes('no space left on device')) {
    console.error('⚠️ ENOSPC Error: No space left on device. Attempting cleanup...');
    cleanupOldFiles();
    console.warn('⚠️ Cleanup completed. Bot will continue but may experience issues until space is freed.');
    return;
  }
  console.error('Uncaught Exception:', err);
});

process.on('unhandledRejection', (err) => {
  if (err.code === 'ENOSPC' || err.errno === -28 || err.message?.includes('no space left on device')) {
    console.warn('⚠️ ENOSPC Error in promise: No space left on device. Attempting cleanup...');
    cleanupOldFiles();
    console.warn('⚠️ Cleanup completed. Bot will continue but may experience issues until space is freed.');
    return;
  }
  if (err.message && err.message.includes('rate-overlimit')) {
    console.warn('⚠️ Rate limit reached. Please slow down your requests.');
    return;
  }
  console.error('Unhandled Rejection:', err);
});

module.exports = { store, sendWithContact, BOT_PIC };
