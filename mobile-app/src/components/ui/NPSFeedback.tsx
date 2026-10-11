/**
 * NPS Survey Component
 * Net Promoter Score survey component with follow-up questions
 */

import React, { useState, useEffect } from 'react';
import { useTheme } from '../../context/ThemeContext';
import { Ionicons } from '@expo/vector-icons';

interface NPSProps {
  onComplete?: (score: number, feedback: string) => void;
  onDismiss?: () => void;
  trigger?: 'purchase' | 'time' | 'feature' | 'manual';
  productId?: string;
  orderId?: string;
}

export const NPSSurvey = ({ 
  onComplete, 
  onDismiss, 
  trigger = 'time',
  productId,
  orderId 
}: NPSProps) => {
  const { colors } = useTheme();
  const [score, setScore] = useState<number | null>(null);
  const [feedback, setFeedback] = useState('');
  const [step, setStep] = useState<'score' | 'feedback' | 'thanks'>('score');
  const [showModal, setShowModal] = useState(true);
  const [animating, setAnimating] = useState(false);

  useEffect(() => {
    // Check if user already answered NPS recently
    const lastNPS = localStorage.getItem('lastNPSSurvey');
    const shouldShow = !lastNPS || (Date.now() - parseInt(localStorage.getItem('lastNPSDate') || '0')) > 90 * 24 * 60 * 60 * 1000; // 90 days
    
    if (!shouldShow && !process.env.NODE_ENV === 'development') {
      setShowModal(false);
      onDismiss?.();
    }
  }, []);

  const handleScoreSelect = (score: number) => {
    setScore(score);
    setAnimating(true);
    setTimeout(() => {
      setStep('feedback');
      setAnimating(false);
    }, 300);
  };

  const handleSubmit = async () => {
    if (!feedback.trim()) {
      // Allow submitting without feedback
    }
    
    const response = {
      score,
      feedback: feedback.trim(),
      productId,
      orderId,
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent
    };

    try {
      // Send to analytics
      await fetch('/api/feedback/nps', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(response)
      });
    } catch (e) {
      console.error('Failed to submit NPS:', e);
    }

    localStorage.setItem('lastNPSSurvey', 'true');
    localStorage.setItem('lastNPSDate', Date.now().toString());
    
    setStep('thanks');
    setTimeout(() => {
      setShowModal(false);
      onComplete?.(score, feedback);
    }, 2000);
  };

  const handleDismiss = () => {
    setShowModal(false);
    onDismiss?.();
  };

  if (!showModal) return null;

  const getScoreLabel = (score: number) => {
    if (score <= 6) return 'Detractor';
    if (score <= 8) return 'Passive';
    return 'Promoter';
  };

  const getScoreColor = (score: number) => {
    if (score <= 6) return '#ef4444';
    if (score <= 8) return '#f59e0b';
    return '#16a34a';
  };

  return (
    <div className="nps-survey-overlay" style={{ display: showModal ? 'flex' : 'none' }}>
      <div className="nps-modal" style={{ opacity: showModal ? 1 : 0, transform: showModal ? 'scale(1)' : 'scale(0.95)' }}>
        <div className="nps-modal-content">
          {step === 'score' && (
            <>
              <div className="nps-header">
                <h2>Koliko je verovatno da preporučite DALLI prijatelju?</h2>
                <p className="nps-subtitle">Ocena od 0 do 10</p>
              </div>
              <div className="nps-scale" role="radiogroup" aria-label="NPS ocena">
                {[0,1,2,3,4,5,6,7,8,9,10].map((num) => (
                  <button
                    key={num}
                    className={`nps-score-btn ${score === num ? 'selected' : ''}`}
                    onClick={() => handleScoreSelect(num)}
                    style={{ 
                      backgroundColor: score === num ? getScoreColor(num) : 'transparent',
                      borderColor: score === num ? getScoreColor(num) : 'var(--color-border)',
                      color: score === num ? '#fff' : 'var(--color-text)'
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        handleScoreSelect(num);
                      }
                    }}
                    tabIndex={0}
                    aria-label={`Ocena ${num}`}
                    aria-pressed={score === num}
                  >
                    {num}
                  </button>
                ))}
              </div>
              <p className="nps-labels">
                <span style={{ color: '#ef4444' }}>Ne preporučujem</span>
                <span style={{ color: '#f59e0b' }}>Neutralno</span>
                <span style={{ color: '#16a34a' }}>Sigurno preporučujem</span>
              </p>
            </>
          )}

          {step === 'feedback' && (
            <>
              <div className="nps-header">
                <h3>Hvala na oceni!</h3>
                <p className="nps-subtitle">Šta vam se sviđa ili šta možemo poboljšati?</p>
              </div>
              <textarea
                value={feedback}
                onChange={(e) => setFeedback(e.target.value)}
                placeholder="Vaše mišljenje nam je važno..."
                className="feedback-textarea"
                rows={4}
                placeholder="Ostavite komentar (opciono)..."
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSubmit();
                  }
                }}
              />
              <div className="nps-actions">
                <button className="btn btn-ghost" onClick={() => setStep('score')}>
                  Nazad
                </button>
                <button className="btn btn-primary" onClick={handleSubmit}>
                  Pošalji
                </button>
              </div>
            </>
          )}

          {step === 'thanks' && (
            <div className="nps-thanks" style={{ animation: 'fadeIn 0.3s ease-out' }}>
              <div className="thanks-icon">🎉</div>
              <h3>Hvala na povratnoj informaciji!</h3>
              <p className="thanks-text">Vaša povratna informacija nam pomaže da postanemo bolji.</p>
              <button className="btn btn-primary" onClick={() => { setShowModal(false); onDismiss?.(); }}>
                Zatvori
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default NPSSurvey;