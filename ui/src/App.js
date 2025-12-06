import React, { useState, useEffect, useRef } from 'react';
import './App.css';
import PersonalityGraph from './PersonalityGraph.js';
import io from 'socket.io-client';

const socket = io('http://localhost:4000');

function App() {
  const [messages, setMessages] = useState([]);
  const [personality, setPersonality] = useState(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [connected, setConnected] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterMode, setFilterMode] = useState('all');
  const messagesEndRef = useRef(null);

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
        return updated;
      });
    });

    return () => {
      socket.off('connect');
      socket.off('disconnect');
      socket.off('connect_error');
      socket.off('message');
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
    
    // Calculate traits based on message content
    const calculateTraits = (messages) => {
      const allText = messages.join(' ').toLowerCase();
      const wordCount = allText.split(/\s+/).length;
      
      // Openness - variety of commands used, creative language
      const commandVariety = new Set(allMessages.filter(m => m.mode).map(m => m.mode)).size;
      const openness = Math.min(100, (commandVariety * 20) + (wordCount * 2));
      
      // Conscientiousness - use of professional/formal modes
      const professionalCount = allMessages.filter(m => m.mode === 'pro' || m.mode === 'tone').length;
      const conscientiousness = Math.min(100, (professionalCount * 25) + 30 + Math.random() * 20);
      
      // Extraversion - message length and frequency
      const avgLength = wordCount / messages.length;
      const extraversion = Math.min(100, (avgLength * 10) + (messages.length * 5));
      
      // Agreeableness - use of polite/culture modes
      const politeCount = allMessages.filter(m => 
        m.mode === 'culture' || (m.mode === 'tone' && m.arg === 'polite')
      ).length;
      const agreeableness = Math.min(100, (politeCount * 30) + 40 + Math.random() * 20);
      
      // Neuroticism (inverted for emotional stability) - use of emotion mode
      const emotionCount = allMessages.filter(m => m.mode === 'emotion').length;
      const neuroticism = Math.max(0, 50 - (emotionCount * 15) + Math.random() * 30);
      
      return {
        openness: Math.max(20, openness),
        conscientiousness: Math.max(20, conscientiousness),
        extraversion: Math.max(20, extraversion),
        agreeableness: Math.max(20, agreeableness),
        neuroticism: Math.max(20, neuroticism)
      };
    };
    
    setTimeout(() => {
      const personality = {
        type: detectPersonalityType(userMessages),
        traits: calculateTraits(userMessages)
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

  const detectPersonalityType = (messages) => {
    const text = messages.join(' ').toLowerCase();
    
    if (text.includes('emotion') || text.includes('feel')) {
      return 'Empathetic Communicator';
    } else if (text.includes('culture') || text.includes('polite')) {
      return 'Cultural Navigator';
    } else if (text.includes('slang') || text.includes('genz')) {
      return 'Casual & Creative';
    } else if (text.includes('pro') || text.includes('professional')) {
      return 'Professional & Precise';
    } else {
      return 'Balanced Explorer';
    }
  };

  return (
    <div className="App">
      <div className={`connection-status ${connected ? 'connected' : 'disconnected'}`}>
        {connected ? '● Connected' : '○ Disconnected'}
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
                    <span>Openness</span>
                    <div className="trait-bar">
                      <div className="trait-fill" style={{ width: `${personality.traits.openness}%` }}></div>
                    </div>
                    <span>{Math.round(personality.traits.openness)}%</span>
                  </div>
                  <div className="trait">
                    <span>Conscientiousness</span>
                    <div className="trait-bar">
                      <div className="trait-fill" style={{ width: `${personality.traits.conscientiousness}%` }}></div>
                    </div>
                    <span>{Math.round(personality.traits.conscientiousness)}%</span>
                  </div>
                  <div className="trait">
                    <span>Extraversion</span>
                    <div className="trait-bar">
                      <div className="trait-fill" style={{ width: `${personality.traits.extraversion}%` }}></div>
                    </div>
                    <span>{Math.round(personality.traits.extraversion)}%</span>
                  </div>
                  <div className="trait">
                    <span>Agreeableness</span>
                    <div className="trait-bar">
                      <div className="trait-fill" style={{ width: `${personality.traits.agreeableness}%` }}></div>
                    </div>
                    <span>{Math.round(personality.traits.agreeableness)}%</span>
                  </div>
                  <div className="trait">
                    <span>Emotional Stability</span>
                    <div className="trait-bar">
                      <div className="trait-fill" style={{ width: `${100 - personality.traits.neuroticism}%` }}></div>
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
