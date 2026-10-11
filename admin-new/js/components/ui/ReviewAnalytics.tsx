/**
 * Review Analytics Component
 * Review analysis dashboard with sentiment analysis, trends, and insights
 */

import React, { useState, useEffect, useMemo } from 'react';
import { useTheme } from '../../context/ThemeContext';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from 'recharts';

interface Review {
  id: string;
  productId: string;
  productName: string;
  userId: string;
  userName: string;
  rating: number;
  title: string;
  comment: string;
  verified: boolean;
  helpful: number;
  images: string[];
  createdAt: string;
  sentiment: 'positive' | 'neutral' | 'negative';
  topics: string[];
}

interface ReviewAnalyticsProps {
  reviews?: Review[];
  productId?: string;
  dateRangeProp?: { start: Date; end: Date };
}

interface Stats {
  total: number;
  avgRating: number;
  distribution: number[];
  sentiment: {
    positive: number;
    neutral: number;
    negative: number;
  };
  monthlyTrends: Array<{ month: string; avgRating: number; count: number }>;
  topTopics: Array<{ topic: string; count: number }>;
}

function RatingTab({ stats }: { stats: { distribution: number[] } }) {
  return (
    <div className="rating-distribution">
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={stats.distribution.map((pct, i) => ({ rating: i + 1, percentage: pct }))}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
          <XAxis dataKey="rating" type="category" name="Ocena" />
          <YAxis domain={[0, 'dataMax']} name="%" />
          <Tooltip formatter={(value) => value + '%'} label="Procenat" />
          <Bar dataKey="percentage" fill="#e74c3c" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
      <div className="rating-breakdown">
        {[1,2,3,4,5].map(star => (
          <div key={star} className="rating-row">
            <span>{'★'.repeat(star) + '☆'.repeat(5 - star)}</span>
            <div className="progress-bar">
              <div className="progress-fill" style={{ width: stats.distribution[star - 1] + '%' }}></div>
            </div>
            <span>{(stats.distribution[star - 1] as number).toFixed(1)}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function SentimentTab({ stats }: { stats: { sentiment: { positive: number; neutral: number; negative: number } } }) {
  return (
    <div className="sentiment-analysis">
      <ResponsiveContainer width="100%" height={300}>
        <PieChart>
          <Pie
            data={[
              { name: 'Pozitivne', value: stats.sentiment.positive, color: '#16a34a' },
              { name: 'Neutralne', value: stats.sentiment.neutral, color: '#f59e0b' },
              { name: 'Negativne', value: stats.sentiment.negative, color: '#ef4444' }
            ]}
            cx="50%" cy="50%" innerRadius={60} outerRadius={100}
            paddingAngle={2}
            dataKey="value"
            nameKey="name"
            label={({ name, percent }) => name + ' ' + ((percent * 100) as number).toFixed(1) + '%'}
            labelLine={false}
          >
            <Cell fill="#16a34a" />
            <Cell fill="#f59e0b" />
            <Cell fill="#ef4444" />
          </Pie>
          <Tooltip formatter={(value: number) => value.toFixed(1) + '%'} />
        </PieChart>
      </ResponsiveContainer>
      <div className="sentiment-details">
        <div className="sentiment-stat positive">
          <span>Pozitivne</span>
          <span>{(stats.sentiment.positive as number).toFixed(1)}%</span>
        </div>
        <div className="sentiment-stat neutral">
          <span>Neutralne</span>
          <span>{(stats.sentiment.neutral as number).toFixed(1)}%</span>
        </div>
        <div className="sentiment-stat negative">
          <span>Negativne</span>
          <span>{(stats.sentiment.negative as number).toFixed(1)}%</span>
        </div>
      </div>
    </div>
  );
}

function TrendsTab({ stats }: { stats: { monthlyTrends: Array<{ month: string; avgRating: number; count: number }> } }) {
  return (
    <div className="trends-analysis">
      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={stats.monthlyTrends}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
          <XAxis dataKey="month" stroke="#71717a" />
          <YAxis domain={[0, 5]} stroke="#71717a" />
          <Tooltip formatter={(value: number) => value.toFixed(2)} labelFormatter={(v: number) => v + '★'} />
          <Line type="monotone" dataKey="avgRating" stroke="#e74c3c" strokeWidth={2} dot={{ r: 4 }} name="Prosečna Ocena" />
          <Line type="monotone" dataKey="count" stroke="#3b82f6" strokeWidth={2} dot={{ r: 4 }} name="Broj Recenzija" yAxisId="right" />
          <YAxis yAxisId="right" orientation="right" domain={[0, 'auto']} stroke="#71717a" />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

function TopicsTab({ stats }: { stats: { topTopics: Array<{ topic: string; count: number }> } }) {
  return (
    <div className="topics-analysis">
      <h3>Najčešće Teme u Recenzijama</h3>
      <div className="topics-list">
        {stats.topTopics.map((item, i) => (
          <div key={item.topic} className="topic-item">
            <span className="topic-rank">#{i + 1}</span>
            <span className="topic-name">{item.topic}</span>
            <span className="topic-count">{item.count} pominjanja</span>
            <div className="topic-bar">
              <div className="topic-bar-fill" style={{ width: (item.count / Math.max(...stats.topTopics.map((t: { count: number }) => t.count))) * 100 + '%' }}></div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export const ReviewAnalytics = ({ reviews = [], productId, dateRangeProp }: ReviewAnalyticsProps) => {
  const { colors } = useTheme();
  const [reviewsData, setReviewsData] = useState<Review[]>(reviews || []);
  const [dateRange, setDateRange] = useState({ 
    start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), 
    end: new Date() 
  });
  const [selectedMetric, setSelectedMetric] = useState<'rating' | 'sentiment' | 'topics' | 'trends'>('rating');
  const [loading, setLoading] = useState(false);

  // Mock data for demonstration
  useEffect(() => {
    if (!reviews || reviews.length === 0) {
      const mockReviews = Array.from({ length: 150 }, (_, i) => ({
        id: 'rev_' + i,
        productId: 'prod_' + (Math.floor(Math.random() * 20) + 1),
        productName: ['Osnovna Majica', 'Muški Duks', 'Ženska Trenerka', 'Čarape'][Math.floor(Math.random() * 4)],
        userId: 'user_' + Math.floor(Math.random() * 100),
        userName: 'Korisnik ' + Math.floor(Math.random() * 100),
        rating: Math.floor(Math.random() * 5) + 1,
        title: ['Odlično!', 'Dobra kvalitet', 'Preporučujem', 'Ne mogu da prestanem da nosim', 'Brza dostava'][Math.floor(Math.random() * 5)],
        comment: 'Produkt je odlične kvalitete, preporučujem svima.',
        verified: Math.random() > 0.3,
        helpful: Math.floor(Math.random() * 50),
        images: [],
        createdAt: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString(),
        sentiment: (Math.random() > 0.7 ? 'positive' : Math.random() > 0.4 ? 'neutral' : 'negative') as 'positive' | 'neutral' | 'negative',
        topics: ['kvalitet', 'cena', 'dostava', 'pogodnost'].slice(0, Math.floor(Math.random() * 4) + 1)
      }));
      setReviewsData(mockReviews);
    }
  }, []);

  const filteredReviews = useMemo(() => {
    let filtered = reviewsData;
    
    if (productId) {
      filtered = filtered.filter(r => r.productId === productId);
    }
    
    if (dateRange) {
      filtered = filtered.filter(r => {
        const date = new Date(r.createdAt);
        return date >= dateRange.start && date <= dateRange.end;
      });
    }
    
    return filtered;
  }, [reviewsData, productId, dateRange]);

  const stats = useMemo((): {
  total: number;
  avgRating: number;
  distribution: number[];
  sentiment: { positive: number; neutral: number; negative: number };
  monthlyTrends: Array<{ month: string; avgRating: number; count: number }>;
  topTopics: Array<{ topic: string; count: number }>;
} => {
    const reviews = filteredReviews;
    const total = reviews.length;
    if (total === 0) return { total: 0, avgRating: 0, distribution: [0,0,0,0,0], sentiment: { positive: 0, neutral: 0, negative: 0 }, monthlyTrends: [], topTopics: [] };
    
    const avgRating = reviews.reduce((sum, r) => sum + r.rating, 0) / total;
    const distribution = [1,2,3,4,5].map((star: number) => 
      reviews.filter(r => r.rating === star).length / total * 100
    );
    
    const sentiment = {
      positive: reviews.filter(r => r.sentiment === 'positive').length / total * 100,
      neutral: reviews.filter(r => r.sentiment === 'neutral').length / total * 100,
      negative: reviews.filter(r => r.sentiment === 'negative').length / total * 100,
    };
    
    const monthlyTrends = Array.from({ length: 6 }, (_, i: number) => {
      const date = new Date();
      date.setMonth(date.getMonth() - i);
      const monthReviews = reviews.filter(r => {
        const d = new Date(r.createdAt);
        return d.getMonth() === date.getMonth() && d.getFullYear() === date.getFullYear();
      });
      return {
        month: date.toLocaleString('sr-RS', { month: 'short' }),
        avgRating: monthReviews.length ? ((((((((((((((((((((((((((((((((((((((((((((monthReviews.reduce((s, r) => s + r.rating, 0) / monthReviews.length) as number) as number) as number) as number) as number) as number) as number) as number) as number) as number) as number) as number) as number) as number) as number) as number) as number) as number) as number) as number) as number) as number) as number) as number) as number) as number) as number) as number) as number) as number) as number) as number) as number) as number) as number) as number) as number) as number) as number) as number) as number) as number) as number) as number : 0,
        count: monthReviews.length
      };
    }).reverse();
    
    const topTopics = useMemo(() => {
      const topicCounts = {};
      filteredReviews.forEach(r => {
        r.topics.forEach(t => {
          topicCounts[t] = (topicCounts[t] || 0) + 1;
        });
      });
      return Object.entries(topicCounts)
        .sort((a: [string, number], b: [string, number]) => b[1] - a[1])
        .slice(0, 10)
        .map(([topic, count]: [string, number]) => ({ topic, count: Number(count) }));
    }, [filteredReviews]);
    
    return { total, avgRating, distribution: [1,2,3,4,5].map(star => 
      reviews.filter(r => r.rating === star).length / total * 100
    ), sentiment, monthlyTrends, topTopics };
  }, [filteredReviews]);

  return (
    <div className="review-analytics">
      <div className="analytics-header">
        <h2>Analiza Recenzija</h2>
        <div className="analytics-filters">
          <select
            value={dateRange.start.toISOString().split('T')[0] + ' to ' + dateRange.end.toISOString().split('T')[0]}
            onChange={(e) => {
              const [start, end] = e.target.value.split(' to ');
              setDateRange({ start: new Date(start), end: new Date(end) });
            }}
          >
            <option value="7d">Poslednjih 7 dana</option>
            <option value="30d">Poslednjih 30 dana</option>
            <option value="90d">Poslednjih 90 dana</option>
            <option value="custom">Prilagođeno</option>
          </select>
        </div>
      </div>

      <div className="metrics-grid">
        <div className="metric-card">
          <div className="metric-value">{(stats.avgRating as number).toFixed(1)}</div>
          <div className="metric-label">Prosečna Ocena</div>
          <div className="metric-trend positive">+0.2 vs prethodni period</div>
        </div>
        <div className="metric-card">
          <div className="metric-value">{stats.total}</div>
          <div className="metric-label">Ukupno Recenzija</div>
          <div className="metric-trend neutral">+12% od prošlog meseca</div>
        </div>
        <div className="metric-card">
          <div className="metric-value">{(stats.sentiment.positive as number).toFixed(1)}%</div>
          <div className="metric-label">Pozitivne Recenzije</div>
          <div className="metric-trend positive">+5%</div>
        </div>
        <div className="metric-card">
          <div className="metric-value">{(stats.sentiment.negative as number).toFixed(1)}%</div>
          <div className="metric-label">Negativne Recenzije</div>
          <div className="metric-trend negative">-2%</div>
        </div>
      </div>

      <div className="analytics-tabs">
        <button
          className={ 'tab-btn ' + (selectedMetric === 'rating' ? 'active' : '') }
          onClick={() => setSelectedMetric('rating')}
        >Distribucija Ocena</button>
        <button
          className={ 'tab-btn ' + (selectedMetric === 'sentiment' ? 'active' : '') }
          onClick={() => setSelectedMetric('sentiment')}
        >Sentiment Analiza</button>
        <button
          className={ 'tab-btn ' + (selectedMetric === 'trends' ? 'active' : '') }
          onClick={() => setSelectedMetric('trends')}
        >Trendovi</button>
        <button
          className={ 'tab-btn ' + (selectedMetric === 'topics' ? 'active' : '') }
          onClick={() => setSelectedMetric('topics')}
        >Teme</button>
      </div>

      <div className="tab-content">
        {selectedMetric === 'rating' && <RatingTab stats={stats} />}
        {selectedMetric === 'sentiment' && <SentimentTab stats={stats} />}
        {selectedMetric === 'trends' && <TrendsTab stats={stats} />}
        {selectedMetric === 'topics' && <TopicsTab stats={stats} />}
      </div>
    </div>
  );
};

export default ReviewAnalytics;
