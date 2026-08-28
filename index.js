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
const yts = require('yt-search');
const axios = require('axios');

const app = express();
const PORT = process.env.PORT || 10000;

const GROUP_LINK = "https://chat.whatsapp.com/GKlxbFDAh8t1CDXQArhJle";

app.use(express.static(__dirname));

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// Settings Parameters (All Active for Maximum Effectiveness)
const settings = {
  autoViewStatus: true,
  autoLikeStatus: true,
  antiDelete: true,
  antiLink: true,
  autoReact: true,
  autoSticker: false,
  autoTyping: false,
  autoRecording: false,
  welcomeMessage: true
};

const messageStore = new Map();
const linkWarnings = new Map();
const messageCounter = new Map();
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

  sock.ev.on('connection.update', (update) => {
    const { connection, lastDisconnect } = update;
    if (connection === 'close') {
      const shouldReconnect = lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut;
      if (shouldReconnect) startBot();
    } else if (connection === 'open') {
      console.log('\n⚡ [SYSTEM INITIATED]: ALLY SCOTT VIP ENGINE IS 100% ONLINE & EFFECTIVE!');
      try {
        sock.updateProfileStatus('⚡ ALLY SCOTT VIP ENGINE | FULLY OPTIMIZED & SECURED 🔒');
      } catch (e) {}
    }
  });

  // Welcome Message Handler
  sock.ev.on('group-participants.update', async (update) => {
    if (!settings.welcomeMessage) return;
    const { id, participants, action } = update;
    if (action === 'add') {
      for (let user of participants) {
        const welcomeText = `┌──[ 👤 SYSTEM ALERT ]──┐\n│ Welcome @${user.split('@')[0]}!\n│ Follow protocol & enjoy.\n│ Hub: ${GROUP_LINK}\n└──[ ALLY SCOTT TECH ]──┘`;
        await sock.sendMessage(id, { text: welcomeText, mentions: [user] });
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

    // Auto View & Auto Like Status (Effective & Immediate)
    if (from === 'status@broadcast') {
      if (settings.autoViewStatus) {
        await sock.readMessages([msg.key]);
      }
      if (settings.autoLikeStatus) {
        await sock.sendMessage(from, { react: { text: '💚', key: msg.key } }, { statusJidList: [msg.key.participant] });
      }
      return;
    }

    // Message activity tracker for .topactive
    if (isGroup && sender) {
      const currentCount = messageCounter.get(`${from}_${sender}`) || 0;
      messageCounter.set(`${from}_${sender}`, currentCount + 1);
    }

    if (settings.autoTyping) await sock.sendPresenceUpdate('composing', from);
    if (settings.autoRecording) await sock.sendPresenceUpdate('recording', from);

    if (msg.key.id) messageStore.set(msg.key.id, msg);

    // Auto Sticker Handler
    const mediaType = Object.keys(msg.message)[0];
    if (settings.autoSticker && mediaType === 'imageMessage' && !isOwner) {
      try {
        const buffer = await downloadMediaMessage(msg, 'buffer', {});
        await sock.sendMessage(from, { sticker: buffer }, { quoted: msg });
      } catch (e) {
        console.error('Auto Sticker Error:', e);
      }
    }

    const body = msg.message.conversation || 
                 msg.message.extendedTextMessage?.text || 
                 msg.message.imageMessage?.caption || 
                 msg.message.videoMessage?.caption || '';

    const command = body.trim().split(' ')[0].toLowerCase();
    const args = body.trim().split(' ').slice(1);
    const query = args.join(' ');

    // OWNER TOGGLE CONTROLS
    if (isOwner) {
      if (command === '.antidelete') {
        settings.antiDelete = args[0] === 'on';
        return sock.sendMessage(from, { text: `🛡️ Anti-Delete: *${settings.antiDelete ? 'ON 🟢' : 'OFF 🔴'}*` }, { quoted: msg });
      }
      if (command === '.antilink') {
        settings.antiLink = args[0] === 'on';
        return sock.sendMessage(from, { text: `🔗 Anti-Link: *${settings.antiLink ? 'ON 🟢' : 'OFF 🔴'}*` }, { quoted: msg });
      }
      if (command === '.autoreact') {
        settings.autoReact = args[0] === 'on';
        return sock.sendMessage(from, { text: `⚡ Auto-React: *${settings.autoReact ? 'ON 🟢' : 'OFF 🔴'}*` }, { quoted: msg });
      }
      if (command === '.autoview') {
        settings.autoViewStatus = args[0] === 'on';
        return sock.sendMessage(from, { text: `👁️ Auto View: *${settings.autoViewStatus ? 'ON 🟢' : 'OFF 🔴'}*` }, { quoted: msg });
      }
      if (command === '.autolike') {
        settings.autoLikeStatus = args[0] === 'on';
        return sock.sendMessage(from, { text: `💚 Auto Like: *${settings.autoLikeStatus ? 'ON 🟢' : 'OFF 🔴'}*` }, { quoted: msg });
      }
      if (command === '.welcome') {
        settings.welcomeMessage = args[0] === 'on';
        return sock.sendMessage(from, { text: `👋 Welcome Alert: *${settings.welcomeMessage ? 'ON 🟢' : 'OFF 🔴'}*` }, { quoted: msg });
      }
      if (command === '.autosticker') {
        settings.autoSticker = args[0] === 'on';
        return sock.sendMessage(from, { text: `🖼️ Auto Sticker: *${settings.autoSticker ? 'ON 🟢' : 'OFF 🔴'}*` }, { quoted: msg });
      }
    }

    // 1. MENU
    if (command === '.menu' || command === '!menu') {
      if (settings.autoReact) {
        await sock.sendMessage(from, { react: { text: '⚡', key: msg.key } });
      }
      const menuText = `
 █▀ █▀▀ █▀█ ▀█▀ ▀█▀
 ▄█ █▄▄ █▄█  █   █ 
════════════════════════════════════════
💻 *ALLY SCOTT VIP ENGINE v3.5*
════════════════════════════════════════

⚙️ *[ SYSTEM STATUS ]*
 ╠═ Auto View Status : *${settings.autoViewStatus ? 'ONLINE 🟢' : 'OFFLINE 🔴'}*
 ╠═ Auto Like Status : *${settings.autoLikeStatus ? 'ONLINE 🟢' : 'OFFLINE 🔴'}*
 ╠═ Anti-Delete      : *${settings.antiDelete ? 'ONLINE 🟢' : 'OFFLINE 🔴'}*
 ╠═ Anti-Link        : *${settings.antiLink ? 'ONLINE 🟢' : 'OFFLINE 🔴'}*
 ╠═ Auto-React       : *${settings.autoReact ? 'ONLINE 🟢' : 'OFFLINE 🔴'}*
 ╠═ Auto Sticker     : *${settings.autoSticker ? 'ONLINE 🟢' : 'OFFLINE 🔴'}*
 ╚═ Welcome Alert    : *${settings.welcomeMessage ? 'ONLINE 🟢' : 'OFFLINE 🔴'}*

┌──[ 🛠️ CORE COMMANDS ]
│ ⚡ .menu
│ ⚡ .ping
│ ⚡ .settings
└───

┌──[ 👨‍💻 CYBER & OSINT ]
│ 📡 .iplookup <ip>
│ 📧 .tempmail
│ 🔍 .subdomain <domain>
└───

┌──[ 👥 MATRIX MANAGEMENT ]
│ ℹ️ .groupinfo
│ 🏆 .topactive
│ 🟢 .online
│ 📢 .tagall
│ 🚫 .kick @user
│ ➕ .add 2557xxx
│ 👑 .promote @user
│ 🔻 .demote @user
│ 🔒 .close
│ 🔓 .open
└───

┌──[ 🎵 MEDIA & EXPLOITS ]
│ 🎧 .song <query>
│ 🖼️ .sticker (Reply)
│ 🔓 .vv (Reply ViewOnce)
└───

🔗 *HUB:* ${GROUP_LINK}
🌐 *POWERED BY ALLY SCOTT TECH*`;

      await sock.sendMessage(from, { text: menuText }, { quoted: msg });
    }

    // 2. SETTINGS
    if (command === '.settings' || command === '!settings') {
      const settingsStatus = `⚙️ *[ ENGINE CONFIG MATRIX ]*

 • Auto View Status : *${settings.autoViewStatus ? 'ON 🟢' : 'OFF 🔴'}*
 • Auto Like Status : *${settings.autoLikeStatus ? 'ON 🟢' : 'OFF 🔴'}*
 • Anti-Delete      : *${settings.antiDelete ? 'ON 🟢' : 'OFF 🔴'}*
 • Anti-Link        : *${settings.antiLink ? 'ON 🟢' : 'OFF 🔴'}*
 • Auto-React       : *${settings.autoReact ? 'ON 🟢' : 'OFF 🔴'}*
 • Auto Sticker     : *${settings.autoSticker ? 'ON 🟢' : 'OFF 🔴'}*
 • Welcome Message  : *${settings.welcomeMessage ? 'ON 🟢' : 'OFF 🔴'}*

*POWERED BY ALLY SCOTT TECH*`;

      await sock.sendMessage(from, { text: settingsStatus }, { quoted: msg });
    }

    // 3. PING
    if (command === '.ping' || command === '!ping') {
      const start = Date.now();
      await sock.sendMessage(from, { text: '📡 *[PINGING SERVER NODE...]*' }, { quoted: msg });
      const latency = Date.now() - start;
      await sock.sendMessage(from, { text: `⚡ *[PONG!]* Latency: *${latency}ms*` }, { quoted: msg });
    }

    // 4. OSINT TOOLS & TEMPMAIL
    if (command === '.tempmail' || command === '!tempmail') {
      await sock.sendMessage(from, { text: '⏳ *[GENERATING TEMP MAIL...]*' }, { quoted: msg });
      try {
        const res = await axios.get('https://www.1secmail.com/api/v1/?action=genRandomMailbox&count=1');
        if (res.data && res.data[0]) {
          await sock.sendMessage(from, { text: `📧 *[ DISPOSABLE TEMP MAIL ]*\n\nAddress: *${res.data[0]}*\n\nUse this node for secure operations!` }, { quoted: msg });
        } else {
          throw new Error('Fallback required');
        }
      } catch (e) {
        try {
          const randStr = Math.random().toString(36).substring(7);
          await sock.sendMessage(from, { text: `📧 *[ DISPOSABLE TEMP MAIL ]*\n\nAddress: *${randStr}@1secmail.com*\n\n*POWERED BY ALLY SCOTT*` }, { quoted: msg });
        } catch (err) {
          await sock.sendMessage(from, { text: '❌ [ERROR]: TempMail service unreachable.' }, { quoted: msg });
        }
      }
    }

    if (command === '.iplookup' || command === '!iplookup') {
      if (!query) return sock.sendMessage(from, { text: '⚠️ [ERROR]: IP required!\n*Usage:* `.iplookup 8.8.8.8`' }, { quoted: msg });
      try {
        const res = await axios.get(`http://ip-api.com/json/${query}`);
        const data = res.data;
        if (data.status === 'fail') return sock.sendMessage(from, { text: '❌ Invalid IP address!' }, { quoted: msg });
        const ipInfo = `💻 *[ IP GEOLOCATION ]*\n\n🌐 IP: ${data.query}\n🏴 Country: ${data.country}\n🏙️ City: ${data.city}\n📡 ISP: ${data.isp}`;
        await sock.sendMessage(from, { text: ipInfo }, { quoted: msg });
      } catch (e) {
        await sock.sendMessage(from, { text: '❌ IP Lookup failed.' }, { quoted: msg });
      }
    }

    if (command === '.subdomain' || command === '!subdomain') {
      if (!query) return sock.sendMessage(from, { text: '⚠️ Target domain required!' }, { quoted: msg });
      try {
        const res = await axios.get(`https://api.hackertarget.com/hostsearch/?q=${query}`);
        await sock.sendMessage(from, { text: `🔍 *[ HOST SEARCH: ${query} ]*\n\n${res.data.slice(0, 800)}` }, { quoted: msg });
      } catch (e) {
        await sock.sendMessage(from, { text: '❌ Subdomain scan failed.' }, { quoted: msg });
      }
    }

    // 5. GROUP MANAGEMENT
    if (command === '.groupinfo' || command === '.gi') {
      if (!isGroup) return sock.sendMessage(from, { text: '⚠️ Group command only!' }, { quoted: msg });
      try {
        const meta = await sock.groupMetadata(from);
        const admins = meta.participants.filter(p => p.admin !== null).map(p => `@${p.id.split('@')[0]}`);
        const infoText = `📊 *[ GROUP INFO ]*\n\n🏷️ Name: ${meta.subject}\n👥 Members: ${meta.participants.length}\n👑 Admins (${admins.length}):\n${admins.join('\n')}`;
        await sock.sendMessage(from, { text: infoText, mentions: meta.participants.map(p => p.id) }, { quoted: msg });
      } catch (e) {
        await sock.sendMessage(from, { text: '❌ Failed to fetch info.' }, { quoted: msg });
      }
    }

    if (command === '.topactive' || command === '.top') {
      if (!isGroup) return sock.sendMessage(from, { text: '⚠️ Group command only!' }, { quoted: msg });
      const groupData = [];
      for (let [key, value] of messageCounter.entries()) {
        if (key.startsWith(`${from}_`)) {
          groupData.push({ jid: key.split('_')[1], count: value });
        }
      }
      if (groupData.length === 0) return sock.sendMessage(from, { text: '📊 No activity logged yet.' }, { quoted: msg });
      groupData.sort((a, b) => b.count - a.count);
      let leaderboardText = `🏆 *[ TOP ACTIVE MEMBERS ]*\n\n`;
      let mentions = [];
      groupData.slice(0, 10).forEach((m, idx) => {
        leaderboardText += `${idx + 1}. @${m.jid.split('@')[0]} ── ✉️ *${m.count}*\n`;
        mentions.push(m.jid);
      });
      await sock.sendMessage(from, { text: leaderboardText, mentions }, { quoted: msg });
    }

    if (command === '.online' || command === '!online') {
      if (!isGroup) return sock.sendMessage(from, { text: '⚠️ Group command only!' }, { quoted: msg });
      try {
        const groupMetadata = await sock.groupMetadata(from);
        let onlineText = `🟢 *[ ACTIVE NODES ]*\n\n`;
        let mentions = groupMetadata.participants.map(p => { onlineText += `👤 @${p.id.split('@')[0]}\n`; return p.id; });
        await sock.sendMessage(from, { text: onlineText, mentions }, { quoted: msg });
      } catch (err) {
        await sock.sendMessage(from, { text: '❌ Error fetching members.' }, { quoted: msg });
      }
    }

    if (command === '.tagall' || command === '!tagall') {
      if (!isGroup) return sock.sendMessage(from, { text: '⚠️ Group command only!' }, { quoted: msg });
      const groupMetadata = await sock.groupMetadata(from);
      let text = `📢 *[ BROADCAST ]*\n\n`;
      let mentions = groupMetadata.participants.map(p => { text += `👉 @${p.id.split('@')[0]}\n`; return p.id; });
      await sock.sendMessage(from, { text, mentions }, { quoted: msg });
    }

    // Group Admin Controls
    if (isGroup) {
      const mentioned = msg.message.extendedTextMessage?.contextInfo?.mentionedJid;
      if (command === '.kick' && mentioned) {
        await sock.groupParticipantsUpdate(from, mentioned, 'remove');
        await sock.sendMessage(from, { text: '✅ Member kicked!' }, { quoted: msg });
      }
      if (command === '.add' && query) {
        const target = query.replace(/[^0-9]/g, '') + '@s.whatsapp.net';
        await sock.groupParticipantsUpdate(from, [target], 'add');
        await sock.sendMessage(from, { text: '✅ Member added!' }, { quoted: msg });
      }
      if (command === '.promote' && mentioned) {
        await sock.groupParticipantsUpdate(from, mentioned, 'promote');
        await sock.sendMessage(from, { text: '✅ Member promoted!' }, { quoted: msg });
      }
      if (command === '.demote' && mentioned) {
        await sock.groupParticipantsUpdate(from, mentioned, 'demote');
        await sock.sendMessage(from, { text: '✅ Member demoted!' }, { quoted: msg });
      }
      if (command === '.close') {
        await sock.groupSettingUpdate(from, 'announcement');
        await sock.sendMessage(from, { text: '🔒 Group closed!' }, { quoted: msg });
      }
      if (command === '.open') {
        await sock.groupSettingUpdate(from, 'not_announcement');
        await sock.sendMessage(from, { text: '🔓 Group opened!' }, { quoted: msg });
      }
    }

    // 6. VIEW ONCE BYPASS (.vv)
    if (command === '.vv' || command === '!vv') {
      const contextInfo = msg.message.extendedTextMessage?.contextInfo;
      const quotedMsg = contextInfo?.quotedMessage;

      if (!quotedMsg) {
        return sock.sendMessage(from, { text: '⚠️ Reply to a View Once message with `.vv`!' }, { quoted: msg });
      }

      let viewOnceContent = null;
      if (quotedMsg.viewOnceMessage) {
        viewOnceContent = quotedMsg.viewOnceMessage.message;
      } else if (quotedMsg.viewOnceMessageV2) {
        viewOnceContent = quotedMsg.viewOnceMessageV2.message;
      } else if (quotedMsg.viewOnceMessageV2Extension) {
        viewOnceContent = quotedMsg.viewOnceMessageV2Extension.message;
      } else {
        viewOnceContent = quotedMsg; 
      }

      const mediaType = Object.keys(viewOnceContent)[0];

      if (mediaType === 'imageMessage' || mediaType === 'videoMessage') {
        try {
          await sock.sendMessage(from, { text: '🔓 *[BYPASSING VIEW ONCE ENCRYPTION...]*' }, { quoted: msg });
          const stream = await downloadMediaMessage({ message: viewOnceContent }, 'buffer', {});

          if (mediaType === 'imageMessage') {
            await sock.sendMessage(from, { image: stream, caption: '🔓 *[VIEW ONCE RECOVERED]*\n*POWERED BY ALLY SCOTT*' }, { quoted: msg });
          } else if (mediaType === 'videoMessage') {
            await sock.sendMessage(from, { video: stream, caption: '🔓 *[VIEW ONCE RECOVERED]*\n*POWERED BY ALLY SCOTT*' }, { quoted: msg });
          }
        } catch (err) {
          await sock.sendMessage(from, { text: '❌ [ERROR]: Failed to decrypt View Once media.' }, { quoted: msg });
        }
      } else {
        await sock.sendMessage(from, { text: '⚠️ Selected message is not a View Once image/video!' }, { quoted: msg });
      }
    }

    // 7. SONG DOWNLOADER (.song)
    if (command === '.song' || command === '!song') {
      if (!query) return sock.sendMessage(from, { text: '⚠️ Song title required!\n*Example:* `.song Marioo Siwezi`' }, { quoted: msg });
      await sock.sendMessage(from, { text: `📥 *[SEARCHING & EXTRACTING]:* ${query}...` }, { quoted: msg });
      
      try {
        const searchResult = await yts(query);
        const video = searchResult.videos[0];
        if (!video) return sock.sendMessage(from, { text: '❌ Track not found.' }, { quoted: msg });

        let audioUrl = null;

        // SERVER 1
        try {
          const res1 = await axios.get(`https://api.dark-yasiya.api.ytmp3.download/ytmp3?url=${encodeURIComponent(video.url)}`, { timeout: 10000 });
          if (res1.data?.result?.download) audioUrl = res1.data.result.download;
        } catch (e) {}

        // SERVER 2
        if (!audioUrl) {
          try {
            const res2 = await axios.get(`https://bk9.fun/download/ytmp3?url=${encodeURIComponent(video.url)}`, { timeout: 10000 });
            if (res2.data?.status && res2.data?.BK9?.download) audioUrl = res2.data.BK9.download;
          } catch (e) {}
        }

        // SERVER 3
        if (!audioUrl) {
          try {
            const res3 = await axios.get(`https://api.widipe.com/download/ytmp3?url=${encodeURIComponent(video.url)}`, { timeout: 10000 });
            if (res3.data?.result?.dl) audioUrl = res3.data.result.dl;
          } catch (e) {}
        }

        if (audioUrl) {
          await sock.sendMessage(from, { audio: { url: audioUrl }, mimetype: 'audio/mp4', fileName: `${video.title}.mp3` }, { quoted: msg });
        } else {
          await sock.sendMessage(from, { text: '❌ All music servers are busy right now. Try again in 2 minutes!' }, { quoted: msg });
        }

      } catch (e) {
        await sock.sendMessage(from, { text: '❌ Failed to process song.' }, { quoted: msg });
      }
    }

    if (command === '.sticker' || command === '.s') {
      const quotedMsg = msg.message.extendedTextMessage?.contextInfo?.quotedMessage;
      const targetMsg = quotedMsg || msg.message;
      const targetMediaType = Object.keys(targetMsg)[0];

      if (targetMediaType === 'imageMessage') {
        try {
          await sock.sendMessage(from, { text: '⏳ *[GENERATING STICKER...]*' }, { quoted: msg });
          const buffer = await downloadMediaMessage({ message: targetMsg }, 'buffer', {});
          await sock.sendMessage(from, { sticker: buffer }, { quoted: msg });
        } catch (err) {
          await sock.sendMessage(from, { text: '❌ Sticker creation failed.' }, { quoted: msg });
        }
      } else {
        await sock.sendMessage(from, { text: '⚠️ Reply to an image with `.sticker`!' }, { quoted: msg });
      }
    }

    // Anti-Link Guard (Effective Link Shield)
    if (isGroup && settings.antiLink && body.match(/chat\.whatsapp\.com\/[a-zA-Z0-9]/g)) {
      if (!isOwner && !body.includes(GROUP_LINK)) { 
        await sock.sendMessage(from, { delete: msg.key });
        const currentWarns = (linkWarnings.get(sender) || 0) + 1;
        linkWarnings.set(sender, currentWarns);

        if (currentWarns === 1) {
          await sock.sendMessage(from, { text: `⚠️ *[LINK GUARD]* Node @${sender.split('@')[0]}, group links are unauthorized!`, mentions: [sender] });
        } else if (currentWarns >= 2) {
          await sock.sendMessage(from, { text: `🚫 *[TERMINATING NODE]:* Link policy breach.`, mentions: [sender] });
          await sock.groupParticipantsUpdate(from, [sender], 'remove');
          linkWarnings.delete(sender);
        }
      }
    }
  });

  // Anti-Delete Guard (Recovers deleted messages immediately)
  sock.ev.on('messages.update', async (updates) => {
    if (!settings.antiDelete) return;
    for (const update of updates) {
      if (update.update.protocolMessage?.type === 0) {
        const deletedId = update.update.protocolMessage.key.id;
        const originalMsg = messageStore.get(deletedId);
        
        if (originalMsg && !originalMsg.key.fromMe) {
          const from = originalMsg.key.remoteJid;
          await sock.sendMessage(from, { text: '🛡️ *[DELETED MESSAGE RECOVERED BY ALLY SCOTT]*' });
          await sock.sendMessage(from, { forward: originalMsg });
          messageStore.delete(deletedId);
        }
      }
    }
  });
}

app.get('/pair', async (req, res) => {
  const number = req.query.number;
  if (!number) return res.status(400).json({ error: 'Phone number required' });
  const cleanedNumber = number.replace(/[^0-9]/g, '');
  try {
    if (!sock.authState.creds.registered) {
      const code = await sock.requestPairingCode(cleanedNumber);
      return res.json({ code });
    } else {
      return res.json({ error: 'Already registered!' });
    }
  } catch (err) {
    return res.status(500).json({ error: 'Pairing failed' });
  }
});

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
startBot();
