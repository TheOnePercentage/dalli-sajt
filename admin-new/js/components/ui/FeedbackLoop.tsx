/**
 * DALLI Feedback Loop - Main Component
 * Integrates NPS surveys, review analysis, feature requests, and churn analytics
 */

import React, { useState, useEffect } from 'react';
import { useTheme } from '../../context/ThemeContext';
import { NPSSurvey } from './NPSSurvey';
import { ReviewAnalytics } from './ReviewAnalytics';
import { FeatureRequestForm, FeatureRequestList } from './FeatureRequests';
import { ChurnAnalytics } from './ChurnAnalytics';

interface FeedbackLoopProps {
  userId?: string;
  userName?: string;
  userEmail?: string;
  userTier?: string;
  onFeedbackSubmit?: (feedback: any) => Promise<void>;
}

export const FeedbackLoop = ({ 
  userId, 
  userName, 
  userEmail, 
  userTier,
  onFeedbackSubmit 
}: FeedbackLoopProps) => {
  const { colors } = useTheme();
  const [activeTab, setActiveTab] = useState<'nps' | 'reviews' | 'features' | 'churn'>('nps');
  const [showNPSSurvey, setShowNPSSurvey] = useState(false);
  const [showFeatureForm, setShowFeatureForm] = useState(false);
  const [activeFeedbackTab, setActiveFeedbackTab] = useState<'nps' | 'reviews' | 'features' | 'churn'>('overview');

  const tabs = [
    { id: 'overview', label: 'Pregled', icon: '📊' },
    { id: 'nps', label: 'NPS', icon: '⭐' },
    { id: 'reviews', label: 'Recenzije', icon: '⭐' },
    { id: 'features', label: 'Predlozi', icon: '💡' },
    { id: 'churn', label: 'Otpadanje', icon: '📉' },
  ];

  const handleFeedbackSubmit = async (feedback: any) => {
    // In production, send to API
    console.log('Feedback submitted:', feedback);
  };

  return (
    <div className="feedback-loop">
      <div className="feedback-header">
        <div className="feedback-header-content">
          <div>
            <h1>Centar Povratnih Informacija</h1>
            <p className="feedback-subtitle">Prati NPS, recenzije, predloge i otpadanje kupaca</p>
          </div>
          <div className="feedback-header-actions">
            <span className="feedback-stats">
              <span className="stat-badge">
                <span className="stat-value">4.7</span>
                <span className="stat-label">NPS</span>
              </span>
              <span className="stat-badge">
                <span className="stat-value">4.8</span>
                <span className="stat-label">Ocena</span>
              </span>
              <span className="stat-badge">
                <span className="stat-value">94%</span>
                <span className="stat-label">Zadovoljstvo</span>
              </span>
            </span>
          </div>

          <div className="feedback-tabs" role="tablist">
            {[
              { id: 'overview', label: 'Pregled', icon: '📊' },
              { id: 'nps', label: 'NPS', icon: '⭐' },
              { id: 'reviews', label: 'Recenzije', icon: '⭐' },
              { id: 'features', label: 'Predlozi', icon: '💡' },
              { id: 'churn', label: 'Otpadanje', icon: '📉' }
            ].map(tab => (
              <button
                key={tab.id}
                role="tab"
                aria-selected={activeFeedbackTab === tab.id}
                onClick={() => setActiveFeedbackTab(tab.id as any)}
                className={`feedback-tab ${activeFeedbackTab === tab.id ? 'active' : ''}`}
                style={{ borderColor: activeFeedbackTab === tab.id ? 'var(--color-primary)' : 'transparent' }}
              >
                <span className="tab-icon">{tab.icon}</span>
                <span className="tab-label">{tab.label}</span>
              </button>
            ))}
          </div>
        </div>

        {activeFeedbackTab === 'overview' && (
          <div className="feedback-overview">
            <div className="metrics-grid">
              <div className="overview-metric nps">
                <div className="overview-metric-value">72</div>
                <div className="overview-metric-label">NPS Score</div>
                <div className="metric-trend positive">+8 od prošlog meseca</div>
              </div>
              <div className="overview-metric reviews">
                <div className="overview-metric-value">4.8</div>
                <div className="overview-metric-label">Prosečna Ocena</div>
                <div className="metric-trend positive">+0.3</div>
              </div>
              <div className="overview-metric features">
                <div className="overview-metric-value">23</div>
                <div className="overview-metric-label">Aktivnih Predloga</div>
                <div className="metric-trend neutral">+3 nove ove nedelje</div>
              </div>
              <div className="overview-metric churn">
                <div className="overview-metric-value">3.2%</div>
                <div className="overview-metric-label">Stopa Otpadanja</div>
                <div className="metric-trend negative">+0.3% vs prethodni mesec</div>
              </div>
            </div>

            <div className="quick-actions">
              <button className="btn btn-primary" onClick={() => setActiveFeedbackTab('nps')}>
                <span>⭐</span> Pokreni NPS Anketu
              </button>
              <button className="btn btn-secondary" onClick={() => setActiveFeedbackTab('features')}>
                <span>💡</span> Pregledaj Predloge
              </button>
              <button className="btn btn-outline" onClick={() => {}}>
                <span>📥 Izvezi Izvještaj</span>
              </button>
            </div>

<div className="quick-stats">
              <div className="stat-card nps">
                <div className="stat-icon">⭐</div>
                <div className="stat-content">
                  <div className="stat-value">72</div>
                  <div className="stat-label">NPS Score</div>
                  <div className="stat-trend positive">+8 od prošlog meseca</div>
                </div>
              </div>
              <div className="stat-card reviews">
                <div className="stat-value">4.8</div>
                <div className="stat-label">Prosečna Ocena</div>
                <div className="stat-trend positive">+0.3</div>
              </div>
              <div className="stat-card features">
                <div className="stat-value">23</div>
                <div className="stat-label">Aktivnih Predloga</div>
                <div className="stat-trend neutral">+3 nove ove nedelje</div>
              </div>
              <div className="stat-card churn">
                <div className="stat-value">3.2%</div>
                <div className="stat-label">Stopa Otpadanja</div>
                <div className="stat-trend negative">+0.3% vs prethodni mesec</div>
              </div>
            </div>

            <div className="quick-actions">
              <button className="btn btn-primary" onClick={() => setActiveFeedbackTab('nps')}>
                <span>⭐</span> Pokreni NPS Anketu
              </button>
              <button className="btn btn-secondary" onClick={() => setActiveFeedbackTab('features')}>
                <span>💡</span> Pregledaj Predloge
              </button>
              <button className="btn btn-outline" onClick={() => {}}>
                <span>📥 Izvezi Izvještaj</span>
              </button>
            </div>
          </div>)}

        {activeFeedbackTab === 'nps' && (
          <NPSSurvey 
            onComplete={(score, feedback) => {}}
            onDismiss={() => setActiveFeedbackTab('overview')}
          />
        )}

        {activeFeedbackTab === 'reviews' && (
          <ReviewAnalytics />
        )}

        {activeFeedbackTab === 'features' && (
          <div className="features-section">
            <div className="features-header">
              <div>
                <h2>Predlozi Funkcionalnosti</h2>
                <p className="features-subtitle">Pregledajte, glasajte i predlažite nove funkcionalnosti</p>
              </div>
              <button className="btn btn-primary" onClick={() => setShowFeatureForm(true)}>
                <span>💡</span> Predloži Funkcionalnost
              </button>
            </div>
            <FeatureRequestList 
              requests={[]} 
              canAdmin={false}
              onVote={(id) => {}}
            />
            {showFeatureForm && (
              <FeatureRequestForm 
                onSubmit={async (data) => {}}
                onCancel={() => setShowFeatureForm(false)}
              />
            )}
          </div>
        )}

        {activeFeedbackTab === 'churn' && (
          <ChurnAnalytics />
        )}
      </div>
    </div>
  );
};

export default FeedbackLoop;