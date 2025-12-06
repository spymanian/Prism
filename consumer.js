// Node.js Kafka Consumer Example
// Install: npm install kafkajs

import { Kafka } from 'kafkajs';
import dotenv from 'dotenv';
import { createServer } from 'http';
import { Server } from 'socket.io';
import natural from 'natural';
import compromise from 'compromise';
import Sentiment from 'sentiment';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load synthetic LinkedIn profiles
const syntheticProfiles = JSON.parse(
  readFileSync(join(__dirname, 'synthetic-profiles.json'), 'utf-8')
).profiles;

const sentiment = new Sentiment();
const TfIdf = natural.TfIdf;
const tokenizer = new natural.WordTokenizer();

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
  console.log('👋 UI client connected:', socket.id);
  
  socket.on('disconnect', () => {
    console.log('👋 UI client disconnected:', socket.id);
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
  
  // Default: chat mode for normal conversation
  return {
    mode: 'chat',
    arg: null,
    text: text
  };
}

// Store historical message data for relative scoring and network analysis
const messageHistory = {
  messages: [],
  maxHistory: 50,
  add(metrics) {
    this.messages.push(metrics);
    if (this.messages.length > this.maxHistory) {
      this.messages.shift();
    }
  },
  getAverage(metric) {
    if (this.messages.length === 0) return 50;
    const sum = this.messages.reduce((acc, m) => acc + m[metric], 0);
    return sum / this.messages.length;
  },
  getPercentile(value, metric) {
    if (this.messages.length < 5) return 50; // Need baseline
    const sorted = this.messages.map(m => m[metric]).sort((a, b) => a - b);
    const index = sorted.findIndex(v => v >= value);
    return index === -1 ? 100 : Math.round((index / sorted.length) * 100);
  },
  getNetworkDistribution() {
    if (this.messages.length < 5) return null;
    
    // Calculate distribution across personality dimensions
    const distribution = {
      formality: { low: 0, mid: 0, high: 0 },
      enthusiasm: { low: 0, mid: 0, high: 0 },
      directness: { low: 0, mid: 0, high: 0 },
      analytical: { low: 0, mid: 0, high: 0 },
      expressiveness: { low: 0, mid: 0, high: 0 }
    };
    
    this.messages.forEach(msg => {
      // Categorize each metric into low (<40), mid (40-70), high (>70)
      Object.keys(distribution).forEach(key => {
        const metricKey = key === 'analytical' ? 'analyticalScore' : key;
        const value = msg[metricKey];
        if (value < 40) distribution[key].low++;
        else if (value <= 70) distribution[key].mid++;
        else distribution[key].high++;
      });
    });
    
    // Convert counts to percentages
    const total = this.messages.length;
    Object.keys(distribution).forEach(key => {
      distribution[key].low = Math.round((distribution[key].low / total) * 100);
      distribution[key].mid = Math.round((distribution[key].mid / total) * 100);
      distribution[key].high = Math.round((distribution[key].high / total) * 100);
    });
    
    return distribution;
  },
  getStyleProfile() {
    if (this.messages.length < 5) return null;
    
    // Determine dominant communication pattern
    const avgFormality = this.getAverage('formality');
    const avgEnthusiasm = this.getAverage('enthusiasm');
    const avgDirectness = this.getAverage('directness');
    const avgAnalytical = this.getAverage('analyticalScore');
    const avgExpressiveness = this.getAverage('expressiveness');
    
    // Calculate consistency (lower std dev = more consistent)
    const consistency = {
      formality: this.getStdDev('formality'),
      enthusiasm: this.getStdDev('enthusiasm'),
      directness: this.getStdDev('directness')
    };
    
    const avgConsistency = (consistency.formality + consistency.enthusiasm + consistency.directness) / 3;
    
    return {
      averages: {
        formality: Math.round(avgFormality),
        enthusiasm: Math.round(avgEnthusiasm),
        directness: Math.round(avgDirectness),
        analytical: Math.round(avgAnalytical),
        expressiveness: Math.round(avgExpressiveness)
      },
      consistency: Math.round(100 - avgConsistency), // Higher = more consistent
      messages: this.messages.length
    };
  },
  getStdDev(metric) {
    if (this.messages.length < 2) return 0;
    const avg = this.getAverage(metric);
    const squaredDiffs = this.messages.map(m => Math.pow(m[metric] - avg, 2));
    const variance = squaredDiffs.reduce((a, b) => a + b, 0) / this.messages.length;
    return Math.sqrt(variance);
  }
};

// GPT-based personality measure refinement
async function refinePersonalityMeasures(text, algorithmicMetrics) {
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
            content: `You are a communication personality analyst. Analyze the message and return ONLY a JSON object with 5 scores (0-100):
{
  "formality": <number>, // How formal/professional vs casual the tone is
  "enthusiasm": <number>, // Energy level, excitement, passion in the message
  "directness": <number>, // How direct/blunt vs indirect/diplomatic
  "analytical": <number>, // Logical reasoning, data-driven, analytical thinking
  "expressiveness": <number> // Emotional expression, use of descriptive language
}

Consider context, nuance, sarcasm, and emotional undertones. Return ONLY valid JSON, no explanations.`
          },
          {
            role: 'user',
            content: `Message: "${text}"\n\nAlgorithmic baseline: ${JSON.stringify(algorithmicMetrics)}\n\nProvide refined scores considering context and nuance.`
          }
        ],
        temperature: 0.3,
        max_tokens: 150
      })
    });

    const data = await response.json();
    const content = data.choices[0].message.content.trim();
    
    // Parse JSON response
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const gptScores = JSON.parse(jsonMatch[0]);
      
      // Blend algorithmic and GPT scores (70% GPT, 30% algorithmic for accuracy)
      return {
        formality: Math.round(gptScores.formality * 0.7 + algorithmicMetrics.formality * 0.3),
        enthusiasm: Math.round(gptScores.enthusiasm * 0.7 + algorithmicMetrics.enthusiasm * 0.3),
        directness: Math.round(gptScores.directness * 0.7 + algorithmicMetrics.directness * 0.3),
        analytical: Math.round(gptScores.analytical * 0.7 + algorithmicMetrics.analytical * 0.3),
        expressiveness: Math.round(gptScores.expressiveness * 0.7 + algorithmicMetrics.expressiveness * 0.3)
      };
    }
  } catch (error) {
    console.error('❌ GPT refinement failed, using algorithmic scores:', error.message);
  }
  
  // Fallback to algorithmic scores
  return algorithmicMetrics;
}

