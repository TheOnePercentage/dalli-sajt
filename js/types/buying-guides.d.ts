/**
 * Buying Guides Type Definitions
 * @module types/buying-guides
 */

export type BuyingGuideCategory = 'hoodie' | 'tracksuit' | 'cotton' | 'size' | 'fabric';

export type BuyingGuideStatus = 'published' | 'draft' | 'archived';

export interface BuyingGuideSEO {
  metaTitle: string;
  metaDescription: string;
  keywords: string[];
  canonicalUrl: string;
  ogImage: string;
}

export interface BuyingGuideFAQ {
  question: string;
  answer: string;
}

export interface BuyingGuide {
  id: string;
  slug: string;
  title: string;
  category: BuyingGuideCategory;
  excerpt: string;
  content: string;
  seo: BuyingGuideSEO;
  faq: BuyingGuideFAQ[];
  relatedProducts?: string[];
  relatedCategories?: string[];
  relatedGuides?: string[];
  author?: string;
  publishedAt: string;
  updatedAt: string;
  status: BuyingGuideStatus;
  readingTime?: string;
  featuredImage?: string;
  tableOfContents?: string[];
}

export interface BuyingGuidesData {
  version: string;
  guides: BuyingGuide[];
}