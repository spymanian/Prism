# Prism 

**AI-Powered iMessage Communication Assistant with Personality Analytics**

> Transform your messages with intelligent AI rewrites, translations, cultural adaptations, and deep personality insights — making every conversation more effective and authentic.

## 🎯 What It Does

Prism is a sophisticated Kafka-powered agent that:
- 🌍 **Translates** messages to any language instantly
- ✨ **Rewrites** text in different tones (polite, professional, casual, Gen-Z)
- 💙 **Analyzes emotions** and suggests healthier communication
- 🌏 **Adapts culturally** for Japanese, Korean, and other cultures
- 🤝 **Matches** your communication style to celebrities
- 📊 **Visualizes** your personality with 3D interactive graphs
- 🔒 **Filters** by phone number - only you can use the agent

## ✨ Features

### Message Transformation Modes

| Mode | Command | Example |
|------|---------|---------|
| 🌍 **Translation** | `lang:es <text>` | `lang:fr Can we meet tomorrow?` |
| ✨ **Tone** | `tone:polite <text>` | `tone:professional I need this done` |
| 📚 **Simplify** | `simplify: <text>` | `simplify: The aforementioned methodology` |
| 💭 **Sentiment** | `sentiment: <text>` | `sentiment: I'm feeling great today!` |
| 🎭 **Style** | `style:genz <text>` | `style:british Hello there friend` |
| 🧑‍💼 **Professional** | `pro: <text>` | `pro: yo can u send that over` |
| 😎 **Slang** | `slang: <text>` | `slang: Please forward the document` |

### 🎨 Magic Features

| Feature | Command | What It Does |
|---------|---------|--------------|
| 💙 **Emotional Intelligence** | `emotion: <text>` | Analyzes emotional subtext and suggests healthier expression |
| 🌏 **Cultural Adaptation** | `culture:japan <text>` | Adapts message for cultural appropriateness |
| ✨ **Personality Vibe** | `vibe:mentor <text>` | Rewrites in a specific personality style |
| 🤝 **Communication Match** | `match: <text>` | Analyzes your style, finds celebrity matches, shows compatibility score |

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ 
- Kafka broker access
- OpenAI API key (GPT-4)
- Series API access
- Your phone number registered with Series

### Installation

1. **Clone and install dependencies**
   ```bash
   npm install
   cd ui && npm install
   ```

2. **Configure environment**
   
   Create `.env` in the root directory:
   ```env
   # Kafka Configuration
   KAFKA_CLIENT_ID=your-client-id
   KAFKA_BOOTSTRAP_SERVERS=your-kafka-broker:9092
   KAFKA_TOPIC=your-topic-name
   KAFKA_CONSUMER_GROUP=your-consumer-group
   KAFKA_TLS_ENABLED=true
   KAFKA_SASL_ENABLED=true
   KAFKA_SASL_MECHANISM=plain
   KAFKA_SASL_USERNAME=your-username
   KAFKA_SASL_PASSWORD=your-password
   
   # OpenAI Configuration
   OPENAI_API_KEY=sk-your-key-here
   
   # Series API Configuration
   SERIES_API_URL=https://api.series.com
   SERIES_API_KEY=your-series-key-here
   SENDER_NUMBER=+16463458837
   RECIPIENT_PHONE=+1234567890  # YOUR phone number
   ```

   Create `ui/.env`:
   ```env
   GENERATE_SOURCEMAP=false
   REACT_APP_USER_PHONE=+1234567890  # YOUR phone number
   ```

3. **Run the consumer (backend)**
   ```bash
   node consumer.js
   ```

4. **Run the UI (frontend)**
   ```bash
   cd ui
   npm start
   ```

5. **Send messages from your phone**
   
   Text the Series number (+16463458837) with commands like:
   - `lang:es Hello world`
   - `emotion: I'm fine`
   - `match: I love exploring new ideas!`

## 📱 How It Works

```
Your Phone → Series API → Kafka → Consumer Agent → OpenAI GPT-4 → Process → Series API → Your Phone
                                                                              ↓
                                                                         Socket.IO
                                                                              ↓
                                                                          React UI
```

### Architecture

1. **Phone Filter**: Only messages from YOUR phone number are processed
2. **Command Parser**: Extracts mode and arguments from your message
3. **GPT-4 Processing**: Transforms text based on the selected mode
4. **Dual Response**: Sends reply to your phone AND updates the web UI
5. **Personality Analysis**: Analyzes your messaging patterns in real-time
6. **3D Visualization**: Displays personality traits as an interactive pentagon

### Security

- ✅ Phone number filtering - only authorized user can trigger the agent
- ✅ Socket.IO broadcasts only to connected UI clients
- ✅ No message data shared between users
- ✅ All API keys secured in environment variables

## 🧠 Algorithmic Personality Analysis

### How It Works

The system uses **NLP-based algorithmic analysis** instead of LLMs for precise, deterministic personality insights:

**Backend Metrics (Natural, Compromise, Sentiment libraries):**
- **Formality**: `50 + (avgWordLength - 4) × 15 - emojis × 10 - exclamations × 5`
- **Enthusiasm**: `30 + exclamations × 20 + emojis × 10 + sentimentBoost`
- **Directness**: `50 + (verbs/wordCount) × 100 - (adjectives/wordCount) × 50`
- **Analytical Score**: `30 + (nouns/wordCount) × 80 + avgSentenceLength × 2`
- **Expressiveness**: `20 + (adjectives/wordCount) × 150 + (adverbs/wordCount) × 100 + emojis × 15`

