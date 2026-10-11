/**
 * Customer Timeline - Phase 24
 */

export function buildTimeline(events = []) {
  return events.sort((a,b) => new Date(b.timestamp) - new Date(a.timestamp));
}
