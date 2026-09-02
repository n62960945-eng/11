require("dotenv").config();

const http = require("http");

const PORT = process.env.PORT || 10000;

http.createServer((req, res) => {
    res.writeHead(200, {
        "Content-Type": "text/plain"
    });

    res.end("Ally Scott WhatsApp Bot is running.");
}).listen(PORT, () => {
    console.log(`🌐 Server running on port ${PORT}`);
});

const {
    default: makeWASocket,
    useMultiFileAuthState,
    DisconnectReason,
    fetchLatestBaileysVersion
} = require("@whiskeysockets/baileys");

const P = require("pino");
const OpenAI = require("openai");

/* =========================================================
   ALLY SCOTT CONFIGURATION
========================================================= */

const BOT_NAME = "Ally Scott";
const FOOTER = "Powered by Scott OpenAI | Ally Scott";

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const OPENAI_MODEL = process.env.OPENAI_MODEL || "gpt-5.6";
const PHONE_NUMBER = process.env.PHONE_NUMBER;

/* =========================================================
   ENVIRONMENT CHECK
========================================================= */

if (!OPENAI_API_KEY) {
    console.error("❌ OPENAI_API_KEY is missing.");
    process.exit(1);
}

if (!PHONE_NUMBER) {
    console.error("❌ PHONE_NUMBER is missing.");
    process.exit(1);
}

/* =========================================================
   OPENAI
========================================================= */

const openai = new OpenAI({
    apiKey: OPENAI_API_KEY
});

/* =========================================================
   LOGGER
========================================================= */

const logger = P({
    level: "silent"
});

let reconnecting = false;
let pairingRequested = false;

/* =========================================================
   ALLY SCOTT MEDICAL AI SYSTEM
========================================================= */

const MEDICAL_PROMPT = `
You are Ally Scott, an advanced AI clinical medicine study assistant.

You help Clinical Medicine students understand medical conditions,
clinical scenarios, diagnosis, differential diagnosis, investigations,
treatment, prevention, follow-up and prognosis.

LANGUAGE:
- The user may ask in Kiswahili, English or mixed language.
- Understand Kiswahili medical questions correctly.
- Unless the user explicitly requests Kiswahili, answer in professional
  medical ENGLISH.
- Keep medical terminology accurate and understandable.

CLINICAL SAFETY:
- You are an educational assistant, not a replacement for a qualified
  healthcare professional.
- Never claim that a diagnosis is confirmed when the information only
  supports a provisional diagnosis.
- If information is missing, identify what information is needed.
- Identify emergencies and dangerous diagnoses that must not be missed.
- Never invent drug doses.
- If dosing depends on age, weight, indication, renal function, hepatic
  function or severity, clearly state this.
- For children, consider weight-based dosing.
- For pregnancy, consider maternal and fetal safety.
- Consider Tanzania clinical practice and STG principles where appropriate,
  but do not falsely claim that a recommendation is current Tanzania STG
  unless it has been verified.

=========================================================
FULL CLINICAL CASE STRUCTURE
=========================================================

When the user gives a clinical CASE or SCENARIO, analyze it using:

1. PROVISIONAL DIAGNOSIS
2. DIFFERENTIAL DIAGNOSIS
3. INVESTIGATIONS
4. TREATMENT / MANAGEMENT
5. PREVENTION
6. FOLLOW-UP
7. PROGNOSIS
8. COMPLICATIONS
9. EXAM / CLINICAL PEARLS

Do not tell the user to use separate commands to obtain these sections.
Generate the complete analysis automatically.

=========================================================
1. PROVISIONAL DIAGNOSIS
=========================================================

- State the most likely diagnosis.
- Explain why it is most likely.
- Mention important supporting clinical features.
- If appropriate, mention the likely underlying cause.

=========================================================
2. DIFFERENTIAL DIAGNOSIS
=========================================================

Give approximately 5 important differential diagnoses.

For each:
- Diagnosis
- Why it is considered
- Supporting features
- Important distinguishing features

Prioritize clinically important and dangerous alternatives.

=========================================================
3. INVESTIGATIONS
=========================================================

Divide into:

A. Bedside / Initial Assessment
B. Laboratory Investigations
C. Imaging
D. Special Investigations

For important investigations provide:
- Investigation
- Reason for requesting it
- Expected or important finding where appropriate

Prioritize urgent investigations first.

=========================================================
4. TREATMENT / MANAGEMENT
=========================================================

A. Immediate / Emergency Management

Use ABCDE where applicable.

Include:
- Airway
- Breathing
- Circulation
- Disability
- Exposure
- Monitoring
- Oxygen when indicated
- IV access
- Fluids when indicated
- Urgent referral/escalation when necessary

B. Non-Pharmacological Management

C. Pharmacological Management

For each medicine, when reliably established, provide:
- Generic name
- Class if useful
- Route
- Dose
- Frequency
- Duration
- Indication

Do not invent doses.

D. Definitive Treatment

E. Management of Complications

=========================================================
5. PREVENTION
=========================================================

Include:
- Primary prevention
- Secondary prevention
- Risk-factor modification
- Patient education

=========================================================
6. FOLLOW-UP
=========================================================

Include:
- When to review
- What to monitor clinically
- Laboratory/imaging follow-up
- Treatment response
- Adherence
- Warning signs requiring urgent medical attention

=========================================================
7. PROGNOSIS
=========================================================

Include:
- Overall prognosis
- Good prognostic factors
- Poor prognostic factors
- Factors that can change the outcome

=========================================================
8. COMPLICATIONS
=========================================================

Separate:
- Early complications
- Late complications
- Serious/life-threatening complications

=========================================================
9. EXAM / CLINICAL PEARLS
=========================================================

Give concise high-yield points useful for:
- Clinical practice
- NACTVET/clinical medicine examinations
- Case presentation
- Viva/oral examination

=========================================================
GENERAL RESPONSE RULES
=========================================================

- Use clear headings.
- Use bullet points.
- Explain important clinical reasoning.
- Avoid unnecessary repetition.
- For investigations, explain WHY.
- For differential diagnoses, explain WHY.
- For treatment, explain the purpose of important drugs.
- For emergencies, prioritize stabilization.
- Do not overstate certainty.
- If the scenario is incomplete, say what additional information is needed.

At the end of responses add:

Powered by Scott OpenAI | Ally Scott
`;

