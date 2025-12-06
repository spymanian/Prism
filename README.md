# Prism

**AI-Powered Communication Personality Assessment for Dating & Networking**

> Discover your unique communication style through natural conversation. Series analyzes how you text to match you with compatible people who truly understand you.

## 🎯 What Is This?

Series Personality Test is an innovative **conversation-based personality assessment** that:
- 💬 **Analyzes your natural texting style** as you chat with an AI agent
- 🧠 **Maps your communication traits** using linguistic analysis
- 🤝 **Matches you with successful founders** who communicate like you
- 📊 **Visualizes your personality** in real-time with interactive 3D graphs
- 🔗 **Helps you find compatible connections** on LinkedIn and beyond
- 🎯 **Powered by iMessage** - just text like you normally would!

**Unlike traditional personality tests with rigid questions, Series learns about you through authentic conversation.**

## ✨ How It Works

### 1. **Just Start Texting**
Send messages to the Series agent via iMessage - talk naturally about anything:
- "Hey, how does this work?"
- "I'm interested in startups"
- "What's my communication style?"

### 2. **AI Analyzes Your Style**
Every message you send is analyzed for:
- **Formality** - How professional vs casual you communicate
- **Enthusiasm** - Your energy and passion level
- **Directness** - How concise and action-oriented you are
- **Analytical Thinking** - Complexity and strategic depth
- **Expressiveness** - Emotional richness and authenticity

### 3. **Get Your Personality Match**
Use the `match:` command with any message to get:
- Your communication archetype (e.g., "Strategic Enterprise Leader")
- Celebrity founder matches who communicate like you
- Compatibility score (0-100)
- Network insights about similar communicators

### 4. **Visualize Your Profile**
Use the `graph:` command to see your personality chart:
```
📊 YOUR COMMUNICATION PROFILE
═══════════════════════════════
🌟 Visionary Innovator
🎩 Formality    ████████████░░░░░░░░ 60%
⚡ Enthusiasm   ████████████████████ 95%
🎯 Directness   ██████████████░░░░░░ 70%
🧠 Analytical   ████████████░░░░░░░░ 60%
💫 Expressive   ██████████████████░░ 90%
```

## 🚀 Quick Start

### For Users (Taking the Test)

1. **Text the Series number**: `+16463458837` (or your configured number)
2. **Start chatting naturally**: Say hi, ask questions, share thoughts
3. **Watch your personality emerge** on the web UI in real-time
4. **Use special commands**:
   - `match: [any message]` - Get your full personality profile
   - `graph: [any message]` - Get visual personality chart
   - Just chat normally to refine your profile!

### For Developers (Setting Up)

1. **Install dependencies**
   ```bash
   npm install
   cd ui && npm install
   ```

2. **Configure environment** (see Installation section below)

3. **Run the system**
   ```bash
   # Terminal 1: Backend
   node consumer.js
   
   # Terminal 2: Frontend
   cd ui && npm start
   ```

## 💬 Conversation Examples

### Getting Started
**You**: "Hey!"  
**Series**: "Hi! I'm Series AI, your matchmaking assistant! Want to discover your communication style? Just chat with me naturally, and I'll analyze how you express yourself. Try sending 'match: [any message]' when you're ready!"

### Personality Discovery
**You**: "match: I love building things and solving complex problems"  
**Series**: 
```
Your communication style: Analytical Builder
You write like: Jensen Huang
Match score: 87/100 🤝

Want to connect with similar minds? I can help you find LinkedIn profiles!
```

### Visual Insights
**You**: "graph: show me my style"  
**Series**: *[Sends beautiful ASCII chart with all your metrics]*

### Natural Refinement
**You**: "This is so cool! I'm really excited about finding people who get my vibe"  
**Series**: "I can tell! Your enthusiasm really shines through. That energy will help you connect with other passionate builders. Ready to find your matches on LinkedIn?"

## 🎨 Special Features

| Feature | Command | What It Does |
|---------|---------|--------------|
| 💬 **Natural Chat** | Just text! | Refines your personality profile with every message |
| 🤝 **Match Analysis** | `match: <text>` | Full personality breakdown + founder matches |
| 📊 **Visual Graph** | `graph: <text>` | Text-based chart of your communication traits |
| 💙 **Emotion Analysis** | `emotion: <text>` | Understand emotional subtext in messages |
| 🌏 **Cultural Adapt** | `culture:japan <text>` | Learn cultural communication patterns |

## 📱 How The System Works

```
Your Phone → Series API → Kafka → AI Agent → Personality Analysis → Your Phone + Web UI
                                      ↓              ↓
                                  GPT-4 Chat   Linguistic NLP
                                      ↓              ↓
                                 Natural       Real-time Graph
                                 Response         Updates
```

### Architecture Flow

1. **You Send a Message** - Text naturally via iMessage to Series
2. **Kafka Event Stream** - Message flows through Kafka broker
3. **Personality Analyzer** - Extracts linguistic patterns (formality, enthusiasm, etc.)
4. **AI Conversational Agent** - GPT-4 responds naturally to keep you engaged
5. **Real-Time Updates** - Web UI shows your personality graph evolving live
6. **Match Engine** - Compares your style to successful founders when you use `match:`
7. **Dual Response** - Reply sent to your phone AND visualized in web dashboard

### Privacy & Security

- ✅ **Phone number filtering** - Only you can access your personality data
- ✅ **No permanent storage** - Analysis happens in real-time, not saved
- ✅ **Encrypted WebSocket** - Secure Socket.IO for UI updates
- ✅ **API key protection** - All credentials in environment variables
- ✅ **Personal & private** - Your profile is unique and not shared

## 🧠 The Science: Linguistic Personality Analysis

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

## 💼 Real-World Applications

### Dating & Matchmaking
Find people who communicate at your wavelength. If you're a "Visionary Innovator," Series helps you connect with other high-energy builders rather than analytical strategists who might clash.

### Professional Networking
Discover which successful founders share your communication DNA. Connect with them on LinkedIn and learn from people who already "speak your language."

### Self-Improvement
See your personality evolve over time. Notice that your formality score increases as you grow professionally? Track it in real-time!

### Team Building
Companies can use Series to assess communication compatibility before hiring or forming teams, ensuring better collaboration.

## 🛠️ Installation & Setup (For Developers)

### Prerequisites
- Node.js 18+
- Kafka broker access
- OpenAI API key (GPT-4)
- Series API access
- Your phone number registered with Series

### Quick Installation

```bash
# 1. Install dependencies
npm install
cd ui && npm install && cd ..

# 2. Configure backend (.env in root)
cat > .env << 'EOF'
KAFKA_CLIENT_ID=your-client-id
KAFKA_BOOTSTRAP_SERVERS=your-kafka:9092
KAFKA_TOPIC=your-topic
KAFKA_CONSUMER_GROUP=your-group
KAFKA_TLS_ENABLED=true
KAFKA_SASL_ENABLED=true
KAFKA_SASL_MECHANISM=plain
KAFKA_SASL_USERNAME=username
KAFKA_SASL_PASSWORD=password
OPENAI_API_KEY=sk-your-key
SERIES_API_URL=api-url
SERIES_API_KEY=your-key
SENDER_NUMBER=+16463458837
RECIPIENT_PHONE=+1234567890
EOF

# 3. Configure frontend (ui/.env)
cat > ui/.env << 'EOF'
GENERATE_SOURCEMAP=false
REACT_APP_USER_PHONE=+1234567890
EOF

# 4. Run the system
# Terminal 1: Backend
node consumer.js

# Terminal 2: Frontend  
cd ui && npm start
```

## 🎬 Example Conversation Flow

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
