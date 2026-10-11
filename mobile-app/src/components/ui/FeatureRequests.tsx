/**
 * Feature Request Component
 * Feature request submission and management system
 */

import React, { useState, useEffect } from 'react';
import { useTheme } from '../../../context/ThemeContext';
import { Ionicons } from '@expo/vector-icons';

interface FeatureRequest {
  id: string;
  title: string;
  description: string;
  category: 'feature' | 'improvement' | 'bug' | 'integration';
  status: 'submitted' | 'under_review' | 'planned' | 'in_progress' | 'completed' | 'rejected';
  votes: number;
  userVoted: boolean;
  submitterId: string;
  submitterName: string;
  createdAt: string;
  updatedAt: string;
  tags: string[];
  adminResponse?: string;
  estimatedEffort?: 'small' | 'medium' | 'large';
  plannedRelease?: string;
}

interface FeatureRequestProps {
  userId?: string;
  userName?: string;
  onSubmit?: (request: Omit<FeatureRequest, 'id' | 'votes' | 'userVoted' | 'status' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  onVote?: (requestId: string) => Promise<void>;
  canAdmin?: boolean;
}

interface FeatureRequestFormProps {
  onSubmit: (data: Omit<FeatureRequest, 'id' | 'votes' | 'userVoted' | 'status' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  onCancel: () => void;
}

export const FeatureRequestForm = ({ onSubmit, onCancel }: FeatureRequestFormProps) => {
  const { colors } = useTheme();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<'feature' | 'improvement' | 'bug' | 'integration'>('feature');
  const [tags, setTags] = useState<string[]>([]);
  const [newTag, setNewTag] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validateForm = () => {
    const errors: Record<string, string> = {};
    if (!title.trim()) errors.title = 'Naslov je obavezan';
    if (title.length < 5) errors.title = 'Naslov mora imati najmanje 5 karaktera';
    if (!description.trim()) errors.description = 'Opis je obavezan';
    if (description.length < 20) errors.description = 'Opis mora imati najmanje 20 karaktera';
    setErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    setSubmitting(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 1000));
      await onSubmit({
        title: title.trim(),
        description: description.trim(),
        category,
        tags
      });
      // Reset form
      setTitle('');
      setDescription('');
      setCategory('feature');
      setTags([]);
    } catch (error) {
      console.error('Failed to submit feature request:', error);
    } finally {
      setSubmitting(false);
    }
  };

  const handleTagAdd = () => {
    const tag = newTag.trim().toLowerCase();
    if (tag && !tags.includes(tag)) {
      setTags(prev => [...prev, tag]);
      setNewTag('');
    }
  };