/* =========================================================
   MENU
========================================================= */

function getMenu() {

    return `
╭━━━━━━━━━━━━━━━━━━━━━━━━━━━━╮
          🤖 *ALLY SCOTT*
     🩺 *MEDICAL AI ASSISTANT*
╰━━━━━━━━━━━━━━━━━━━━━━━━━━━━╯

📌 *GENERAL*
.ping
.menu
.help

🧠 *AI*
.ai [question]
.ask [question]

🩺 *CLINICAL CASE*
.diagnosis [case/scenario]

📋 *CLINICAL TOPICS*
.ddx [condition]
.investigation [condition/case]
.treatment [condition]
.prevention [condition]
.followup [condition]
.prognosis [condition]
.complications [condition]

💊 *MEDICINES*
.drug [drug name]
.dose [drug + patient age/weight]
.sideeffects [drug]

📚 *STUDY*
.study [topic]
.mcq [topic]
.shortanswer [topic]
.essay [topic]
.case [topic]

🌍 *LANGUAGE*
.translate [text]
.summarize [text]

━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🩺 You can ask in:
*English • Kiswahili • Mixed*

📌 *Example:*

.diagnosis
55-year-old man with difficulty breathing,
orthopnea and bilateral leg swelling for 5 days.
History of hypertension.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━

⚠️ Educational purposes only.

*Powered by Scott OpenAI*
*Ally Scott*
`;
}

/* =========================================================
   OPENAI FUNCTION
========================================================= */

async function askOpenAI(instruction) {

    try {

        const response =
            await openai.responses.create({

                model: OPENAI_MODEL,

                instructions:
                    MEDICAL_PROMPT,

                input:
                    instruction
            });

        let answer =
            response.output_text || "";

        if (!answer.trim()) {

            answer =
                "Sorry, I could not generate a response.";
        }

        return `${answer.trim()}

━━━━━━━━━━━━━━━━━━━━
${FOOTER}`;

    } catch (error) {

        console.error(
            "OpenAI error:",
            error.message
        );

        return `
❌ *AI ERROR*

I could not process your request right now.

Please try again.

${FOOTER}
`;
    }
}

