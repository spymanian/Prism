// Node.js Kafka Consumer Example
// Install: npm install kafkajs

import { Kafka } from 'kafkajs';
import dotenv from 'dotenv';
import { createServer } from 'http';
import { Server } from 'socket.io';

dotenv.config();

// Create HTTP server for Socket.IO
const httpServer = createServer();
const io = new Server(httpServer, {
  cors: {
    origin: "http://localhost:3000",
    methods: ["GET", "POST"]
  }
});

// Start Socket.IO server
const SOCKET_PORT = process.env.SOCKET_PORT || 4000;
httpServer.listen(SOCKET_PORT, () => {
  console.log(`🔌 Socket.IO server running on port ${SOCKET_PORT}`);
});

io.on('connection', (socket) => {
  console.log('👋 UI client connected');
  socket.on('disconnect', () => {
    console.log('👋 UI client disconnected');
  });
});

// Kafka Configuration
const kafka = new Kafka({
  clientId: process.env.KAFKA_CLIENT_ID,
  brokers: process.env.KAFKA_BOOTSTRAP_SERVERS.split(','),
  ssl: process.env.KAFKA_TLS_ENABLED === 'true',
  sasl: process.env.KAFKA_SASL_ENABLED === 'true' ? {
    mechanism: process.env.KAFKA_SASL_MECHANISM,
    username: process.env.KAFKA_SASL_USERNAME,
    password: process.env.KAFKA_SASL_PASSWORD
  } : undefined
});

const consumer = kafka.consumer({ 
  groupId: process.env.KAFKA_CONSUMER_GROUP
});

const SERIES_API_URL = process.env.SERIES_API_URL;
const SERIES_API_KEY = process.env.SERIES_API_KEY;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const TARGET_LANGUAGE = process.env.TARGET_LANGUAGE || 'en';
const SENDER_NUMBER = process.env.SENDER_NUMBER;
const RECIPIENT_PHONE = process.env.RECIPIENT_PHONE;

// Store last detected language per conversation
const conversationLanguages = new Map();

// Parse command from message
function parseCommand(text) {
  const commandMatch = text.match(/^(\w+):(\S+)?\s+(.+)$/);
  if (commandMatch) {
    return {
      mode: commandMatch[1],
      arg: commandMatch[2] || null,
      text: commandMatch[3]
    };
  }
  
  // Check for simple mode without arg
  const simpleMatch = text.match(/^(\w+):\s+(.+)$/);
  if (simpleMatch) {
    return {
      mode: simpleMatch[1],
      arg: null,
      text: simpleMatch[2]
    };
  }
  
  // Default: simplify mode
  return {
    mode: 'simplify',
    arg: null,
    text: text
  };
}

// Universal text transformer using GPT
async function transformText(mode, arg, text) {
  const prompts = {
    lang: `Translate the following text to ${arg || 'Spanish'}. Return ONLY the translation, nothing else.`,
    tone: `Rewrite the following text in a ${arg || 'polite'} tone. Return ONLY the rewritten text, nothing else.`,
    simplify: `Simplify the following text to be easy to understand, like explaining to a 10-year-old. Return ONLY the simplified text, nothing else.`,
    sentiment: `Analyze the sentiment and mood of the following text. Return in format: "SENTIMENT: [description]. MOOD: [emoji]"`,
    style: `Rewrite the following text in a ${arg || 'british'} style/personality. Return ONLY the rewritten text, nothing else.`,
    pro: `Rewrite the following casual/slang text in professional language. Return ONLY the professional version, nothing else.`,
    slang: `Rewrite the following formal text in casual slang/Gen-Z language. Return ONLY the slang version, nothing else.`,
    
    // MAGIC FEATURES
    emotion: `Analyze the emotional subtext of this message. First identify the emotion, then suggest a healthier/clearer way to express it. Format: "EMOTION: [emotion + emoji]. SUGGESTION: [rewritten message]"`,
    culture: `Rewrite the following text to be culturally appropriate for ${arg || 'Japanese'} culture. Include cultural context if needed. Return the culturally adapted version.`,
    vibe: `Rewrite the following text in the style of a ${arg || 'calm, gentle mentor'}. Match the personality, tone, and energy. Return ONLY the rewritten text.`,
    
    // COMMUNICATION STYLE MATCHING
    match: `Analyze the communication style of the following text and provide a compatibility assessment. Return your response as a JSON object with this exact format:
{
  "communicationStyle": "Brief description of their texting style",
  "matches": "Name of famous successful founder/entrepreneur",
  "compatibilityScore": 85,
  "networkInsight": 3,
  "trustFactor": "Your authentic communication style helps build genuine connections"
}

Be creative and insightful. Choose a real successful founder whose communication style actually matches the input. The compatibilityScore should be 0-100, networkInsight should be 1-5.`
  };
  
  const systemPrompt = prompts[mode] || prompts['simplify'];

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: systemPrompt
          },
          {
            role: 'user',
            content: text
          }
        ],
        temperature: 0.7
      })
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const data = await response.json();
    return data.choices[0].message.content.trim();
  } catch (error) {
    console.error('❌ Transform error:', error);
    throw error;
  }
}

