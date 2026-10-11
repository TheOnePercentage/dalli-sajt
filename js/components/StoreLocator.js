/**
 * Store Locator Component
 * Web Component for displaying DALLI store locations with map
 */

export class StoreLocator extends HTMLElement {
  static get observedAttributes() {
    return ['user-lat', 'user-lng', 'show-distance', 'max-results'];
  }

  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this.locations = [];
    this.userLocation = null;
    this.showDistance = true;
    this.maxResults = 10;
  }

  connectedCallback() {
    this.loadLocations();
  }

  attributeChangedCallback(name, oldValue, newValue) {
    if (oldValue === newValue) return;
    if (name === 'show-distance') this.showDistance = newValue !== 'false';
    if (name === 'max-results') this.maxResults = parseInt(newValue) || 10;
    if (name === 'user-lat' || name === 'user-lng') {
      this.userLocation = {
        lat: parseFloat(this.getAttribute('user-lat')),
        lng: parseFloat(this.getAttribute('user-lng'))
      };
      this.render();
    }
  }

  async loadLocations() {
    try {
      const response = await fetch('/locations-index.json');
      const data = await response.json();
      this.locations = data.locations || [];
      this.detectUserLocation();
      this.render();
    } catch (error) {
      console.warn('[StoreLocator] Failed to load locations:', error);
      this.renderError();
    }
  }

  detectUserLocation() {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          this.userLocation = {
            lat: position.coords.latitude,
            lng: position.coords.longitude
          };
          this.setAttribute('user-lat', position.coords.latitude);
          this.setAttribute('user-lng', position.coords.longitude);
          this.render();
        },
        (error) => {
          console.warn('[StoreLocator] Geolocation denied:', error.message);
          this.render();
        },
        { timeout: 5000, enableHighAccuracy: false }
      );
    } else {
      this.render();
    }
  }

  calculateDistance(lat1, lng1, lat2, lng2) {
    const R = 6371; // Earth radius in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLng/2) * Math.sin(dLng/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  }

  getSortedLocations() {
    let locations = [...this.locations];
    
    if (this.userLocation) {
      locations.forEach(loc => {
        loc.distance = this.calculateDistance(
          this.userLocation.lat, this.userLocation.lng,
          loc.geo.latitude, loc.geo.longitude
        );
      });
      locations.sort((a, b) => a.distance - b.distance);
    }
    
    return locations.slice(0, this.maxResults);
  }

  formatDistance(km) {
    if (km < 1) return `${Math.round(km * 1000)} m`;
    return `${km.toFixed(1)} km`;
  }

  getCurrentOpeningStatus(location) {
    if (!location.openingHours) return { open: null, text: 'Nedostupno' };
    
    const now = new Date();
    const day = now.toLocaleDateString('en-US', { weekday: 'long' });
    const currentTime = now.getHours() * 60 + now.getMinutes();
    
    const todayHours = location.openingHours.find(h => h.dayOfWeek === day);
    if (!todayHours) return { open: false, text: 'Zatvoreno danas' };
    
    const openTime = this.timeToMinutes(todayHours.opens);
    const closeTime = this.timeToMinutes(todayHours.closes);
    
    if (currentTime >= openTime && currentTime < closeTime) {
      const remaining = closeTime - currentTime;
      return { open: true, text: `Otvoreno do ${todayHours.closes} (${Math.floor(remaining/60)}h ${remaining%60}min)` };
    } else {
      return { open: false, text: `Zatvoreno (otvara se ${todayHours.opens})` };
    }
  }

  timeToMinutes(timeStr) {
    const [hours, minutes] = timeStr.split(':').map(Number);
    return hours * 60 + minutes;
  }

  render() {
    const sortedLocations = this.getSortedLocations();
    
    this.shadowRoot.innerHTML = `
      <style>
        :host { display: block; font-family: inherit; }
        .store-locator { padding: var(--space-4); }
        .locator-header { margin-bottom: var(--space-6); }
        .locator-title { font-size: var(--text-2xl); font-weight: var(--font-bold); margin-bottom: var(--space-2); }
        .locator-subtitle { color: var(--color-text-tertiary); }
        
        .locator-search { margin-bottom: var(--space-6); }
        .search-input { width: 100%; padding: var(--space-3) var(--space-4); border: 1px solid var(--color-border); border-radius: var(--radius-md); font-size: var(--text-base); }
        .search-input:focus { outline: none; border-color: var(--color-primary); box-shadow: 0 0 0 3px var(--color-primary-light); }
        
        .user-location { padding: var(--space-3) var(--space-4); background: var(--color-primary-light); border-radius: var(--radius-md); margin-bottom: var(--space-4); display: flex; align-items: center; gap: var(--space-2); font-size: var(--text-sm); color: var(--color-primary); }
        .user-location.hidden { display: none; }
        
        .stores-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); gap: var(--space-4); }
        .store-card { border: 1px solid var(--color-border); border-radius: var(--radius-lg); padding: var(--space-4); background: var(--color-bg-primary); transition: box-shadow var(--duration-fast); }
        .store-card:hover { box-shadow: var(--shadow-md); }
        .store-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: var(--space-3); }
        .store-name { font-size: var(--text-lg); font-weight: var(--font-semibold); color: var(--color-text-primary); }
        .store-type { font-size: var(--text-xs); font-weight: var(--font-medium); padding: 2px 8px; border-radius: var(--radius-full); background: var(--color-primary-light); color: var(--color-primary); text-transform: capitalize; }
        .store-address { color: var(--color-text-secondary); font-size: var(--text-sm); margin-bottom: var(--space-2); line-height: 1.5; }
        .store-meta { display: flex; flex-wrap: wrap; gap: var(--space-3); margin-bottom: var(--space-3); font-size: var(--text-sm); color: var(--color-text-tertiary); }
        .store-meta-item { display: flex; align-items: center; gap: 4px; }
        .distance-badge { background: var(--color-primary-light); color: var(--color-primary); padding: 2px 8px; border-radius: var(--radius-full); font-size: var(--text-xs); font-weight: var(--font-medium); }
        .store-hours { padding: var(--space-3); background: var(--color-bg-secondary); border-radius: var(--radius-md); font-size: var(--text-sm); }
        .hours-status { display: flex; align-items: center; gap: var(--space-2); margin-bottom: var(--space-2); font-weight: var(--font-medium); }
        .status-dot { width: 8px; height: 8px; border-radius: 50%; }
        .status-dot.open { background: var(--color-success); }
        .status-dot.closed { background: var(--color-error); }
        .hours-text { font-size: var(--text-sm); color: var(--color-text-secondary); }
        .store-actions { display: flex; gap: var(--space-2); margin-top: var(--space-4); }
        .btn-store { flex: 1; padding: var(--space-2) var(--space-4); border-radius: var(--radius-md); font-size: var(--text-sm); font-weight: var(--font-medium); text-align: center; text-decoration: none; transition: all var(--duration-fast); }
        .btn-primary { background: var(--color-primary); color: var(--color-text-inverse); }
        .btn-primary:hover { background: var(--color-primary-dark); }
        .btn-secondary { background: var(--color-bg-secondary); color: var(--color-text-primary); border: 1px solid var(--color-border); }
        .btn-secondary:hover { background: var(--color-bg-tertiary); }
        .no-results { text-align: center; padding: var(--space-12); color: var(--color-text-tertiary); }
        
        @media (max-width: 640px) {
          .stores-grid { grid-template-columns: 1fr; }
        }
      </style>
      <div class="store-locator">
        <div class="locator-header">
          <h2 class="locator-title">Naši Store-ovi</h2>
          <p class="locator-subtitle">Pronađite najbliži DALLI store i dođite na kupovinu</p>
        </div>
        
        <div class="locator-search">
          <input type="text" class="search-input" placeholder="Pretraži po gradu, adresi ili imenu store-a..." id="storeSearch">
        </div>
        
        ${this.userLocation ? `
          <div class="user-location">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><circle cx="12" cy="12" r="3"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41"/></svg>
            <span>Vaša lokacija detektovana. Sortiramo store-ove po udaljenosti.</span>
        ` : ''}
        
        <div class="stores-grid" id="storesGrid">
          ${sortedLocations.length === 0 ? `
            <div class="no-results">
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" style="margin: 0 auto var(--space-4); color: var(--color-border);"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/></svg>
              <h3>Nema dostupnih store-ova</h3>
              <p>Pokušajte drugačiji pretragu ili proverite kasnije.</p>
            </div>
          ` : sortedLocations.map(loc => {
            const status = this.getCurrentOpeningStatus(loc);
            return `
              <article class="store-card" data-location="${loc.slug}">
                <div class="store-header">
                  <div>
                    <h3 class="store-name">${loc.name}</h3>
                    <span class="store-type">${loc.type}</span>
                  </div>
                  ${this.showDistance && loc.distance !== undefined ? `
                    <span class="distance-badge">${this.formatDistance(loc.distance)}</span>
                  ` : ''}
                </div>
                <address class="store-address">${loc.address}</address>
                <div class="store-meta">
                  <span class="store-meta-item">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
                    ${loc.phone}
                  </span>
                  ${loc.email ? `
                    <span class="store-meta-item">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
                      ${loc.email}
                    </span>
                  ` : ''}
                </div>
                <div class="store-hours">
                  <div class="hours-status">
                    <span class="status-dot ${loc.openingHours ? 'open' : 'closed'}"></span>
                    <span>${loc.openingHours ? 'Otvoreno' : 'Zatvoreno'}</span>
                  </div>
                  <div class="hours-text">${loc.openingHours ? loc.openingHours.map(h => `${h.dayOfWeek}: ${h.opens}-${h.closes}`).join('<br>') : 'Radno vreme nedostupno'}</div>
                </div>
                <div class="store-actions">
                  <a href="${loc.url}" class="btn-store btn-primary">Detalji & Putanja</a>
                  <a href="${loc.googleMapsUrl}" target="_blank" rel="noopener" class="btn-store btn-secondary">Google Maps</a>
                </div>
              </article>
            `}).join('')}
        </div>
      </div>
    `;
    
    // Add search functionality
    const searchInput = this.shadowRoot.getElementById('storeSearch');
    if (searchInput) {
      searchInput.addEventListener('input', (e) => this.filterStores(e.target.value));
    }
  }

  filterStores(query) {
    const cards = this.shadowRoot.querySelectorAll('.store-card');
    const q = query.toLowerCase().trim();
    
    cards.forEach(card => {
      const name = card.querySelector('.store-name')?.textContent?.toLowerCase() || '';
      const address = card.querySelector('.store-address')?.textContent?.toLowerCase() || '';
      const matches = !q || name.includes(q) || address.includes(q);
      card.style.display = matches ? 'block' : 'none';
    });
  }

  renderError() {
    this.shadowRoot.innerHTML = `
      <style>
        .error { text-align: center; padding: var(--space-8); color: var(--color-text-tertiary); }
      </style>
      <div class="error">
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" style="margin: 0 auto var(--space-4); color: var(--color-border);"><circle cx="12" cy="12" r="10"/><path d="M12 8v4M12 16h.01"/></svg>
        <p>Ne mogu da učitam lokacije store-ova. Molimo pokušajte kasnije.</p>
      </div>
    `;
  }
}

if (!customElements.get('store-locator')) {
  customElements.define('store-locator', StoreLocator);
}

export default StoreLocator;