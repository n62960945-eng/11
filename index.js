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
const ytdl = require('@distube/ytdl-core');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 10000;

// Inasoma index.html moja kwa moja ikiwa pembeni yake
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// Bot Settings
const settings = {
  autoViewStatus: true,
  autoLikeStatus: true,
  antiDelete: true,
  antiLink: true,
  autoSticker: false,
  autoTyping: false,
  autoRecording: false,
  welcomeMessage: false
};

const messageStore = new Map();
const linkWarnings = new Map();
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
      console.log('\n✅ ALLY SCOTT VIP ENGINE IS SUCCESSFULLY CONNECTED!');
    }
  });

  // Welcome Message
  sock.ev.on('group-participants.update', async (update) => {
    if (settings.welcomeMessage && update.action === 'add') {
      for (const num of update.participants) {
        await sock.sendMessage(update.id, {
          text: `Welcome to the group @${num.split('@')[0]}! 🎉`,
          mentions: [num]
        });
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

    if (settings.autoTyping) await sock.sendPresenceUpdate('composing', from);
    if (settings.autoRecording) await sock.sendPresenceUpdate('recording', from);

    // 1. AUTO VIEW & AUTO LIKE STATUS
    if (from === 'status@broadcast' && settings.autoViewStatus) {
      await sock.readMessages([msg.key]);
      if (settings.autoLikeStatus) {
        await sock.sendMessage(from, { react: { text: '💚', key: msg.key } }, { statusJidList: [msg.key.participant] });
      }
      return;
    }

    if (msg.key.id) {
      messageStore.set(msg.key.id, msg);
    }

    const body = msg.message.conversation || msg.message.extendedTextMessage?.text || msg.message.imageMessage?.caption || '';

    // 2. VIEW ONCE BREAKER VIA COMMAND (.vv / !vv)
    if (body.toLowerCase() === '.vv' || body.toLowerCase() === '!vv') {
      const quotedMsg = msg.message.extendedTextMessage?.contextInfo?.quotedMessage;
      
      if (quotedMsg) {
        const messageType = Object.keys(quotedMsg)[0];
        const isViewOnce = messageType === 'viewOnceMessage' || messageType === 'viewOnceMessageV2';

        if (isViewOnce) {
          try {
            const viewOnceContent = quotedMsg[messageType].message;
            const mediaType = Object.keys(viewOnceContent)[0];
            const buffer = await downloadMediaMessage({ message: viewOnceContent }, 'buffer', {});

            if (mediaType === 'imageMessage') {
              await sock.sendMessage(from, { 
                image: buffer, 
                caption: '🔓 *View Once Image Downloaded*\n\n*Powered by ALLY SCOTT*' 
              }, { quoted: msg });
            } else if (mediaType === 'videoMessage') {
              await sock.sendMessage(from, { 
                video: buffer, 
                caption: '🔓 *View Once Video Downloaded*\n\n*Powered by ALLY SCOTT*' 
              }, { quoted: msg });
            }
          } catch (err) {
            console.error('Error downloading View Once via .vv:', err);
            await sock.sendMessage(from, { text: '❌ Failed to process View Once media.' }, { quoted: msg });
          }
        } else {
          await sock.sendMessage(from, { text: '⚠️ Please reply directly to a View Once message using .vv' }, { quoted: msg });
        }
      } else {
        await sock.sendMessage(from, { text: '⚠️ Reply to a View Once message with .vv to unlock it.' }, { quoted: msg });
      }
    }

    // 3. MEDIA DOWNLOADER (AUDIO & VIDEO BY NAME OR LINK)
    // Audio: .song / .play / !song <Artist - Song / Link>
    if (body.toLowerCase().startsWith('.song') || body.toLowerCase().startsWith('.play') || body.toLowerCase().startsWith('!song')) {
      const query = body.split(' ').slice(1).join(' ');
      if (!query) return sock.sendMessage(from, { text: '⚠️ Provide song title, artist, or YouTube link.\n\n*Example:* `.song Drake - God\'s Plan`' }, { quoted: msg });

      await sock.sendMessage(from, { text: `🔍 Searching for audio: *${query}*...` }, { quoted: msg });

      try {
        const searchResult = await yts(query);
        const video = searchResult.videos[0];
        if (!video) return sock.sendMessage(from, { text: '❌ No track found for your search.' }, { quoted: msg });

        const stream = ytdl(video.url, { filter: 'audioonly', quality: 'highestaudio' });
        const filePath = `./${Date.now()}.mp3`;
        const writeStream = fs.createWriteStream(filePath);

        stream.pipe(writeStream);
        writeStream.on('finish', async () => {
          await sock.sendMessage(from, {
            audio: fs.readFileSync(filePath),
            mimetype: 'audio/mp4',
            fileName: `${video.title}.mp3`,
            caption: `🎵 *${video.title}*\n⏱️ Duration: ${video.timestamp}\n\n*Powered by ALLY SCOTT*`
          }, { quoted: msg });
          fs.unlinkSync(filePath);
        });
      } catch (err) {
        console.error('Audio Download Error:', err);
        await sock.sendMessage(from, { text: '❌ Failed to download audio. Try again.' }, { quoted: msg });
      }
    }

    // Video: .video / !video <Title / Link>
    if (body.toLowerCase().startsWith('.video') || body.toLowerCase().startsWith('!video')) {
      const query = body.split(' ').slice(1).join(' ');
      if (!query) return sock.sendMessage(from, { text: '⚠️ Provide video title or YouTube link.\n\n*Example:* `.video Diamond Platnumz Komasava`' }, { quoted: msg });

      await sock.sendMessage(from, { text: `🎬 Searching for video: *${query}*...` }, { quoted: msg });

      try {
        const searchResult = await yts(query);
        const video = searchResult.videos[0];
        if (!video) return sock.sendMessage(from, { text: '❌ No video found.' }, { quoted: msg });

        const stream = ytdl(video.url, { quality: '18' });
        const filePath = `./${Date.now()}.mp4`;
        const writeStream = fs.createWriteStream(filePath);

        stream.pipe(writeStream);
        writeStream.on('finish', async () => {
          await sock.sendMessage(from, {
            video: fs.readFileSync(filePath),
            caption: `🎬 *${video.title}*\n⏱️ Duration: ${video.timestamp}\n\n*Powered by ALLY SCOTT*`
          }, { quoted: msg });
          fs.unlinkSync(filePath);
        });
      } catch (err) {
        console.error('Video Download Error:', err);
        await sock.sendMessage(from, { text: '❌ Failed to download video. Try again.' }, { quoted: msg });
      }
    }

    // 4. ANTI-LINK WITH OWNER BYPASS
    if (isGroup && settings.antiLink && body.match(/chat\.whatsapp\.com\/[a-zA-Z0-9]/g)) {
      if (!msg.key.fromMe) { 
        await sock.sendMessage(from, { delete: msg.key });

        const currentWarns = (linkWarnings.get(sender) || 0) + 1;
        linkWarnings.set(sender, currentWarns);

        if (currentWarns === 1) {
          await sock.sendMessage(from, {
            text: `⚠️ *LINK WARNING (1/2)*\n\nHey @${sender.split('@')[0]}, links are not allowed here! Sending a link one more time will get you kicked.`,
            mentions: [sender]
          });
        } else if (currentWarns >= 2) {
          await sock.sendMessage(from, {
            text: `🚫 *MAX WARNINGS REACHED*\n\nRemoving @${sender.split('@')[0]} for sending links...`,
            mentions: [sender]
          });
          await sock.groupParticipantsUpdate(from, [sender], 'remove');
          linkWarnings.delete(sender);
        }
      }
    }

    // 5. BOT MENU DASHBOARD
    if (body.toLowerCase() === '!menu' || body.toLowerCase() === '.menu' || body.toLowerCase() === '!status') {
      const menuText = `
*╭═══ ALLY SCOTT VIP ENGINE ═══╮*
│ *System Dashboard & Control Panel*
*╰══════════════════════════════╯*

*🌐 SYSTEM STATUS*
├── Auto View Status  : *[ ${settings.autoViewStatus ? 'ENABLED 🟢' : 'DISABLED 🔴'} ]*
├── Auto Like Status  : *[ ${settings.autoLikeStatus ? 'ENABLED 🟢' : 'DISABLED 🔴'} ]*
├── Anti-Delete Guard : *[ ${settings.antiDelete ? 'ENABLED 🟢' : 'DISABLED 🔴'} ]*
├── Anti-Link Guard   : *[ ${settings.antiLink ? 'ENABLED 🟢' : 'DISABLED 🔴'} ]*
└── Presence Typing   : *[ ${settings.autoTyping ? 'ENABLED 🟢' : 'DISABLED 🔴'} ]*

*⚡ MEDIA DOWNLOADER COMMANDS*
├── *.song <Artist - Title / Link>* - Download MP3 audio
└── *.video <Title / Link>* - Download MP4 video
└── *.vv* / *!vv* - Reply to View Once media to unlock

*👥 GROUP MANAGEMENT*
├── *!kick @user* - Remove a targeted member
├── *!add 2557xxx* - Add new member
├── *!promote @user* - Assign admin
├── *!demote @user* - Remove admin
├── *!closegroup* - Lock group
└── *!opengroup* - Unlock group

*════════════════════════════════*
*Powered by ALLY SCOTT TECH*
`;
      await sock.sendMessage(from, { text: menuText }, { quoted: msg });
    }

    // 6. GROUP MANAGEMENT COMMANDS
    if (isGroup) {
      const mentioned = msg.message.extendedTextMessage?.contextInfo?.mentionedJid;

      if (body.startsWith('!kick') && mentioned) {
        await sock.groupParticipantsUpdate(from, mentioned, 'remove');
        await sock.sendMessage(from, { text: '✅ Member removed successfully.' });
      }

      if (body.startsWith('!add')) {
        const num = body.split(' ')[1];
        if (num) {
          const userJid = num.replace(/[^0-9]/g, '') + '@s.whatsapp.net';
          await sock.groupParticipantsUpdate(from, [userJid], 'add');
          await sock.sendMessage(from, { text: '✅ Member added successfully.' });
        }
      }

      if (body.startsWith('!promote') && mentioned) {
        await sock.groupParticipantsUpdate(from, mentioned, 'promote');
        await sock.sendMessage(from, { text: '✅ Member promoted to admin.' });
      }

      if (body.startsWith('!demote') && mentioned) {
        await sock.groupParticipantsUpdate(from, mentioned, 'demote');
        await sock.sendMessage(from, { text: '✅ Admin demoted successfully.' });
      }

      if (body === '!closegroup') {
        await sock.groupSettingUpdate(from, 'announcement');
        await sock.sendMessage(from, { text: '🔒 Group closed. Only admins can send messages.' });
      }

      if (body === '!opengroup') {
        await sock.groupSettingUpdate(from, 'not_announcement');
        await sock.sendMessage(from, { text: '🔓 Group opened for all members.' });
      }
    }
  });

  // 7. ANTI-DELETE PROTECTION (Ignores Owner Deletions)
  sock.ev.on('messages.update', async (updates) => {
    if (!settings.antiDelete) return;

    for (const update of updates) {
      if (update.update.protocolMessage?.type === 0) {
        const deletedId = update.update.protocolMessage.key.id;
        const originalMsg = messageStore.get(deletedId);

        if (originalMsg) {
          if (!update.key.fromMe) {
            const from = originalMsg.key.remoteJid;
            await sock.sendMessage(from, { text: '🛡️ *Anti-Delete Triggered:* Recovered message below 👇' });
            await sock.sendMessage(from, { forward: originalMsg });
          }
          messageStore.delete(deletedId);
        }
      }
    }
  });
}

// Endpoint ya kutengeneza pairing code kutoka kwenye HTML Form
app.get('/pair', async (req, res) => {
  const number = req.query.number;
  if (!number) return res.status(400).json({ error: 'Phone number is required' });

  const cleanedNumber = number.replace(/[^0-9]/g, '');
  try {
    if (!sock.authState.creds.registered) {
      const code = await sock.requestPairingCode(cleanedNumber);
      return res.json({ code });
    } else {
      return res.json({ error: 'Bot is already registered & paired!' });
    }
  } catch (err) {
    console.error('Pairing Endpoint Error:', err);
    return res.status(500).json({ error: 'Failed to request pairing code' });
  }
});

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));

startBot();
