# LiveTranslate 🌍✨

**Real-Time iMessage Translator Agent**

> A messaging agent that translates incoming messages in real time, in both directions, across any language — making conversations feel magically human.

## 🎯 What It Does

LiveTranslate is a Kafka-powered agent that:
- Listens for incoming iMessage events
- Detects the language of each message
- Translates it to your preferred language
- Sends the translation back instantly
- Works in both directions (you can reply in your language, it translates back)

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ 
- Kafka broker running
- OpenAI API key
- Series API access

### Installation

1. **Clone and install dependencies**
   ```bash
   npm install
   ```

2. **Configure environment**
   ```bash
   cp .env.example .env
   ```
   
   Edit `.env` with your credentials:
   ```env
   KAFKA_BROKER=localhost:9092
   KAFKA_TOPIC=series-events
   KAFKA_GROUP_ID=livetranslate-agent
   
   OPENAI_API_KEY=sk-your-key-here
   
   SERIES_API_URL=https://api.series.com
   SERIES_API_KEY=your-series-key-here
   
   TARGET_LANGUAGE=en
   ```

3. **Run the agent**
   ```bash
   npm start
   ```

## 📱 How It Works

```
User Phone → Kafka → LiveTranslate Agent → OpenAI Translation → Series API → Back to Phone
```

### Events Processed
- `message.received` - Incoming messages to translate
- `typing_indicator.received` - (Optional) Show typing while translating

### Flow
1. Message arrives in foreign language
2. Agent detects language using OpenAI
3. Translates to your target language (default: English)
4. Sends translated message back
5. When you reply, it can reverse-translate back to sender's language

## 🎬 Demo

**Step 1:** Send a message in Spanish
```
"¿Puedes venir mañana?"
```

**Step 2:** Agent processes and logs
```
📨 Incoming message:
   From: +1234567890
   Text: "¿Puedes venir mañana?"
   🌍 Detected: es
   ✨ Translated: "Can you come tomorrow?"
   ✅ Sent translation
```

**Step 3:** You receive on your phone
```
(es→en): Can you come tomorrow?
```

## 🛠️ Project Structure

```
livetranslate/
├── src/
│   ├── index.js              # Main Kafka consumer/producer
│   └── services/
│       ├── translator.js     # OpenAI translation service
│       └── series.js         # Series API integration
├── .env.example              # Environment template
├── package.json
└── README.md
```

## 🎨 Optional Enhancements

### Language Switching
Allow users to switch target languages on-the-fly:
```javascript
// "Switch to French"
TARGET_LANGUAGE = 'fr'
```

### Personality Translation
Add tone modifiers:
```javascript
// "Make it sound professional"
// "Make it sound casual"
// "Translate as Gen-Z texting"
```

### Cultural Adaptation
```javascript
// "Translate politely for Japanese culture"
// "Translate formally for business"
```

## 🧪 Development

**Run with auto-reload:**
```bash
npm run dev
```

**Test with mock events:**
```javascript
// Send a test event to Kafka
const testEvent = {
  event_type: 'message.received',
  data: {
    text: 'Bonjour le monde',
    chat_id: 'test-chat-123',
    sender: '+1234567890'
  }
};
```

## 📝 API Reference

### Translation Service
```javascript
import { translateMessage } from './services/translator.js';

const { detectedLanguage, translatedText } = await translateMessage('Hola');
// { detectedLanguage: 'es', translatedText: 'Hello' }
```

### Series Integration
```javascript
import { sendChatMessage } from './services/series.js';

await sendChatMessage('chat-id-123', 'Translated message here');
```

## 🏆 Why This Wins

✅ **Human-Centered Impact** - Removes language barriers instantly  
✅ **Technical Execution** - Clean Kafka + AI pipeline  
✅ **Creativity** - Reimagines texting as cross-language telepathy  
✅ **Demo Quality** - Live, visual, magical  

## 📄 License

MIT

---

**Built for Series Hackathon 2025** • *The Future Feels Human*
