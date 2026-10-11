(function() {
  'use strict';

  const CMS = window.CMS;
  if (!CMS) return;

  // ============================================
  // LINK JUICE FLOW - PageRank Visualization - Step 11
  // ============================================

  class PageRankCalculator {
    constructor(options = {}) {
      this.dampingFactor = options.dampingFactor || 0.85;
      this.maxIterations = options.maxIterations || 100;
      this.tolerance = options.tolerance || 1e-6;
      this.minScore = options.minScore || 0.0001;
    }

    calculate(nodes, edges) {
      // nodes: [{ id, url, title, outboundCount, inboundCount, ... }]
      // edges: [{ source, target, weight: 1 }]
      
      const nodeMap = new Map(nodes.map(n => [n.id, { 
        ...n, 
        score: 1 / nodes.length,
        newScore: 0,
        outEdges: [],
        inEdges: []
      }]));

      // Build adjacency
      edges.forEach(edge => {
        const source = nodeMap.get(edge.source);
        const target = nodeMap.get(edge.target);
        if (source && target) {
          source.outEdges.push(target.id);
          target.inEdges.push(source.id);
        }
      });

      // Identify dangling nodes (no outbound links)
      const danglingNodes = nodes.filter(n => n.outboundCount === 0).map(n => n.id);

      // Power iteration
      for (let iter = 0; iter < this.maxIterations; iter++) {
        let maxDiff = 0;
        const danglingScore = danglingNodes.reduce((sum, id) => sum + (nodeMap.get(id)?.score || 0), 0);
        const danglingContribution = (danglingScore * this.dampingFactor) / nodes.length;

        nodes.forEach(node => {
          const nodeData = nodeMap.get(node.id);
          let newScore = (1 - this.dampingFactor) / nodes.length;
          newScore += danglingContribution;

          // Add contributions from inbound links
          nodeData.inEdges.forEach(sourceId => {
            const sourceData = nodeMap.get(sourceId);
            if (sourceData && sourceData.outEdges.length > 0) {
              newScore += this.dampingFactor * (sourceData.score / sourceData.outEdges.length);
            }
          });

          const diff = Math.abs(newScore - nodeData.score);
          maxDiff = Math.max(maxDiff, diff);
          nodeData.newScore = Math.max(newScore, this.minScore);
        });

        // Update scores
        nodeMap.forEach(data => data.score = data.newScore);

        if (maxDiff < this.tolerance) break;
      }

      // Normalize scores to sum = 1
      const totalScore = Array.from(nodeMap.values()).reduce((sum, n) => sum + n.score, 0);
      nodeMap.forEach(data => data.score = data.score / totalScore);

      // Return sorted by score
      return Array.from(nodeMap.values())
        .sort((a, b) => b.score - a.score)
        .map(n => ({
          id: n.id,
          url: n.url,
          title: n.title,
          score: n.score,
          scorePercent: (n.score * 100).toFixed(2),
          outboundCount: n.outboundCount,
          inboundCount: n.inboundCount,
          outEdges: n.outEdges,
          inEdges: n.inEdges,
        }));
    }
  }

  function buildLinkGraph(scanResults) {
    const pages = scanResults.pages || new Map();
    const links = scanResults.links || [];

    // Nodes
    const nodes = [];
    pages.forEach((page, url) => {
      nodes.push({
        id: url,
        url,
        title: page.title || 'Bez naslova',
        outboundCount: page.outboundLinks || 0,
        inboundCount: page.inboundLinks || 0,
        wordCount: page.wordCount || 0,
      });
    });

    // Edges (internal links only)
    const edges = links
      .filter(l => l.isInternal)
      .map(link => ({
        source: link.sourceUrl,
        target: link.targetUrl,
        weight: 1,
      }));

  return { nodes, edges };
  }

  function categorizeByScore(score, maxScore) {
    const pct = score / maxScore;
    if (pct >= 0.1) return 'authority';      // Top 10% of score
    if (pct >= 0.05) return 'strong';        // Top 5-10%
    if (pct >= 0.01) return 'moderate';      // Top 1-5%
    if (pct >= 0.005) return 'weak';         // 0.5-1%
    return 'minimal';                         // < 0.5%
  }

  function findLinkSinks(pageRankResults) {
    // Pages with high PageRank but few outbound links (hoarding link juice)
    return pageRankResults
      .filter(p => p.scorePercent >= 1 && p.outboundCount <= 3)
      .sort((a, b) => b.score - a.score)
      .slice(0, 10);
  }

  function findLinkSources(pageRankResults) {
    // Pages with high outbound but low inbound (distributing juice)
    return pageRankResults
      .filter(p => p.outboundCount >= 10 && p.inboundCount <= 5)
      .sort((a, b) => b.outboundCount - a.outboundCount)
      .slice(0, 10);
  }

  function findOrphanedAuthority(pageRankResults) {
    // High PageRank but no inbound links (shouldn't happen if calc is right, but check)
    return pageRankResults
      .filter(p => p.scorePercent >= 0.5 && p.inboundCount === 0)
      .slice(0, 5);
  }

  function getFlowData(pageRankResults, scanResults) {
    // Build flow edges for visualization
    const links = scanResults.links || [];
    const scores = new Map(pageRankResults.map(p => [p.id, p.score]));
    
    return links
      .filter(l => l.isInternal && scores.has(l.sourceUrl) && scores.has(l.targetUrl))
      .map(link => ({
        source: link.sourceUrl,
        target: link.targetUrl,
        sourceScore: scores.get(link.sourceUrl),
        targetScore: scores.get(link.targetUrl),
        flow: scores.get(link.sourceUrl) / (scanResults.pages.get(link.sourceUrl)?.outboundCount || 1),
      }))
      .filter(f => f.flow > 0)
      .sort((a, b) => b.flow - a.flow)
      .slice(0, 200); // Limit for visualization
  }

  // Export
  window.NC_LinkJuice = {
    PageRankCalculator,
    buildLinkGraph,
    categorizeByScore,
    findLinkSinks,
    findLinkSources,
    findOrphanedAuthority,
    getFlowData,
  };

})();