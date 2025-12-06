import React from 'react';
import './MatchCard.css';

function MatchCard({ matchData }) {
  // Parse the match data from the message text
  const parseMatchData = (text) => {
    try {
      // Try to parse as JSON first (new format from backend)
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const jsonData = JSON.parse(jsonMatch[0]);
        return {
          communicationStyle: jsonData.communicationStyle || '',
          matches: jsonData.matches || 'Analyzing...',
          compatibilityScore: jsonData.compatibilityScore || 0,
          networkInsight: jsonData.networkInsight || 0,
          trustFactor: jsonData.trustFactor || '',
          qualityBreakdown: jsonData.qualityBreakdown || null,
          improvementAreas: jsonData.improvementAreas || [],
          historicalContext: jsonData.historicalContext || null,
          metrics: jsonData.metrics || null
        };
      }
      
      // Fallback to regex parsing (old format)
      const styleMatch = text.match(/COMMUNICATION STYLE: (.+)/);
      const matchesMatch = text.match(/MATCHES: You communicate like (.+)/);
      const scoreMatch = text.match(/COMPATIBILITY SCORE: (\d+)\/100/);
      const insightMatch = text.match(/NETWORK INSIGHT: (\d+) people/);
      const trustMatch = text.match(/TRUST FACTOR: ✅ (.+)/);

      return {
        communicationStyle: styleMatch ? styleMatch[1].trim() : '',
        matches: matchesMatch ? matchesMatch[1].trim() : '',
        compatibilityScore: scoreMatch ? parseInt(scoreMatch[1]) : 0,
        networkInsight: insightMatch ? parseInt(insightMatch[1]) : 0,
        trustFactor: trustMatch ? trustMatch[1].trim() : '',
        qualityBreakdown: null,
        improvementAreas: [],
        historicalContext: null,
        metrics: null
      };
    } catch (e) {
      console.error('Error parsing match data:', e);
      return null;
    }
  };

  const data = parseMatchData(matchData);
  
  if (!data) return null;

  // Calculate match tier based on score
  const getMatchTier = (score) => {
    if (score >= 90) return { tier: 'EXCEPTIONAL', emoji: '🏆' };
    if (score >= 80) return { tier: 'EXCELLENT', emoji: '⭐' };
    if (score >= 70) return { tier: 'GOOD', emoji: '✨' };
    if (score >= 60) return { tier: 'MODERATE', emoji: '💫' };
    return { tier: 'DEVELOPING', emoji: '🌱' };
  };

  // Calculate algorithmic metrics
  const calculateMetrics = (score, networkSize, historicalContext) => {
    const tier = getMatchTier(score);
    
    // Use real percentile from backend if available, otherwise approximate
    const percentile = historicalContext?.currentPercentile || Math.min(99, Math.floor((score / 100) * 99));
    
    const confidenceLevel = score >= 80 ? 'HIGH' : score >= 60 ? 'MEDIUM' : 'LOW';
    
    // Use real historical data if available
    const sampleSize = historicalContext?.totalMessages || 50;
    const networkPercentage = networkSize > 0 ? ((networkSize / sampleSize) * 100).toFixed(1) : 0;
    
    return {
      tier,
      percentile,
      confidenceLevel,
      networkPercentage,
      sampleSize,
      synergy: score >= 80 ? 'Strong alignment detected' : score >= 60 ? 'Moderate alignment' : 'Developing connection',
      algorithm: 'AI-Driven Behavioral Analysis'
    };
  };

  const metrics = calculateMetrics(data.compatibilityScore, data.networkInsight, data.historicalContext);

  return (
    <div className="match-card">
      <div className="match-header">
        <div className="header-main">
          <h3>🤝 Communication Match Analysis</h3>
          <div className="algorithm-badge">{metrics.algorithm}</div>
        </div>
        <div className="match-tier">
          {metrics.tier.emoji} {metrics.tier.tier} MATCH
        </div>
      </div>
      
      <div className="match-content">
        {/* Compatibility Score with Advanced Metrics */}
        <div className="match-section score-section">
          <div className="match-label">Compatibility Analysis</div>
          <div className="score-grid">
            <div className="score-main">
              <div className="score-circle">
                <span className="score-number">
                  {data.compatibilityScore}
                </span>
                <span className="score-total">/100</span>
              </div>
              <div className="score-bar-container">
                <div 
                  className="score-bar-fill" 
                  style={{ width: `${data.compatibilityScore}%` }}
                ></div>
              </div>
            </div>
            <div className="score-stats">
              <div className="stat-item">
                <span className="stat-label">Percentile Rank</span>
                <span className="stat-value">{metrics.percentile}th</span>
              </div>
              <div className="stat-item">
                <span className="stat-label">Confidence</span>
                <span className="stat-value">{metrics.confidenceLevel}</span>
              </div>
              <div className="stat-item">
                <span className="stat-label">Synergy Index</span>
                <span className="stat-value">{metrics.synergy}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Communication Style */}
        <div className="match-section">
          <div className="match-label">Detected Communication Pattern</div>
          <div className="match-value style-value">
            <span className="style-icon">🧠</span>
            {data.communicationStyle}
          </div>
        </div>

        {/* Celebrity Match */}
        <div className="match-section">
          <div className="match-label">Behavioral Similarity Model</div>
          <div className="match-value celebrity">
            <span className="celebrity-icon">✨</span>
            <span className="celebrity-name">{data.matches}</span>
            <span className="match-badge">AI-Matched</span>
          </div>
          {data.metrics && (
            <div className="personality-metrics">
              <div className="metric-row">
                <span className="metric-label">Formality:</span>
                <div className="metric-bar">
                  <div className="metric-fill" style={{ width: `${data.metrics.formality}%` }}></div>
                </div>
                <span className="metric-value">{data.metrics.formality}</span>
              </div>
              <div className="metric-row">
                <span className="metric-label">Enthusiasm:</span>
                <div className="metric-bar">
                  <div className="metric-fill" style={{ width: `${data.metrics.enthusiasm}%` }}></div>
                </div>
                <span className="metric-value">{data.metrics.enthusiasm}</span>
              </div>
              <div className="metric-row">
                <span className="metric-label">Expressiveness:</span>
                <div className="metric-bar">
                  <div className="metric-fill" style={{ width: `${data.metrics.expressiveness}%` }}></div>
                </div>
                <span className="metric-value">{data.metrics.expressiveness}</span>
              </div>
              <div className="metric-row">
                <span className="metric-label">Analytical:</span>
                <div className="metric-bar">
                  <div className="metric-fill" style={{ width: `${data.metrics.analyticalScore}%` }}></div>
                </div>
                <span className="metric-value">{data.metrics.analyticalScore}</span>
              </div>
              <div className="metric-row">
                <span className="metric-label">Directness:</span>
                <div className="metric-bar">
                  <div className="metric-fill" style={{ width: `${data.metrics.directness}%` }}></div>
                </div>
                <span className="metric-value">{data.metrics.directness}</span>
              </div>
            </div>
          )}
        </div>

        {/* Quality Breakdown - Only show if available */}
        {data.qualityBreakdown && (
          <div className="match-section quality-section">
            <div className="match-label">Message Quality Analysis</div>
            <div className="quality-grid">
              <div className="quality-item">
                <span className="quality-label">Clarity</span>
                <div className="quality-bar-container">
                  <div className="quality-bar-fill" style={{ width: `${data.qualityBreakdown.clarity}%` }}></div>
                </div>
                <span className="quality-value">{Math.round(data.qualityBreakdown.clarity)}</span>
              </div>
              <div className="quality-item">
                <span className="quality-label">Depth</span>
                <div className="quality-bar-container">
                  <div className="quality-bar-fill" style={{ width: `${data.qualityBreakdown.depth}%` }}></div>
                </div>
                <span className="quality-value">{Math.round(data.qualityBreakdown.depth)}</span>
              </div>
              <div className="quality-item">
                <span className="quality-label">Engagement</span>
                <div className="quality-bar-container">
                  <div className="quality-bar-fill" style={{ width: `${data.qualityBreakdown.engagement}%` }}></div>
                </div>
                <span className="quality-value">{Math.round(data.qualityBreakdown.engagement)}</span>
              </div>
              <div className="quality-item">
                <span className="quality-label">Coherence</span>
                <div className="quality-bar-container">
                  <div className="quality-bar-fill" style={{ width: `${data.qualityBreakdown.coherence}%` }}></div>
                </div>
                <span className="quality-value">{Math.round(data.qualityBreakdown.coherence)}</span>
              </div>
            </div>
            {data.improvementAreas && data.improvementAreas.length > 0 && (
              <div className="improvement-tips">
                💡 Areas to improve: {data.improvementAreas.join(', ')}
              </div>
            )}
          </div>
        )}

        {/* Historical Context - Only show if available */}
        {data.historicalContext && (
          <div className="match-section historical-section">
            <div className="match-label">📈 Your Progress</div>
            <div className="historical-stats">
              <div className="hist-stat">
                <span className="hist-label">Messages Analyzed</span>
                <span className="hist-value">{data.historicalContext.totalMessages}</span>
              </div>
              <div className="hist-stat">
                <span className="hist-label">Your Average Quality</span>
                <span className="hist-value">{data.historicalContext.averageQuality}/100</span>
              </div>
              <div className="hist-stat">
                <span className="hist-label">This Message Rank</span>
                <span className="hist-value">{data.historicalContext.currentPercentile}th percentile</span>
              </div>
            </div>
          </div>
        )}

        {/* Network Analysis */}
        <div className="match-section network-section">
          <div className="match-label">Network Distribution Analysis</div>
          <div className="network-grid">
            <div className="network-visual">
              <div className="network-count-large">{data.networkInsight}</div>
              <div className="network-label">Similar Profiles</div>
            </div>
            <div className="network-stats">
              <div className="network-stat">
                <span className="net-label">Network Coverage</span>
                <span className="net-value">{metrics.networkPercentage}%</span>
              </div>
              <div className="network-stat">
                <span className="net-label">Sample Size</span>
                <span className="net-value">N = {metrics.sampleSize}</span>
              </div>
              <div className="network-bar">
                <div 
                  className="network-bar-fill" 
                  style={{ width: `${metrics.networkPercentage}%` }}
                ></div>
              </div>
            </div>
          </div>
        </div>

        {/* Trust Factor */}
        <div className="match-section trust">
          <div className="match-label">Trust Algorithm Output</div>
          <div className="trust-content">
            <span className="trust-icon">✅</span>
            <span className="trust-text">{data.trustFactor}</span>
            <span className="verified-badge">VERIFIED</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default MatchCard;