  const handleTagRemove = (tag: string) => {
    setTags(prev => prev.filter(t => t !== tag));
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      handleTagAdd();
    }
  };

  if (!userId) return <div>Molimo prijavite se da biste predložili funkcionalnost.</div>;

  return (
    <form onSubmit={handleSubmit} className="feature-request-form">
      <div className="form-header">
        <h3>Predloži Novu Funkcionalnost</h3>
        <button className="close-btn" onClick={onCancel} aria-label="Zatvori">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="18" y1="6" x2="6" y2="18"/>
            <line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        </button>
      </div>

      <div className="form-group">
        <label htmlFor="title" className="form-label">Naslov *</label>
        <input
          type="text"
          id="title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Kratak, jasnan naslov (npr. 'Dodaj filtriranje po boji')"
          maxLength={100}
          className={`input ${errors.title ? 'error' : ''}`}
          aria-invalid={!!errors.title}
          aria-describedby={errors.title ? 'title-error' : undefined}
        />
        {errors.title && <span className="error-message" id="title-error">{errors.title}</span>}
      </div>

      <div className="form-group">
        <label htmlFor="description" className="form-label">Opis *</label>
        <textarea
          id="description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Opišite funkcionalnost, problem koji rešava, korisnike na koje utice..."
          rows={6}
          className={`textarea ${errors.description ? 'error' : ''}`}
          aria-invalid={!!errors.description}
          aria-describedby={errors.description ? 'description-error' : undefined}
        />
        {errors.description && <span className="error-message" id="description-error">{errors.description}</span>}
        <p className="char-count">{description.length}/2000 karaktera</p>
      </div>

      <div className="form-group">
        <label htmlFor="category" className="form-label">Kategorija *</label>
        <select
          id="category"
          value={category}
          onChange={(e) => setCategory(e.target.value as any)}
          className="select"
        >
          <option value="feature">✨ Nova Funkcionalnost</option>
          <option value="improvement">🔧 Poboljšanje</option>
          <option value="bug">🐛 Greška/Bug</option>
          <option value="integration">🔗 Integracija</option>
        </select>
      </div>

      <div className="form-group">
        <label className="form-label">Tagovi</label>
        <div className="tags-input">
          <div className="tags-display">
            {tags.map(tag => (
              <span key={tag} className="tag">
                {tag}
                <button type="button" onClick={() => handleTagRemove(tag)} aria-label={`Ukloni tag ${tag}`}>×</button>
              </span>
            ))}
            <div className="tag-input-wrapper">
              <input
                type="text"
                value={newTag}
                onChange={(e) => setNewTag(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Dodaj tag (Enter za dodavanje)"
                className="tag-input"
                placeholder="npr. mobilni, plaćanje, dostava"
              />
            </div>
          </div>
        </div>

        {errors.general && <div className="error-message">{errors.general}</div>}

        <div className="form-actions">
          <button type="button" className="btn btn-secondary" onClick={onCancel}>
            Otkaži
          </button>
          <button type="submit" className="btn btn-primary" disabled={submitting}>
            {submitting ? 'Slanje...' : 'Pošalji Predlog'}
          </button>
        </div>
      </form>
    </div>
  );
};

export const FeatureRequestList = ({ 
  requests = [], 
  userId, 
  canAdmin = false,
  onVote,
  onAdminAction 
}: {
  requests: any[];
  userId?: string;
  canAdmin?: boolean;
  onVote?: (requestId: string) => Promise<void>;
  onAdminAction?: (requestId: string, action: 'approve' | 'reject' | 'plan' | 'complete', data?: any) => Promise<void>;
}) => {
  const { colors } = useTheme();
  const [filter, setFilter] = useState<'all' | 'open' | 'planned' | 'completed' | 'my'>('all');
  const [sort, setSort] = useState<'votes' | 'recent' | 'updated'>('votes');

  const filteredRequests = requests
    .filter(req => {
      if (filter === 'my') return req.submitterId === userId;
      if (filter === 'open') return ['submitted', 'under_review', 'planned', 'in_progress'].includes(req.status);
      if (filter === 'planned') return req.status === 'planned';
      if (filter === 'completed') return req.status === 'completed';
      return true;
    })
    .sort((a, b) => {
      if (sort === 'votes') return b.votes - a.votes;
      if (sort === 'recent') return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
    });

  const getStatusConfig = (status: string) => {
    const configs: Record<string, { label: string; color: string; bg: string }> = {
      submitted: { label: 'Predat', color: '#3b82f6', bg: '#3b82f620' },
      under_review: { label: 'U Pregledu', color: '#3b82f6', bg: '#3b82f620' },
      planned: { label: 'Planirano', color: '#8b5cf6', bg: '#8b5cf620' },
      in_progress: { label: 'U Razvoju', color: '#f59e0b', bg: '#f59e0b20' },
      completed: { label: 'Završeno', color: '#16a34a', bg: '#16a34a20' },
      rejected: { label: 'Odbijeno', color: '#ef4444', bg: '#ef444420' },
    };
    return configs[status] || { label: status, color: '#6b7280', bg: '#2a2a3a' };
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('sr-RS', { day: '2-digit', month: '2-digit', year: 'numeric' });
  };

  const handleVote = async (requestId: string) => {
    if (onVote) await onVote(requestId);
  };

  const handleAdminAction = async (requestId: string, action: 'approve' | 'reject' | 'plan' | 'complete', data?: any) => {
    if (onAdminAction) await onAdminAction(requestId, action, data);
  };

  return (
    <div className="feature-requests">
      <div className="feature-requests-header">
        <div className="header-content">
          <h2>Predlozi Funkcionalnosti</h2>
          <p className="subtitle">Podelite ideje, glasajte za predloge, pratite razvoj</p>
        </div>
        <div className="header-actions">
          <div className="filter-group">
            <select value={filter} onChange={(e) => setFilter(e.target.value)} className="filter-select">
              <option value="all">Svi</option>
              <option value="open">Otvoreni</option>
              <option value="planned">Planirani</option>
              <option value="completed">Završeni</option>
              <option value="my">Moji</option>
            </select>
            <select value={sort} onChange={(e) => setSort(e.target.value)} className="filter-select">
              <option value="votes">Po Glasovima</option>
              <option value="recent">Najnoviji</option>
              <option value="updated">Nedavno Ažurirani</option>
            </select>
          </div>
        </div>
      </div>

      <div className="requests-list">
        {requests.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">💡</div>
            <h3>Nema predloga</h3>
            <p>Budite prvi koji predlaže novu funkcionalnost!</Text>
            <button className="btn btn-primary" onClick={() => setShowForm(true)}>
              Predloži Funkcionalnost
            </button>
          </div>
        ) : (
          <div className="requests-list">
            {requests.map(request => (
              <article key={request.id} className="feature-request-card">
                <div className="request-header">
                  <div className="request-header-left">
                    <span className={`status-badge ${request.status}`}>{getStatusConfig(request.status).label}</span>
                    <span className="request-category">{request.category}</span>
                  </div>
                  <div className="request-meta">
                    <span className="request-votes">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/></svg>
                      <span>{request.votes}</span>
                    </span>
                    <span className="request-date">{formatDate(request.createdAt)}</span>
                  </div>
                </div>
                <h3 className="request-title">{request.title}</h3>
                <p className="request-description">{request.description}</p>
                
                {request.tags.length > 0 && (
                  <div className="request-tags">
                    {request.tags.map(tag => <span key={tag} className="tag">{tag}</span>)}
                  </div>
                }

                <div className="request-footer">
                  <div className="request-stats">
                    <span className="votes">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/></svg>
                      <span>{request.votes}</span>
                    </span>
                    <span className="request-author">{request.submitterName}</Text>
                    <Text style={styles.metaText}>• {formatDate(request.createdAt)}</Text>
                  </div>
                  <div className="request-actions">
                    <TouchableOpacity
                      style={[{ backgroundColor: request.userVoted ? '#e74c3c' : 'transparent' }]}
                      onPress={() => onVote?.(request.id)}
                    >
                      <Ionicons name={request.userVoted ? 'heart' : 'heart-outline'} size={20} color={request.userVoted ? '#e74c3c' : '#71717a'} />
                      <Text style={styles.voteCount}>{request.votes}</Text>
                    </TouchableOpacity>
                    {canAdmin && (
                      <TouchableOpacity style={styles.adminActionBtn} onPress={() => {}}>
                        <Ionicons name="construct" size={20} color={colors.textTertiary} />
                      </TouchableOpacity>
                    )}
                  </div>
                  
                  {canAdmin && (
                    <View style={styles.adminActions}>
                      <TouchableOpacity onPress={() => onAdminAction?.(request.id, 'approve')}>
                        <Text style={styles.adminActionText}>Prihvati</Text>
                      </TouchableOpacity>
                      <TouchableOpacity style={styles.adminActionBtn} onPress={() => {}}>
                        <Ionicons name="calendar" size={20} color={colors.textTertiary} />
                      </TouchableOpacity>
                      <TouchableOpacity style={styles.adminActionBtn} onPress={() => {}}>
                        <Ionicons name="close-circle" size={20} color={colors.error} />
                      </TouchableOpacity>
                    </View>
                  )}
                </View>
              ))}
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
};

export { FeatureRequestForm, FeatureRequestList };