/* =========================================================
   COMMAND HANDLER
========================================================= */

async function handleCommand(text) {

    const trimmed =
        text.trim();

    if (!trimmed.startsWith(".")) {
        return null;
    }

    const parts =
        trimmed.split(/\s+/);

    const command =
        parts[0].toLowerCase();

    const argument =
        parts
            .slice(1)
            .join(" ")
            .trim();

    /* =====================================================
       GENERAL
    ===================================================== */

    if (command === ".ping") {

        return `
🏓 *PONG!*

🤖 Bot: *${BOT_NAME}*
🟢 Status: *ONLINE*
🧠 AI: *OpenAI*

${FOOTER}`;
    }

    if (
        command === ".menu" ||
        command === ".help"
    ) {

        return getMenu();
    }

    if (!argument) {

        return `
⚠️ *Please provide a question or topic.*

Example:

${command} hypertension

Type *.menu* to see all commands.

${FOOTER}`;
    }

    let instruction = "";

    /* =====================================================
       AI
    ===================================================== */

    switch (command) {

        case ".ai":
        case ".ask":

            instruction = `
Answer the user's question accurately.

USER QUESTION:
${argument}
`;

            break;

        /* =================================================
           FULL DIAGNOSIS
        ================================================= */

        case ".diagnosis":

            instruction = `
The user has provided a clinical case/scenario.

Perform a COMPLETE clinical case analysis.

IMPORTANT:
Do NOT tell the user to use .ddx, .investigation or .treatment.
You must provide ALL sections automatically.

Use this exact structure:

━━━━━━━━━━━━━━━━━━━━
1. PROVISIONAL DIAGNOSIS
━━━━━━━━━━━━━━━━━━━━

- Most likely diagnosis
- Clinical reasoning
- Supporting features

━━━━━━━━━━━━━━━━━━━━
2. DIFFERENTIAL DIAGNOSIS
━━━━━━━━━━━━━━━━━━━━

Give approximately 5 important differentials.

For each:
- Diagnosis
- Why considered
- Supporting features
- Distinguishing features

━━━━━━━━━━━━━━━━━━━━
3. INVESTIGATIONS
━━━━━━━━━━━━━━━━━━━━

A. Bedside / Initial Assessment
B. Laboratory Investigations
C. Imaging
D. Special Investigations

For each important investigation explain:
- Why it is requested
- Expected/important finding

━━━━━━━━━━━━━━━━━━━━
4. TREATMENT / MANAGEMENT
━━━━━━━━━━━━━━━━━━━━

A. Immediate / Emergency Management
B. Non-Pharmacological Management
C. Pharmacological Management
D. Definitive Treatment
E. Management of Complications

For medicines provide reliable:
- Drug
- Route
- Dose
- Frequency
- Duration
- Indication

Do not invent doses.

━━━━━━━━━━━━━━━━━━━━
5. PREVENTION
━━━━━━━━━━━━━━━━━━━━

- Primary prevention
- Secondary prevention
- Risk-factor modification
- Patient education

━━━━━━━━━━━━━━━━━━━━
6. FOLLOW-UP
━━━━━━━━━━━━━━━━━━━━

- Review timing
- Clinical monitoring
- Investigations
- Treatment response
- Adherence
- Red flags

━━━━━━━━━━━━━━━━━━━━
7. PROGNOSIS
━━━━━━━━━━━━━━━━━━━━

- Overall prognosis
- Good prognostic factors
- Poor prognostic factors
- Factors affecting outcome

━━━━━━━━━━━━━━━━━━━━
8. COMPLICATIONS
━━━━━━━━━━━━━━━━━━━━

- Early
- Late
- Serious/life-threatening

━━━━━━━━━━━━━━━━━━━━
9. EXAM / CLINICAL PEARLS
━━━━━━━━━━━━━━━━━━━━

Give high-yield examination and clinical points.

CASE / SCENARIO:
${argument}
`;

            break;

        /* =================================================
           DIFFERENTIAL DIAGNOSIS
        ================================================= */

        case ".ddx":

            instruction = `
Give approximately 5 important differential diagnoses for:

${argument}

For each include:
- Diagnosis
- Why it is considered
- Supporting features
- Important distinguishing features

Prioritize dangerous diagnoses that should not be missed.
`;

            break;

        /* =================================================
           INVESTIGATIONS
        ================================================= */

        case ".investigation":

            instruction = `
Create a systematic investigation plan for:

${argument}

Use:

A. Bedside / Initial Assessment
B. Laboratory Investigations
C. Imaging
D. Special Investigations

For every important investigation explain:
- Why it is requested
- Expected/important findings

Prioritize urgent investigations.
`;

            break;

        /* =================================================
           TREATMENT
        ================================================= */

        case ".treatment":

            instruction = `
Give a complete clinical management plan for:

${argument}

Include:

1. Immediate / Emergency Management
2. Non-Pharmacological Management
3. Pharmacological Management
4. Definitive Treatment
5. Treatment of Complications
6. Follow-up
7. Prevention

For medicines give reliable:
- Generic name
- Route
- Dose
- Frequency
- Duration
- Indication

Never invent doses.
`;

            break;

        /* =================================================
           PREVENTION
        ================================================= */

        case ".prevention":

            instruction = `
Explain prevention of:

${argument}

Include:
- Primary prevention
- Secondary prevention
- Risk-factor modification
- Patient education
`;

            break;

        /* =================================================
           FOLLOW-UP
        ================================================= */

        case ".followup":

            instruction = `
Create a clinical follow-up plan for:

${argument}

Include:
- When to review
- Clinical monitoring
- Laboratory/imaging monitoring
- Treatment response
- Adherence
- Warning signs
`;

            break;

        /* =================================================
           PROGNOSIS
        ================================================= */

        case ".prognosis":

            instruction = `
Explain the prognosis of:

${argument}

Include:
- Overall prognosis
- Good prognostic factors
- Poor prognostic factors
- Factors affecting outcome
`;

            break;

        /* =================================================
           COMPLICATIONS
        ================================================= */

        case ".complications":

            instruction = `
Explain complications of:

${argument}

Separate:
- Early complications
- Late complications
- Serious/life-threatening complications
`;

            break;

        /* =================================================
           DRUG
        ================================================= */

        case ".drug":

            instruction = `
Give an educational drug monograph for:

${argument}

Include:
- Generic name
- Drug class
- Mechanism of action
- Indications
- Contraindications
- Precautions
- Adverse effects
- Important interactions
- Route
- Dosing when reliably established
- Monitoring
- Important clinical notes
`;

            break;

        /* =================================================
           DOSE
        ================================================= */

        case ".dose":

            instruction = `
Explain the appropriate dosing considerations for:

${argument}

Include:
- Usual dose when reliably established
- Route
- Frequency
- Duration
- Indication
- Pediatric considerations
- Weight-based dosing when applicable
- Renal/hepatic considerations when relevant

Do not invent doses.
`;

            break;

        /* =================================================
           SIDE EFFECTS
        ================================================= */

        case ".sideeffects":

            instruction = `
Explain the important adverse effects and precautions of:

${argument}

Include:
- Common adverse effects
- Serious adverse effects
- Contraindications
- Important precautions
- What to do if serious adverse effects occur
`;

            break;

        /* =================================================
           STUDY
        ================================================= */

        case ".study":

            instruction = `
Teach the following medical topic at Clinical Medicine student level:

${argument}

Use:

1. Definition
2. Causes
3. Risk factors
4. Pathophysiology
5. Clinical features
6. Diagnosis
7. Differential diagnosis
8. Investigations
9. Treatment
10. Complications
11. Prevention
12. Follow-up
13. Prognosis
14. Exam points
`;

            break;

        /* =================================================
           MCQ
        ================================================= */

        case ".mcq":

            instruction = `
Create 10 high-quality Clinical Medicine MCQs about:

${argument}

Each question must have:

A.
B.
C.
D.

After the questions provide:

ANSWER KEY

Then give a short explanation for each answer.
`;

            break;

        /* =================================================
           SHORT ANSWER
        ================================================= */

        case ".shortanswer":

            instruction = `
Create 10 Clinical Medicine short-answer questions about:

${argument}

After the questions provide a marking-oriented answer key.
`;

            break;

        /* =================================================
           ESSAY
        ================================================= */

        case ".essay":

            instruction = `
Create 5 NACTVET-style Clinical Medicine essay questions about:

${argument}

Then provide marking points for each question.
`;

            break;

        /* =================================================
           CASE
        ================================================= */

        case ".case":

            instruction = `
Create a realistic Clinical Medicine case scenario about:

${argument}

Include:

- Patient profile
- Presenting complaints
- History
- Risk factors
- Examination findings
- Investigations
- Questions
- Model answers
- Clinical reasoning
`;

            break;

        /* =================================================
           TRANSLATION
        ================================================= */

        case ".translate":

            instruction = `
Translate the following text accurately.

If the text is Kiswahili, translate it into professional English.

If the text is English, translate it into natural Kiswahili.

Preserve medical terminology where appropriate.

TEXT:
${argument}
`;

            break;

        /* =================================================
           SUMMARY
        ================================================= */

        case ".summarize":

            instruction = `
Summarize the following medical text into concise study notes.

Use:
- Headings
- Bullet points
- Important definitions
- Key clinical points
- Exam points

TEXT:
${argument}
`;

            break;

        /* =================================================
           UNKNOWN COMMAND
        ================================================= */

        default:

            return `
❌ *UNKNOWN COMMAND*

You entered:
${command}

Type *.menu* to see available commands.

${FOOTER}`;
    }

    return await askOpenAI(instruction);
}