**Frontend Big Five Mapping:**
- **Conscientiousness** ← formality × 0.6 + professionalWords × 15
- **Extraversion** ← enthusiasm × 0.7 + messageVolume × 3
- **Openness** ← expressiveness × 0.5 + diverseVocabulary × 20
- **Agreeableness** ← expressiveness × 0.4 + culturalAwareness × 20
- **Emotional Stability** ← calmness + complexThought - anxietyMarkers

**Why Algorithmic?**
- ✅ **Consistent**: Same input always produces same results
- ✅ **Fast**: Instant analysis without API calls
- ✅ **Transparent**: You can see exactly how scores are calculated
- ✅ **Accurate**: Based on proven linguistic research
- ✅ **No Hallucinations**: Pure mathematical computation

### 3D Visualization

The personality pentagon uses color-coding aligned with the trait calculations:
- 🔴 **Red** (Openness) - Creativity and diversity of expression
- 🌊 **Teal** (Conscientiousness) - Formality and professionalism
- 🔵 **Blue** (Extraversion) - Enthusiasm and engagement
- 🟢 **Green** (Agreeableness) - Empathy and expressiveness
- 🟡 **Yellow** (Emotional Stability) - Calmness and balance

## 🎬 Demo Examples

**Translation:**
```
You: lang:es Good morning, how are you?
AI:  LANG:ES 🌍: Buenos días, ¿cómo estás?
```

**Emotional Intelligence:**
```
You: emotion: whatever, I don't care
AI:  EMOTION 💙:
     EMOTION: Frustration/apathy 😔
     SUGGESTION: I'm feeling a bit overwhelmed right now. Can we talk about this later?
```

**Communication Match:**
```
You: match: I love exploring new ideas and connecting with people
AI:  MATCH 🤝:
     COMMUNICATION STYLE: Inquisitive and reflective
     MATCHES: You communicate like Oprah Winfrey
     COMPATIBILITY SCORE: 88/100
     NETWORK INSIGHT: 4 people in your network have similar styles
     TRUST FACTOR: ✅ Your authentic communication style helps build genuine connections
```

## 🛠️ Project Structure

```
series-hackathon/
├── consumer.js               # Main Kafka consumer + OpenAI processing
├── producer.js               # Test producer (for development)
├── package.json
├── .env                      # Backend configuration
├── ui/                       # React frontend
│   ├── src/
│   │   ├── App.js           # Main React component
│   │   ├── App.css          # Styling
│   │   ├── PersonalityGraph.js  # 3D personality visualization
│   │   ├── MatchCard.js     # Communication match display
│   │   └── MatchCard.css
│   ├── public/
│   ├── package.json
│   └── .env                 # Frontend configuration
└── README.md
```

## 🎨 UI Features

### Real-Time Message Display
- Live message updates via Socket.IO
- User messages and agent responses color-coded
- Timestamps and message search
- Filter by mode (translations, emotional, cultural, etc.)

### 3D Personality Visualization
- **Interactive Pentagon Graph**: Rotate, zoom, and explore
- **Color-Coded Traits**:
  - 🔴 Red - Openness
  - 🔵 Teal - Conscientiousness
  - 💙 Blue - Extraversion
  - 💚 Green - Agreeableness
  - 💛 Yellow - Emotional Stability
- Real-time updates as you send more messages
- Personality type detection (e.g., "The Innovative Explorer")

### Communication Match Card
- Celebrity communication style match
- Compatibility score with visual gauge
- Network insights
- Trust factor analysis

### Data Export
- Download personality data as JSON or TOML
- Includes all messages, traits, and analytics
- Timestamps and command history

## 🧪 Development

**Run consumer with auto-reload:**
```bash
npm run dev
```

**Test with producer:**
```bash
node producer.js
```

**Frontend development:**
```bash
cd ui
npm start
```

## 🔧 Technologies Used

### Backend
- **Kafka**: Message streaming and event processing
- **OpenAI GPT-4**: Text transformation and analysis
- **Series API**: iMessage integration
- **Socket.IO**: Real-time UI updates
- **Node.js**: Runtime environment

### Frontend
- **React**: UI framework
- **Three.js / React Three Fiber**: 3D visualization
- **Socket.IO Client**: Real-time communication
- **CSS3**: Styling and animations

## 🎯 Use Cases

1. **Language Learning** - Practice conversations in any language
2. **Professional Communication** - Ensure your messages sound appropriate
3. **Cultural Sensitivity** - Adapt messages for different cultures
4. **Emotional Intelligence** - Express feelings more effectively
5. **Self-Discovery** - Understand your communication patterns
6. **Team Building** - Analyze communication compatibility

## 📝 Command Reference

### Basic Commands
```
lang:<language> <text>       # Translate to any language (es, fr, ja, ko, etc.)
tone:<tone> <text>          # Rewrite in a specific tone (polite, formal, casual)
simplify: <text>            # Simplify complex text
sentiment: <text>           # Analyze mood and sentiment
style:<style> <text>        # Apply personality style (genz, british, etc.)
pro: <text>                 # Make it professional
slang: <text>               # Make it casual/slang
```

### Magic Commands
```
emotion: <text>             # Emotional intelligence analysis + healthier rewrite
culture:<country> <text>    # Cultural adaptation (japan, korea, etc.)
vibe:<personality> <text>   # Rewrite in specific personality vibe (mentor, friend, coach)
match: <text>               # Communication style analysis + celebrity match
```

### Default Behavior
If you send text without a command, it defaults to `simplify:` mode.  

## 📄 License

MIT

---

**Built for Series Hackathon 2025** • *The Future Feels Human*
