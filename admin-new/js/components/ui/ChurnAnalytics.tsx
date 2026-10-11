/**
 * Churn Analysis Component
 * Customer churn prediction, risk analysis, and retention strategies
 */

import React, { useState, useEffect, useMemo } from 'react';
import { useTheme } from '../../context/ThemeContext';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell, AreaChart, Area } from 'recharts';

interface ChurnCustomer {
  id: string;
  name: string;
  email: string;
  tier: 'bronze' | 'silver' | 'gold' | 'platinum';
  churnRisk: number; // 0-1
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  lastOrderDate: string;
  daysSinceLastOrder: number;
  totalOrders: number;
  lifetimeValue: number;
  avgOrderValue: number;
  riskFactors: string[];
  lastActivity: string;
  segment: 'new' | 'active' | 'at_risk' | 'churned' | 'loyal';
}

interface ChurnAnalyticsProps {
  customers?: any[];
  onRetainCustomer?: (customerId: string, action: string) => Promise<void>;
}

export const ChurnAnalytics = ({ customers = [], onRetainCustomer }: ChurnAnalyticsProps) => {
  const { colors } = useTheme();
  const [customersData, setCustomersData] = useState<any[]>([]);
  const [dateRange, setDateRange] = useState({ 
    start: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000), 
    end: new Date() 
  });
  const [riskFilter, setRiskFilter] = useState<'all' | 'critical' | 'high' | 'medium' | 'low'>('all');
  const [selectedCustomer, setSelectedCustomer] = useState<any>(null);
  const [showRetentionModal, setShowRetentionModal] = useState(false);

  useEffect(() => {
    // Mock data - in production fetch from API
    const mockCustomers = Array.from({ length: 200 }, (_, i) => {
      const tiers = ['bronze', 'silver', 'gold', 'platinum'] as const;
      const segments = ['new', 'active', 'at_risk', 'churned', 'loyal'] as const;
      const riskLevels = ['low', 'medium', 'high', 'critical'] as const;
      const riskFactors = [
        'Dugo nema narudžbine',
        'Smanjena aktivnost',
        'Negativne recenzije',
        'Otkazane porudžbine',
        'Vraćena roba',
        'Nema aktivnosti na sajtu',
        'Odbijene plaćanja',
        'Zapošljena podrška'
      ];

      const tier = tiers[Math.floor(Math.random() * tiers.length)];
      const segment = segments[Math.floor(Math.random() * segments.length)];
      const riskLevel = riskLevels[Math.floor(Math.random() * riskLevels.length)];
      
      const daysSinceOrder = Math.floor(Math.random() * 180);
      const totalOrders = Math.floor(Math.random() * 50) + 1;
      const ltv = Math.floor(Math.random() * 50000) + 1000;
      
      return {
        id: `cust_${i}`,
        name: `Korisnik ${i + 1}`,
        email: `user${i}@email.com`,
        tier: tiers[Math.floor(Math.random() * tiers.length)],
        churnRisk: Math.random(),
        riskLevel,
        lastOrderDate: new Date(Date.now() - Math.random() * 180 * 24 * 60 * 60 * 1000).toISOString(),
        daysSinceLastOrder: daysSinceOrder,
        totalOrders: totalOrders,
        lifetimeValue: ltv,
        avgOrderValue: Math.round(ltv / totalOrders),
        riskFactors: riskFactors.slice(0, Math.floor(Math.random() * 3) + 1),
        lastActivity: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString(),
        segment: segment,
  };
});

    setCustomersData(mockCustomers);
  }, []);

  const tiers = ['bronze', 'silver', 'gold', 'platinum'] as const;
  const segments = ['new', 'active', 'at_risk', 'churned', 'loyal'] as const;
  const riskLevels = ['low', 'medium', 'high', 'critical'] as const;

  const filteredCustomers = useMemo(() => {
    let filtered = customersData;
    
    // Filter by risk level
    if (riskFilter !== 'all') {
      filtered = filtered.filter(c => c.riskLevel === riskFilter);
    }
    
    return filtered;
  }, [customersData, riskFilter]);

  const stats = useMemo(() => {
    const customers = filteredCustomers;
    const total = customers.length;
    if (total === 0) return { 
      total: 0, 
      atRisk: 0, 
      churned: 0, 
      healthy: 0, 
      avgLTV: 0,
      churnRate: 0,
      riskDistribution: { critical: 0, high: 0, medium: 0, low: 0 }
    };

    const atRisk = customers.filter(c => c.riskLevel === 'critical' || c.riskLevel === 'high').length;
    const churned = customers.filter(c => c.segment === 'churned').length;
    const healthy = customers.filter(c => c.segment === 'loyal' || c.segment === 'active').length;
    const avgLTV = customers.reduce((sum, c) => sum + c.lifetimeValue, 0) / customers.length;
    const churnRate = (customers.filter(c => c.segment === 'churned').length / customers.length) * 100;

    const riskDistribution = {
      critical: customers.filter(c => c.riskLevel === 'critical').length,
      high: customers.filter(c => c.riskLevel === 'high').length,
      medium: customers.filter(c => c.riskLevel === 'medium').length,
      low: customers.filter(c => c.riskLevel === 'low').length
    };

    return {
      total: customers.length,
      atRisk,
      churned,
      healthy,
      avgLTV: Math.round(customers.reduce((sum, c) => sum + c.lifetimeValue, 0) / customers.length),
      churnRate: Math.round((customers.filter(c => c.segment === 'churned').length / customers.length) * 100),
      riskDistribution
    };
  }, [filteredCustomers]);

  const handleRetainCustomer = async (customerId: string, action: string) => {
    // In production, call retention API
    console.log(`Retention action for ${customerId}: ${action}`);
  };

  const getRiskColor = (level: string) => {
    switch (level) {
      case 'critical': return '#ef4444';
      case 'high': return '#f97316';
      case 'medium': return '#f59e0b';
      case 'low': return '#16a34a';
      default: return '#6b7280';
    }
  };

  const getSegmentLabel = (segment: string) => {
    const labels: Record<string, string> = {
      new: 'Novi',
      active: 'Aktivni',
      at_risk: 'U Riziku',
      churned: 'Otpadli',
      loyal: 'Verni'
    };
    return labels[segment] || segment;
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('sr-RS', { style: 'currency', currency: 'RSD', maximumFractionDigits: 0 }).format(value);
  };

  return (
    <div className="churn-analytics">
      <div className="analytics-header">
        <div className="header-content">
          <h2>Churn Analitika</h2>
          <p className="header-subtitle">Predikcija otpadanja kupaca i strategije retencije</p>
        </div>
        <div className="header-filters">
          <select value={riskFilter} onChange={(e) => setRiskFilter(e.target.value)} className="filter-select">
            <option value="all">Svi rizici</option>
            <option value="critical">Kritični</option>
            <option value="high">Visoki</option>
            <option value="medium">Srednji</option>
            <option value="low">Nizak</option>
          </select>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="metrics-grid">
        <div className="metric-card critical">
          <div className="metric-icon">⚠️</div>
          <div className="metric-value">{stats.atRisk}</div>
          <div className="metric-label">U Riziku</div>
          <div className="metric-trend negative">+12% od prošlog meseca</div>
        </div>
        <div className="metric-card warning">
          <div className="metric-icon">📉</div>
          <div className="metric-value">{stats.churned}</div>
          <div className="metric-label">Otpadli Kupci</div>
          <div className="metric-trend negative">{stats.churnRate.toFixed(1)}% stopa otpadanja</div>
        </div>
        <div className="metric-card success">
          <div className="metric-icon">✅</div>
          <div className="metric-value">{stats.healthy}</div>
          <div className="metric-label">Zdravi Kupci</div>
          <div className="metric-trend positive">+8% od prošlog meseca</div>
        </div>
        <div className="metric-card info">
          <div className="metric-icon">💰</div>
          <div className="metric-value">{formatCurrency(stats.avgLTV)}</div>
          <div className="metric-label">Prosečan LTV</div>
          <div className="metric-trend positive">+12% YoY</div>
        </div>
        <div className="metric-card warning">
          <div className="metric-icon">📉</div>
          <div className="metric-value">{stats.churnRate.toFixed(1)}%</div>
          <div className="metric-label">Stopa Otpadanja</div>
          <div className="metric-trend negative">+3.2% vs prethodni mesec</div>
        </div>
      </div>

      {/* Risk Distribution */}
      <div className="section">
        <h2 className="section-title">Distribucija Rizika</h2>
        <div className="risk-distribution">
          <div className="risk-bars">
            <div className="risk-bar critical">
              <div className="risk-bar-label">
                <span className="risk-label critical">Kritični</span>
                <span className="risk-count">{stats.riskDistribution.critical}</span>
              </div>
              <div className="risk-bar-container">
                <div className="risk-bar critical" style={{ width: `${stats.total > 0 ? (stats.riskDistribution.critical / stats.total) * 100 : 0}%` }}></div>
              </div>
              <span className="risk-count">{stats.riskDistribution.critical} kupaca</span>
            </div>
            <div className="risk-bar high">
              <span className="risk-label high">Visoki</span>
              <span className="risk-count">{stats.riskDistribution.high}</span>
              <div className="risk-bar-container">
                <div className="risk-bar high" style={{ width: `${stats.total > 0 ? (stats.riskDistribution.high / stats.total) * 100 : 0}%` }}></div>
              </div>
              <span className="risk-count">{stats.riskDistribution.high} kupaca</span>
            </div>
            <div className="risk-bar medium">
              <span className="risk-label medium">Srednji</span>
              <span className="risk-count">{stats.riskDistribution.medium}</span>
              <div className="risk-bar-container">
                <div className="risk-bar medium" style={{ width: `${stats.total > 0 ? (stats.riskDistribution.medium / stats.total) * 100 : 0}%` }}></div>
              </div>
              <span className="risk-count">{stats.riskDistribution.medium} kupaca</span>
            </div>
            <div className="risk-bar low">
              <span className="risk-label low">Nizak</span>
              <span className="risk-count">{stats.riskDistribution.low}</span>
              <div className="risk-bar-container">
                <div className="risk-bar low" style={{ width: `${stats.total > 0 ? (stats.riskDistribution.low / stats.total) * 100 : 0}%` }}></div>
              </div>
              <span className="risk-count">{stats.riskDistribution.low} kupaca</span>
            </div>
          </div>
        </div>
        </div>

        {/* At-Risk Customers Table */}
        <div className="section">
          <div className="section-header">
            <h2 className="section-title">Kupci U Riziku</h2>
            <select value={riskFilter} onChange={(e) => setRiskFilter(e.target.value)} className="filter-select">
              <option value="all">Svi</option>
              <option value="critical">Kritični</option>
              <option value="high">Visoki</option>
              <option value="medium">Srednji</option>
              <option value="low">Nizak</option>
            </select>
          </div>

          <div className="customers-table-container">
            <table className="customers-table">
              <thead>
                <tr>
                  <th>Kupac</th>
                  <th>Segment</th>
                  <th>Rizik</th>
                  <th>Poslednja Narudžbina</th>
                  <th>Ukupno Narudžbina</th>
                  <th>LTV</th>
                  <th>Faktori Rizika</th>
                  <th>Akcije</th>
                </tr>
              </thead>
              <tbody>
                {filteredCustomers.slice(0, 20).map((customer) => (
                  <tr key={customer.id} className={customer.riskLevel === 'critical' ? 'critical-row' : ''}>
                    <td className="customer-name">
                      <div className="customer-avatar">{customer.name.charAt(0)}</div>
                      <div>
                        <div style={{ fontWeight: 600 }}>{customer.name}</div>
                        <span className="customer-email">{customer.email}</span>
                      </div>
                    </td>
                    <td>
                      <span className={`segment-badge ${customer.segment}`}>{getSegmentLabel(customer.segment)}</span>
                    </td>
                    <td>
                      <span className={`risk-badge ${customer.riskLevel}`}>
                        {customer.riskLevel.charAt(0).toUpperCase() + customer.riskLevel.slice(1)}
                        <span className="risk-score">({(customer.churnRisk * 100).toFixed(0)}%)</span>
                      </span>
                    </td>
                    <td>{new Date(customer.lastOrderDate).toLocaleDateString('sr-RS')}</td>
                    <td>{customer.totalOrders}</td>
                    <td>{formatCurrency(customer.lifetimeValue)}</td>
                    <td>
                      <div className="risk-factors">
                        {customer.riskFactors.slice(0, 2).map((factor, i) => (
                          <span key={i} className="risk-factor-tag">{factor}</span>
                        ))}
                        {customer.riskFactors.length > 2 && (
                          <span className="more-factors">+{customer.riskFactors.length - 2} više</span>
                        )}
                      </div>
                    </td>
                    <td>
                      <button 
                        className="btn btn-ghost btn-sm"
                        onClick={() => handleRetainCustomer(customer.id, 'contact')}
                      >
                        Kontaktiraj
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Retention Strategies */}
        <div className="section">
          <h2 className="section-title">Strategije Retencije</h2>
          <div className="strategies-grid">
            {[
              { title: 'Win-back Kampanja', desc: 'Ciljanje otpalih kupaca sa personalizovanim ponudama', action: 'Kreiraj kampanju', icon: '📧' },
              { title: 'VIP Program', desc: 'Ekskluzivne prednosti za najbolje kupce', action: 'Pokreni', icon: '💎' },
              { title: 'Lojalnost Program', desc: 'Bodovi za svaku kupovinu', action: 'Pokreni', icon: '🏆' },
              { title: 'Proaktivni Support', desc: 'Proaktivna podrška rizičnim kupcima', action: 'Postavi', icon: '🛟' },
            ].map((strategy, i) => (
              <div key={i} className="strategy-card">
                <div className="strategy-icon">{strategy.icon}</div>
                <div>
                  <h4>{strategy.title}</h4>
                  <p>{strategy.desc}</p>
                </div>
                <button className="btn btn-primary btn-sm" onClick={() => {}}>
                  {strategy.action}
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };

export default ChurnAnalytics;