/* =========================================================
   START WHATSAPP
========================================================= */

async function startBot() {

    const {
        state,
        saveCreds
    } = await useMultiFileAuthState(
        "./auth_info"
    );

    const {
        version
    } = await fetchLatestBaileysVersion();

    const sock =
        makeWASocket({

            version,

            auth: state,

            logger,

            printQRInTerminal: false,

            browser: [
                "Ally Scott",
                "Chrome",
                "1.0.0"
            ],

            generateHighQualityLinkPreview: true
        });

    /* =====================================================
       SAVE CREDENTIALS
    ===================================================== */

    sock.ev.on(
        "creds.update",
        saveCreds
    );

    /* =====================================================
       CONNECTION UPDATE
    ===================================================== */

    sock.ev.on(
        "connection.update",
        async (update) => {

            const {
                connection,
                lastDisconnect
            } = update;

            /* =============================================
               CONNECTION OPEN
            ============================================= */

            if (connection === "open") {

                reconnecting = false;

                console.log("");
                console.log(
                    "======================================"
                );
                console.log(
                    "🤖 ALLY SCOTT IS ONLINE"
                );
                console.log(
                    "🟢 WhatsApp Connected"
                );
                console.log(
                    "🧠 OpenAI Enabled"
                );
                console.log(
                    "======================================"
                );
                console.log("");
            }

            /* =============================================
               CONNECTION CLOSED
            ============================================= */

            if (connection === "close") {

                const statusCode =
                    lastDisconnect
                        ?.error
                        ?.output
                        ?.statusCode;

                console.log(
                    "WhatsApp connection closed:",
                    statusCode
                );

                /* -----------------------------------------
                   LOGGED OUT / 401
                ----------------------------------------- */

                if (
                    statusCode === 401 ||
                    statusCode ===
                    DisconnectReason.loggedOut
                ) {

                    console.log("");
                    console.log(
                        "❌ WhatsApp session logged out."
                    );
                    console.log(
                        "Delete auth_info and pair again."
                    );
                    console.log("");

                    return;
                }

                /* -----------------------------------------
                   OTHER CONNECTION ERRORS
                ----------------------------------------- */

                if (!reconnecting) {

                    reconnecting = true;

                    console.log(
                        "🔄 Reconnecting in 5 seconds..."
                    );

                    setTimeout(
                        async () => {

                            reconnecting = false;

                            try {

                                await startBot();

                            } catch (error) {

                                console.error(
                                    "❌ Reconnection error:",
                                    error.message
                                );
                            }

                        },
                        5000
                    );
                }
            }
        }
    );

    /* =====================================================
       PAIRING CODE
    ===================================================== */

    if (
        !state.creds.registered &&
        !pairingRequested
    ) {

        pairingRequested = true;

        try {

            const cleanNumber =
                PHONE_NUMBER.replace(
                    /\D/g,
                    ""
                );

            console.log("");
            console.log(
                "======================================"
            );
            console.log(
                "       🤖 ALLY SCOTT BOT"
            );
            console.log(
                "======================================"
            );
            console.log(
                "Preparing WhatsApp pairing..."
            );
            console.log("");

            /*
             * Wait for the WhatsApp socket to initialize.
             */

            await new Promise(
                resolve =>
                    setTimeout(
                        resolve,
                        3000
                    )
            );

            const pairingCode =
                await sock.requestPairingCode(
                    cleanNumber
                );

            console.log("");
            console.log(
                "======================================"
            );
            console.log(
                "       🔐 PAIRING CODE"
            );
            console.log(
                "======================================"
            );
            console.log(
                pairingCode
            );
            console.log(
                "======================================"
            );
            console.log("");

            console.log(
                "WhatsApp > Linked Devices > Link a device > Link with phone number instead"
            );

            console.log("");

        } catch (error) {

            console.error(
                "❌ Pairing code error:",
                error.message
            );

            pairingRequested = false;
        }
    }

    /* =====================================================
       MESSAGE HANDLER
    ===================================================== */

    sock.ev.on(
        "messages.upsert",
        async ({ messages }) => {

            try {

                const message =
                    messages?.[0];

                if (!message?.message) {
                    return;
                }

                /* Ignore own messages */

                if (message.key?.fromMe) {
                    return;
                }

                const jid =
                    message.key?.remoteJid;

                if (!jid) {
                    return;
                }

                const content =
                    message.message;

                let text = "";

                /* =========================================
                   NORMAL TEXT
                ========================================= */

                if (
                    content.conversation
                ) {

                    text =
                        content.conversation;

                }

                /* =========================================
                   EXTENDED TEXT
                ========================================= */

                else if (
                    content
                        .extendedTextMessage
                        ?.text
                ) {

                    text =
                        content
                            .extendedTextMessage
                            .text;

                }

                /* =========================================
                   IMAGE CAPTION
                ========================================= */

                else if (
                    content
                        .imageMessage
                        ?.caption
                ) {

                    text =
                        content
                            .imageMessage
                            .caption;

                }

                /* =========================================
                   VIDEO CAPTION
                ========================================= */

                else if (
                    content
                        .videoMessage
                        ?.caption
                ) {

                    text =
                        content
                            .videoMessage
                            .caption;
                }

                text =
                    text.trim();

                if (!text) {
                    return;
                }

                console.log(
                    `[MESSAGE] ${jid}: ${text}`
                );

                /* =========================================
                   COMMAND
                ========================================= */

                if (
                    text.startsWith(".")
                ) {

                    const reply =
                        await handleCommand(
                            text
                        );

                    if (reply) {

                        await sock.sendMessage(
                            jid,
                            {
                                text: reply
                            }
                        );
                    }

                    return;
                }

                /* =========================================
                   NORMAL MESSAGE → AI
                ========================================= */

                const reply =
                    await askOpenAI(`
The user sent the following message:

${text}

Determine what the user wants.

If it is a clinical case or scenario,
provide the complete clinical case structure:

1. Provisional Diagnosis
2. Differential Diagnosis
3. Investigations with reasons
4. Treatment / Management
5. Prevention
6. Follow-up
7. Prognosis
8. Complications
9. Exam / Clinical Pearls

If it is a general medical question,
answer appropriately.
`);

                await sock.sendMessage(
                    jid,
                    {
                        text: reply
                    }
                );

            } catch (error) {

                console.error(
                    "❌ Message handler error:",
                    error.message
                );
            }
        }
    );
}

/* =========================================================
   START APPLICATION
========================================================= */

startBot().catch(
    (error) => {

        console.error(
            "❌ Fatal bot error:",
            error
        );

        process.exit(1);
    }
);
