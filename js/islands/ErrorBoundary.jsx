/**
 * Error boundary za React Islands — štiti MPA stranicu od bilo kakve greške
 * unutar island-a: umesto pada čitavog sajta, prikaže prazan placeholder.
 */

import React from 'react';

export default class IslandBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    console.error('[islands] mount error:', error, info);
  }

  render() {
    if (this.state.error) {
      return React.createElement('div', { 'data-island-error': '1' }, null);
    }
    return this.props.children;
  }
}
