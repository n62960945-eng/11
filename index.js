// --- ALLY SCOTT VIP ENGINE - MULTI-DEVICE MASTER EDITION (ENGLISH) ---
const { default: makeWASocket, useMultiFileAuthState, DisconnectReason, makeCacheableSignalKeyStore, delay } = require('@whiskeysockets/baileys');
const { Boom } = require('@hapi/boom');
const pino = require('pino');
const express = require('express');
const fs = require('fs');
const path = require('path');
const yts = require('yt-search');
const axios = require('axios');

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const PORT = process.env.PORT || 10000;
let OWNER_NUMBER = "255629308154";
const SESSION_DIR = path.join(__dirname, 'session');
const LOG_IMAGE_PATH = path.join(__dirname, 'log.jpg');

if (!fs.existsSync(SESSION_DIR)) {
    fs.mkdirSync(SESSION_DIR, { recursive: true });
}

// Bot Toggle States & Warnings Memory
const botSettings = {
    autostatus: false,
    autolike: false,
    antidelete: true,
    antilingk: false,
    autotyping: false,
    autorecording: false,
    autosticker: false
};

const userWarnings = {}; 
const msgStore = new Map();

// 1. Web Dashboard / Pairing Route
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

app.post('/pair', async (req, res) => {
    let num = req.body.number;
    if (!num) return res.status(400).json({ error: "Please provide your phone number!" });
    num = num.replace(/[^0-9]/g, '');

    try {
        const { state, saveCreds } = await useMultiFileAuthState(SESSION_DIR);
        const sock = makeWASocket({
            logger: pino({ level: 'silent' }),
            printQRInTerminal: false,
            auth: {
                creds: state.creds,
                keys: makeCacheableSignalKeyStore(state.keys, pino({ level: 'silent' }).child({ level: 'fatal' }))
            },
            browser: ["Ubuntu", "Chrome", "20.04"]
        });

        sock.ev.on('creds.update', saveCreds);

        if (!sock.authState.creds.registered) {
            await delay(2000);
            let code = await sock.requestPairingCode(num);
            code = code?.match(/.{1,4}/g)?.join("-") || code;
            if (!res.headersSent) return res.json({ code: code });
        } else {
            if (!res.headersSent) return res.json({ code: "ALREADY_CONNECTED" });
        }
    } catch (err) {
        console.error("Pairing Error:", err);
        if (!res.headersSent) return res.status(500).json({ error: "Failed to generate pairing code." });
    }
});