// Helper function to determine dominant communication trait
function getDominantTrait(styleProfile) {
  if (!styleProfile) return null;
  
  const { averages } = styleProfile;
  const traits = {
    formality: averages.formality,
    enthusiasm: averages.enthusiasm,
    directness: averages.directness,
    analytical: averages.analytical,
    expressiveness: averages.expressiveness
  };
  
  const dominant = Object.entries(traits).reduce((a, b) => a[1] > b[1] ? a : b);
  
  const labels = {
    formality: 'Professional & Formal',
    enthusiasm: 'Energetic & Enthusiastic',
    directness: 'Direct & Concise',
    analytical: 'Analytical & Logical',
    expressiveness: 'Expressive & Descriptive'
  };
  
  return {
    trait: dominant[0],
    score: dominant[1],
    label: labels[dominant[0]]
  };
}

// Algorithmic communication style analyzer (baseline)
function analyzeCommunicationStyle(text) {
  const doc = compromise(text);
  const tokens = tokenizer.tokenize(text.toLowerCase());
  const sentimentResult = sentiment.analyze(text);
  
  // Enhanced sentiment detection for mental health and emotional keywords
  const negativeEmotionalWords = [
    'unstable', 'insane', 'crashing', 'overwhelmed', 'anxious', 'depressed',
    'struggling', 'broken', 'failing', 'hopeless', 'worthless', 'terrible',
    'awful', 'horrible', 'stressed', 'crying', 'sad', 'hurt', 'pain',
    'alone', 'lonely', 'scared', 'afraid', 'worried', 'panic', 'crisis'
  ];
  
  const positiveEmotionalWords = [
    'excited', 'happy', 'great', 'amazing', 'wonderful', 'love', 'awesome',
    'fantastic', 'brilliant', 'excellent', 'perfect', 'thrilled', 'grateful',
    'blessed', 'proud', 'confident', 'hopeful', 'optimistic', 'motivated'
  ];
  
  const lowerText = text.toLowerCase();
  const negativeMatches = negativeEmotionalWords.filter(word => lowerText.includes(word)).length;
  const positiveMatches = positiveEmotionalWords.filter(word => lowerText.includes(word)).length;
  
  // Enhanced sentiment score that considers emotional keywords
  let enhancedSentimentScore = sentimentResult.score;
  enhancedSentimentScore -= negativeMatches * 3; // Heavily weight negative emotional words
  enhancedSentimentScore += positiveMatches * 2;
  
  // Calculate linguistic metrics
  const wordCount = tokens.length;
  const avgWordLength = tokens.reduce((sum, word) => sum + word.length, 0) / wordCount;
  const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
  const avgSentenceLength = wordCount / sentences.length;
  
  // Extract features
  const hasQuestions = (text.match(/\?/g) || []).length;
  const hasExclamations = (text.match(/!/g) || []).length;
  const capitalWords = (text.match(/\b[A-Z]{2,}\b/g) || []).length;
  const emojis = (text.match(/[\u{1F300}-\u{1F9FF}]/gu) || []).length;
  
  // POS tagging
  const verbs = doc.verbs().length;
  const nouns = doc.nouns().length;
  const adjectives = doc.adjectives().length;
  const adverbs = doc.adverbs().length;
  
  // Calculate style scores (0-100)
  const formality = Math.min(100, Math.max(0, 
    50 + (avgWordLength - 4) * 15 - emojis * 10 - hasExclamations * 5
  ));
  
  // Use enhanced sentiment for enthusiasm calculation
  const enthusiasm = Math.min(100, Math.max(0,
    30 + hasExclamations * 20 + emojis * 10 + (enhancedSentimentScore > 0 ? 20 : 0) - (negativeMatches * 10)
  ));
  
  const directness = Math.min(100, Math.max(0,
    50 + (verbs / wordCount) * 100 - (adjectives / wordCount) * 50
  ));
  
  const analyticalScore = Math.min(100, Math.max(0,
    30 + (nouns / wordCount) * 80 + avgSentenceLength * 2
  ));
  
  const expressiveness = Math.min(100, Math.max(0,
    20 + (adjectives / wordCount) * 150 + (adverbs / wordCount) * 100 + emojis * 15
  ));
  
  // Calculate message quality metrics (engagement affected by sentiment)
  const qualityMetrics = {
    clarity: Math.min(100, Math.max(0, 
      50 + (wordCount > 5 ? 20 : -20) + (avgSentenceLength < 25 ? 15 : -10)
    )),
    depth: Math.min(100, Math.max(0,
      30 + (nouns / wordCount) * 100 + (avgWordLength - 3) * 10
    )),
    engagement: Math.min(100, Math.max(0,
      40 + hasQuestions * 15 + hasExclamations * 10 + (enhancedSentimentScore > 0 ? 20 : 0) - (negativeMatches * 5)
    )),
    coherence: Math.min(100, Math.max(0,
      50 + (verbs > 0 ? 20 : -20) + (sentences.length > 1 ? 15 : -10)
    ))
  };
  
  const averageQuality = (qualityMetrics.clarity + qualityMetrics.depth + 
                          qualityMetrics.engagement + qualityMetrics.coherence) / 4;
  
  // Store metrics for historical comparison
  const currentMetrics = {
    formality: Math.round(formality),
    enthusiasm: Math.round(enthusiasm),
    directness: Math.round(directness),
    analyticalScore: Math.round(analyticalScore),
    expressiveness: Math.round(expressiveness),
    quality: Math.round(averageQuality),
    sentiment: enhancedSentimentScore
  };
  messageHistory.add(currentMetrics);
  
  // Determine communication style profile
  let styleDescription = '';
  let styleTitle = '';
  let baseScore = 50;
  
  if (formality > 70 && analyticalScore > 60) {
    styleDescription = 'Professional, analytical, and detail-oriented';
    styleTitle = 'Strategic Enterprise Leader';
    baseScore = 45 + formality * 0.2;
  } else if (enthusiasm > 70 && expressiveness > 60) {
    styleDescription = 'Energetic, passionate, and engaging';
    styleTitle = 'Visionary Innovator';
    baseScore = 50 + enthusiasm * 0.15;
  } else if (directness > 70 && formality < 50) {
    styleDescription = 'Direct, concise, and action-oriented';
    styleTitle = 'Bold Disruptor';
    baseScore = 40 + directness * 0.25;
  } else if (analyticalScore > 70) {
    styleDescription = 'Thoughtful, strategic, and data-driven';
    styleTitle = 'Data-Driven Strategist';
    baseScore = 45 + analyticalScore * 0.2;
  } else if (expressiveness > 60 && enhancedSentimentScore > 2) {
    styleDescription = 'Warm, authentic, and empathetic';
    styleTitle = 'Empathetic Connector';
    baseScore = 50 + expressiveness * 0.15;
  } else if (hasQuestions > 1) {
    styleDescription = 'Curious, inquisitive, and collaborative';
    styleTitle = 'Curious Entrepreneur';
    baseScore = 45 + hasQuestions * 3;
  } else {
    styleDescription = 'Balanced, thoughtful, and adaptable';
    styleTitle = 'Balanced Operator';
    baseScore = 35 + (formality + directness) * 0.15;
  }
  
  // Adjust score based on quality and historical performance
  let compatibilityScore = Math.round(baseScore);
  
  // Quality adjustment (±15 points)
  compatibilityScore += Math.round((averageQuality - 50) * 0.3);
  
  // Historical relative scoring (if enough data)
  if (messageHistory.messages.length >= 5) {
    const avgHistoricalQuality = messageHistory.getAverage('quality');
    const relativeBonus = (averageQuality - avgHistoricalQuality) * 0.2;
    compatibilityScore += Math.round(relativeBonus);
    
    // Percentile bonus for exceptional messages
    const qualityPercentile = messageHistory.getPercentile(averageQuality, 'quality');
    if (qualityPercentile >= 80) {
      compatibilityScore += 5;
    }
  }
  
  // Clamp to realistic range (40-95 instead of 60-99)
  compatibilityScore = Math.min(95, Math.max(40, compatibilityScore));
  
  // Network insight based on style uniqueness
  const styleUniqueness = Math.abs(50 - formality) + Math.abs(50 - enthusiasm);
  const networkInsight = Math.max(1, Math.min(7, Math.floor(5 - styleUniqueness / 30)));
  
  // Trust factor based on consistency
  const consistency = 100 - Math.abs(formality - directness);
  let trustFactor = consistency > 70 
    ? 'Your consistent communication style builds strong trust'
    : 'Your adaptive communication style creates diverse connections';
  
  // Add improvement suggestions for lower scores
  let improvementTips = [];
  if (compatibilityScore < 60) {
    if (qualityMetrics.clarity < 50) improvementTips.push('clarity');
    if (qualityMetrics.depth < 50) improvementTips.push('depth');
    if (qualityMetrics.engagement < 50) improvementTips.push('engagement');
    if (qualityMetrics.coherence < 50) improvementTips.push('structure');
  }
  
  // Get network distribution analysis if enough data
  const networkDistribution = messageHistory.getNetworkDistribution();
  const styleProfile = messageHistory.getStyleProfile();
  
  return {
    communicationStyle: styleDescription,
    styleTitle,
    compatibilityScore,
    networkInsight,
    trustFactor,
    qualityBreakdown: qualityMetrics,
    improvementAreas: improvementTips,
    historicalContext: messageHistory.messages.length >= 5 ? {
      totalMessages: messageHistory.messages.length,
      averageQuality: Math.round(messageHistory.getAverage('quality')),
      currentPercentile: messageHistory.getPercentile(averageQuality, 'quality')
    } : null,
    networkAnalysis: networkDistribution ? {
      distribution: networkDistribution,
      profile: styleProfile,
      dominantTrait: getDominantTrait(styleProfile)
    } : null,
    metrics: {
      formality: Math.round(formality),
      enthusiasm: Math.round(enthusiasm),
      directness: Math.round(directness),
      analyticalScore: Math.round(analyticalScore),
      expressiveness: Math.round(expressiveness),
      sentiment: sentimentResult.score
    }
  };
}

