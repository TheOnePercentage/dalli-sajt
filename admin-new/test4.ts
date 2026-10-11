import { useMemo } from 'react';

const reviews: any[] = [];
const filteredReviews = [];

const stats = useMemo(() => {
  const reviews = filteredReviews;
  const monthlyTrends = Array.from({ length: 6 }, (_, i) => {
    return { value: i };
  }).reverse();
  return { monthlyTrends };
}, [filteredReviews]);
