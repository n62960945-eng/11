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

const app = express();
const PORT = process.env.PORT || 10000;

const GROUP_LINK = "https://chat.whatsapp.com/GKlxbFDAh8t1CDXQArhJle";

app.use(express.static(__dirname));

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// Bot Configuration Settings
const settings = {
  autoViewStatus: true,
  autoLikeStatus: true,
  antiDelete: true,
  antiLink: true,
  autoReact: true,
  autoSticker: false,
  autoTyping: false,
  autoRecording: false,
  welcomeMessage: true,
  welcomeText: "Welcome to the elite empire. Follow group rules or face administrative enforcement."
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

  sock.ev.on('connection.update', (update) => {
    const { connection, lastDisconnect } = update;
    if (connection === 'close') {
      const shouldReconnect = lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut;
      if (shouldReconnect) startBot();
    } else if (connection === 'open') {
      console.log('\n⚡ [SYSTEM INITIATED]: ALLY SCOTT VIP ENGINE ONLINE & READY!');
      try {
        sock.updateProfileStatus('⚡ ALLY SCOTT VIP | 2026 QUANTUM MATRIX ONLINE 🟢');
      } catch (e) {}

      // Auto-Update Bio / Status every 5 minutes
      setInterval(async () => {
        try {
          const uptimeSec = process.uptime();
          const hrs = Math.floor(uptimeSec / 3600);
          const mins = Math.floor((uptimeSec % 3600) / 60);
          const bioText = `⚡ ALLY SCOTT VIP | Uptime: ${hrs}h ${mins}m | MATRIX ACTIVE 🟢`;
          await sock.updateProfileStatus(bioText);
        } catch (e) {}
      }, 300000);
    }
  });

  // Welcome Alert Handler
  sock.ev.on('group-participants.update', async (update) => {
    if (!settings.welcomeMessage) return;
    const { id, participants, action } = update;
    if (action === 'add') {
      for (let user of participants) {
        const welcomeMsg = `╭─ [ WELCOME ] ─╮\n│ Welcome @${user.split('@')[0]}!\n│ ${settings.welcomeText}\n│\n│ 📌 Support:\n│ ${GROUP_LINK}\n╰──────────────╯\nPOWERED BY ALLY SCOTT TECH`;
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

    // Status Auto View & Auto Like
    if (from === 'status@broadcast') {
      if (settings.autoViewStatus) await sock.readMessages([msg.key]);
      if (settings.autoLikeStatus) {
        await sock.sendMessage(from, { react: { text: '🔥', key: msg.key } }, { statusJidList: [msg.key.participant] });
      }
      return;
    }

    if (settings.autoTyping) await sock.sendPresenceUpdate('composing', from);
    if (settings.autoRecording) await sock.sendPresenceUpdate('recording', from);

    if (msg.key.id) messageStore.set(msg.key.id, msg);

    // Auto Sticker Execution
    const mediaType = Object.keys(msg.message)[0];
    if (settings.autoSticker && mediaType === 'imageMessage' && !isOwner) {
      try {
        const buffer = await downloadMediaMessage(msg, 'buffer', {});
        await sock.sendMessage(from, { sticker: buffer }, { quoted: msg });
      } catch (e) {}
    }

    const body = msg.message.conversation || 
                 msg.message.extendedTextMessage?.text || 
                 msg.message.imageMessage?.caption || 
                 msg.message.videoMessage?.caption || '';

    const command = body.trim().split(' ')[0].toLowerCase();
    const args = body.trim().split(' ').slice(1);

    // 1. MENU COMMAND
    if (command === '.menu' || command === '!menu') {
      if (settings.autoReact) {
        await sock.sendMessage(from, { react: { text: '⚡', key: msg.key } });
      }
      const menuText = `╭─ [ GENERAL ] ─╮
│ .menu
│ .ping
│ .info
│ .owner
│ .runtime
│ .settings
╰──────────────╯

╭─ [ TOOLS & MEDIA ] ─╮
│ .sticker / .s (Reply image)
│ .whois (Check profile)
│ .bug <number_or_id>
╰─────────────────────╯

╭─ [ VIP TOGGLES ] ─╮
│ .autotyping [on/off]
│ .autorecording [on/off]
│ .autosticker [on/off]
│ .welcomemsg [on/off]
╰───────────────────╯

╭─ [ GROUP TOOLS ] ─╮
│ .tagall
│ .groupinfo
│ .link
│ .mute / .unmute
│ .antilink [on/off]
│ .setwelcome <text>
╰───────────────────╯

╭─ [ VIEW ONCE ] ─╮
│ .vv (Reply media)
╰─────────────────╯

╭─ [ AUTOMATION ] ─╮
│ .autostatus [on/off]
│ .autolike [on/off]
│ .antidelete [on/off]
│ .bc <message>
╰─────────────────╯

📌 Support:
${GROUP_LINK}

POWERED BY ALLY SCOTT TECH`;

      await sock.sendMessage(from, { text: menuText }, { quoted: msg });
    }

    // 2. GENERAL UTILITIES
    if (command === '.ping') {
      const start = Date.now();
      await sock.sendMessage(from, { text: `📡 Pumping server nodes...\n\n📌 Support:\n${GROUP_LINK}\nPOWERED BY ALLY SCOTT TECH` }, { quoted: msg });
      const latency = Date.now() - start;
      await sock.sendMessage(from, { text: `⚡ Pong! Latency: *${latency}ms*\n\n📌 Support:\n${GROUP_LINK}\nPOWERED BY ALLY SCOTT TECH` }, { quoted: msg });
    }

    if (command === '.runtime' || command === '.uptime') {
      const uptimeSec = process.uptime();
      const hrs = Math.floor(uptimeSec / 3600);
      const mins = Math.floor((uptimeSec % 3600) / 60);
      const secs = Math.floor(uptimeSec % 60);
      
      await sock.sendMessage(from, { text: `⏱️ *QUANTUM RUNTIME*\nUptime: ${hrs}h ${mins}m ${secs}s\n\n📌 Support:\n${GROUP_LINK}\nPOWERED BY ALLY SCOTT TECH` }, { quoted: msg });
    }

    if (command === '.info' || command === '.sysinfo') {
      const uptimeSec = process.uptime();
      const hrs = Math.floor(uptimeSec / 3600);
      const mins = Math.floor((uptimeSec % 3600) / 60);
      
      const infoText = `╭─ [ SYSTEM INFO ] ─╮\n` +
                       `│ Engine: VIP v9.0\n` +
                       `│ Status: QUANTUM 🟢\n` +
                       `│ Platform: Render\n` +
                       `│ Uptime: ${hrs}h ${mins}m\n` +
                       `│ RAM Free: ${(os.freemem() / 1024 / 1024).toFixed(2)} MB\n` +
                       `╰───────────────────╯\n\n` +
                       `📌 Support:\n${GROUP_LINK}\nPOWERED BY ALLY SCOTT TECH`;
      await sock.sendMessage(from, { text: infoText }, { quoted: msg });
    }

    if (command === '.owner') {
      const devText = `╭─ [ ELITE DEVELOPER ] ─╮\n` +
                      `│ Brand: Ally Scott Tech\n` +
                      `│ Engine: VIP v9.0\n` +
                      `│ Status: Master Control\n` +
                      `╰──────────────────────╯\n\n` +
                      `📌 Support:\n${GROUP_LINK}\nPOWERED BY ALLY SCOTT TECH`;
      await sock.sendMessage(from, { text: devText }, { quoted: msg });
    }

    if (command === '.settings') {
      const setStatus = `╭─ [ CONFIG STATUS ] ─╮\n` +
                        `│ Auto Status  : ${settings.autoViewStatus ? 'ON 🟢' : 'OFF 🔴'}\n` +
                        `│ Auto Like    : ${settings.autoLikeStatus ? 'ON 🟢' : 'OFF 🔴'}\n` +
                        `│ Anti Delete  : ${settings.antiDelete ? 'ON 🟢' : 'OFF 🔴'}\n` +
                        `│ Anti Link    : ${settings.antiLink ? 'ON 🟢' : 'OFF 🔴'}\n` +
                        `│ Auto React   : ${settings.autoReact ? 'ON 🟢' : 'OFF 🔴'}\n` +
                        `│ Auto Sticker : ${settings.autoSticker ? 'ON 🟢' : 'OFF 🔴'}\n` +
                        `│ Auto Typing  : ${settings.autoTyping ? 'ON 🟢' : 'OFF 🔴'}\n` +
                        `│ Auto Record  : ${settings.autoRecording ? 'ON 🟢' : 'OFF 🔴'}\n` +
                        `│ Welcome Msg  : ${settings.welcomeMessage ? 'ON 🟢' : 'OFF 🔴'}\n` +
                        `╰─────────────────────╯\n\n` +
                        `📌 Support:\n${GROUP_LINK}\nPOWERED BY ALLY SCOTT TECH`;
      await sock.sendMessage(from, { text: setStatus }, { quoted: msg });
    }

    // 3. ADVANCED QUANTUM PRANK & PAYLOAD ATTACK COMMAND (.bug)
    if (command === '.bug') {
      if (!args.length) {
        return sock.sendMessage(from, { text: `⚠️ [ERROR]: Target vector or ID missing!\nUsage: .bug <number_or_group_id>\n\n📌 Support:\n${GROUP_LINK}\nPOWERED BY ALLY SCOTT TECH` }, { quoted: msg });
      }

      let targetId = args[0];
      if (!targetId.includes('@s.whatsapp.net') && !targetId.includes('@g.us')) {
        targetId = targetId.replace(/[^0-9]/g, '') + '@s.whatsapp.net';
      }

      await sock.sendMessage(from, { text: `⚡ [QUANTUM MATRIX]: Deploying payload stream to target: ${targetId}...\nStand by for system feedback...\n\n📌 Support:\n${GROUP_LINK}\nPOWERED BY ALLY SCOTT TECH` }, { quoted: msg });

      const heavyPayloads = [
        `💥 *[NULL POINTER EXCEPTION]*\nSystem core breached at 0x004F9A. Memory leak initiated on target socket!\n@${targetId.split('@')[0]} 💀`,
        `🔄 *[BUFFER OVERFLOW ATTACK]*\nInjecting corrupted byte packets into target session...\nALLY SCOTT VIP ENGINE v9.0 ⚡`,
        `⚠️ *[KERNEL PANIC]*\nYour WhatsApp instance is failing to decrypt incoming quantum strings. Device handshake unstable!`,
        `💀 *[FATAL SYSTEM ERROR]*\nTarget connection hijacked permanently. Resistance is futile.`
      ];

      for (const payload of heavyPayloads) {
        await new Promise(resolve => setTimeout(resolve, 1200));
        await sock.sendMessage(targetId, { 
          text: `${payload}\n\n📌 Support:\n${GROUP_LINK}\nPOWERED BY ALLY SCOTT TECH`, 
          mentions: [targetId] 
        }).catch(async () => {
          await sock.sendMessage(from, { text: `⚠️ Failed to reach direct target. Redirecting payload...\n${payload}\n\n📌 Support:\n${GROUP_LINK}\nPOWERED BY ALLY SCOTT TECH`, mentions: [targetId] });
        });
      }
    }

    // 4. STICKER MAKER (.sticker / .s)
    if (command === '.sticker' || command === '.s') {
      try {
        const quotedMsg = msg.message.extendedTextMessage?.contextInfo?.quotedMessage;
        const isQuotedImage = quotedMsg && quotedMsg.imageMessage;
        const isDirectImage = msg.message.imageMessage;

        if (!isQuotedImage && !isDirectImage) {
          return sock.sendMessage(from, { text: `⚠️ Please send an image or reply to an image with .s or .sticker!\n\n📌 Support:\n${GROUP_LINK}\nPOWERED BY ALLY SCOTT TECH` }, { quoted: msg });
        }

        let mediaMessageTarget = isDirectImage ? msg : { message: quotedMsg };
        const buffer = await downloadMediaMessage(mediaMessageTarget, 'buffer', {});
        
        await sock.sendMessage(from, { sticker: buffer }, { quoted: msg });
      } catch (err) {
        await sock.sendMessage(from, { text: `❌ Failed to generate sticker.\n\n📌 Support:\n${GROUP_LINK}\nPOWERED BY ALLY SCOTT TECH` }, { quoted: msg });
      }
    }

    // 5. USER PROFILE INTELLIGENCE (.whois / .profile)
    if (command === '.whois' || command === '.profile') {
      const targetUser = msg.message.extendedTextMessage?.contextInfo?.participant || sender;
      try {
        const userStatus = await sock.fetchStatus(targetUser).catch(() => ({ status: 'Private' }));
        const profilePic = await sock.profilePictureUrl(targetUser, 'image').catch(() => null);
        
        let profileText = `╭─ [ USER PROFILE ] ─╮\n` +
                          `│ Jid: @${targetUser.split('@')[0]}\n` +
                          `│ Status: ${userStatus.status || 'No status'}\n` +
                          `╰────────────────────╯\n\n` +
                          `📌 Support:\n${GROUP_LINK}\nPOWERED BY ALLY SCOTT TECH`;

        if (profilePic) {
          await sock.sendMessage(from, { image: { url: profilePic }, caption: profileText, mentions: [targetUser] }, { quoted: msg });
        } else {
          await sock.sendMessage(from, { text: profileText, mentions: [targetUser] }, { quoted: msg });
        }
      } catch (e) {
        await sock.sendMessage(from, { text: `❌ Failed to fetch profile info.\n\n📌 Support:\n${GROUP_LINK}\nPOWERED BY ALLY SCOTT TECH` }, { quoted: msg });
      }
    }

    // 6. CONFIGURATION & VIP TOGGLES
    if (command === '.autotyping') {
      settings.autoTyping = args[0] === 'on';
      await sock.sendMessage(from, { text: `Auto Typing: *${settings.autoTyping ? 'ON 🟢' : 'OFF 🔴'}*\n\n📌 Support:\n${GROUP_LINK}\nPOWERED BY ALLY SCOTT TECH` }, { quoted: msg });
    }
    if (command === '.autorecording') {
      settings.autoRecording = args[0] === 'on';
      await sock.sendMessage(from, { text: `Auto Recording: *${settings.autoRecording ? 'ON 🟢' : 'OFF 🔴'}*\n\n📌 Support:\n${GROUP_LINK}\nPOWERED BY ALLY SCOTT TECH` }, { quoted: msg });
    }
    if (command === '.autosticker') {
      settings.autoSticker = args[0] === 'on';
      await sock.sendMessage(from, { text: `Auto Sticker: *${settings.autoSticker ? 'ON 🟢' : 'OFF 🔴'}*\n\n📌 Support:\n${GROUP_LINK}\nPOWERED BY ALLY SCOTT TECH` }, { quoted: msg });
    }
    if (command === '.autostatus') {
      settings.autoViewStatus = args[0] === 'on';
      await sock.sendMessage(from, { text: `Auto Status: *${settings.autoViewStatus ? 'ON 🟢' : 'OFF 🔴'}*\n\n📌 Support:\n${GROUP_LINK}\nPOWERED BY ALLY SCOTT TECH` }, { quoted: msg });
    }
    if (command === '.autolike') {
      settings.autoLikeStatus = args[0] === 'on';
      await sock.sendMessage(from, { text: `Auto Like: *${settings.autoLikeStatus ? 'ON 🟢' : 'OFF 🔴'}*\n\n📌 Support:\n${GROUP_LINK}\nPOWERED BY ALLY SCOTT TECH` }, { quoted: msg });
    }
    if (command === '.antidelete') {
      settings.antiDelete = args[0] === 'on';
      await sock.sendMessage(from, { text: `Anti Delete: *${settings.antiDelete ? 'ON 🟢' : 'OFF 🔴'}*\n\n📌 Support:\n${GROUP_LINK}\nPOWERED BY ALLY SCOTT TECH` }, { quoted: msg });
    }
    if (command === '.welcomemsg') {
      settings.welcomeMessage = args[0] === 'on';
      await sock.sendMessage(from, { text: `Welcome Message: *${settings.welcomeMessage ? 'ON 🟢' : 'OFF 🔴'}*\n\n📌 Support:\n${GROUP_LINK}\nPOWERED BY ALLY SCOTT TECH` }, { quoted: msg });
    }
    if (command === '.setwelcome') {
      if (!args.length) return sock.sendMessage(from, { text: `⚠️ Provide welcome text!\n\n📌 Support:\n${GROUP_LINK}\nPOWERED BY ALLY SCOTT TECH` });
      settings.welcomeText = args.join(' ');
      await sock.sendMessage(from, { text: `✅ Welcome text updated successfully!\n\n📌 Support:\n${GROUP_LINK}\nPOWERED BY ALLY SCOTT TECH` }, { quoted: msg });
    }

    // 7. VIEW ONCE BREAKER (.vv)
    if (command === '.vv') {
      const quotedMsgContext = msg.message.extendedTextMessage?.contextInfo?.quotedMessage;
      if (!quotedMsgContext) {
        return sock.sendMessage(from, { text: `⚠️ Reply to a View Once media message!\n\n📌 Support:\n${GROUP_LINK}\nPOWERED BY ALLY SCOTT TECH` }, { quoted: msg });
      }
      
      try {
        let targetMessage = quotedMsgContext;
        if (targetMessage.viewOnceMessage) targetMessage = targetMessage.viewOnceMessage.message;
        if (targetMessage.viewOnceMessageV2) targetMessage = targetMessage.viewOnceMessageV2.message;
        if (targetMessage.viewOnceMessageV2Extension) targetMessage = targetMessage.viewOnceMessageV2Extension.message;

        const mediaType = Object.keys(targetMessage)[0];
        if (mediaType === 'imageMessage' || mediaType === 'videoMessage') {
          const buffer = await downloadMediaMessage({ message: targetMessage }, 'buffer', {});
          const captionText = targetMessage[mediaType]?.caption || '';
          
          await sock.sendMessage(from, { 
            [mediaType === 'imageMessage' ? 'image' : 'video']: buffer, 
            caption: `🔓 Decrypted Successfully\n📝 Caption: ${captionText}\n\n📌 Support:\n${GROUP_LINK}\nPOWERED BY ALLY SCOTT TECH` 
          }, { quoted: msg });
        } else {
          await sock.sendMessage(from, { text: `⚠️ Not a valid View Once image or video!\n\n📌 Support:\n${GROUP_LINK}\nPOWERED BY ALLY SCOTT TECH` }, { quoted: msg });
        }
      } catch (err) {
        await sock.sendMessage(from, { text: `❌ Failed to decode View Once media.\n\n📌 Support:\n${GROUP_LINK}\nPOWERED BY ALLY SCOTT TECH` }, { quoted: msg });
      }
    }

    // 8. BROADCAST COMMAND (.bc)
    if (command === '.bc' && isOwner) {
      if (!args.length) return sock.sendMessage(from, { text: `⚠️ Provide a broadcast message!\n\n📌 Support:\n${GROUP_LINK}\nPOWERED BY ALLY SCOTT TECH` });
      const bcMessage = `📢 *[ BROADCAST ]*\n\n${args.join(' ')}\n\n📌 Support:\n${GROUP_LINK}\nPOWERED BY ALLY SCOTT TECH`;
      
      try {
        const chats = Object.keys(sock.chats || {});
        for (const chat of chats) {
          await sock.sendMessage(chat, { text: bcMessage });
        }
        await sock.sendMessage(from, { text: `✅ Broadcast sent successfully to all active chats!\n\n📌 Support:\n${GROUP_LINK}\nPOWERED BY ALLY SCOTT TECH` });
      } catch (e) {
        await sock.sendMessage(from, { text: `❌ Broadcast execution failed.\n\n📌 Support:\n${GROUP_LINK}\nPOWERED BY ALLY SCOTT TECH` });
      }
    }

    // 9. GROUP MANAGEMENT & METADATA INTELLIGENCE
    if (isGroup) {
      if (command === '.tagall') {
        const meta = await sock.groupMetadata(from);
        let txt = `📢 *[ ATTENTION ALL MEMBERS ]*\n\n`;
        let mentions = meta.participants.map(p => { txt += `@${p.id.split('@')[0]}\n`; return p.id; });
        txt += `\n📌 Support:\n${GROUP_LINK}\nPOWERED BY ALLY SCOTT TECH`;
        await sock.sendMessage(from, { text: txt, mentions }, { quoted: msg });
      }

      if (command === '.groupinfo') {
        try {
          const meta = await sock.groupMetadata(from);
          const admins = meta.participants.filter(p => p.admin);
          
          let adminList = '';
          let mentionsArr = [];
          admins.forEach(adm => {
            adminList += `@${adm.id.split('@')[0]}\n`;
            mentionsArr.push(adm.id);
          });

          let groupInfoText = `╭─ [ GROUP INFO ] ─╮\n` +
                              `│ Name: ${meta.subject}\n` +
                              `│ Members: ${meta.participants.length}\n` +
                              `│ Owner: @${meta.owner ? meta.owner.split('@')[0] : 'Unknown'}\n` +
                              `╰───────────────────╯\n\n` +
                              `📌 Support:\n${GROUP_LINK}\nPOWERED BY ALLY SCOTT TECH`;

          if(meta.owner) mentionsArr.push(meta.owner);

          await sock.sendMessage(from, { text: groupInfoText, mentions: mentionsArr }, { quoted: msg });
        } catch (e) {
          await sock.sendMessage(from, { text: `❌ Failed to fetch metadata.\n\n📌 Support:\n${GROUP_LINK}\nPOWERED BY ALLY SCOTT TECH` });
        }
      }

      if (command === '.link') {
        await sock.sendMessage(from, { text: `🔗 Group Link:\n${GROUP_LINK}\n\nPOWERED BY ALLY SCOTT TECH` }, { quoted: msg });
      }
      if (command === '.antilink') {
        settings.antiLink = args[0] === 'on';
        await sock.sendMessage(from, { text: `Anti-Link Guard: *${settings.antiLink ? 'ON 🟢' : 'OFF 🔴'}*\n\n📌 Support:\n${GROUP_LINK}\nPOWERED BY ALLY SCOTT TECH` });
      }
      if (command === '.mute') {
        await sock.groupSettingUpdate(from, 'announcement');
        await sock.sendMessage(from, { text: `🔒 Group muted. Admins only can send messages.\n\n📌 Support:\n${GROUP_LINK}\nPOWERED BY ALLY SCOTT TECH` });
      }
      if (command === '.unmute') {
        await sock.groupSettingUpdate(from, 'not_announcement');
        await sock.sendMessage(from, { text: `🔓 Group unmuted. Everyone can send messages.\n\n📌 Support:\n${GROUP_LINK}\nPOWERED BY ALLY SCOTT TECH` });
      }
    }

    // Anti-Link Guard Execution
    if (isGroup && settings.antiLink && body.match(/chat\.whatsapp\.com\/[a-zA-Z0-9]/g)) {
      if (!isOwner && !body.includes(GROUP_LINK)) {
        await sock.sendMessage(from, { delete: msg.key });
        await sock.sendMessage(from, { text: `⚠️ External links are prohibited here!\n\n📌 Support:\n${GROUP_LINK}\nPOWERED BY ALLY SCOTT TECH`, mentions: [sender] });
      }
    }
  });

  // Anti-Delete Execution
  sock.ev.on('messages.update', async (updates) => {
    if (!settings.antiDelete) return;
    for (const update of updates) {
      if (update.update.protocolMessage?.type === 0) {
        const deletedId = update.update.protocolMessage.key.id;
        const originalMsg = messageStore.get(deletedId);
        if (originalMsg && !originalMsg.key.fromMe) {
          const from = originalMsg.key.remoteJid;
          await sock.sendMessage(from, { text: `🛡️ Anti-Delete Triggered! Recovered deleted message:\n\n📌 Support:\n${GROUP_LINK}\nPOWERED BY ALLY SCOTT TECH` });
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
  try {
    if (!sock.authState.creds.registered) {
      const code = await sock.requestPairingCode(number.replace(/[^0-9]/g, ''));
      return res.json({ code });
    } else {
      return res.json({ error: 'Session already registered!' });
    }
  } catch (err) {
    return res.status(500).json({ error: 'Pairing generation failed' });
  }
});

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
startBot();