// Universal text transformer using GPT or algorithms
async function transformText(mode, arg, text) {
  const prompts = {
    chat: `You are Series AI, a matchmaking assistant for a professional dating/networking app called Series that connects people based on communication compatibility.

IMPORTANT: If the user expresses serious emotional distress, mental health concerns, or uses words like "unstable," "insane," "crashing out," or similar crisis language:
1. Acknowledge their feelings with empathy and warmth
2. Gently suggest they might benefit from talking to a mental health professional or calling a crisis hotline
3. Then pivot to: "When you're feeling better, I'd love to help you discover your communication style with our 'match:' feature - it can help you connect with people who truly understand you."

For normal conversations:
- Be warm, conversational, and encouraging
- Guide users to use the "match:" command to discover their communication style
- Mention "graph:" command to get a visual personality chart sent to them
- After they use match:, offer to help find LinkedIn profiles of similar communicators
- Keep responses brief (2-3 sentences max), enthusiastic, and action-oriented

When users ask about personality, connections, or LinkedIn → Always push towards the "match:" command first.
When users want to see their personality visually → Suggest the "graph:" command to get a chart image.`,
    lang: `Translate the following text to ${arg}. Return ONLY the translation, nothing else.`,
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

Be creative and insightful. Choose a real successful founder whose communication style actually matches the input. The compatibilityScore should be 0-100, networkInsight should be 1-5.`,
    graph: `Return a brief message like "Generating your personality graph..." - this is a special mode that creates a visual chart.`
  };
  
  // Special mode: Generate and send personality graph
  if (mode === 'graph') {
    const analysisResult = analyzeCommunicationStyle(text);
    return JSON.stringify({
      mode: 'graph',
      data: analysisResult
    });
  }
  
  // Use algorithmic analysis for match mode, then get GPT celebrity
  if (mode === 'match') {
    const analysisResult = analyzeCommunicationStyle(text);
    
    // Find best matching LinkedIn profile based on communication style similarity
    const userMetrics = analysisResult.metrics;
    const profileMatches = syntheticProfiles.map(profile => {
      // Calculate similarity score (0-100) based on personality metrics
      const diffs = {
        formality: Math.abs(userMetrics.formality - profile.communicationStyle.formality),
        enthusiasm: Math.abs(userMetrics.enthusiasm - profile.communicationStyle.enthusiasm),
        directness: Math.abs(userMetrics.directness - profile.communicationStyle.directness),
        analytical: Math.abs(userMetrics.analyticalScore - profile.communicationStyle.analytical),
        expressiveness: Math.abs(userMetrics.expressiveness - profile.communicationStyle.expressiveness)
      };
      
      // Average difference (lower is better)
      const avgDiff = (diffs.formality + diffs.enthusiasm + diffs.directness + diffs.analytical + diffs.expressiveness) / 5;
      
      // Convert to similarity score (0-100, higher is better)
      const similarityScore = Math.max(0, Math.min(100, 100 - avgDiff));
      
      return {
        ...profile,
        calculatedMatchScore: Math.round(similarityScore)
      };
    });
    
    // Sort by similarity and get top 3
    const topMatches = profileMatches
      .sort((a, b) => b.calculatedMatchScore - a.calculatedMatchScore)
      .slice(0, 3);
    
    // Use GPT to generate a celebrity match based on the style title
    try {
      const celebrityPrompt = `Given someone with the communication archetype "${analysisResult.styleTitle}" who is described as "${analysisResult.communicationStyle}", suggest ONE real successful founder/entrepreneur/business leader whose communication style matches this profile. Just respond with their name only, nothing else.`;
      
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
              content: 'You are an expert in analyzing communication styles of successful business leaders. Respond with only the person\'s name.'
            },
            {
              role: 'user',
              content: celebrityPrompt
            }
          ],
          temperature: 0.8
        })
      });

      if (response.ok) {
        const data = await response.json();
        analysisResult.matches = data.choices[0].message.content.trim();
      } else {
        analysisResult.matches = 'Successful Entrepreneur';
      }
    } catch (error) {
      console.error('Celebrity generation error:', error);
      analysisResult.matches = 'Successful Entrepreneur';
    }
    
    // Add LinkedIn profile matches to the result
    analysisResult.linkedInMatches = topMatches.map(profile => ({
      name: profile.name,
      title: profile.title,
      location: profile.location,
      headline: profile.headline,
      matchScore: profile.calculatedMatchScore,
      styleTitle: profile.styleTitle,
      mutualConnections: profile.mutualConnections,
      profileUrl: profile.profileUrl,
      interests: profile.interests
    }));
    
    return JSON.stringify(analysisResult, null, 2);
  }
  
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

// Function to generate personality graph as text
function generatePersonalityGraphText(personalityData) {
  const metrics = [
    { name: 'Formality', value: personalityData.metrics.formality, emoji: '🎩' },
    { name: 'Enthusiasm', value: personalityData.metrics.enthusiasm, emoji: '⚡' },
    { name: 'Directness', value: personalityData.metrics.directness, emoji: '🎯' },
    { name: 'Analytical', value: personalityData.metrics.analyticalScore, emoji: '🧠' },
    { name: 'Expressive', value: personalityData.metrics.expressiveness, emoji: '💫' }
  ];
  
  let graph = `📊 YOUR COMMUNICATION PROFILE\n`;
  graph += `═══════════════════════════════\n\n`;
  graph += `🌟 ${personalityData.styleTitle}\n`;
  graph += `${personalityData.communicationStyle}\n\n`;
  
  metrics.forEach(metric => {
    const barLength = Math.round(metric.value / 5); // 20 chars max
    const bar = '█'.repeat(barLength) + '░'.repeat(20 - barLength);
    graph += `${metric.emoji} ${metric.name.padEnd(11)} ${bar} ${metric.value}%\n`;
  });
  
  graph += `\n═══════════════════════════════\n`;
  graph += `💡 Tip: Use 'match:' to find similar communicators!`;
  
  return graph;
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

// Function to send image via iMessage
async function sendImageReply(fromPhone, imageBuffer, text = '') {
  try {
    const base64Image = imageBuffer.toString('base64');
    
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
          text: text,
          attachments: [
            {
              data_base64: base64Image,
              filename: 'personality-graph.png',
              mime_type: 'image/png'
            }
          ]
        }
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Series API error: ${response.status} - ${errorText}`);
    }

    const result = await response.json();
    console.log('✅ Image sent successfully!');
    return result;
  } catch (error) {
    console.error('❌ Error sending image:', error);
    throw error;
  }
}

