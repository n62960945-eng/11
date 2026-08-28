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

// Bot Dynamic Settings - Status Features ACTIVE by default
const settings = {
  autoViewStatus: true,
  autoLikeStatus: true,
  antiDelete: true,
  antiLink: true,
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
      console.log('\n⚡ [SYSTEM INITIATED]: ALLY SCOTT CYBER ENGINE IS ONLINE!');
    }
  });

  // Welcome Message Event Handler
  sock.ev.on('group-participants.update', async (update) => {
    if (!settings.welcomeMessage) return;
    const { id, participants, action } = update;
    if (action === 'add') {
      for (let user of participants) {
        const welcomeText = `┌───[ 👤 SYSTEM ALERT ]───┐\n│ Welcome to the matrix, @${user.split('@')[0]}!\n│ Secure your node & follow protocol.\n│ Join official hub: ${GROUP_LINK}\n└───[ POWERED BY ALLY SCOTT ]───┘`;
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

    // Auto View & Auto Like Status (ALWAYS ACTIVE)
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

    // Auto Sticker Feature
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

    // TOGGLE COMMANDS FOR SYSTEM FEATURES (OWNER ONLY)
    if (isOwner) {
      if (command === '.antidelete') {
        settings.antiDelete = args[0] === 'on';
        return sock.sendMessage(from, { text: `🛡️ Anti-Delete is now *${settings.antiDelete ? 'ENABLED 🟢' : 'DISABLED 🔴'}*` }, { quoted: msg });
      }
      if (command === '.antilink') {
        settings.antiLink = args[0] === 'on';
        return sock.sendMessage(from, { text: `🔗 Anti-Link is now *${settings.antiLink ? 'ENABLED 🟢' : 'DISABLED 🔴'}*` }, { quoted: msg });
      }
      if (command === '.autoview') {
        settings.autoViewStatus = args[0] === 'on';
        return sock.sendMessage(from, { text: `👁️ Auto View Status is now *${settings.autoViewStatus ? 'ENABLED 🟢' : 'DISABLED 🔴'}*` }, { quoted: msg });
      }
      if (command === '.autolike') {
        settings.autoLikeStatus = args[0] === 'on';
        return sock.sendMessage(from, { text: `💚 Auto Like Status is now *${settings.autoLikeStatus ? 'ENABLED 🟢' : 'DISABLED 🔴'}*` }, { quoted: msg });
      }
      if (command === '.welcome') {
        settings.welcomeMessage = args[0] === 'on';
        return sock.sendMessage(from, { text: `👋 Welcome Message is now *${settings.welcomeMessage ? 'ENABLED 🟢' : 'DISABLED 🔴'}*` }, { quoted: msg });
      }
      if (command === '.autosticker') {
        settings.autoSticker = args[0] === 'on';
        return sock.sendMessage(from, { text: `🖼️ Auto Sticker is now *${settings.autoSticker ? 'ENABLED 🟢' : 'DISABLED 🔴'}*` }, { quoted: msg });
      }
    }

    // 1. CYBERPUNK MENU WITH CLEAN ASCII HEADER
    if (command === '.menu' || command === '!menu') {
      const menuText = `
┌──────────────────────────────┐
│  ⚡ ᴬᴸᴸʸ ˢᶜᴼᵀᵀ ⱽᴵᴾ ᴱᴺᴳᴵᴺᴱ ⚡  │
└──────────────────────────────┘
════════════════════════════════
💻 *ALLY SCOTT VIP ENGINE v3.5*
════════════════════════════════

⚙️ *[ SYSTEM STATUS ]*
 ╠═ Auto View Status : *${settings.autoViewStatus ? 'ONLINE 🟢' : 'OFFLINE 🔴'}*
 ╠═ Auto Like Status : *${settings.autoLikeStatus ? 'ONLINE 🟢' : 'OFFLINE 🔴'}*
 ╠═ Anti-Delete      : *${settings.antiDelete ? 'ONLINE 🟢' : 'OFFLINE 🔴'}*
 ╠═ Anti-Link        : *${settings.antiLink ? 'ONLINE 🟢' : 'OFFLINE 🔴'}*
 ╠═ Auto Sticker     : *${settings.autoSticker ? 'ONLINE 🟢' : 'OFFLINE 🔴'}*
 ╠═ Auto Typing      : *${settings.autoTyping ? 'ONLINE 🟢' : 'OFFLINE 🔴'}*
 ╠═ Auto Recording   : *${settings.autoRecording ? 'ONLINE 🟢' : 'OFFLINE 🔴'}*
 ╚═ Welcome Alert    : *${settings.welcomeMessage ? 'ONLINE 🟢' : 'OFFLINE 🔴'}*

╭─── 🛠️ [ CORE SYSTEM ] ───╮
│ ⚡ .menu      :: Main Control Panel
│ ⚡ .ping      :: Test System Latency
│ ⚡ .settings  :: View Engine Parameters
╰───────────────────────────╯

╭─── 👨‍💻 [ CYBER & OSINT ] ───╮
│ 📡 .iplookup <IP>      :: IP Geolocation
│ 📧 .tempmail          :: Disposable Mail
│ 🔍 .subdomain <domain> :: Subdomain Target Scan
╰───────────────────────────╯

╭─── 👥 [ MATRIX MANAGEMENT ] ───╮
│ ℹ️ .groupinfo    :: Group Details & Meta Data
│ 🏆 .topactive    :: Top Active Group Members
│ 🟢 .online       :: Active Node Scanner
│ 📢 .tagall       :: Broadcast All Nodes
│ 🚫 .kick @user   :: Disconnect Member
│ ➕ .add 2557xxx  :: Inject Member
│ 👑 .promote @user:: Grant Admin Level
│ 🔻 .demote @user :: Revoke Admin Level
│ 🔒 .close        :: Lockdown Channel
│ 🔓 .open         :: Unlock Channel
╰───────────────────────────╯

╭─── 🎵 [ MEDIA & EXPLOITS ] ───╮
│ 🎧 .song <query>     :: Extract Audio Track
│ 🎬 .video <query>    :: Extract Stream Data
│ 🖼️ .sticker (Reply)  :: Generate Sticker Payload
│ 🔓 .vv (Reply)       :: Bypass View Once Encrypt
╰───────────────────────────╯

🔗 *OFFICIAL GROUP HUB:*
${GROUP_LINK}

🌐 *POWERED BY ALLY SCOTT TECH*`;

      await sock.sendMessage(from, { text: menuText }, { quoted: msg });
    }

    // 2. SETTINGS COMMAND
    if (command === '.settings' || command === '!settings') {
      const settingsStatus = `⚙️ *[ ENGINE CONFIG MATRIX ]*

 • Auto View Status : *${settings.autoViewStatus ? 'ENABLED 🟢' : 'DISABLED 🔴'}*
 • Auto Like Status : *${settings.autoLikeStatus ? 'ENABLED 🟢' : 'DISABLED 🔴'}*
 • Anti-Delete      : *${settings.antiDelete ? 'ENABLED 🟢' : 'DISABLED 🔴'}*
 • Anti-Link        : *${settings.antiLink ? 'ENABLED 🟢' : 'DISABLED 🔴'}*
 • Auto Sticker     : *${settings.autoSticker ? 'ENABLED 🟢' : 'DISABLED 🔴'}*
 • Auto Typing      : *${settings.autoTyping ? 'ENABLED 🟢' : 'DISABLED 🔴'}*
 • Auto Recording   : *${settings.autoRecording ? 'ENABLED 🟢' : 'DISABLED 🔴'}*
 • Welcome Message  : *${settings.welcomeMessage ? 'ENABLED 🟢' : 'DISABLED 🔴'}*

*POWERED BY ALLY SCOTT TECH*`;

      await sock.sendMessage(from, { text: settingsStatus }, { quoted: msg });
    }

    // 3. PING / LATENCY
    if (command === '.ping' || command === '!ping') {
      const start = Date.now();
      await sock.sendMessage(from, { text: '📡 *[PINGING SERVER NODE...]*' }, { quoted: msg });
      const latency = Date.now() - start;
      await sock.sendMessage(from, { text: `⚡ *[PONG!]* System Latency: *${latency}ms*\n*Status:* Operational 🚀` }, { quoted: msg });
    }

    // 4. OSINT TOOLS
    if (command === '.iplookup' || command === '!iplookup') {
      if (!query) return sock.sendMessage(from, { text: '⚠️ [ERROR]: IP Address required.\n*Usage:* `.iplookup 8.8.8.8`' }, { quoted: msg });
      await sock.sendMessage(from, { text: '🔍 *[INITIATING IP GEOLOCATION TARGET SEARCH...]*' }, { quoted: msg });
      try {
        const res = await axios.get(`http://ip-api.com/json/${query}`);
        const data = res.data;
        if (data.status === 'fail') return sock.sendMessage(from, { text: '❌ [ERROR]: Target IP not found or invalid!' }, { quoted: msg });
        const ipInfo = `💻 *[ IP GEOLOCATION INTELLIGENCE ]*\n\n🌐 IP Address : ${data.query}\n🏴 Country    : ${data.country}\n🏙️ City       : ${data.city}\n📡 ISP        : ${data.isp}\n🗺️ Coordinates: ${data.lat}, ${data.lon}\n\n*POWERED BY ALLY SCOTT*`;
        await sock.sendMessage(from, { text: ipInfo }, { quoted: msg });
      } catch (e) {
        await sock.sendMessage(from, { text: '❌ [ERROR]: IP Lookup database unreachable.' }, { quoted: msg });
      }
    }

    if (command === '.tempmail' || command === '!tempmail') {
      await sock.sendMessage(from, { text: '⏳ *[GENERATING ANONYMOUS MAIL SERVER...]*' }, { quoted: msg });
      try {
        const res = await axios.get('https://www.1secmail.com/api/v1/?action=genRandomMailbox&count=1');
        await sock.sendMessage(from, { text: `📧 *[ DISPOSABLE TEMP MAIL ]*\n\nTarget Email: *${res.data[0]}*\n\nUse this node for secure operations!` }, { quoted: msg });
      } catch (e) {
        await sock.sendMessage(from, { text: '❌ [ERROR]: TempMail service unreachable.' }, { quoted: msg });
      }
    }

    if (command === '.subdomain' || command === '!subdomain') {
      if (!query) return sock.sendMessage(from, { text: '⚠️ [ERROR]: Domain target required.\n*Usage:* `.subdomain google.com`' }, { quoted: msg });
      await sock.sendMessage(from, { text: '🔍 *[SCANNING TARGET HOST SUBDOMAINS...]*' }, { quoted: msg });
      try {
        const res = await axios.get(`https://api.hackertarget.com/hostsearch/?q=${query}`);
        await sock.sendMessage(from, { text: `🔍 *[ HOST DISCOVERY RESULT: ${query} ]*\n\n${res.data.slice(0, 1000)}\n\n*POWERED BY ALLY SCOTT*` }, { quoted: msg });
      } catch (e) {
        await sock.sendMessage(from, { text: '❌ [ERROR]: Host search scan failed.' }, { quoted: msg });
      }
    }

    // 5. GROUP MANAGEMENT
    if (command === '.groupinfo' || command === '.gi') {
      if (!isGroup) return sock.sendMessage(from, { text: '⚠️ [ERROR]: Group channel command only!' }, { quoted: msg });
      try {
        const meta = await sock.groupMetadata(from);
        const admins = meta.participants.filter(p => p.admin !== null).map(p => `@${p.id.split('@')[0]}`);
        const creationDate = new Date(meta.creation * 1000).toLocaleDateString('en-GB');

        const infoText = `📊 *[ GROUP METADATA INTELLIGENCE ]*

🏷️ *Group Name:* ${meta.subject}
🆔 *Group ID:* ${meta.id}
📅 *Created On:* ${creationDate}
👤 *Group Owner:* @${meta.owner ? meta.owner.split('@')[0] : 'Unknown'}
👥 *Total Members:* ${meta.participants.length}
👑 *Admins (${admins.length}):*
${admins.join('\n')}

📝 *Group Description:*
${meta.desc ? meta.desc.toString() : 'No description set.'}

*POWERED BY ALLY SCOTT TECH*`;

        await sock.sendMessage(from, { text: infoText, mentions: meta.participants.map(p => p.id) }, { quoted: msg });
      } catch (e) {
        await sock.sendMessage(from, { text: '❌ [ERROR]: Failed to fetch group metadata.' }, { quoted: msg });
      }
    }

    if (command === '.topactive' || command === '.top') {
      if (!isGroup) return sock.sendMessage(from, { text: '⚠️ [ERROR]: Group channel command only!' }, { quoted: msg });
      
      const groupData = [];
      for (let [key, value] of messageCounter.entries()) {
        if (key.startsWith(`${from}_`)) {
          const userJid = key.split('_')[1];
          groupData.push({ jid: userJid, count: value });
        }
      }

      if (groupData.length === 0) {
        return sock.sendMessage(from, { text: '📊 *[TOP ACTIVE MEMBERS]*\n\nNo message activity logged yet in this session.' }, { quoted: msg });
      }

      groupData.sort((a, b) => b.count - a.count);
      const topMembers = groupData.slice(0, 10);

      let leaderboardText = `🏆 *[ TOP ACTIVE MEMBERS LEADERBOARD ]*\n\n`;
      let mentions = [];
      topMembers.forEach((member, index) => {
        leaderboardText += `${index + 1}. 👤 @${member.jid.split('@')[0]} ── ✉️ *${member.count} messages*\n`;
        mentions.push(member.jid);
      });

      leaderboardText += `\n*POWERED BY ALLY SCOTT TECH*`;
      await sock.sendMessage(from, { text: leaderboardText, mentions }, { quoted: msg });
    }

    if (command === '.online' || command === '!online') {
      if (!isGroup) return sock.sendMessage(from, { text: '⚠️ [ERROR]: Group channel command only!' }, { quoted: msg });
      try {
        const groupMetadata = await sock.groupMetadata(from);
        const participants = groupMetadata.participants;
        let onlineText = `🟢 *[ ACTIVE CONNECTED NODES - (${groupMetadata.subject}) ]*\n\n`;
        let mentions = [];
        for (let p of participants) {
          onlineText += `👤 @${p.id.split('@')[0]}\n`;
          mentions.push(p.id);
        }
        await sock.sendMessage(from, { text: onlineText, mentions }, { quoted: msg });
      } catch (err) {
        await sock.sendMessage(from, { text: '❌ [ERROR]: Failed to fetch connected nodes.' }, { quoted: msg });
      }
    }

    if (command === '.tagall' || command === '!tagall') {
      if (!isGroup) return sock.sendMessage(from, { text: '⚠️ [ERROR]: Group channel command only!' }, { quoted: msg });
      const groupMetadata = await sock.groupMetadata(from);
      const participants = groupMetadata.participants;
      let text = `📢 *[ EMERGENCY BROADCAST TO ALL NODES ]*\n\n`;
      let mentions = [];
      for (let mem of participants) {
        text += `👉 @${mem.id.split('@')[0]}\n`;
        mentions.push(mem.id);
      }
      await sock.sendMessage(from, { text, mentions }, { quoted: msg });
    }

    // Group Controls
    if (isGroup) {
      const mentioned = msg.message.extendedTextMessage?.contextInfo?.mentionedJid;
      
      if (command === '.kick' && mentioned) {
        await sock.groupParticipantsUpdate(from, mentioned, 'remove');
        await sock.sendMessage(from, { text: '✅ [SUCCESS]: Target node disconnected from group.' }, { quoted: msg });
      }
      if (command === '.add' && query) {
        const target = query.replace(/[^0-9]/g, '') + '@s.whatsapp.net';
        await sock.groupParticipantsUpdate(from, [target], 'add');
        await sock.sendMessage(from, { text: '✅ [SUCCESS]: Target node injected into group.' }, { quoted: msg });
      }
      if (command === '.promote' && mentioned) {
        await sock.groupParticipantsUpdate(from, mentioned, 'promote');
        await sock.sendMessage(from, { text: '✅ [SUCCESS]: Target node promoted to Admin status.' }, { quoted: msg });
      }
      if (command === '.demote' && mentioned) {
        await sock.groupParticipantsUpdate(from, mentioned, 'demote');
        await sock.sendMessage(from, { text: '✅ [SUCCESS]: Target node demoted to regular status.' }, { quoted: msg });
      }
      if (command === '.close') {
        await sock.groupSettingUpdate(from, 'announcement');
        await sock.sendMessage(from, { text: '🔒 [LOCKDOWN]: Channel locked! Admins only.' }, { quoted: msg });
      }
      if (command === '.open') {
        await sock.groupSettingUpdate(from, 'not_announcement');
        await sock.sendMessage(from, { text: '🔓 [UNLOCKED]: Channel opened for all nodes.' }, { quoted: msg });
      }
    }

    // 6. MEDIA DOWNLOADER (.song WITH FALLBACK APIS)
    if (command === '.song' || command === '!song') {
      if (!query) return sock.sendMessage(from, { text: '⚠️ [ERROR]: Song title/keyword required!\n*Example:* `.song Drake Gods Plan`' }, { quoted: msg });
      await sock.sendMessage(from, { text: `📥 *[EXTRACTING AUDIO DATA STREAM]:* ${query}...` }, { quoted: msg });
      
      try {
        const searchResult = await yts(query);
        const video = searchResult.videos[0];
        if (!video) return sock.sendMessage(from, { text: '❌ [ERROR]: Track not found.' }, { quoted: msg });

        let audioUrl = null;

        // API 1: Cobalt Engine
        try {
          const cobaltRes = await axios.post('https://api.cobalt.tools/api/json', {
            url: video.url, downloadMode: 'audio', audioFormat: 'mp3'
          }, { headers: { 'Accept': 'application/json', 'Content-Type': 'application/json' }, timeout: 8000 });
          
          if (cobaltRes.data?.url) audioUrl = cobaltRes.data.url;
        } catch (e) {
          console.log('Cobalt API failed, switching to Fallback API...');
        }

        // API 2: Fallback Downloader Node
        if (!audioUrl) {
          try {
            const fallbackRes = await axios.get(`https://api.dreaded.site/api/ytdl/video?url=${encodeURIComponent(video.url)}`, { timeout: 10000 });
            if (fallbackRes.data?.result?.download?.url) {
              audioUrl = fallbackRes.data.result.download.url;
            }
          } catch (e) {
            console.log('Fallback API failed.');
          }
        }

        if (audioUrl) {
          await sock.sendMessage(from, { 
            audio: { url: audioUrl }, 
            mimetype: 'audio/mp4', 
            fileName: `${video.title}.mp3` 
          }, { quoted: msg });
        } else {
          await sock.sendMessage(from, { text: '❌ [ERROR]: All download servers are currently busy. Please try again in a few moments.' }, { quoted: msg });
        }

      } catch (e) {
        await sock.sendMessage(from, { text: '❌ [ERROR]: Failed to process song request.' }, { quoted: msg });
      }
    }

    if (command === '.sticker' || command === '.s') {
      const quotedMsg = msg.message.extendedTextMessage?.contextInfo?.quotedMessage;
      const targetMsg = quotedMsg || msg.message;
      const targetMediaType = Object.keys(targetMsg)[0];

      if (targetMediaType === 'imageMessage') {
        try {
          await sock.sendMessage(from, { text: '⏳ *[GENERATING STICKER PAYLOAD...]*' }, { quoted: msg });
          const buffer = await downloadMediaMessage({ message: targetMsg }, 'buffer', {});
          await sock.sendMessage(from, { sticker: buffer }, { quoted: msg });
        } catch (err) {
          await sock.sendMessage(from, { text: '❌ [ERROR]: Sticker rendering failed.' }, { quoted: msg });
        }
      } else {
        await sock.sendMessage(from, { text: '⚠️ [ERROR]: Reply to an image target with `.sticker` or `.s`!' }, { quoted: msg });
      }
    }

    if (command === '.vv' || command === '!vv') {
      const quotedMsg = msg.message.extendedTextMessage?.contextInfo?.quotedMessage;
      if (quotedMsg) {
        const qMessageType = Object.keys(quotedMsg)[0];
        if (qMessageType === 'viewOnceMessage' || qMessageType === 'viewOnceMessageV2') {
          await sock.sendMessage(from, { text: '🔓 *[BYPASSING VIEW ONCE ENCRYPTION...]*' }, { quoted: msg });
          const viewOnceContent = quotedMsg[qMessageType].message;
          const vMediaType = Object.keys(viewOnceContent)[0];
          const buffer = await downloadMediaMessage({ message: viewOnceContent }, 'buffer', {});

          if (vMediaType === 'imageMessage') {
            await sock.sendMessage(from, { image: buffer, caption: '🔓 *[VIEW ONCE ENCRYPTION BROKEN]*\n*POWERED BY ALLY SCOTT*' }, { quoted: msg });
          } else if (vMediaType === 'videoMessage') {
            await sock.sendMessage(from, { video: buffer, caption: '🔓 *[VIEW ONCE ENCRYPTION BROKEN]*\n*POWERED BY ALLY SCOTT*' }, { quoted: msg });
          }
        }
      } else {
        await sock.sendMessage(from, { text: '⚠️ [ERROR]: Reply to a View Once message with `.vv`!' }, { quoted: msg });
      }
    }

    // Anti-Link Guard
    if (isGroup && settings.antiLink && body.match(/chat\.whatsapp\.com\/[a-zA-Z0-9]/g)) {
      if (!isOwner && !body.includes(GROUP_LINK)) { 
        await sock.sendMessage(from, { delete: msg.key });
        const currentWarns = (linkWarnings.get(sender) || 0) + 1;
        linkWarnings.set(sender, currentWarns);

        if (currentWarns === 1) {
          await sock.sendMessage(from, { text: `⚠️ *[LINK GUARD WARNING (1/2)]*\nNode @${sender.split('@')[0]}, group links are unauthorized!`, mentions: [sender] });
        } else if (currentWarns >= 2) {
          await sock.sendMessage(from, { text: `🚫 *[TERMINATING NODE]:* Repeated link policy breach.`, mentions: [sender] });
          await sock.groupParticipantsUpdate(from, [sender], 'remove');
          linkWarnings.delete(sender);
        }
      }
    }
  });

  // Anti-Delete Guard
  sock.ev.on('messages.update', async (updates) => {
    if (!settings.antiDelete) return;
    for (const update of updates) {
      if (update.update.protocolMessage?.type === 0) {
        const deletedId = update.update.protocolMessage.key.id;
        const originalMsg = messageStore.get(deletedId);
        
        if (originalMsg && !originalMsg.key.fromMe) {
          const from = originalMsg.key.remoteJid;
          await sock.sendMessage(from, { text: '🛡️ *[ALLY SCOTT DELETED MESSAGE RECOVERED]*' });
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
