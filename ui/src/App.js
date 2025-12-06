import React, { useState, useEffect, useRef } from 'react';
import './App.css';
import PersonalityGraph from './PersonalityGraph.js';
import MatchCard from './MatchCard.js';
import io from 'socket.io-client';

const socket = io('http://localhost:4000');

function App() {
  const [messages, setMessages] = useState([]);
  const [personality, setPersonality] = useState(null);
  const [matchResult, setMatchResult] = useState(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [connected, setConnected] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterMode, setFilterMode] = useState('all');
  const [darkMode, setDarkMode] = useState(() => {
    const saved = localStorage.getItem('darkMode');
    return saved !== null ? JSON.parse(saved) : true;
  });
  const messagesEndRef = useRef(null);

  // Toggle dark mode
  useEffect(() => {
    localStorage.setItem('darkMode', JSON.stringify(darkMode));
    document.body.className = darkMode ? 'dark-mode' : 'light-mode';
  }, [darkMode]);

  // Load messages from localStorage on mount
  useEffect(() => {
    const savedMessages = localStorage.getItem('messageHistory');
    if (savedMessages) {
      try {
        const parsed = JSON.parse(savedMessages);
        setMessages(parsed.map(msg => ({
          ...msg,
          timestamp: new Date(msg.timestamp)
        })));
      } catch (e) {
        console.error('Error loading message history:', e);
      }
    }
  }, []);

  // Save messages to localStorage whenever they change
  useEffect(() => {
    if (messages.length > 0) {
      localStorage.setItem('messageHistory', JSON.stringify(messages));
    } else {
      localStorage.removeItem('messageHistory');
    }
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    // Socket.IO event listeners
    socket.on('connect', () => {
      console.log('✅ Connected to consumer server');
      setConnected(true);
    });

    socket.on('disconnect', () => {
      console.log('❌ Disconnected from consumer server');
      setConnected(false);
    });

    socket.on('connect_error', (error) => {
      console.error('❌ Connection error:', error);
    });

    socket.on('message', (msg) => {
      console.log('📨 Received message:', msg);
      setMessages(prev => {
        const updated = [...prev, {
          ...msg,
          timestamp: new Date(msg.timestamp)
        }];
        analyzePersonality(updated);
        
        // Check if this is a match result
        if (msg.mode === 'match' && msg.type === 'agent') {
          setMatchResult(msg.text);
        }
        
        return updated;
      });
    });

    socket.on('personality_update', (data) => {
      console.log('📊 Received personality update:', data);
      
      // Map backend metrics to Big Five traits for visualization
      const traits = {
        openness: Math.min(100, Math.max(0, Math.round(50 + (data.metrics.analyticalScore - 50) * 0.5 + (data.metrics.expressiveness - 50) * 0.3))),
        conscientiousness: Math.min(100, Math.max(0, Math.round(data.metrics.formality * 0.8 + 20))),
        extraversion: Math.min(100, Math.max(0, Math.round(data.metrics.enthusiasm * 0.7 + data.metrics.expressiveness * 0.3))),
        agreeableness: Math.min(100, Math.max(0, Math.round(60 + (data.metrics.expressiveness - 50) * 0.4))),
        neuroticism: Math.min(100, Math.max(0, Math.round(50 - (data.metrics.formality - 50) * 0.3)))
      };
      
      const personality = {
        type: data.style.title || 'Analyzing...',
        traits: traits
      };
      
      setPersonality(personality);
      setIsAnalyzing(false);
      console.log('✨ Personality visualization updated:', personality);
    });

    return () => {
      socket.off('connect');
      socket.off('disconnect');
      socket.off('connect_error');
      socket.off('message');
      socket.off('personality_update');
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const analyzePersonality = async (allMessages) => {
    if (allMessages.length < 1) return;

    setIsAnalyzing(true);
    
    // Get all user messages
    const userMessages = allMessages.filter(m => m.type === 'user').map(m => m.text);
    
    // Calculate traits based on actual linguistic patterns (aligned with match algorithm)
    const calculateTraits = (messages) => {
      if (messages.length === 0) return { openness: 50, conscientiousness: 50, extraversion: 50, agreeableness: 50, neuroticism: 50 };
      
      const allText = messages.join(' ');
      const wordCount = allText.split(/\s+/).filter(w => w.length > 0).length;
      const sentences = allText.split(/[.!?]+/).filter(s => s.trim().length > 0);
      
      // Linguistic analysis (matching backend algorithm) - using RATIOS not totals
      const avgWordLength = allText.split(/\s+/).reduce((sum, word) => sum + word.length, 0) / wordCount;
      const avgSentenceLength = wordCount / Math.max(1, sentences.length);
      const questionCount = (allText.match(/\?/g) || []).length;
      const exclamationCount = (allText.match(/!/g) || []).length;
      const capitalWords = (allText.match(/\b[A-Z]{2,}\b/g) || []).length;
      const emojis = (allText.match(/[\u{1F300}-\u{1F9FF}]/gu) || []).length;
      
      // Convert to per-message averages to prevent unbounded growth
      const avgQuestionsPerMsg = questionCount / messages.length;
      const avgExclamationsPerMsg = exclamationCount / messages.length;
      const avgEmojisPerMsg = emojis / messages.length;
      const avgWordsPerMsg = wordCount / messages.length;
      const avgCapitalsPerMsg = capitalWords / messages.length;
      
      // Command usage patterns
      const commandVariety = new Set(allMessages.filter(m => m.mode).map(m => m.mode)).size;
      const emotionCount = allMessages.filter(m => m.mode === 'emotion').length;
      const cultureCount = allMessages.filter(m => m.mode === 'culture').length;
      const professionalCount = allMessages.filter(m => m.mode === 'pro' || m.mode === 'tone').length;
      const langCount = allMessages.filter(m => m.mode === 'lang').length;
      
      // Calculate formality (from backend algorithm)
      const formality = Math.min(100, Math.max(0, 
        50 + (avgWordLength - 4) * 15 - avgEmojisPerMsg * 10 - avgExclamationsPerMsg * 5
      ));
      
      // Calculate enthusiasm (from backend algorithm)
      const enthusiasm = Math.min(100, Math.max(0,
        30 + Math.min(20, avgExclamationsPerMsg * 20) + Math.min(30, avgEmojisPerMsg * 10)
      ));
      
      // Calculate expressiveness (from backend algorithm)
      const expressiveness = Math.min(100, Math.max(0,
        20 + Math.min(45, avgEmojisPerMsg * 15) + Math.min(30, avgExclamationsPerMsg * 10)
      ));
      
      // Map backend metrics to Big Five traits for consistency
      // OPENNESS - Curiosity, creativity, openness to experience
      // Capped to prevent unbounded growth
      const openness = Math.min(100, Math.max(20,
        30 + Math.min(36, commandVariety * 12) + Math.min(24, avgQuestionsPerMsg * 8) + 
        Math.min(20, langCount / messages.length * 100) + (avgWordLength - 4) * 8
      ));
      
      // CONSCIENTIOUSNESS - Organization, reliability, professionalism
      const conscientiousness = Math.min(100, Math.max(20,
        formality * 0.6 + Math.min(30, professionalCount / messages.length * 150) + (avgSentenceLength * 2)
      ));
      
      // EXTRAVERSION - Energy, enthusiasm, sociability
      // Message count capped to prevent unbounded growth
      const extraversion = Math.min(100, Math.max(20,
        enthusiasm * 0.7 + Math.min(20, Math.log(messages.length + 1) * 8) + Math.min(15, avgWordsPerMsg * 0.5)
      ));
      
      // AGREEABLENESS - Cooperation, empathy, warmth
      const agreeableness = Math.min(100, Math.max(20,
        50 + Math.min(30, cultureCount / messages.length * 150) + 
        Math.min(20, emotionCount / messages.length * 100) + 
        (expressiveness * 0.3) - (avgCapitalsPerMsg * 5)
      ));
      
      // EMOTIONAL STABILITY (inverse of Neuroticism)
      const emotionalStability = Math.min(100, Math.max(20,
        60 + Math.min(24, emotionCount / messages.length * 120) - 
        Math.min(15, avgExclamationsPerMsg * 3) - (avgCapitalsPerMsg * 4) +
        (formality > 50 ? 10 : -5)
      ));
      const neuroticism = 100 - emotionalStability;
      
      return {
        openness: Math.round(openness),
        conscientiousness: Math.round(conscientiousness),
        extraversion: Math.round(extraversion),
        agreeableness: Math.round(agreeableness),
        neuroticism: Math.round(neuroticism)
      };
    };
    
    setTimeout(() => {
      const traits = calculateTraits(userMessages);
      const personality = {
        type: detectPersonalityType(userMessages, traits),
        traits: traits
      };
      setPersonality(personality);
      setIsAnalyzing(false);
    }, 500);
  };

  const exportPersonalityData = (format = 'json') => {
    const exportData = {
      timestamp: new Date().toISOString(),
      totalMessages: messages.length,
      userMessages: messages.filter(m => m.type === 'user').length,
      agentMessages: messages.filter(m => m.type === 'agent').length,
      personality: personality ? {
        type: personality.type,
        traits: {
          openness: Math.round(personality.traits.openness),
          conscientiousness: Math.round(personality.traits.conscientiousness),
          extraversion: Math.round(personality.traits.extraversion),
          agreeableness: Math.round(personality.traits.agreeableness),
          emotionalStability: Math.round(100 - personality.traits.neuroticism)
        }
      } : null,
      messages: messages.map(msg => ({
        text: msg.text,
        type: msg.type,
        timestamp: msg.timestamp,
        mode: msg.mode,
        arg: msg.arg
      }))
    };
    
    if (format === 'json') {
      // Download as JSON
      const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `personality-analysis-${Date.now()}.json`;
      link.click();
      URL.revokeObjectURL(url);
    } else if (format === 'toml') {
      // Convert to TOML format
      const tomlContent = `timestamp = "${exportData.timestamp}"
total_messages = ${exportData.totalMessages}
user_messages = ${exportData.userMessages}
agent_messages = ${exportData.agentMessages}

[personality]
type = "${exportData.personality?.type || 'Unknown'}"

[personality.traits]
openness = ${exportData.personality?.traits.openness || 0}
conscientiousness = ${exportData.personality?.traits.conscientiousness || 0}
extraversion = ${exportData.personality?.traits.extraversion || 0}
agreeableness = ${exportData.personality?.traits.agreeableness || 0}
emotional_stability = ${exportData.personality?.traits.emotionalStability || 0}

${exportData.messages.map((msg, i) => `
[[messages]]
text = """${msg.text.replace(/"""/g, '\\"""')}"""
type = "${msg.type}"
timestamp = "${msg.timestamp}"
mode = "${msg.mode || ''}"
arg = "${msg.arg || ''}"`).join('\n')}`;

      const blob = new Blob([tomlContent], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `personality-analysis-${Date.now()}.toml`;
      link.click();
      URL.revokeObjectURL(url);
    }
    
    console.log('📊 Personality data exported as', format.toUpperCase());
  };

  const clearHistory = () => {
    const count = messages.length;
    if (window.confirm(`Clear all ${count} messages and personality analysis? This cannot be undone.`)) {
      setMessages([]);
      setPersonality(null);
      localStorage.removeItem('messageHistory');
      console.log('🗑️ Chat history cleared');
    }
  };

  const filteredMessages = messages.filter(msg => {
    const matchesSearch = msg.text.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFilter = filterMode === 'all' || 
                         (filterMode === 'user' && msg.type === 'user') ||
                         (filterMode === 'agent' && msg.type === 'agent') ||
                         (msg.mode && msg.mode === filterMode);
    return matchesSearch && matchesFilter;
  });

  const getAnalytics = () => {
    const userMsgs = messages.filter(m => m.type === 'user');
    const agentMsgs = messages.filter(m => m.type === 'agent');
    
    const commandCounts = {};
    messages.forEach(m => {
      if (m.mode) {
        commandCounts[m.mode] = (commandCounts[m.mode] || 0) + 1;
      }
    });

    return {
      totalMessages: messages.length,
      userMessages: userMsgs.length,
      agentMessages: agentMsgs.length,
      commandCounts,
      averageMessageLength: userMsgs.length > 0 
        ? Math.round(userMsgs.reduce((sum, m) => sum + m.text.length, 0) / userMsgs.length)
        : 0
    };
  };

  const detectPersonalityType = (messages, traits) => {
    if (!traits) {
      return 'Analyzing...';
    }
    
    // Use Big Five traits to determine personality archetype
    const { openness, conscientiousness, extraversion, agreeableness, neuroticism } = traits;
    const emotionalStability = 100 - neuroticism;
    
    // Match to personality archetypes based on trait combinations
    if (openness >= 70 && extraversion >= 60) {
      return 'The Innovative Explorer';
    } else if (conscientiousness >= 75 && emotionalStability >= 65) {
      return 'The Reliable Strategist';
    } else if (extraversion >= 75 && agreeableness >= 70) {
      return 'The Charismatic Connector';
    } else if (agreeableness >= 75 && emotionalStability >= 70) {
      return 'The Empathetic Diplomat';
    } else if (openness >= 70 && conscientiousness >= 70) {
      return 'The Analytical Visionary';
    } else if (extraversion >= 70) {
      return 'The Energetic Communicator';
    } else if (conscientiousness >= 70) {
      return 'The Disciplined Professional';
    } else if (openness >= 70) {
      return 'The Creative Thinker';
    } else if (agreeableness >= 70) {
      return 'The Collaborative Partner';
    } else if (emotionalStability >= 70) {
      return 'The Calm Mediator';
    } else {
      return 'The Balanced Adapter';
    }
  };

  return (
    <div className="App">
      <div className="app-header">
        <div className={`connection-status ${connected ? 'connected' : 'disconnected'}`}>
          {connected ? '● Connected' : '○ Disconnected'}
        </div>
        
        <button 
          onClick={() => setDarkMode(!darkMode)} 
          className="theme-toggle"
          title={darkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
        >
          {darkMode ? '☀️' : '🌙'}
        </button>
      </div>
      
      <div className="container-grid">
        {/* Left Side - Messages */}
        <div className="phone-section">
          <div className="messages-list">
            <div className="messages-header">
              <h3>Live Messages</h3>
              <button onClick={clearHistory} className="clear-btn" title="Clear all messages">
                🗑️ Clear
              </button>
            </div>

            {/* Search and Filter */}
            <div className="search-filter-section">
              <input
                type="text"
                placeholder="🔍 Search messages..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="search-input"
              />
              <select 
                value={filterMode} 
                onChange={(e) => setFilterMode(e.target.value)}
                className="filter-select"
              >
                <option value="all">All Messages</option>
                <option value="user">User Only</option>
                <option value="agent">Agent Only</option>
                <option value="lang">🌍 Translations</option>
                <option value="emotion">💙 Emotional</option>
                <option value="culture">🌏 Cultural</option>
                <option value="tone">✨ Tone</option>
                <option value="vibe">✨ Vibe</option>
              </select>
            </div>

            <div className="instructions">
              <p><strong>📱 Send messages to +16463458837 from your phone</strong></p>
              <div className="command-examples">
                <p><code>lang:es</code> 🌍 Translate to Spanish (or any language)</p>
                <p><code>tone:polite</code> ✨ Rewrite in polite tone</p>
                <p><code>simplify:</code> 📚 Simplify for easy reading</p>
                <p><code>sentiment:</code> 💭 Analyze sentiment/mood</p>
                <p><code>style:genz</code> 🎭 Rewrite in Gen-Z style</p>
                <p><code>pro:</code> 🧑‍💼 Make it professional</p>
                <p><code>slang:</code> 😎 Make it casual/slang</p>
                <p><code>emotion:</code> 💙 Emotional intelligence analysis</p>
                <p><code>culture:japan</code> 🌏 Cultural adaptation</p>
                <p><code>vibe:mentor</code> ✨ Rewrite in specific personality</p>
                <p style={{ marginTop: '0.5rem', fontStyle: 'italic' }}>Or just send any text (defaults to simplify mode)</p>
              </div>
            </div>

            {/* Analytics Summary */}
            {messages.length > 0 && (
              <div className="analytics-summary">
                <h4>📊 Quick Stats</h4>
                <div className="stats-grid">
                  <div className="stat-item">
                    <span className="stat-value">{getAnalytics().totalMessages}</span>
                    <span className="stat-label">Total Messages</span>
                  </div>
                  <div className="stat-item">
                    <span className="stat-value">{getAnalytics().userMessages}</span>
                    <span className="stat-label">Your Messages</span>
                  </div>
                  <div className="stat-item">
                    <span className="stat-value">{getAnalytics().averageMessageLength}</span>
                    <span className="stat-label">Avg Length</span>
                  </div>
                  <div className="stat-item">
                    <span className="stat-value">{Object.keys(getAnalytics().commandCounts).length}</span>
                    <span className="stat-label">Commands Used</span>
                  </div>
                </div>
              </div>
            )}

            {filteredMessages.length === 0 && messages.length === 0 && (
              <p className="empty-message">Waiting for messages...</p>
            )}
            {filteredMessages.length === 0 && messages.length > 0 && (
              <p className="empty-message">No messages match your search/filter</p>
            )}
            {filteredMessages.map((msg) => (
              <div key={msg.id} className={`message-item ${msg.type}`}>
                <div className="message-text">{msg.text}</div>
                <div className="message-time">
                  {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>
        </div>

        {/* Right Side - Personality Graph */}
        <div className="graph-section">
          <div className="personality-panel">
            <h2>Your Communication Profile</h2>
            
            {messages.length > 0 && (
              <div className="export-buttons">
                <button onClick={() => exportPersonalityData('json')} className="export-btn">
                  📄 Download JSON
                </button>
                <button onClick={() => exportPersonalityData('toml')} className="export-btn">
                  📝 Download TOML
                </button>
              </div>
            )}
            
            {/* Match Result Card */}
            {matchResult && (
              <MatchCard matchData={matchResult} />
            )}
            
            {isAnalyzing && (
              <div className="analyzing">
                <div className="spinner"></div>
                <p>Analyzing your messaging style...</p>
              </div>
            )}
            {personality && !isAnalyzing && (
              <>
                <div className="personality-type">
                  <h3>{personality.type}</h3>
                </div>
                <div className="graph-container">
                  <PersonalityGraph traits={personality.traits} />
                </div>
                <div className="traits-list">
                  <div className="trait">
                    <span style={{ color: '#ff6b6b', fontWeight: 'bold' }}>🔴 Openness</span>
                    <div className="trait-bar">
                      <div className="trait-fill" style={{ width: `${personality.traits.openness}%`, backgroundColor: '#ff6b6b' }}></div>
                    </div>
                    <span>{Math.round(personality.traits.openness)}%</span>
                  </div>
                  <div className="trait">
                    <span style={{ color: '#4ecdc4', fontWeight: 'bold' }}>🔵 Conscientiousness</span>
                    <div className="trait-bar">
                      <div className="trait-fill" style={{ width: `${personality.traits.conscientiousness}%`, backgroundColor: '#4ecdc4' }}></div>
                    </div>
                    <span>{Math.round(personality.traits.conscientiousness)}%</span>
                  </div>
                  <div className="trait">
                    <span style={{ color: '#45b7d1', fontWeight: 'bold' }}>💙 Extraversion</span>
                    <div className="trait-bar">
                      <div className="trait-fill" style={{ width: `${personality.traits.extraversion}%`, backgroundColor: '#45b7d1' }}></div>
                    </div>
                    <span>{Math.round(personality.traits.extraversion)}%</span>
                  </div>
                  <div className="trait">
                    <span style={{ color: '#96ceb4', fontWeight: 'bold' }}>💚 Agreeableness</span>
                    <div className="trait-bar">
                      <div className="trait-fill" style={{ width: `${personality.traits.agreeableness}%`, backgroundColor: '#96ceb4' }}></div>
                    </div>
                    <span>{Math.round(personality.traits.agreeableness)}%</span>
                  </div>
                  <div className="trait">
                    <span style={{ color: '#ffeaa7', fontWeight: 'bold' }}>💛 Emotional Stability</span>
                    <div className="trait-bar">
                      <div className="trait-fill" style={{ width: `${100 - personality.traits.neuroticism}%`, backgroundColor: '#ffeaa7' }}></div>
                    </div>
                    <span>{Math.round(100 - personality.traits.neuroticism)}%</span>
                  </div>
                </div>

                {/* Command Usage Chart */}
                {Object.keys(getAnalytics().commandCounts).length > 0 && (
                  <div className="command-usage">
                    <h4>Command Usage</h4>
                    <div className="command-bars">
                      {Object.entries(getAnalytics().commandCounts)
                        .sort((a, b) => b[1] - a[1])
                        .map(([cmd, count]) => {
                          const modeEmojis = {
                            lang: '🌍', tone: '✨', simplify: '📚', sentiment: '💭',
                            style: '🎭', pro: '🧑‍💼', slang: '😎', emotion: '💙',
                            culture: '🌏', vibe: '✨'
                          };
                          const maxCount = Math.max(...Object.values(getAnalytics().commandCounts));
                          const percentage = (count / maxCount) * 100;
                          return (
                            <div key={cmd} className="command-bar-item">
                              <span className="command-name">{modeEmojis[cmd]} {cmd}</span>
                              <div className="command-bar-track">
                                <div 
                                  className="command-bar-fill" 
                                  style={{ width: `${percentage}%` }}
                                ></div>
                              </div>
                              <span className="command-count">{count}</span>
                            </div>
                          );
                        })}
                    </div>
                  </div>
                )}
              </>
            )}
            {!personality && !isAnalyzing && (
              <div className="empty-state">
                <p>📊 Send a few messages to see your personality analysis</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
