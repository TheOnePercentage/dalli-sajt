import { useMemo } from 'react';

interface Review {
  createdAt: string;
}

const reviews: Review[] = [];
const filteredReviews: Review[] = [];

const stats = useMemo(() => {
  const reviews = filteredReviews;
  const monthlyTrends = Array.from({ length: 6 }, (_, i) => {
    const date = new Date();
    date.setMonth(date.getMonth() - i);
    const monthReviews = reviews.filter(r => {
      const d = new Date(r.createdAt);
      return d.getMonth() === date.getMonth() && d.getFullYear() === date.getFullYear();
    });
    return {
      month: date.toLocaleString('sr-RS', { month: 'short' }),
      avgRating: monthReviews.length ? monthReviews.reduce((s, r) => s + (r as any).rating, 0) / monthReviews.length : 0,
      count: monthReviews.length
    };
  }).reverse();
  return { monthlyTrends };
}, [filteredReviews]);
