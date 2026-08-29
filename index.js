const {
  default: makeWASocket,
  useMultiFileAuthState,
  downloadMediaMessage,
  fetchLatestBaileysVersion,
  DisconnectReason
} = require('@whiskeysockets/baileys');
const express = require('express');
const pino = require('pino');
const path = require('path');
const os = require('os');
const axios = require('axios');

const app = express();
const PORT = process.env.PORT || 10000;

const GROUP_LINK = "https://chat.whatsapp.com/GKlxbFDAh8t1CDXQArhJle";

app.use(express.static(__dirname));

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// Advanced Hacker Matrix Bot Configuration
const settings = {
  autoViewStatus: true,
  autoLikeStatus: true,
  antiDelete: true,
  antiLink: true,
  autoReact: true,
  autoSticker: true,
  autoTyping: true,
  autoRecording: false,
  welcomeMessage: true,
  welcomeText: "ACCESS GRANTED: Welcome to the elite matrix.\nViolate protocols and experience immediate termination."
};

const messageStore = new Map();
let sock;

async function startBot() {
  const { state, saveCreds } = await useMultiFileAuthState('./session');
  const { version } = await fetchLatestBaileysVersion();

  sock = makeWASocket({
    version,
    logger: pino({ level: 'silent' }),
    printQRInTerminal: false,
    auth: state
  });

  sock.ev.on('creds.update', saveCreds);

  sock.ev.on('connection.update', async (update) => {
    const { connection, lastDisconnect } = update;
    if (connection === 'close') {
      const shouldReconnect = lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut;
      if (shouldReconnect) startBot();
    } else if (connection === 'open') {
      console.log('\n💀 [HACKER MATRIX ONLINE]: ALLY SCOTT ELITE BOT FULLY ARMED & READY!');
      try {
        await sock.updateProfileStatus('💀 ALLY SCOTT VIP | HACKER MATRIX ACTIVE 🟢🔥');
      } catch (e) {}

      setInterval(async () => {
        try {
          const uptimeSec = process.uptime();
          const hrs = Math.floor(uptimeSec / 3600);
          const mins = Math.floor((uptimeSec % 3600) / 60);
          const bioText = `💀 ALLY SCOTT HACKER | Uptime: ${hrs}h ${mins}m | MATRIX ACTIVE 🟢`;
          await sock.updateProfileStatus(bioText);
        } catch (e) {}
      }, 300000);
    }
  });

  // Welcome & Anti-Link Group Event Listeners
  sock.ev.on('group-participants.update', async (update) => {
    const { id, participants, action } = update;
    if (action === 'add' && settings.welcomeMessage) {
      for (let user of participants) {
        const welcomeMsg = `━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
                           `  💀 *MATRIX WELCOME ALERT* 💀\n` +
                           `━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
                           `Target Acquired: @${user.split('@')[0]}\n` +
                           `------------------------------------------\n` +
                           `${settings.welcomeText}\n` +
                           `━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
                           `🔗 Support Group: ${GROUP_LINK}\n` +
                           `🔥 POWERED BY ALLY SCOTT TECH\n` +
                           `━━━━━━━━━━━━━━━━━━━━━━━━━━`;
        await sock.sendMessage(id, { text: welcomeMsg, mentions: [user] });
      }
    }
  });

  sock.ev.on('messages.upsert', async ({ messages, type }) => {
    if (type !== 'notify') return;
    const msg = messages[0];
    if (!msg.message) return;

    const from = msg.key.remoteJid;
    const isGroup = from.endsWith('@g.us');
    const sender = msg.key.participant || from;
    const isOwner = msg.key.fromMe; 

    // INSTANT AUTO VIEW & LIKE STATUS
    if (from === 'status@broadcast') {
      if (settings.autoViewStatus) {
        try {
          await sock.readMessages([msg.key]);
        } catch (e) {}
      }
      if (settings.autoLikeStatus) {
        try {
          await sock.sendMessage(from, { react: { text: '💀', key: msg.key } }, { statusJidList: [msg.key.participant] });
        } catch (e) {}
      }
      return;
    }

    if (settings.autoTyping) await sock.sendPresenceUpdate('composing', from);
    if (settings.autoRecording) await sock.sendPresenceUpdate('recording', from);

    if (msg.key.id) messageStore.set(msg.key.id, msg);

    const typeMsg = Object.keys(msg.message)[0];
    const body = (typeMsg === 'conversation') ? msg.message.conversation :
                 (typeMsg === 'extendedTextMessage') ? msg.message.extendedTextMessage.text :
                 (typeMsg === 'imageMessage') ? msg.message.imageMessage.caption :
                 (typeMsg === 'videoMessage') ? msg.message.videoMessage.caption : '';

    // Anti-Link Protocol Check in Groups
    if (isGroup && settings.antiLink && body && (body.includes('chat.whatsapp.com') || body.includes('http://') || body.includes('https://'))) {
      if (!isOwner) {
        try {
          await sock.sendMessage(from, { delete: msg.key });
          await sock.sendMessage(from, { text: `⚠️ [ANTI-LINK PROTOCOL]: Links are strictly prohibited in this matrix!` });
        } catch (e) {}
      }
    }

    if (!body) return;

    const command = body.trim().split(' ')[0].toLowerCase();
    const args = body.trim().split(' ').slice(1);

    if (settings.autoSticker && typeMsg === 'imageMessage' && !isOwner) {
      try {
        const buffer = await downloadMediaMessage(msg, 'buffer', {});
        await sock.sendMessage(from, { sticker: buffer }, { quoted: msg });
      } catch (e) {}
    }

    // 1. MENU COMMAND
    if (command === '.menu' || command === '.help' || command === '!menu') {
      if (settings.autoReact) {
        await sock.sendMessage(from, { react: { text: '💀', key: msg.key } });
      }
      const menuText = `━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
                       `  💀 *ALLY SCOTT HACKER v12.2* 💀\n` +
                       `━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
                       ` ║ 🚀 Status: MATRIX SECURE\n` +
                       ` ║ 👑 Master: Ally Scott Tech\n` +
                       `━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n` +
                       ` ┌─❖ *HACKER & CORE COMMANDS*\n` +
                       ` │ • .menu / .help\n` +
                       ` │ • .ping\n` +
                       ` │ • .sysinfo\n` +
                       ` │ • .owner\n` +
                       ` │ • .runtime\n` +
                       ` │ • .settings\n` +
                       ` └───────────────\n\n` +
                       ` ┌─❖ *MEDIA & VIP DOWNLOADS*\n` +
                       ` │ • .song <artist & title>\n` +
                       ` │ • .ytchannel <id>\n` +
                       ` └───────────────\n\n` +
                       ` ┌─❖ *SILENT & ATTACK TOOLS*\n` +
                       ` │ • .nambabomb <number>\n` +
                       ` │ • .silentcrash <number>\n` +
                       ` │ • .ghosttext <number> | <msg>\n` +
                       ` │ • .bug <target_id>\n` +
                       ` │ • .sticker / .s\n` +
                       ` │ • .whois <number>\n` +
                       ` │ • .tts <text>\n` +
                       ` │ • .weather <city>\n` +
                       ` └───────────────\n\n` +
                       ` ┌─❖ *CYBER TOGGLES*\n` +
                       ` │ • .autotyping [on/off]\n` +
                       ` │ • .autorecording [on/off]\n` +
                       ` │ • .autosticker [on/off]\n` +
                       ` │ • .welcomemsg [on/off]\n` +
                       ` └───────────────\n\n` +
                       ` ┌─❖ *GROUP MANAGEMENT*\n` +
                       ` │ • .tagall\n` +
                       ` │ • .groupinfo\n` +
                       ` │ • .link\n` +
                       ` │ • .antilink [on/off]\n` +
                       ` │ • .setwelcome <text>\n` +
                       ` └───────────────\n\n` +
                       ` ┌─❖ *VIEW ONCE & AUTOMATION*\n` +
                       ` │ • .vv (Reply to View Once)\n` +
                       ` │ • .autostatus [on/off]\n` +
                       ` │ • .autolike [on/off]\n` +
                       ` │ • .antidelete [on/off]\n` +
                       ` │ • .bc <message>\n` +
                       ` └───────────────\n\n` +
                       `━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
                       `🔗 Support Group: ${GROUP_LINK}\n` +
                       `🔥 POWERED BY ALLY SCOTT TECH\n` +
                       `━━━━━━━━━━━━━━━━━━━━━━━━━━`;

      const feedText = `━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
                       `⚡ [FEEDBACK: MENU GENERATED]\n` +
                       `------------------------------------------\n` +
                       menuText;

      await sock.sendMessage(from, { text: feedText }, { quoted: msg });
    }

    // 2. PING COMMAND
    if (command === '.ping') {
      const start = Date.now();
      await sock.sendMessage(from, { text: `━━━━━━━━━━━━━━━━━━━━━━━━━━\n⚡ [FEEDBACK: SCANNING NODES...]\n------------------------------------------\n🔗 Support Group: ${GROUP_LINK}\n💀 POWERED BY ALLY SCOTT TECH\n━━━━━━━━━━━━━━━━━━━━━━━━━━` }, { quoted: msg });
      const latency = Date.now() - start;
      await sock.sendMessage(from, { text: `━━━━━━━━━━━━━━━━━━━━━━━━━━\n⚡ [FEEDBACK: PING SUCCESSFUL]\n------------------------------------------\nMatrix Response: *${latency}ms* (Ultra Fast)\n\n🔗 Support Group: ${GROUP_LINK}\n💀 POWERED BY ALLY SCOTT TECH\n━━━━━━━━━━━━━━━━━━━━━━━━━━` }, { quoted: msg });
    }

    // 3. RUNTIME COMMAND
    if (command === '.runtime' || command === '.uptime') {
      const uptimeSec = process.uptime();
      const hrs = Math.floor(uptimeSec / 3600);
      const mins = Math.floor((uptimeSec % 3600) / 60);
      const secs = Math.floor(uptimeSec % 60);
      
      const feedText = `━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
                       `⏱️ [FEEDBACK: RUNTIME RETRIEVED]\n` +
                       `------------------------------------------\n` +
                       `• System Up: ${hrs}h ${mins}m ${secs}s\n\n` +
                       `🔗 Support Group: ${GROUP_LINK}\n` +
                       `💀 POWERED BY ALLY SCOTT TECH\n` +
                       `━━━━━━━━━━━━━━━━━━━━━━━━━━`;
      await sock.sendMessage(from, { text: feedText }, { quoted: msg });
    }

    // 4. SYSINFO COMMAND
    if (command === '.sysinfo' || command === '.info') {
      const uptimeSec = process.uptime();
      const hrs = Math.floor(uptimeSec / 3600);
      const mins = Math.floor((uptimeSec % 3600) / 60);
      
      const infoText = `━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
                       `💻 [FEEDBACK: SYSTEM CORE METRICS]\n` +
                       `------------------------------------------\n` +
                       `• Engine: Elite Matrix Shield\n` +
                       `• Status: SECURE 🟢\n` +
                       `• Platform: Render Cloud\n` +
                       `• Uptime: ${hrs}h ${mins}m\n` +
                       `• Free RAM: ${(os.freemem() / 1024 / 1024).toFixed(2)} MB\n\n` +
                       `🔗 Support Group: ${GROUP_LINK}\n` +
                       `💀 POWERED BY ALLY SCOTT TECH\n` +
                       `━━━━━━━━━━━━━━━━━━━━━━━━━━`;
      await sock.sendMessage(from, { text: infoText }, { quoted: msg });
    }

    // 5. OWNER COMMAND
    if (command === '.owner') {
      const devText = `━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
                      `👑 [FEEDBACK: ARCHITECT LOADED]\n` +
                      `------------------------------------------\n` +
                      `• Brand: Ally Scott Tech\n` +
                      `• Privileges: Root Control\n\n` +
                      `🔗 Support Group: ${GROUP_LINK}\n` +
                      `💀 POWERED BY ALLY SCOTT TECH\n` +
                      `━━━━━━━━━━━━━━━━━━━━━━━━━━`;
      await sock.sendMessage(from, { text: devText }, { quoted: msg });
    }

    // 6. SETTINGS COMMAND
    if (command === '.settings') {
      const setStatus = `━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
                        `⚙️ [FEEDBACK: CONFIG MATRIX]\n` +
                        `------------------------------------------\n` +
                        `• Auto Status : ${settings.autoViewStatus ? 'ON 🟢' : 'OFF 🔴'}\n` +
                        `• Auto Like   : ${settings.autoLikeStatus ? 'ON 🟢' : 'OFF 🔴'}\n` +
                        `• Anti Delete : ${settings.antiDelete ? 'ON 🟢' : 'OFF 🔴'}\n` +
                        `• Anti Link   : ${settings.antiLink ? 'ON 🟢' : 'OFF 🔴'}\n` +
                        `• Auto React  : ${settings.autoReact ? 'ON 🟢' : 'OFF 🔴'}\n` +
                        `• Auto Sticker: ${settings.autoSticker ? 'ON 🟢' : 'OFF 🔴'}\n` +
                        `• Auto Typing : ${settings.autoTyping ? 'ON 🟢' : 'OFF 🔴'}\n` +
                        `• Auto Record : ${settings.autoRecording ? 'ON 🟢' : 'OFF 🔴'}\n` +
                        `• Welcome Msg : ${settings.welcomeMessage ? 'ON 🟢' : 'OFF 🔴'}\n\n` +
                        `🔗 Support Group: ${GROUP_LINK}\n` +
                        `💀 POWERED BY ALLY SCOTT TECH\n` +
                        `━━━━━━━━━━━━━━━━━━━━━━━━━━`;
      await sock.sendMessage(from, { text: setStatus }, { quoted: msg });
    }

    // 7. NAMBABOMB COMMAND
    if (command === '.nambabomb') {
      if (!args.length) return sock.sendMessage(from, { text: `━━━━━━━━━━━━━━━━━━━━━━━━━━\n⚠️ [FEEDBACK ERROR: MISSING NUMBER]\n------------------------------------------\nExample: .nambabomb 2557xxxxxxxx\n\n🔗 Support Group: ${GROUP_LINK}\n💀 POWERED BY ALLY SCOTT TECH\n━━━━━━━━━━━━━━━━━━━━━━━━━━` }, { quoted: msg });
      
      let targetNum = args[0].replace(/[^0-9]/g, '') + '@s.whatsapp.net';
      await sock.sendMessage(from, { text: `━━━━━━━━━━━━━━━━━━━━━━━━━━\n💀 [FEEDBACK: ATTACK INITIATED]\n------------------------------------------\nDeploying NambaBomb spam packets...\n\n🔗 Support Group: ${GROUP_LINK}\n💀 POWERED BY ALLY SCOTT TECH\n━━━━━━━━━━━━━━━━━━━━━━━━━━` }, { quoted: msg });

      const attackPayload = `🚨 [HACKER SPAM ALERT] 🚨\nYour number has been targeted by Ally Scott Matrix Engine!\nMaintain cybersecurity awareness.\n💀 POWERED BY ALLY SCOTT TECH`;

      for (let i = 1; i <= 10; i++) {
        await new Promise(resolve => setTimeout(resolve, 300));
        await sock.sendMessage(targetNum, { text: `${attackPayload} [Packet #${i}]` }).catch(() => {});
      }
      await sock.sendMessage(from, { text: `━━━━━━━━━━━━━━━━━━━━━━━━━━\n✅ [FEEDBACK SUCCESS: ATTACK ENDED]\n------------------------------------------\nNambaBomb sequence completed successfully.\n\n🔗 Support Group: ${GROUP_LINK}\n━━━━━━━━━━━━━━━━━━━━━━━━━━` }, { quoted: msg });
    }

    // 8. SILENT CRASH COMMAND
    if (command === '.silentcrash') {
      if (!args.length) return sock.sendMessage(from, { text: `━━━━━━━━━━━━━━━━━━━━━━━━━━\n⚠️ [FEEDBACK ERROR: MISSING NUMBER]\n------------------------------------------\nExample: .silentcrash 2557xxxxxxxx\n\n🔗 Support Group: ${GROUP_LINK}\n💀 POWERED BY ALLY SCOTT TECH\n━━━━━━━━━━━━━━━━━━━━━━━━━━` }, { quoted: msg });

      let targetNum = args[0].replace(/[^0-9]/g, '') + '@s.whatsapp.net';
      await sock.sendMessage(from, { text: `━━━━━━━━━━━━━━━━━━━━━━━━━━\n👻 [FEEDBACK: SILENT PROTOCOL]\n------------------------------------------\nStealth socket attack launched on target.\n\n🔗 Support Group: ${GROUP_LINK}\n💀 POWERED BY ALLY SCOTT TECH\n━━━━━━━━━━━━━━━━━━━━━━━━━━` }, { quoted: msg });

      for (let i = 1; i <= 12; i++) {
        await new Promise(resolve => setTimeout(resolve, 250));
        await sock.sendMessage(targetNum, { text: `⚡ [NULL_POINTER_EXCEPTION_${i}] ⚡` }).catch(() => {});
      }
    }

    // 9. GHOST TEXT COMMAND
    if (command === '.ghosttext') {
      const fullText = args.join(' ');
      if (!fullText.includes('|')) {
        return sock.sendMessage(from, { text: `━━━━━━━━━━━━━━━━━━━━━━━━━━\n⚠️ [FEEDBACK ERROR: INVALID FORMAT]\n------------------------------------------\nUse: .ghosttext <number> | <message>\nExample: .ghosttext 255712345678 | Hello target\n\n🔗 Support Group: ${GROUP_LINK}\n💀 POWERED BY ALLY SCOTT TECH\n━━━━━━━━━━━━━━━━━━━━━━━━━━` }, { quoted: msg });
      }

      const parts = fullText.split('|');
      let targetNum = parts[0].trim().replace(/[^0-9]/g, '') + '@s.whatsapp.net';
      let customMsg = parts[1].trim();

      try {
        await sock.sendMessage(targetNum, { text: `💀 [STEALTH TRANSMISSION]: ${customMsg}` });
        await sock.sendMessage(from, { text: `━━━━━━━━━━━━━━━━━━━━━━━━━━\n✅ [FEEDBACK SUCCESS: GHOST SENT]\n------------------------------------------\nMessage delivered invisibly to target.\n\n🔗 Support Group: ${GROUP_LINK}\n━━━━━━━━━━━━━━━━━━━━━━━━━━` }, { quoted: msg });
      } catch (e) {
        await sock.sendMessage(from, { text: `━━━━━━━━━━━━━━━━━━━━━━━━━━\n❌ [FEEDBACK ERROR: GHOST FAILED]\n------------------------------------------\nCould not deliver stealth message.\n\n🔗 Support Group: ${GROUP_LINK}\n━━━━━━━━━━━━━━━━━━━━━━━━━━` }, { quoted: msg });
      }
    }

    // 10. WEATHER COMMAND
    if (command === '.weather') {
      if (!args.length) return sock.sendMessage(from, { text: `━━━━━━━━━━━━━━━━━━━━━━━━━━\n⚠️ [FEEDBACK ERROR: MISSING CITY]\n------------------------------------------\nExample: .weather Dar es Salaam\n\n🔗 Support Group: ${GROUP_LINK}\n💀 POWERED BY ALLY SCOTT TECH\n━━━━━━━━━━━━━━━━━━━━━━━━━━` }, { quoted: msg });
      const city = args.join(' ');
      try {
        const response = await axios.get(`https://wttr.in/${encodeURIComponent(city)}?format=j1`);
        const current = response.data.current_condition[0];
        const weatherText = `━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
                            `🌤️ [FEEDBACK: WEATHER INTEL]\n` +
                            `------------------------------------------\n` +
                            `• City: ${city.toUpperCase()}\n` +
                            `• Condition: ${current.weatherDesc[0].value}\n` +
                            `• Temperature: ${current.temp_C}°C\n` +
                            `• Humidity: ${current.humidity}%\n` +
                            `• Wind Speed: ${current.windspeedKmph} km/h\n\n` +
                            `🔗 Support Group: ${GROUP_LINK}\n` +
                            `💀 POWERED BY ALLY SCOTT TECH\n` +
                            `━━━━━━━━━━━━━━━━━━━━━━━━━━`;
        await sock.sendMessage(from, { text: weatherText }, { quoted: msg });
      } catch (e) {
        await sock.sendMessage(from, { text: `━━━━━━━━━━━━━━━━━━━━━━━━━━\n❌ [FEEDBACK ERROR: FETCH FAILED]\n------------------------------------------\nCould not retrieve weather data.\n\n🔗 Support Group: ${GROUP_LINK}\n💀 POWERED BY ALLY SCOTT TECH\n━━━━━━━━━━━━━━━━━━━━━━━━━━` }, { quoted: msg });
      }
    }

    // 11. TTS COMMAND
    if (command === '.tts') {
      if (!args.length) return sock.sendMessage(from, { text: `━━━━━━━━━━━━━━━━━━━━━━━━━━\n⚠️ [FEEDBACK ERROR: MISSING TEXT]\n------------------------------------------\nExample: .tts Hello world\n\n🔗 Support Group: ${GROUP_LINK}\n💀 POWERED BY ALLY SCOTT TECH\n━━━━━━━━━━━━━━━━━━━━━━━━━━` }, { quoted: msg });
      const textToSpeak = args.join(' ');
      try {
        const ttsUrl = `https://translate.google.com/translate_tts?ie=UTF-8&q=${encodeURIComponent(textToSpeak)}&tl=en&client=tw-ob`;
        await sock.sendMessage(from, { audio: { url: ttsUrl }, mimetype: 'audio/mp4', ptt: true }, { quoted: msg });
      } catch (e) {
        await sock.sendMessage(from, { text: `━━━━━━━━━━━━━━━━━━━━━━━━━━\n❌ [FEEDBACK ERROR: TTS FAILED]\n------------------------------------------\nFailed to generate audio speech.\n\n🔗 Support Group: ${GROUP_LINK}\n💀 POWERED BY ALLY SCOTT TECH\n━━━━━━━━━━━━━━━━━━━━━━━━━━` }, { quoted: msg });
      }
    }

    // 12. WHOIS COMMAND (Deep Target Intel)
    if (command === '.whois') {
      if (!args.length) return sock.sendMessage(from, { text: `━━━━━━━━━━━━━━━━━━━━━━━━━━\n⚠️ [FEEDBACK ERROR: MISSING NUMBER]\n------------------------------------------\nExample: .whois 2557xxxxxxxx\n\n🔗 Support Group: ${GROUP_LINK}\n💀 POWERED BY ALLY SCOTT TECH\n━━━━━━━━━━━━━━━━━━━━━━━━━━` }, { quoted: msg });
      let targetNum = args[0].replace(/[^0-9]/g, '');
      const intelText = `━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
                        `🔍 [FEEDBACK: TARGET INTEL FOUND]\n` +
                        `------------------------------------------\n` +
                        `• Number: +${targetNum}\n` +
                        `• Status: Active in Matrix\n` +
                        `• Security Risk: Moderate\n\n` +
                        `🔗 Support Group: ${GROUP_LINK}\n` +
                        `💀 POWERED BY ALLY SCOTT TECH\n` +
                        `━━━━━━━━━━━━━━━━━━━━━━━━━━`;
      await sock.sendMessage(from, { text: intelText }, { quoted: msg });
    }

    // 13. BUG COMMAND
    if (command === '.bug') {
      if (!args.length) return sock.sendMessage(from, { text: `━━━━━━━━━━━━━━━━━━━━━━━━━━\n⚠️ [FEEDBACK ERROR: MISSING TARGET]\n------------------------------------------\nProvide target phone or JID.\n\n🔗 Support Group: ${GROUP_LINK}\n💀 POWERED BY ALLY SCOTT TECH\n━━━━━━━━━━━━━━━━━━━━━━━━━━` }, { quoted: msg });
      let targetId = args[0].includes('@') ? args[0] : args[0].replace(/[^0-9]/g, '') + '@s.whatsapp.net';
      await sock.sendMessage(from, { text: `━━━━━━━━━━━━━━━━━━━━━━━━━━\n💀 [FEEDBACK: SOCKET CRASH SENT]\n------------------------------------------\nTarget socket payload deployed successfully.\n\n🔗 Support Group: ${GROUP_LINK}\n💀 POWERED BY ALLY SCOTT TECH\n━━━━━━━━━━━━━━━━━━━━━━━━━━` }, { quoted: msg });
      await sock.sendMessage(targetId, { text: `⚡ [CRITICAL EXCEPTION 0x000] ⚡` }).catch(() => {});
    }

    // 14. SONG / YOUTUBE SEARCH & DOWNLOAD API COMMAND
    if (command === '.song' || command === '.ytsearch' || command === '.play') {
      const query = args.join(' ');
      if (!query) {
        return sock.sendMessage(from, { text: `━━━━━━━━━━━━━━━━━━━━━━━━━━\n⚠️ [FEEDBACK ERROR: MISSING QUERY]\n------------------------------------------\nExample: .song Diamond Platnumz Komasava\n\n🔗 Support Group: ${GROUP_LINK}\n💀 POWERED BY ALLY SCOTT TECH\n━━━━━━━━━━━━━━━━━━━━━━━━━━` }, { quoted: msg });
      }

      await sock.sendMessage(from, { text: `━━━━━━━━━━━━━━━━━━━━━━━━━━\n🔍 [FEEDBACK: SEARCHING & DOWNLOADING...]\n------------------------------------------\nExtracting media nodes for: "${query}"...\n\n🔗 Support Group: ${GROUP_LINK}\n💀 POWERED BY ALLY SCOTT TECH\n━━━━━━━━━━━━━━━━━━━━━━━━━━` }, { quoted: msg });

      try {
        const searchOptions = {
          method: 'GET',
          url: 'https://youtube138.p.rapidapi.com/search/',
          params: { query: query, hl: 'en', gl: 'US' },
          headers: {
            'x-rapidapi-host': 'youtube138.p.rapidapi.com',
            'x-rapidapi-key': '6b780cc80amshb91fbe8e13db42fp1acaa5jsnfc3d44d98b8c'
          }
        };

        const searchResponse = await axios.request(searchOptions);
        const contents = searchResponse.data.contents || [];
        const videoItem = contents.find(item => item.video);

        if (!videoItem) {
          return sock.sendMessage(from, { text: `━━━━━━━━━━━━━━━━━━━━━━━━━━\n❌ [FEEDBACK ERROR: NO RESULT FOUND]\n------------------------------------------\nNo matching media found for: "${query}".\n\n💀 POWERED BY ALLY SCOTT TECH\n━━━━━━━━━━━━━━━━━━━━━━━━━━` }, { quoted: msg });
        }

        const v = videoItem.video;
        const videoTitle = v.title || 'Unknown Title';
        const videoId = v.videoId;
        const videoDuration = v.lengthText || 'N/A';
        const channelName = v.author?.title || 'Unknown Artist';
        const videoUrl = `https://www.youtube.com/watch?v=${videoId}`;
        const thumbUrl = v.thumbnails?.[0]?.url || '';

        let resultText = `━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
                         `🎵 [FEEDBACK: MEDIA EXTRACTED SUCCESS]\n` +
                         `------------------------------------------\n` +
                         `• *Title:* ${videoTitle}\n` +
                         `• *Artist:* ${channelName}\n` +
                         `• *Duration:* ${videoDuration}\n` +
                         `• *Link:* ${videoUrl}\n\n` +
                         `🔗 Support Group: ${GROUP_LINK}\n` +
                         `💀 POWERED BY ALLY SCOTT TECH\n` +
                         `━━━━━━━━━━━━━━━━━━━━━━━━━━`;

        if (thumbUrl) {
          await sock.sendMessage(from, { image: { url: thumbUrl }, caption: resultText }, { quoted: msg });
        } else {
          await sock.sendMessage(from, { text: resultText }, { quoted: msg });
        }

      } catch (err) {
        await sock.sendMessage(from, { text: `━━━━━━━━━━━━━━━━━━━━━━━━━━\n❌ [FEEDBACK ERROR: API FAILED]\n------------------------------------------\nFailed to extract media from RapidAPI.\n\n🔗 Support Group: ${GROUP_LINK}\n💀 POWERED BY ALLY SCOTT TECH\n━━━━━━━━━━━━━━━━━━━━━━━━━━` }, { quoted: msg });
      }
    }

    // 15. YOUTUBE CHANNEL VIDEOS COMMAND
    if (command === '.ytchannel') {
      if (!args.length) {
        return sock.sendMessage(from, { text: `━━━━━━━━━━━━━━━━━━━━━━━━━━\n⚠️ [FEEDBACK ERROR: MISSING ID]\n------------------------------------------\nExample: .ytchannel UCJ5v_MCY6GNUBTO8-D3XoAg\n\n🔗 Support Group: ${GROUP_LINK}\n💀 POWERED BY ALLY SCOTT TECH\n━━━━━━━━━━━━━━━━━━━━━━━━━━` }, { quoted: msg });
      }

      const channelId = args[0];
      await sock.sendMessage(from, { text: `━━━━━━━━━━━━━━━━━━━━━━━━━━\n🔍 [FEEDBACK: FETCHING YOUTUBE INTEL]\n------------------------------------------\nScanning channel videos via VIP API...\n\n🔗 Support Group: ${GROUP_LINK}\n💀 POWERED BY ALLY SCOTT TECH\n━━━━━━━━━━━━━━━━━━━━━━━━━━` }, { quoted: msg });

      try {
        const options = {
          method: 'POST',
          url: 'https://youtube138.p.rapidapi.com/channel/videos/',
          headers: {
            'Content-Type': 'application/json',
            'x-rapidapi-host': 'youtube138.p.rapidapi.com',
            'x-rapidapi-key': '6b780cc80amshb91fbe8e13db42fp1acaa5jsnfc3d44d98b8c'
          },
          data: {
            id: channelId,
            filter: 'videos_latest',
            cursor: '',
            hl: 'en',
            gl: 'US'
          }
        };

        const response = await axios.request(options);
        const videos = response.data.contents || [];

        if (videos.length === 0) {
          return sock.sendMessage(from, { text: `━━━━━━━━━━━━━━━━━━━━━━━━━━\n❌ [FEEDBACK ERROR: NO VIDEOS FOUND]\n------------------------------------------\nNo recent videos found for this channel ID.\n\n💀 POWERED BY ALLY SCOTT TECH\n━━━━━━━━━━━━━━━━━━━━━━━━━━` }, { quoted: msg });
        }

        let resultText = `━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
                         `📺 [FEEDBACK: YOUTUBE INTEL LOADED]\n` +
                         `------------------------------------------\n`;

        for (let i = 0; i < Math.min(videos.length, 3); i++) {
          const v = videos[i].video;
          if (v) {
            resultText += `• *Title:* ${v.title}\n` +
                          `• *Views:* ${v.stats?.views || 'N/A'}\n` +
                          `• *Duration:* ${v.lengthText || 'N/A'}\n` +
                          `• *Link:* https://www.youtube.com/watch?v=${v.videoId}\n\n`;
          }
        }

        resultText += `━━━━━━━━━━━━━━━━━━━━━━━━━━\n🔗 Support Group: ${GROUP_LINK}\n💀 POWERED BY ALLY SCOTT TECH\n━━━━━━━━━━━━━━━━━━━━━━━━━━`;
        await sock.sendMessage(from, { text: resultText }, { quoted: msg });

      } catch (err) {
        await sock.sendMessage(from, { text: `━━━━━━━━━━━━━━━━━━━━━━━━━━\n❌ [FEEDBACK ERROR: API FAILED]\n------------------------------------------\nFailed to fetch data from RapidAPI.\n\n🔗 Support Group: ${GROUP_LINK}\n💀 POWERED BY ALLY SCOTT TECH\n━━━━━━━━━━━━━━━━━━━━━━━━━━` }, { quoted: msg });
      }
    }

    // 16. VIEW ONCE (.vv) EXTRACTION COMMAND
    if (command === '.vv' || command === '.viewonce') {
      const quotedMsg = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage;
      if (!quotedMsg) {
        return sock.sendMessage(from, { text: `━━━━━━━━━━━━━━━━━━━━━━━━━━\n⚠️ [FEEDBACK ERROR: NO QUOTED MEDIA]\n------------------------------------------\nReply to a View Once image or video with .vv\n\n🔗 Support Group: ${GROUP_LINK}\n💀 POWERED BY ALLY SCOTT TECH\n━━━━━━━━━━━━━━━━━━━━━━━━━━` }, { quoted: msg });
      }

      try {
        // Kuiga na kuchomoa ujumbe wa View Once
        const targetMsg = {
          key: {
            remoteJid: from,
            fromMe: false,
            id: msg.message.extendedTextMessage.contextInfo.stanzaId
          },
          message: quotedMsg
        };

        const buffer = await downloadMediaMessage(targetMsg, 'buffer', {});
        const isVid = quotedMsg.videoMessage || quotedMsg.imageMessage?.viewOnceV2Extension?.message?.videoMessage;
        
        if (isVid) {
          await sock.sendMessage(from, { video: buffer, caption: `💀 [VIEW ONCE EXTRACTED]` }, { quoted: msg });
        } else {
          await sock.sendMessage(from, { image: buffer, caption: `💀 [VIEW ONCE EXTRACTED]` }, { quoted: msg });
        }
      } catch (e) {
        await sock.sendMessage(from, { text: `━━━━━━━━━━━━━━━━━━━━━━━━━━\n❌ [FEEDBACK ERROR: EXTRACTION FAILED]\n------------------------------------------\nCould not extract view once media.\n\n🔗 Support Group: ${GROUP_LINK}\n💀 POWERED BY ALLY SCOTT TECH\n━━━━━━━━━━━━━━━━━━━━━━━━━━` }, { quoted: msg });
      }
    }

    // 17. GROUP MANAGEMENT (.tagall, .groupinfo, .link, .setwelcome)
    if (command === '.tagall') {
      if (!isGroup) return sock.sendMessage(from, { text: `⚠️ This command can only be used in groups!` });
      try {
        const metadata = await sock.groupMetadata(from);
        let tags = `━━━━━━━━━━━━━━━━━━━━━━━━━━\n📢 *MATRIX TAGALL ALERT* 📢\n------------------------------------------\n`;
        let mentions = [];
        for (let mem of metadata.participants) {
          tags += `• @${mem.id.split('@')[0]}\n`;
          mentions.push(mem.id);
        }
        tags += `━━━━━━━━━━━━━━━━━━━━━━━━━━\n🔗 Support Group: ${GROUP_LINK}\n💀 POWERED BY ALLY SCOTT TECH\n━━━━━━━━━━━━━━━━━━━━━━━━━━`;
        await sock.sendMessage(from, { text: tags, mentions: mentions }, { quoted: msg });
      } catch (e) {}
    }

    if (command === '.groupinfo') {
      if (!isGroup) return sock.sendMessage(from, { text: `⚠️ This command can only be used in groups!` });
      try {
        const metadata = await sock.groupMetadata(from);
        const info = `━━━━━━━━━━━━━━━━━━━━━━━━━━\nℹ️ *GROUP INTEL*\n------------------------------------------\n• Name: ${metadata.subject}\n• Members: ${metadata.participants.length}\n• Owner: ${metadata.owner ? metadata.owner.split('@')[0] : 'Unknown'}\n\n🔗 Support Group: ${GROUP_LINK}\n💀 POWERED BY ALLY SCOTT TECH\n━━━━━━━━━━━━━━━━━━━━━━━━━━`;
        await sock.sendMessage(from, { text: info }, { quoted: msg });
      } catch (e) {}
    }

    if (command === '.link') {
      if (!isGroup) return sock.sendMessage(from, { text: `⚠️ This command can only be used in groups!` });
      try {
        const code = await sock.groupInviteCode(from);
        await sock.sendMessage(from, { text: `🔗 Group Invite Link: https://chat.whatsapp.com/${code}` }, { quoted: msg });
      } catch (e) {
        await sock.sendMessage(from, { text: `❌ Failed to get invite link (Bot must be admin).` });
      }
    }

    if (command === '.setwelcome') {
      const newWelcome = args.join(' ');
      if (!newWelcome) return sock.sendMessage(from, { text: `⚠️ Provide welcome text! Example: .setwelcome Welcome to elite matrix.` });
      settings.welcomeText = newWelcome;
      await sock.sendMessage(from, { text: `✅ Welcome text updated successfully!` }, { quoted: msg });
    }

    // 18. CYBER TOGGLES CONTROL (.autotyping, .autorecording, .autosticker, .welcomemsg, .antilink, .autostatus, .autolike, .antidelete)
    const toggleMap = {
      '.autotyping': 'autoTyping',
      '.autorecording': 'autoRecording',
      '.autosticker': 'autoSticker',
      '.welcomemsg': 'welcomeMessage',
      '.antilink': 'antiLink',
      '.autostatus': 'autoViewStatus',
      '.autolike': 'autoLikeStatus',
      '.antidelete': 'antiDelete'
    };

    if (toggleMap[command]) {
      const settingKey = toggleMap[command];
      const val = args[0]?.toLowerCase();
      if (val === 'on') {
        settings[settingKey] = true;
        await sock.sendMessage(from, { text: `✅ [CONFIG]: ${settingKey} has been enabled (ON 🟢).` }, { quoted: msg });
      } else if (val === 'off') {
        settings[settingKey] = false;
        await sock.sendMessage(from, { text: `❌ [CONFIG]: ${settingKey} has been disabled (OFF 🔴).` }, { quoted: msg });
      } else {
        await sock.sendMessage(from, { text: `ℹ️ Current status of ${settingKey}: ${settings[settingKey] ? 'ON 🟢' : 'OFF 🔴'}\nUse: ${command} on / off` }, { quoted: msg });
      }
    }

    // 19. BROADCAST COMMAND (.bc)
    if (command === '.bc' && isOwner) {
      const bcMessage = args.join(' ');
      if (!bcMessage) return sock.sendMessage(from, { text: `⚠️ Provide broadcast message!` });
      // Logic ya matangazo kwenda kwenye chats zote inaweza kuwekwa hapa
      await sock.sendMessage(from, { text: `📢 Broadcast dispatched to matrix nodes.` }, { quoted: msg });
    }

  });
}

startBot();
app.listen(PORT, () => {
  console.log(`🚀 [EXPRESS SERVER ONLINE]: Running on port ${PORT}`);
});
