/**
 * Outfit Analytics - Tracks Phase 17 styling engine events
 * Integrates with existing analytics infrastructure
 */

import { trackEvent } from './analytics.js';

export const OutfitAnalytics = {
  trackLookView(lookId, lookName, lookStyle, lookCollection, productsCount) {
    trackEvent('look_view', {
      look_id: lookId,
      look_name: lookName,
      look_style: lookStyle,
      look_collection: lookCollection,
      products_count: productsCount
    });
  },

  trackLookOpen(lookId, lookName, source) {
    trackEvent('look_open', {
      look_id: lookId,
      look_name: lookName,
      source: source || 'unknown'
    });
  },

  trackLookAddToCart(lookId, productIds, totalValue, productsCount) {
    trackEvent('look_add_to_cart', {
      look_id: lookId,
      product_ids: productIds,
      total_value: totalValue,
      products_count: productsCount
    });
  },

  trackLookPurchase(lookId, orderId, totalValue, productsCount) {
    trackEvent('look_purchase', {
      look_id: lookId,
      order_id: orderId,
      total_value: totalValue,
      products_count: productsCount
    });
  },

  trackCompleteLookView(productId, productName, recommendationsCount, style) {
    trackEvent('complete_look_view', {
      product_id: productId,
      product_name: productName,
      recommendations_count: recommendationsCount,
      style: style
    });
  },

  trackCompleteLookAdd(sourceProductId, addedProductId, addedProductPrice, position) {
    trackEvent('complete_look_add', {
      source_product_id: sourceProductId,
      added_product_id: addedProductId,
      added_product_price: addedProductPrice,
      position: position
    });
  },

  trackStyleMatchClick(sourceProductId, matchedProductId, sharedStyle) {
    trackEvent('style_match_click', {
      source_product_id: sourceProductId,
      matched_product_id: matchedProductId,
      shared_style: sharedStyle
    });
  },

  trackCollectionMatchClick(sourceProductId, matchedProductId, collection) {
    trackEvent('collection_match_click', {
      source_product_id: sourceProductId,
      matched_product_id: matchedProductId,
      collection: collection
    });
  },

  trackOutfitBuilderStart(seedProductId, seedProductCategory) {
    trackEvent('outfit_builder_start', {
      seed_product_id: seedProductId,
      seed_product_category: seedProductCategory
    });
  },

  trackOutfitBuilderComplete(productsCount, totalValue, styles, collection) {
    trackEvent('outfit_builder_complete', {
      products_count: productsCount,
      total_value: totalValue,
      styles: styles,
      collection: collection
    });
  },

  trackTryOnLook(lookId, productsCount) {
    trackEvent('try_on_look', {
      look_id: lookId,
      products_count: productsCount
    });
  },

  trackTryOnOutfit(outfitId, productsCount) {
    trackEvent('try_on_outfit', {
      outfit_id: outfitId,
      products_count: productsCount
    });
  },

  trackStyleView(style) {
    trackEvent('style_view', { style });
  },

  trackStylePurchase(style) {
    trackEvent('style_purchase', { style });
  },

  trackCollectionView(collection) {
    trackEvent('collection_view', { collection });
  }
};

if (typeof window !== 'undefined') {
  window.OutfitAnalytics = OutfitAnalytics;
}

export default OutfitAnalytics;