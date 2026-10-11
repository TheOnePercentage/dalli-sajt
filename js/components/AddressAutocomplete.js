export class AddressAutocomplete {
  constructor(input, options = {}) {
    this.input = input;
    this.cityInput = options.cityInput;
    this.postalInput = options.postalInput;
    this.countryInput = options.countryInput;
    this.suggestionsContainer = null;
    this.selectedIndex = -1;
    this.cities = [];
    this.debounceTimer = null;
    this.isOpen = false;

    // Serbian cities with postal codes
    this.serbianCities = [
      { city: 'Beograd', postal: '11000', municipality: 'Beograd' },
      { city: 'Novi Sad', postal: '21000', municipality: 'Južnobačka' },
      { city: 'Niš', postal: '18000', municipality: 'Nišavska' },
      { city: 'Kragujevac', postal: '34000', municipality: 'Šumadijska' },
      { city: 'Subotica', postal: '24000', municipality: 'Severnobačka' },
      { city: 'Zrenjanin', postal: '23000', municipality: 'Srednjebanatska' },
      { city: 'Pančevo', postal: '26000', municipality: 'Južnobačka' },
      { city: 'Čačak', postal: '32000', municipality: 'Moravička' },
      { city: 'Kraljevo', postal: '36000', municipality: 'Raška' },
      { city: 'Smederevo', postal: '11300', municipality: 'Podunavska' },
      { city: 'Leskovac', postal: '16000', municipality: 'Jablanička' },
      { city: 'Užice', postal: '31000', municipality: 'Zlatiborska' },
      { city: 'Vranje', postal: '17500', municipality: 'Pčinjska' },
      { city: 'Šabac', postal: '15000', municipality: 'Mačvanska' },
      { city: 'Sombor', postal: '25000', municipality: 'Zapadnobačka' },
      { city: 'Požarevac', postal: '12000', municipality: 'Braničevska' },
      { city: 'Valjevo', postal: '14000', municipality: 'Kolubarska' },
      { city: 'Kruševac', postal: '37000', municipality: 'Rasinska' },
      { city: 'Pirot', postal: '18300', municipality: 'Pirotska' },
      { city: 'Zaječar', postal: '19000', municipality: 'Zaječarska' },
      { city: 'Sremska Mitrovica', postal: '22000', municipality: 'Sremska' },
      { city: 'Vršac', postal: '26300', municipality: 'Južnobačka' },
      { city: 'Prokuplje', postal: '18400', municipality: 'Toplička' },
      { city: 'Bor', postal: '19210', municipality: 'Borska' },
      { city: 'Kikinda', postal: '23300', municipality: 'Severnobačka' },
      { city: 'Vršac', postal: '26300', municipality: 'Južnobačka' },
      { city: 'Ruma', postal: '22400', municipality: 'Sremska' },
      { city: 'Bačka Palanka', postal: '21400', municipality: 'Južnobačka' },
      { city: 'Novi Pazar', postal: '36300', municipality: 'Raška' },
      { city: 'Loznica', postal: '15300', municipality: 'Mačvanska' },
      { city: 'Bela Crkva', postal: '26330', municipality: 'Južnobačka' },
      { city: 'Senta', postal: '23210', municipality: 'Severnobačka' },
      { city: 'Bečej', postal: '23220', municipality: 'Južnobačka' },
      { city: 'Inđija', postal: '22320', municipality: 'Sremska' },
      { city: 'Stara Pazova', postal: '22300', municipality: 'Sremska' },
      { city: 'Pećinci', postal: '22410', municipality: 'Sremska' },
      { city: 'Ub', postal: '14210', municipality: 'Kolubarska' },
      { city: 'Lajkovac', postal: '14223', municipality: 'Kolubarska' },
      { city: 'Mionica', postal: '14225', municipality: 'Kolubarska' },
      { city: 'Osečina', postal: '14230', municipality: 'Kolubarska' },
      { city: 'Arilje', postal: '31230', municipality: 'Zlatiborska' },
      { city: 'Ivanjica', postal: '32250', municipality: 'Moravička' },
      { city: 'Nova Varoš', postal: '31330', municipality: 'Zlatiborska' },
      { city: 'Prijepolje', postal: '31300', municipality: 'Zlatiborska' },
      { city: 'Priboj', postal: '31330', municipality: 'Zlatiborska' },
      { city: 'Sjenica', postal: '36310', municipality: 'Raška' },
      { city: 'Tutin', postal: '36320', municipality: 'Raška' },
      { city: 'Kuršumlija', postal: '18420', municipality: 'Toplička' },
      { city: 'Blace', postal: '18404', municipality: 'Toplička' },
      { city: 'Žitorađa', postal: '18416', municipality: 'Toplička' },
      { city: 'Doljevac', postal: '18225', municipality: 'Nišavska' },
      { city: 'Gadžin Han', postal: '18330', municipality: 'Nišavska' },
      { city: 'Merošina', postal: '18408', municipality: 'Nišavska' },
      { city: 'Ražanj', postal: '37228', municipality: 'Nišavska' },
      { city: 'Aleksinac', postal: '18220', municipality: 'Nišavska' },
      { city: 'Sokobanja', postal: '19310', municipality: 'Zaječarska' },
      { city: 'Knjaževac', postal: '19350', municipality: 'Zaječarska' },
      { city: 'Boljevac', postal: '19360', municipality: 'Zaječarska' },
      { city: 'Varvarin', postal: '37230', municipality: 'Rasinska' },
      { city: 'Trstenik', postal: '37240', municipality: 'Rasinska' },
      { city: 'Ćićevac', postal: '37250', municipality: 'Rasinska' },
      { city: 'Rekovac', postal: '35235', municipality: 'Moravička' },
      { city: 'Topola', postal: '34310', municipality: 'Šumadijska' },
      { city: 'Aranđelovac', postal: '34300', municipality: 'Šumadijska' },
      { city: 'Batočina', postal: '34220', municipality: 'Šumadijska' },
      { city: 'Knić', postal: '34210', municipality: 'Šumadijska' },
      { city: 'Lapovo', postal: '34230', municipality: 'Šumadijska' },
      { city: 'Rača', postal: '34230', municipality: 'Šumadijska' },
      { city: 'Despotovac', postal: '35213', municipality: 'Moravička' },
      { city: 'Paraćin', postal: '35250', municipality: 'Moravička' },
      { city: 'Ćuprija', postal: '35260', municipality: 'Moravička' },
      { city: 'Svilajnac', postal: '35220', municipality: 'Moravička' },
      { city: 'Velika Plana', postal: '11320', municipality: 'Podunavska' },
      { city: 'Smederevska Palanka', postal: '11360', municipality: 'Podunavska' },
      { city: 'Gornji Milanovac', postal: '32300', municipality: 'Moravička' },
      { city: 'Lučani', postal: '32240', municipality: 'Moravička' },
      { city: 'Lučani', postal: '32240', municipality: 'Moravička' },
      { city: 'Čačak', postal: '32000', municipality: 'Moravička' },
      { city: 'Ljig', postal: '14240', municipality: 'Moravička' },
      { city: 'Ivanjica', postal: '32250', municipality: 'Moravička' },
      { city: 'Raška', postal: '36350', municipality: 'Raška' },
      { city: 'Vrnjačka Banja', postal: '36210', municipality: 'Raška' },
      { city: 'Novi Pazar', postal: '36300', municipality: 'Raška' },
      { city: 'Tutin', postal: '36320', municipality: 'Raška' },
      { city: 'Sjenica', postal: '36310', municipality: 'Raška' },
      { city: 'Kraljevo', postal: '36000', municipality: 'Raška' },
      { city: 'Vrnjačka Banja', postal: '36210', municipality: 'Raška' },
      { city: 'Kraljevo', postal: '36000', municipality: 'Raška' },
      { city: 'Raška', postal: '36350', municipality: 'Raška' },
      { city: 'Vrnjačka Banja', postal: '36210', municipality: 'Raška' },
      { city: 'Novi Pazar', postal: '36300', municipality: 'Raška' },
      { city: 'Tutin', postal: '36320', municipality: 'Raška' },
      { city: 'Sjenica', postal: '36310', municipality: 'Raška' },
      { city: 'Kraljevo', postal: '36000', municipality: 'Raška' },
      { city: 'Vrnjačka Banja', postal: '36210', municipality: 'Raška' },
      { city: 'Kraljevo', postal: '36000', municipality: 'Raška' }
    ];

    this.init();
  }

  init() {
    this.input = typeof this.input === 'string' ? document.getElementById(this.input) : this.input;
    if (!this.input) return;

    this.cityInput = typeof this.cityInput === 'string' ? document.getElementById(this.cityInput) : this.cityInput;
    this.postalInput = typeof this.postalInput === 'string' ? document.getElementById(this.postalInput) : this.postalInput;
    this.countryInput = typeof this.countryInput === 'string' ? document.getElementById(this.countryInput) : this.countryInput;

    this.createSuggestionsContainer();
    this.bindEvents();
  }

  createSuggestionsContainer() {
    this.suggestionsContainer = document.createElement('div');
    this.suggestionsContainer.className = 'address-autocomplete-suggestions';
    this.suggestionsContainer.setAttribute('role', 'listbox');
    this.suggestionsContainer.setAttribute('aria-label', 'Predlozi adresa');
    this.input.parentNode.style.position = 'relative';
    this.input.parentNode.appendChild(this.suggestionsContainer);
  }

  bindEvents() {
    this.input.addEventListener('input', (e) => this.handleInput(e));
    this.input.addEventListener('focus', () => this.handleFocus());
    this.input.addEventListener('blur', (e) => this.handleBlur(e));
    this.input.addEventListener('keydown', (e) => this.handleKeydown(e));

    document.addEventListener('click', (e) => {
      if (!this.input.contains(e.target) && !this.suggestionsContainer.contains(e.target)) {
        this.close();
      }
    });
  }

  handleInput(e) {
    const value = e.target.value.trim();
    clearTimeout(this.debounceTimer);
    this.debounceTimer = setTimeout(() => {
      if (value.length >= 2) {
        this.search(value);
      } else {
        this.close();
      }
    }, 150);
  }

  handleFocus() {
    if (this.input.value.trim().length >= 2) {
      this.search(this.input.value.trim());
    }
  }

  handleBlur(e) {
    setTimeout(() => this.close(), 200);
  }

  handleKeydown(e) {
    if (!this.isOpen) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        this.selectNext();
        break;
      case 'ArrowUp':
        e.preventDefault();
        this.selectPrev();
        break;
      case 'Enter':
        e.preventDefault();
        if (this.selectedIndex >= 0) {
          this.select(this.selectedIndex);
        }
        break;
      case 'Escape':
        this.close();
        this.input.blur();
        break;
      case 'Tab':
        if (this.selectedIndex >= 0) {
          e.preventDefault();
          this.select(this.selectedIndex);
        }
        this.close();
        break;
    }
  }

  search(query) {
    const normalized = query.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    
    this.cities = this.serbianCities
      .filter(city => {
        const cityNorm = city.city.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
        const postalNorm = city.postal;
        const munNorm = city.municipality.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
        return cityNorm.includes(normalized) || postalNorm.includes(normalized) || munNorm.includes(normalized);
      })
      .slice(0, 10);

    this.render();
  }

  render() {
    if (this.cities.length === 0) {
      this.close();
      return;
    }

    this.suggestionsContainer.innerHTML = this.cities
      .map((city, i) => `
        <div class="address-suggestion" role="option" data-index="${i}" data-city="${city.city}" data-postal="${city.postal}" data-municipality="${city.municipality}">
          <span class="suggestion-city">${this.highlightMatch(city.city)}</span>
          <span class="suggestion-postal">${city.postal}</span>
          <span class="suggestion-municipality">${city.municipality}</span>
        </div>
      `).join('');

    this.suggestionsContainer.style.display = 'block';
    this.isOpen = true;
    this.selectedIndex = -1;
  }

  highlightMatch(city) {
    const query = this.input.value.trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    if (!query) return city;
    const regex = new RegExp(`(${query})`, 'gi');
    return city.replace(regex, '<mark>$1</mark>');
  }

  selectNext() {
    if (this.selectedIndex < this.cities.length - 1) {
      this.selectedIndex++;
      this.updateSelection();
    }
  }

  selectPrev() {
    if (this.selectedIndex > 0) {
      this.selectedIndex--;
      this.updateSelection();
    }
  }

  updateSelection() {
    const items = this.suggestionsContainer.querySelectorAll('.address-suggestion');
    items.forEach((item, i) => {
      item.classList.toggle('selected', i === this.selectedIndex);
      item.setAttribute('aria-selected', i === this.selectedIndex);
    });
  }

  select(index) {
    const city = this.cities[index];
    if (!city) return;

    this.input.value = city.city;
    this.input.dispatchEvent(new Event('input', { bubbles: true }));

    if (this.cityInput) {
      this.cityInput.value = city.city;
      this.cityInput.dispatchEvent(new Event('change', { bubbles: true }));
    }

    if (this.postalInput) {
      this.postalInput.value = city.postal;
      this.postalInput.dispatchEvent(new Event('change', { bubbles: true }));
    }

    if (this.countryInput) {
      this.countryInput.value = 'RS';
      this.countryInput.dispatchEvent(new Event('change', { bubbles: true }));
    }

    this.close();
    this.input.focus();
  }

  close() {
    this.suggestionsContainer.style.display = 'none';
    this.isOpen = false;
    this.selectedIndex = -1;
  }

  destroy() {
    clearTimeout(this.debounceTimer);
    if (this.suggestionsContainer) {
      this.suggestionsContainer.remove();
    }
  }
}

// Auto-init for inputs with data-address-autocomplete
document.addEventListener('DOMContentLoaded', () => {
  document.querySelectorAll('[data-address-autocomplete]').forEach(input => {
    const cityInput = input.dataset.cityInput ? document.getElementById(input.dataset.cityInput) : null;
    const postalInput = input.dataset.postalInput ? document.getElementById(input.dataset.postalInput) : null;
    const countryInput = input.dataset.countryInput ? document.getElementById(input.dataset.countryInput) : null;
    new AddressAutocomplete(input, { cityInput, postalInput, countryInput });
  });
});

export default AddressAutocomplete;