// Function to start typing indicator
async function startTypingIndicator(chatId) {
  try {
    const response = await fetch(`${SERIES_API_URL}/api/chats/${chatId}/start_typing`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SERIES_API_KEY}`
      }
    });

    if (response.ok) {
      console.log('⌨️  Typing indicator started');
      return true;
    } else {
      console.log('⚠️  Could not start typing indicator:', response.status);
      return false;
    }
  } catch (error) {
    console.error('❌ Error starting typing indicator:', error);
    return false;
  }
}

// Function to stop typing indicator
async function stopTypingIndicator(chatId) {
  try {
    const response = await fetch(`${SERIES_API_URL}/api/chats/${chatId}/stop_typing`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SERIES_API_KEY}`
      }
    });

    if (response.ok) {
      console.log('⌨️  Typing indicator stopped');
      return true;
    } else {
      console.log('⚠️  Could not stop typing indicator:', response.status);
      return false;
    }
  } catch (error) {
    console.error('❌ Error stopping typing indicator:', error);
    return false;
  }
}

// Function to mark chat as read
async function markChatAsRead(chatId) {
  try {
    const response = await fetch(`${SERIES_API_URL}/api/chats/${chatId}/mark_as_read`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SERIES_API_KEY}`
      }
    });

    if (response.ok || response.status === 204) {
      console.log('✓ Chat marked as read');
      return true;
    } else {
      console.log('⚠️  Could not mark chat as read:', response.status);
      return false;
    }
  } catch (error) {
    console.error('❌ Error marking chat as read:', error);
    return false;
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
          
          // ONLY process messages from YOUR phone number - ignore everyone else
          if (from_phone !== RECIPIENT_PHONE) {
            console.log(`⏭️  Ignoring message from ${from_phone} (not authorized user ${RECIPIENT_PHONE})`);
            return;
          }
          
          console.log(`\n📥 Message from ${from_phone}:`);
          console.log(`   Text: "${text}"`);
          
          // Mark chat as read immediately when message is received
          if (chat_id) {
            await markChatAsRead(chat_id);
          }
          
          // Start typing indicator to show the agent is processing
          if (chat_id) {
            await startTypingIndicator(chat_id);
          }
          
          // Emit incoming message to UI (only your messages pass the phone filter above)
          io.emit('message', {
            id: Date.now(),
            text: text,
            type: 'user',
            timestamp: new Date().toISOString(),
            from: from_phone
          });
          
          console.log(`   📤 Message emitted to UI`);
          
          // Analyze and emit personality data for visualization
          const algorithmicAnalysis = analyzeCommunicationStyle(text);
          
          // Use GPT to refine the 5 personality measures
          const refinedMetrics = await refinePersonalityMeasures(text, {
            formality: algorithmicAnalysis.metrics.formality,
            enthusiasm: algorithmicAnalysis.metrics.enthusiasm,
            directness: algorithmicAnalysis.metrics.directness,
            analytical: algorithmicAnalysis.metrics.analyticalScore,
            expressiveness: algorithmicAnalysis.metrics.expressiveness
          });
          
          // Update the analysis with refined GPT scores
          algorithmicAnalysis.metrics.formality = refinedMetrics.formality;
          algorithmicAnalysis.metrics.enthusiasm = refinedMetrics.enthusiasm;
          algorithmicAnalysis.metrics.directness = refinedMetrics.directness;
          algorithmicAnalysis.metrics.analyticalScore = refinedMetrics.analytical;
          algorithmicAnalysis.metrics.expressiveness = refinedMetrics.expressiveness;
          
          io.emit('personality_update', {
            metrics: {
              formality: refinedMetrics.formality,
              enthusiasm: refinedMetrics.enthusiasm,
              directness: refinedMetrics.directness,
              analyticalScore: refinedMetrics.analytical,
              expressiveness: refinedMetrics.expressiveness
            },
            style: {
              title: algorithmicAnalysis.styleTitle,
              description: algorithmicAnalysis.communicationStyle
            },
            timestamp: new Date().toISOString()
          });
          
          console.log(`   📊 Personality analysis emitted to UI (GPT-refined)`);
          console.log(`   📊 Refined scores: F:${refinedMetrics.formality} E:${refinedMetrics.enthusiasm} D:${refinedMetrics.directness} A:${refinedMetrics.analytical} Ex:${refinedMetrics.expressiveness}`);
          
          // Parse command
          const { mode, arg, text: messageText } = parseCommand(text);
          
          console.log(`   Mode: ${mode}${arg ? ':' + arg : ''}`);
          console.log(`   Processing: "${messageText}"`);
          
          // Transform the text
          try {
            console.log('✨ Transforming...');
            const result = await transformText(mode, arg, messageText);
            
            console.log(`   Result: "${result}"`);
            
            // Create natural, human-like responses
            const conversationalPrefixes = {
              chat: '💬',
              graph: '📊',
              lang: arg ? `Here's that in ${arg.toUpperCase()} 🌍` : 'Translated 🌍',
              tone: arg ? `Made it ${arg} for you ✨` : 'Tone adjusted ✨',
              simplify: 'Here\'s a simpler way to say that 📚',
              sentiment: 'Here\'s how that reads 💭',
              style: arg ? `Rewritten in ${arg} style 🎭` : 'Styled 🎭',
              pro: 'Professional version 🧑‍💼',
              slang: 'Casual version 😎',
              emotion: 'Emotional insight 💙',
              culture: arg ? `Adapted for ${arg} 🌏` : 'Culturally adapted 🌏',
              vibe: arg ? `In ${arg} style ✨` : 'Rewritten ✨',
              match: 'Communication analysis 🤝'
            };
            
            // Get natural prefix or default
            const naturalPrefix = conversationalPrefixes[mode] || '🔮';
            
            // Format response naturally
            let replyText;
            let uiMessage;
            
            if (mode === 'graph') {
              // Graph mode: Generate and send text-based visualization
              try {
                const graphData = JSON.parse(result);
                const graphText = generatePersonalityGraphText(graphData.data);
                
                // Send text graph via iMessage
                replyText = graphText;
                
                // Also send to UI
                uiMessage = {
                  id: Date.now() + 1,
                  text: graphText,
                  type: 'agent',
                  timestamp: new Date().toISOString(),
                  mode: mode,
                  arg: arg
                };
              } catch (e) {
                console.error('Error generating graph:', e);
                replyText = 'Sorry, I had trouble generating your graph. Try sending another message first!';
                uiMessage = {
                  id: Date.now() + 1,
                  text: replyText,
                  type: 'agent',
                  timestamp: new Date().toISOString(),
                  mode: mode,
                  arg: arg
                };
              }
            } else if (mode === 'chat') {
              // Chat mode: direct, conversational responses without prefix
              replyText = result;
              uiMessage = {
                id: Date.now() + 1,
                text: result,
                type: 'agent',
                timestamp: new Date().toISOString(),
                mode: mode,
                arg: arg
              };
            } else if (mode === 'match') {
              // For match mode, send structured data to UI and simple text to iMessage
              try {
                const matchData = JSON.parse(result);
                
                // Build iMessage text with LinkedIn profiles
                let replyParts = [
                  `Your communication style: ${matchData.communicationStyle}\n`,
                  `You write like: ${matchData.matches}`,
                  `Match score: ${matchData.compatibilityScore}/100 🤝\n`
                ];
                
                // Add top LinkedIn matches
                if (matchData.linkedInMatches && matchData.linkedInMatches.length > 0) {
                  replyParts.push('\n📊 LinkedIn Matches:\n');
                  matchData.linkedInMatches.forEach((profile, idx) => {
                    replyParts.push(
                      `\n${idx + 1}. ${profile.name} (${profile.matchScore}% match)`,
                      `   ${profile.title}`,
                      `   ${profile.location}`,
                      `   💼 ${profile.mutualConnections} mutual connections`
                    );
                  });
                }
                
                replyText = replyParts.join('\n');
                
                // Rich data for UI (will be formatted nicely by MatchCard)
                uiMessage = {
                  id: Date.now() + 1,
                  text: result, // Send JSON string - UI will parse it
                  type: 'agent',
                  timestamp: new Date().toISOString(),
                  mode: mode,
                  arg: arg
                };
              } catch (e) {
                replyText = result;
                uiMessage = {
                  id: Date.now() + 1,
                  text: `${naturalPrefix}\n\n${result}`,
                  type: 'agent',
                  timestamp: new Date().toISOString(),
                  mode: mode,
                  arg: arg
                };
              }
            } else {
              // For other modes, use natural conversational format
              // Add subtle variation to make it feel more human
              const variations = [
                `${naturalPrefix}\n\n${result}`,
                `${naturalPrefix}:\n\n${result}`,
                `${naturalPrefix}\n${result}`
              ];
              
              // Pick variation based on message length (consistent but varied)
              const variation = variations[result.length % variations.length];
              replyText = variation;
              
              uiMessage = {
                id: Date.now() + 1,
                text: variation,
                type: 'agent',
                timestamp: new Date().toISOString(),
                mode: mode,
                arg: arg
              };
            }
            
            // Emit agent response to UI
            io.emit('message', uiMessage);
            
            console.log(`   📤 Agent response emitted to UI`);
            
            // Send result back immediately (no typing delay)
            await sendReply(from_phone, replyText);
            
            // Stop typing indicator after sending reply
            if (chat_id) {
              await stopTypingIndicator(chat_id);
            }
            
            console.log('✅ Message processed successfully');
          } catch (transformError) {
            console.error('❌ Error during transformation:', transformError);
            
            // Stop typing indicator on error
            if (chat_id) {
              await stopTypingIndicator(chat_id);
            }
            
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