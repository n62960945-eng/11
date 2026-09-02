# 🤖 Ally Scott WhatsApp AI Bot

Advanced WhatsApp AI Medical Assistant.

Powered by Scott OpenAI | Ally Scott

## Features

- WhatsApp Pairing Code
- OpenAI AI
- Clinical case analysis
- Provisional diagnosis
- Differential diagnosis
- Investigations
- Treatment / Management
- Prevention
- Follow-up
- Prognosis
- Complications
- Clinical pearls
- Drug information
- Drug dosing information
- MCQ generation
- Short-answer questions
- Essay questions
- Clinical case generation
- Translation
- Summarization

## Commands

### General

.ping

.menu

.help


### AI

.ai [question]

.ask [question]


### Full Clinical Case Analysis

.diagnosis [case/scenario]


### Clinical

.ddx [condition]

.investigation [condition/case]

.treatment [condition]

.prevention [condition]

.followup [condition]

.prognosis [condition]

.complications [condition]


### Medicines

.drug [drug name]

.dose [drug + age/weight]

.sideeffects [drug]


### Study

.study [topic]

.mcq [topic]

.shortanswer [topic]

.essay [topic]

.case [topic]


### Language

.translate [text]

.summarize [text]


## Example

.diagnosis

A 55-year-old man presents with progressive shortness
of breath, orthopnea and bilateral leg swelling for
5 days. He has a history of hypertension.


The bot automatically provides:

1. Provisional Diagnosis
2. Differential Diagnosis
3. Investigations
4. Treatment / Management
5. Prevention
6. Follow-up
7. Prognosis
8. Complications
9. Exam / Clinical Pearls


## Language

Users can ask questions in:

- English
- Kiswahili
- Mixed English/Kiswahili

The bot understands both languages.

By default, medical answers are given in professional English
unless the user requests Kiswahili.


## Environment Variables

OPENAI_API_KEY

OPENAI_MODEL

PHONE_NUMBER


## Deployment

This project is designed for deployment on Render as a
background worker.

Build command:

npm install

Start command:

npm start


## WhatsApp Pairing

When the bot starts for the first time, the Render logs will
display a WhatsApp pairing code.

On WhatsApp:

Settings
→ Linked Devices
→ Link a device
→ Link with phone number instead


## Security

Never upload:

.env

.env.local

auth_info/

Never put an OpenAI API key directly inside index.js.


## Medical Disclaimer

Ally Scott is an educational AI assistant.

It does not replace qualified clinical assessment,
professional medical judgment, diagnosis or treatment.

Powered by Scott OpenAI | Ally Scott