async function translateText(text, targetLang = TARGET_LANGUAGE) {
  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: `You are a translation assistant. Detect the language of the input text and translate it to ${targetLang}. If the text is already in ${targetLang}, just return it as-is. Format your response as JSON: {"language": "detected_language_code", "translation": "translated_text"}`
          },
          {
            role: 'user',
            content: text
          }
        ],
        temperature: 0.3
      })
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices[0].message.content;
    
    // Parse JSON response
    try {
      const result = JSON.parse(content);
      return {
        detectedLanguage: result.language,
        translatedText: result.translation
      };
    } catch {
      // Fallback if not JSON
      return {
        detectedLanguage: 'unknown',
        translatedText: content
      };
    }
  } catch (error) {
    console.error('❌ Translation error:', error);
    throw error;
  }
}

// Function to send a reply message
async function sendReply(fromPhone, text) {
  try {
    // Create a new chat with the message
    const response = await fetch(`${SERIES_API_URL}/api/chats`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SERIES_API_KEY}`
      },
      body: JSON.stringify({
        send_from: SENDER_NUMBER,
        chat: {
          phone_numbers: [fromPhone]
        },
        message: {
          text: text
        }
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Series API error: ${response.status} - ${errorText}`);
    }

    const result = await response.json();
    console.log('✅ Reply sent successfully!');
    return result;
  } catch (error) {
    console.error('❌ Error sending reply:', error);
    throw error;
  }
}

