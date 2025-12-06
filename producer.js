// Node.js Kafka Producer Example
// Install: npm install kafkajs

import { Kafka } from 'kafkajs';
import dotenv from 'dotenv';

dotenv.config();

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

const producer = kafka.producer();

const SERIES_API_URL = process.env.SERIES_API_URL;
const SERIES_API_KEY = process.env.SERIES_API_KEY;
const RECIPIENT_PHONE = process.env.RECIPIENT_PHONE;

async function sendMessageViaKafka(messageText, fromPhone) {
  await producer.connect();
  
  const messageEvent = {
    api_version: "v2",
    created_at: new Date().toISOString(),
    event_type: "message.received",
    event_id: `test-${Date.now()}`,
    data: {
      chat_id: "test-chat-123",
      from_phone: fromPhone,
      text: messageText,
      service: "iMessage",
      is_read: false,
      sent_at: new Date().toISOString(),
      attachments: [],
      chat_handles: [
        { display_name: "AI Bot", identifier: process.env.SENDER_NUMBER, is_me: false },
        { display_name: "You", identifier: process.env.RECIPIENT_PHONE, is_me: true }
      ]
    }
  };

  try {
    const result = await producer.send({
      topic: process.env.KAFKA_TOPIC,
      messages: [
        {
          value: JSON.stringify(messageEvent)
        }
      ]
    });

    console.log(`✅ Message sent to Kafka from ${fromPhone}!`);
    console.log(`   Text: "${messageText}"`);
    console.log('Result:', result);
  } catch (error) {
    console.error('❌ Error sending to Kafka:', error);
  } finally {
    await producer.disconnect();
  }
}

// Test with readline input OR by sending actual iMessage through Series API
async function testBidirectional() {
  const readline = await import('readline');
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  const question = (query) => new Promise((resolve) => rl.question(query, resolve));

  console.log('\n🔮 Universal Message Rewriter - Test Producer');
  console.log('==============================================\n');
  console.log('💡 NOTE: This is a TEST tool. Normally, messages come from Series API webhooks → Kafka automatically.\n');
  console.log('This producer simulates sending messages as if they came from your phone.\n');
  console.log('Easy Command Formats:');
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
  console.log('  match: Hey! Really excited about this opportunity');
  console.log('  Just send plain text (defaults to simplify)\n');

  const message = await question('Enter your test message: ');

  console.log('\n📤 Sending test message to Kafka...');
  await sendMessageViaKafka(message, RECIPIENT_PHONE);

  rl.close();
}
testBidirectional();