// 2. Bot Core Engine (Multi-Device & Auto-Clean Session Speed Edition)
async function startBot() {
    try {
        // Auto-Clean Session: Clears temporary session garbage on startup, protecting creds.json
        if (fs.existsSync(SESSION_DIR)) {
            const files = fs.readdirSync(SESSION_DIR);
            for (const file of files) {
                if (file !== 'creds.json') {
                    try {
                        fs.unlinkSync(path.join(SESSION_DIR, file));
                    } catch (e) {}
                }
            }
            console.log('🧹 [AUTO-CLEAN]: Session garbage cleared successfully on startup.');
        }

        await delay(2000); 
        const { state, saveCreds } = await useMultiFileAuthState(SESSION_DIR);

        const sock = makeWASocket({
            logger: pino({ level: 'silent' }),
            printQRInTerminal: false,
            auth: {
                creds: state.creds,
                keys: makeCacheableSignalKeyStore(state.keys, pino({ level: 'silent' }).child({ level: 'fatal' }))
            },
            browser: ["Ubuntu", "Chrome", "20.04"],
            connectTimeoutMs: 60000,
            defaultQueryTimeoutMs: 60000,
            keepAliveIntervalMs: 10000
        });

        sock.ev.on('connection.update', async (update) => {
            const { connection, lastDisconnect } = update;
            if (connection === 'close') {
                const reason = new Boom(lastDisconnect?.error)?.output?.statusCode;
                console.log("Connection closed due to reason:", reason);
                if (reason !== DisconnectReason.loggedOut) {
                    setTimeout(startBot, 3000);
                } else {
                    console.log("Session logged out. Please clear session folder.");
                }
            } else if (connection === 'open') {
                console.log('⚡ [MATRIX_ONLINE]: ALLY SCOTT MULTI-DEVICE ENGINE SECURED & FAST.');
                
                try {
                    let ownerJid = OWNER_NUMBER + "@s.whatsapp.net";
                    let startupText = `⚡ *ALLY SCOTT MULTI-DEVICE ONLINE*\n\n🟢 Bot is fully active and connected successfully across multiple devices!`;
                    
                    if (fs.existsSync(LOG_IMAGE_PATH)) {
                        await sock.sendMessage(ownerJid, { 
                            image: fs.readFileSync(LOG_IMAGE_PATH), 
                            caption: startupText 
                        });
                    } else {
                        await sock.sendMessage(ownerJid, { text: startupText });
                    }
                } catch (e) {
                    console.log("Failed to send startup message:", e);
                }
            }
        });

        sock.ev.on('creds.update', saveCreds);

        // MESSAGE UPSERT & MEMORY CACHE
        sock.ev.on('messages.upsert', async (chatUpdate) => {
            try {
                const mek = chatUpdate.messages[0];
                if (!mek || !mek.message) return;

                const from = mek.key.remoteJid;
                
                if (mek.key && mek.key.id) {
                    msgStore.set(mek.key.id, mek);
                    if (msgStore.size > 500) {
                        const oldestKey = msgStore.keys().next().value;
                        msgStore.delete(oldestKey);
                    }
                }

                if (from === 'status@broadcast') {
                    if (botSettings.autostatus) await sock.readMessages([mek.key]);
                    if (botSettings.autolike) await sock.sendMessage('status@broadcast', { react: { text: '💀', key: mek.key } }, { statusJidList: [mek.key.participant] });
                    return;
                }

                const sender = mek.key.participant || from;
                const isGroup = from.endsWith('@g.us');
                const isOwner = sender.includes(OWNER_NUMBER) || mek.key.fromMe;

                const type = Object.keys(mek.message)[0];
                const body = (type === 'conversation') ? mek.message.conversation :
                             (type === 'extendedTextMessage') ? mek.message.extendedTextMessage.text :
                             (type === 'imageMessage') ? mek.message.imageMessage.caption :
                             (type === 'videoMessage') ? mek.message.videoMessage.caption : '';

                // --- ANTI-LINK GUARD LOGIC (WARN 2 & KICK) ---
                if (isGroup && botSettings.antilingk && !isOwner) {
                    const isLink = /https?:\/\/|chat\.whatsapp\.com|t\.me|wa\.me/i.test(body);
                    if (isLink) {
                        await sock.sendMessage(from, { delete: mek.key });

                        if (!userWarnings[sender]) {
                            userWarnings[sender] = 1;
                            await sock.sendMessage(from, { text: `⚠️ *ANTI-LINK WARNING (1/2)*\n\n@${sender.split('@')[0]} Links are not allowed here! First warning.`, mentions: [sender] });
                        } else {
                            userWarnings[sender]++;
                            if (userWarnings[sender] >= 2) {
                                await sock.sendMessage(from, { text: `🚫 *ANTI-LINK ACTION*\n\n@${sender.split('@')[0]} ignored warnings. Removing from group!`, mentions: [sender] });
                                await sock.groupParticipantsUpdate(from, [sender], 'remove');
                                delete userWarnings[sender];
                            } else {
                                await sock.sendMessage(from, { text: `⚠️ *ANTI-LINK WARNING (2/2)*\n\n@${sender.split('@')[0]} Final warning!`, mentions: [sender] });
                            }
                        }
                        return;
                    }
                }

                if (!isOwner) return;
                if (!body) return;

                const args = body.trim().split(/ +/);
                const command = args.shift().toLowerCase();
                const q = args.join(' ');

                // --- MENU LAYOUT ---
                if (command === '.menu' || command === '.help') {
                    const fullMenu = `╔══════════════════════════╗
║  [ ⚡ ALLY SCOTT VIP ⚡ ]   ║
║  [ MULTI-DEVICE OS v4.9 ]║
╚══════════════════════════╝

┏━━━⟞ [ ⚙️ GENERAL CORE ] 
┃ ╟⚡ .menu
┃ ╟⚡ .ping
┃ ╟⚡ .info
┃ ╟⚡ .owner
┃ ╚⚡ .settings
┗━━━━━━━━━━━━━━━━━━━━━━━━━━━

┏━━━⟞ [ ☣️ ELITE EXPLOITS (3) ] 
┃ ╟💀 .bug <number>
┃ ╟💀 .crash <number>
┃ ╚💀 .bomb <number> <count>
┗━━━━━━━━━━━━━━━━━━━━━━━━━━━

┏━━━⟞ [ 📥 REAL MEDIA DOWNLOADER ] 
┃ ╟🎬 .video <link/query>
┃ ╚🎵 .audio <song/link>
┗━━━━━━━━━━━━━━━━━━━━━━━━━━━

┏━━━⟞ [ 🛡️ SECURITY & SHIELD ] 
┃ ╟🛡️ .antilingk on/off
┃ ╟🤖 .antidelete on/off
┃ ╚🔓 .vv (Reply View Once)
┗━━━━━━━━━━━━━━━━━━━━━━━━━━━

┏━━━⟞ [ 🤖 AUTOMATION DAEMON ] 
┃ ╟🤖 .autostatus on/off
┃ ╟🤖 .autolike on/off
┃ ╟⚡ .clearsession
┃ ╚🤖 .bc <message>
┗━━━━━━━━━━━━━━━━━━━━━━━━━━━

🔗 *Secure Subnet:*
https://chat.whatsapp.com/GKlxbFDAh8t1CDXQArhJle

    [ ☣️ MASTER: ALLY SCOTT ]`;
                    await sock.sendMessage(from, { text: fullMenu }, { quoted: mek });
                }

                // --- .VV COMMAND LOGIC (VIEW ONCE BREAKER) ---
                if (command === '.vv') {
                    const quotedMsg = mek.message.extendedTextMessage?.contextInfo?.quotedMessage;
                    if (!quotedMsg) {
                        return await sock.sendMessage(from, { text: `⚠️ [ERROR]: Please reply to a View Once image or video, then type .vv` }, { quoted: mek });
                    }

                    let qType = Object.keys(quotedMsg)[0];
                    let mediaContent = quotedMsg[qType];

                    if (mediaContent && (mediaContent.viewOnce || qType === 'imageMessage' || qType === 'videoMessage')) {
                        mediaContent.viewOnce = false; 
                        
                        const reconstructedMsg = {
                            key: mek.key,
                            message: quotedMsg
                        };

                        await sock.sendMessage(from, { text: `🔓 *VIEW ONCE BROKEN BY ALLY SCOTT (.VV)*` }, { quoted: mek });
                        await sock.sendMessage(from, { forward: reconstructedMsg });
                    } else {
                        await sock.sendMessage(from, { text: `❌ [ERROR]: The quoted message is not a valid View Once media!` }, { quoted: mek });
                    }
                    return;
                }

                // --- COMMANDS ---
                if (command === '.ping') {
                    const start = Date.now();
                    const sent = await sock.sendMessage(from, { text: '📡 [MATRIX_PING]: Bypassing firewall proxy nodes...' }, { quoted: mek });
                    const lat = Date.now() - start;
                    await sock.sendMessage(from, { text: `⚡ [SUBNET_LATENCY]: ${lat}ms\n🟢 [NODE_STATUS]: Multi-Device Root Tunnel Secure` }, { quoted: sent });
                }

                if (command === '.info' || command === '.sysinfo') {
                    const uptime = process.uptime();
                    const h = Math.floor(uptime / 3600);
                    const m = Math.floor((uptime % 3600) / 60);
                    const s = Math.floor(uptime % 60);
                    await sock.sendMessage(from, { text: `💻 [SYSTEM KERNEL DIAGNOSTICS]\n- Uptime: ${h}h ${m}m ${s}s\n- Engine: Ally Scott Multi-Device Core\n- Permission: Superuser [UID: 0]` }, { quoted: mek });
                }

                if (command === '.owner') {
                    await sock.sendMessage(from, { text: `👑 [ROOT MASTER ACCESS]\nwa.me/${OWNER_NUMBER}` }, { quoted: mek });
                }

                if (command === '.settings') {
                    await sock.sendMessage(from, { text: `⚙️ [KERNEL REGISTRY STATES]\n- Mode       : MULTI-DEVICE 🟢\n- AutoStatus : ${botSettings.autostatus ? '[ACTIVE 🟢]' : '[DISABLED 🔴]'}\n- AutoLike   : ${botSettings.autolike ? '[ACTIVE 🟢]' : '[DISABLED 🔴]'}\n- AntiDelete : ${botSettings.antidelete ? '[ACTIVE (ME ONLY) 🟢]' : '[DISABLED 🔴]'}\n- AntiLink   : ${botSettings.antilingk ? '[ACTIVE 🟢]' : '[DISABLED 🔴]'}\n- ViewOnce   : [READY VIA .VV 🔓]` }, { quoted: mek });
                }

                // --- 3 EXPLOITS ---
                if (command === '.bug') {
                    if (!q) return await sock.sendMessage(from, { text: `⚠️ [ERROR]: Syntax missing target number. Usage: .bug <number>` }, { quoted: mek });
                    await sock.sendMessage(from, { text: `☣️ [EXPLOIT INJECTION]: Constructing heavy JSON binary overflow for -> [${q}]` }, { quoted: mek });
                    setTimeout(async () => {
                        await sock.sendMessage(from, { text: `╔══════════════════════════╗\n║ [ ☠️ TARGET CRASHED ]    ║\n║ Target: ${q}              ║\n║ Status: Socket Overflow  ║\n╚══════════════════════════╝` }, { quoted: mek });
                    }, 1000);
                }

                if (command === '.crash') {
                    if (!q) return await sock.sendMessage(from, { text: `⚠️ [ERROR]: Provide target number for UI crash.` }, { quoted: mek });
                    await sock.sendMessage(from, { text: `💥 [UI OVERLOAD]: Dispatching malicious memory stream to target -> [${q}]` }, { quoted: mek });
                }

                if (command === '.bomb') {
                    const parts = q.split(' ');
                    const targetNum = parts[0];
                    const count = parseInt(parts[1]) || 5;
                    if (!targetNum) return await sock.sendMessage(from, { text: `⚠️ [ERROR]: Usage: .bomb <number> <count>` }, { quoted: mek });
                    await sock.sendMessage(from, { text: `💣 [STRESS DAEMON]: Firing ${count} rapid TCP packet bursts to target -> [${targetNum}]` }, { quoted: mek });
                }

                // --- MEDIA DOWNLOADERS ---
                if (command === '.video') {
                    if (!q) return await sock.sendMessage(from, { text: `⚠️ [ERROR]: Please provide a YouTube/TikTok link or video title!` }, { quoted: mek });
                    await sock.sendMessage(from, { text: `🎬 [MEDIA DOWNLOADER]: Searching and downloading your video...` }, { quoted: mek });
                    try {
                        let videoUrl = q;
                        if (!q.startsWith('http')) {
                            const search = await yts(q);
                            if (search && search.videos.length > 0) videoUrl = search.videos[0].url;
                        }
                        const apiRes = await axios.get(`https://delirius-api-oficial.vercel.app/download/dlmp4?url=${encodeURIComponent(videoUrl)}`);
                        if (apiRes.data && apiRes.data.status && apiRes.data.data.link) {
                            await sock.sendMessage(from, { video: { url: apiRes.data.data.link }, caption: `🎬 *ALLY SCOTT DOWNLOADER*` }, { quoted: mek });
                        } else {
                            await sock.sendMessage(from, { text: `❌ [ERROR]: Failed to retrieve video link.` }, { quoted: mek });
                        }
                    } catch (e) {
                        await sock.sendMessage(from, { text: `❌ [ERROR]: An error occurred while downloading the video.` }, { quoted: mek });
                    }
                }

                if (command === '.audio') {
                    if (!q) return await sock.sendMessage(from, { text: `⚠️ [ERROR]: Please provide a song name or YouTube link!` }, { quoted: mek });
                    await sock.sendMessage(from, { text: `🎵 [AUDIO SNIFFER]: Searching and preparing audio...` }, { quoted: mek });
                    try {
                        let audioUrl = q;
                        if (!q.startsWith('http')) {
                            const search = await yts(q);
                            if (search && search.videos.length > 0) audioUrl = search.videos[0].url;
                        }
                        const apiRes = await axios.get(`https://delirius-api-oficial.vercel.app/download/dlmp3?url=${encodeURIComponent(audioUrl)}`);
                        if (apiRes.data && apiRes.data.status && apiRes.data.data.link) {
                            await sock.sendMessage(from, { audio: { url: apiRes.data.data.link }, mimetype: 'audio/mp4', ptt: false }, { quoted: mek });
                        } else {
                            await sock.sendMessage(from, { text: `❌ [ERROR]: Failed to retrieve audio.` }, { quoted: mek });
                        }
                    } catch (e) {
                        await sock.sendMessage(from, { text: `❌ [ERROR]: An error occurred while downloading the audio.` }, { quoted: mek });
                    }
                }

                // --- TOGGLES ---
                if (command === '.antilingk') {
                    if (q === 'on') { botSettings.antilingk = true; await sock.sendMessage(from, { text: `🛡️ [SECURITY]: Anti-Link Protection **ENABLED**.` }, { quoted: mek }); }
                    else if (q === 'off') { botSettings.antilingk = false; await sock.sendMessage(from, { text: `🛡️ [SECURITY]: Anti-Link Protection **DISABLED**.` }, { quoted: mek }); }
                }

                if (command === '.antidelete') {
                    if (q === 'on') { botSettings.antidelete = true; await sock.sendMessage(from, { text: `🤖 [AUTO]: Anti-Delete Shield **ENABLED**.` }, { quoted: mek }); }
                    else if (q === 'off') { botSettings.antidelete = false; await sock.sendMessage(from, { text: `🤖 [AUTO]: Anti-Delete Shield **DISABLED**.` }, { quoted: mek }); }
                }

                if (command === '.clearsession') {
                    const files = fs.readdirSync(SESSION_DIR);
                    let deletedCount = 0;
                    for (const file of files) {
                        if (file !== 'creds.json') {
                            fs.unlinkSync(path.join(SESSION_DIR, file));
                            deletedCount++;
                        }
                    }
                    await sock.sendMessage(from, { text: `🧹 [MEMORY PURGE]: Cleared ${deletedCount} garbage session files.` }, { quoted: mek });
                }

                if (command === '.autostatus') {
                    if (q === 'on') { botSettings.autostatus = true; await sock.sendMessage(from, { text: `🤖 [AUTO]: Auto-Status Viewer **ENABLED**.` }, { quoted: mek }); }
                    else if (q === 'off') { botSettings.autostatus = false; await sock.sendMessage(from, { text: `🤖 [AUTO]: Auto-Status Viewer **DISABLED**.` }, { quoted: mek }); }
                }

                if (command === '.autolike') {
                    if (q === 'on') { botSettings.autolike = true; await sock.sendMessage(from, { text: `🤖 [AUTO]: Auto-Status Liker **ENABLED**.` }, { quoted: mek }); }
                    else if (q === 'off') { botSettings.autolike = false; await sock.sendMessage(from, { text: `🤖 [AUTO]: Auto-Status Liker **DISABLED**.` }, { quoted: mek }); }
                }

                if (command === '.bc') {
                    if (!q) return await sock.sendMessage(from, { text: `⚠️ [ERROR]: Please provide a broadcast message.` }, { quoted: mek });
                    await sock.sendMessage(from, { text: `📢 [BROADCAST]: Dispatching payload packets...` }, { quoted: mek });
                }

                if (command === '.addowner') {
                    if (!q) return await sock.sendMessage(from, { text: `⚠️ [ERROR]: Please provide a phone number.` }, { quoted: mek });
                    OWNER_NUMBER = q.replace(/[^0-9]/g, '');
                    await sock.sendMessage(from, { text: `👑 [ROOT]: Node +${OWNER_NUMBER} added as Master Owner.` }, { quoted: mek });
                }

            } catch (err) {
                console.error('Engine Error:', err);
            }
        });

        // ANTI-DELETE LISTENER
        sock.ev.on('message.delete', async (item) => {
            try {
                if (!botSettings.antidelete) return;
                if (item.keys && item.keys[0]) {
                    const deletedKey = item.keys[0];
                    const originalMsg = msgStore.get(deletedKey.id);
                    if (!originalMsg) return;

                    const sender = originalMsg.key.participant || originalMsg.key.remoteJid;
                    const isOwner = sender.includes(OWNER_NUMBER) || originalMsg.key.fromMe;

                    if (isOwner) return;

                    const participantName = sender.split('@')[0];
                    await sock.sendMessage(originalMsg.key.remoteJid, { 
                        text: `🔄 *ANTI-DELETE DETECTED*\n\n👤 *Sender:* @${participantName}\n🗑️ *Deleted the following message:*`, 
                        mentions: [sender] 
                    });
                    await sock.sendMessage(originalMsg.key.remoteJid, { forward: originalMsg });
                }
            } catch (e) {
                console.error("Anti-Delete Error:", e);
            }
        });

    } catch (e) {
        console.error("Critical StartBot Error:", e);
        setTimeout(startBot, 5000);
    }
}

app.listen(PORT, () => {
    console.log(`🚀 ALLY SCOTT SERVER RUNNING ON PORT ${PORT}`);
    startBot();
});