async function consumeMessages() {
  // Track when consumer starts to ignore old messages
  const consumerStartTime = Date.now();
  
  await consumer.connect();
  await consumer.subscribe({ 
    topic: process.env.KAFKA_TOPIC,
    fromBeginning: false 
  });

  console.log(`Listening to topic: ${process.env.KAFKA_TOPIC}`);
  console.log('Waiting for messages... (Press Ctrl+C to stop)\n');
  
  // Print the help menu
  console.log('🔮 Universal Message Rewriter Agent');
  console.log('===================================\n');
  console.log('Basic Commands:');
  console.log('  lang:es <text>       - Translate to Spanish (or any language)');
  console.log('  tone:polite <text>   - Rewrite in polite tone');
  console.log('  simplify: <text>     - Simplify for easy reading');
  console.log('  sentiment: <text>    - Analyze sentiment/mood');
  console.log('  style:genz <text>    - Rewrite in Gen-Z style');
  console.log('  pro: <text>          - Make it professional');
  console.log('  slang: <text>        - Make it casual/slang\n');
  console.log('✨ MAGIC FEATURES:');
  console.log('  emotion: <text>      - Emotional intelligence + healthier rewrite');
  console.log('  culture:japan <text> - Culturally adapt for Japan/Korea/etc');
  console.log('  vibe:mentor <text>   - Rewrite in a specific personality');
  console.log('  match: <text>        - Analyze communication style & get compatibility score\n');
  console.log('Examples:');
  console.log('  lang:fr Can we meet tomorrow?');
  console.log('  emotion: okay whatever');
  console.log('  culture:japan My bad I forgot');
  console.log('  vibe:mentor I need help with this');
  console.log('  match: Hey! Really excited about this opportunity\n');
  console.log('📱 Send a message to ' + SENDER_NUMBER + ' from your phone to test!\n');
  console.log('==========================================\n');

  await consumer.run({
    eachMessage: async ({ topic, partition, message }) => {
      // Log EVERY message received from Kafka
      console.log('\n🔔 RAW KAFKA MESSAGE RECEIVED!');
      console.log('Timestamp:', new Date().toISOString());
      console.log('Topic:', topic);
      console.log('Partition:', partition);
      console.log('Offset:', message.offset);
      console.log('Raw Value:', message.value.toString());
      console.log('---');
      
      try {
        const event = JSON.parse(message.value.toString());
        
        console.log('\n📨 Received event:');
        console.log('Event Type:', event.event_type);
        console.log('Full Event:', JSON.stringify(event, null, 2));

        // Handle incoming messages
        if (event.event_type === 'message.received') {
          const { chat_id, text, from_phone } = event.data;
          const messageTime = new Date(event.created_at).getTime();
          
          // Ignore messages sent before consumer started
          if (messageTime < consumerStartTime) {
            console.log(`⏭️  Skipping old message from ${from_phone} (sent before consumer start)`);
            return;
          }
          
          console.log(`\n📥 Message from ${from_phone}:`);
          console.log(`   Text: "${text}"`);
          
          // Emit incoming message to UI
          io.emit('message', {
            id: Date.now(),
            text: text,
            type: 'user',
            timestamp: new Date().toISOString(),
            from: from_phone
          });
          
          // Parse command
          const { mode, arg, text: messageText } = parseCommand(text);
          
          console.log(`   Mode: ${mode}${arg ? ':' + arg : ''}`);
          console.log(`   Processing: "${messageText}"`);
          
          // Transform the text
          try {
            console.log('✨ Transforming...');
            const result = await transformText(mode, arg, messageText);
            
            console.log(`   Result: "${result}"`);
            
            // Format response with emoji
            const modeEmojis = {
              lang: '🌍',
              tone: '✨',
              simplify: '📚',
              sentiment: '💭',
              style: '🎭',
              pro: '🧑‍💼',
              slang: '😎',
              emotion: '💙',  // Magic Feature A
              culture: '🌏',  // Magic Feature C
              vibe: '✨',     // Magic Feature B
              match: '🤝'     // Communication Style Matching
            };
            
            const emoji = modeEmojis[mode] || '🔮';
            const prefix = arg ? `${mode.toUpperCase()}:${arg.toUpperCase()}` : mode.toUpperCase();
            
            // Special formatting for match mode
            let replyText;
            if (mode === 'match') {
              try {
                const matchData = JSON.parse(result);
                replyText = `${prefix} ${emoji}:\n\n` +
                  `COMMUNICATION STYLE: ${matchData.communicationStyle}\n` +
                  `MATCHES: You communicate like ${matchData.matches}\n` +
                  `COMPATIBILITY SCORE: ${matchData.compatibilityScore}/100\n` +
                  `NETWORK INSIGHT: ${matchData.networkInsight} people in your network have similar communication styles\n` +
                  `TRUST FACTOR: ✅ ${matchData.trustFactor}`;
              } catch (e) {
                // Fallback if JSON parsing fails
                replyText = `${prefix} ${emoji}: ${result}`;
              }
            } else {
              replyText = `${prefix} ${emoji}: ${result}`;
            }
            
            // Emit agent response to UI
            io.emit('message', {
              id: Date.now() + 1,
              text: replyText,
              type: 'agent',
              timestamp: new Date().toISOString(),
              mode: mode,
              arg: arg
            });
            
            // Send result back
            await sendReply(from_phone, replyText);
            console.log('✅ Message processed successfully');
          } catch (transformError) {
            console.error('❌ Error during transformation:', transformError);
            // Still emit error message to UI so it doesn't block
            io.emit('message', {
              id: Date.now() + 1,
              text: '❌ Error processing message',
              type: 'agent',
              timestamp: new Date().toISOString()
            });
          }
        }
      } catch (error) {
        console.error('❌ Error processing message:', error);
        console.log('Raw message:', message.value.toString());
      }
      
      console.log('✓ Ready for next message\n');
    }
  });
}

consumeMessages().catch(console.error);