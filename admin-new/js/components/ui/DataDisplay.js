/**
 * DALLI Data Display Component System
 * Mobile-first, accessible, SEO-optimized
 * Components: Table, List, Grid, Masonry, Carousel/Slider, Accordion, Tree View, Timeline
 */

export class DataDisplay {
  static init() {
    this.initTables();
    this.initLists();
    this.initGrids();
    this.initCarousels();
    this.initAccordions();
    this.initTreeViews();
    this.initTimelines();
  }

  // ============================================================
  // TABLES (Sortable, Filterable, Virtualized, Responsive)
  // ============================================================
  static initTables() {
    document.querySelectorAll('.data-table').forEach(table => {
      const sortable = table.classList.contains('data-table--sortable');
      const filterable = table.classList.contains('data-table--filterable');
      const paginated = table.classList.contains('data-table--paginated');
      const selectable = table.classList.contains('data-table--selectable');
      const virtualized = table.classList.contains('data-table--virtualized');

      // Sortable headers
      if (sortable) {
        table.querySelectorAll('th[data-sort]').forEach(th => {
          th.style.cursor = 'pointer';
          th.setAttribute('role', 'columnheader');
          th.setAttribute('aria-sort', 'none');
          th.addEventListener('click', () => this.sortTable(table, th));
        });
      }

      // Row selection
      if (selectable) {
        const selectAll = table.querySelector('thead input[type="checkbox"]');
        const rowCheckboxes = table.querySelectorAll('tbody input[type="checkbox"]');

        if (selectAll) {
          selectAll.addEventListener('change', (e) => {
            rowCheckboxes.forEach(cb => {
              cb.checked = e.target.checked;
              cb.closest('tr')?.classList.toggle('selected', e.target.checked);
            });
          });
        }

        rowCheckboxes.forEach(cb => {
          cb.addEventListener('change', () => {
            cb.closest('tr')?.classList.toggle('selected', cb.checked);
            const allChecked = Array.from(rowCheckboxes).every(cb => cb.checked);
            const selectAll = table.querySelector('thead input[type="checkbox"]');
            if (selectAll) selectAll.checked = allChecked;
          });
        });
      }

      // Pagination
      if (paginated) {
        this.initTablePagination(table);
      }

      // Virtualized scrolling
      if (virtualized) {
        this.initVirtualizedTable(table);
      }

      // Responsive card view on mobile
      this.initResponsiveTable(table);
    });
  }

  static sortTable(table, th) {
    const column = th.dataset.sort;
    const tbody = table.querySelector('tbody');
    const rows = Array.from(tbody.querySelectorAll('tr'));
    const currentSort = th.getAttribute('aria-sort');
    const isAsc = currentSort !== 'ascending';
    
    // Reset all headers
    table.querySelectorAll('th[aria-sort]').forEach(h => h.setAttribute('aria-sort', 'none'));
    th.setAttribute('aria-sort', isAsc ? 'ascending' : 'descending');

    rows.sort((a, b) => {
      const aVal = a.querySelector(`td[data-col="${column}"]`)?.textContent.trim() || '';
      const bVal = b.querySelector(`td[data-col="${column}"]`)?.textContent.trim() || '';
      
      // Try numeric comparison
      const aNum = parseFloat(aVal.replace(/[^\d.-]/g, ''));
      const bNum = parseFloat(bVal.replace(/[^\d.-]/g, ''));
      
      if (!isNaN(aNum) && !isNaN(bNum)) {
        return isAsc ? aNum - bNum : bNum - aNum;
      }
      
      return isAsc ? aVal.localeCompare(bVal, 'sr') : bVal.localeCompare(aVal, 'sr');
    });

    tbody.append(...rows);
  }

  static initTablePagination(table) {
    const tbody = table.querySelector('tbody');
    const rows = Array.from(tbody.querySelectorAll('tr'));
    const perPage = parseInt(table.dataset.perPage || '10', 10);
    const totalPages = Math.ceil(rows.length / perPage);
    let currentPage = 1;

    const renderPage = (page) => {
      const start = (page - 1) * perPage;
      const end = start + perPage;
      rows.forEach((row, index) => {
        row.style.display = (index >= start && index < end) ? '' : 'none';
      });
      
      // Update pagination controls
      const pagination = table.parentElement.querySelector('.table-pagination');
      if (pagination) {
        pagination.innerHTML = this.renderPagination(page, totalPages);
      }
    };

    if (totalPages > 1) {
      const pagination = document.createElement('div');
      pagination.className = 'table-pagination';
      pagination.innerHTML = this.renderPagination(1, totalPages);
      table.parentElement.appendChild(pagination);

      pagination.addEventListener('click', (e) => {
        const btn = e.target.closest('[data-page]');
        if (btn) {
          currentPage = parseInt(btn.dataset.page, 10);
          renderPage(currentPage);
        }
      });

      renderPage(1);
    }
  }

  static renderPagination(current, total) {
    let html = '<nav class="table-pagination__nav" aria-label="Stranice tabele">';
    
    if (current > 1) {
      html += `<button class="pagination__link" data-page="${current - 1}" aria-label="Prethodna"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="15 18 9 12 15 6"/></svg></button>`;
    }

    const start = Math.max(1, current - 2);
    const end = Math.min(total, current + 2);

    for (let i = start; i <= end; i++) {
      html += `<button class="pagination__link ${i === current ? 'pagination__link--current' : ''}" data-page="${i}" ${i === current ? 'aria-current="page"' : ''}>${i}</button>`;
    }

    if (current < total) {
      html += `<button class="pagination__link" data-page="${current + 1}" aria-label="Sledeća"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 18 15 12 9 6"/></svg></button>`;
    }

    html += '</nav>';
    return html;
  }

  static initVirtualizedTable(table) {
    const tbody = table.querySelector('tbody');
    const rows = Array.from(tbody.querySelectorAll('tr'));
    const rowHeight = 48; // Approximate row height
    const container = table.parentElement;
    const visibleCount = Math.ceil(container.clientHeight / rowHeight) + 2;

    let scrollTop = 0;
    let startIndex = 0;
    let endIndex = Math.min(rows.length, visibleCount);

    const renderVisible = () => {
      rows.forEach((row, index) => {
        row.style.display = (index >= startIndex && index < endIndex) ? '' : 'none';
      });
    };

    const onScroll = () => {
      scrollTop = container.scrollTop;
      startIndex = Math.floor(scrollTop / rowHeight);
      endIndex = Math.min(rows.length, startIndex + visibleCount);
      renderVisible();
    };

    container.addEventListener('scroll', onScroll, { passive: true });
    renderVisible();
  }

  static initResponsiveTable(table) {
    // Add card view for mobile
    const thead = table.querySelector('thead');
    const headers = Array.from(thead.querySelectorAll('th')).map(th => th.textContent.trim());

    table.querySelectorAll('tbody tr').forEach(row => {
      const cells = Array.from(row.querySelectorAll('td'));
      const dataAttrs = cells.map((cell, i) => `data-label="${headers[i]}"`).join(' ');
      cells.forEach((cell, i) => {
        cell.setAttribute('data-label', headers[i]);
      });
    });

    // Add mobile card class
    table.classList.add('data-table--responsive');
  }

  // ============================================================
  // LISTS (Virtualized, Grouped, Searchable)
  // ============================================================
  static initLists() {
    document.querySelectorAll('.data-list').forEach(list => {
      const virtualized = list.classList.contains('data-list--virtualized');
      const grouped = list.classList.contains('data-list--grouped');
      const searchable = list.classList.contains('data-list--searchable');

      if (searchable) {
        const searchInput = list.querySelector('[data-list-search]');
        const items = list.querySelectorAll('[data-list-item]');

        if (searchInput) {
          let debounce;
          searchInput.addEventListener('input', (e) => {
            clearTimeout(debounce);
            debounce = setTimeout(() => {
              const query = e.target.value.toLowerCase();
              list.querySelectorAll('[data-list-item]').forEach(item => {
                const text = item.textContent.toLowerCase();
                item.style.display = text.includes(query) ? '' : 'none';
              });
            }, 150);
          });
        }
      }

      if (virtualized) {
        this.initVirtualizedList(list);
      }

      if (grouped) {
        this.initGroupedList(list);
      }
    });
  }

  static initVirtualizedList(list) {
    const items = Array.from(list.querySelectorAll('[data-list-item]'));
    const container = list;
    const itemHeight = 60;
    const visibleCount = Math.ceil(container.clientHeight / itemHeight) + 2;

    let startIndex = 0;
    let endIndex = Math.min(items.length, visibleCount);

    const renderVisible = () => {
      items.forEach((item, index) => {
        item.style.display = (index >= startIndex && index < endIndex) ? '' : 'none';
      });
    };

    list.addEventListener('scroll', () => {
      startIndex = Math.floor(list.scrollTop / 60);
      endIndex = Math.min(items.length, startIndex + Math.ceil(list.clientHeight / 60) + 2);
      items.forEach((item, index) => {
        item.style.display = (index >= startIndex && index < endIndex) ? '' : 'none';
      });
    }, { passive: true });

    renderVisible();
  }

  static initGroupedList(list) {
    const groups = list.querySelectorAll('[data-list-group]');
    
    groups.forEach(group => {
      const header = group.querySelector('[data-group-header]');
      const content = group.querySelector('[data-group-content]');
      const toggle = header?.querySelector('[data-group-toggle]');

      if (toggle && content) {
        header.style.cursor = 'pointer';
        header.addEventListener('click', () => {
          const isOpen = content.classList.toggle('open');
          toggle.setAttribute('aria-expanded', isOpen);
        });

        // Keyboard support
        header.addEventListener('keydown', (e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            content.classList.toggle('open');
            toggle.setAttribute('aria-expanded', content.classList.contains('open'));
          }
        });
      }
    });
  }

  // ============================================================
  // GRIDS (Masonry, Auto-fit, Responsive)
  // ============================================================
  static initGrids() {
    document.querySelectorAll('.data-grid').forEach(grid => {
      const masonry = grid.classList.contains('data-grid--masonry');
      const autoFit = grid.classList.contains('data-grid--auto-fit');

      if (masonry) {
        // CSS Grid masonry
        grid.style.gridTemplateColumns = 'repeat(auto-fill, minmax(280px, 1fr))';
        grid.style.gridAutoRows = 'auto';
        grid.style.gap = 'var(--space-4)';
      }

      if (autoFit) {
        const minWidth = grid.dataset.minItemWidth || '280px';
        grid.style.gridTemplateColumns = `repeat(auto-fill, minmax(${minWidth}, 1fr))`;
      }
    });
  }

  // ============================================================
  // CAROUSELS / SLIDERS
  // ============================================================
  static initCarousels() {
    document.querySelectorAll('.carousel').forEach(carousel => {
      const track = carousel.querySelector('.carousel__track');
      const slides = Array.from(carousel.querySelectorAll('.carousel__slide'));
      const prevBtn = carousel.querySelector('.carousel__prev');
      const nextBtn = carousel.querySelector('.carousel__next');
      const dotsContainer = carousel.querySelector('.carousel__dots');
      const autoplay = carousel.dataset.autoplay !== 'false';
      const interval = parseInt(carousel.dataset.interval || '5000', 10);
      const infinite = carousel.dataset.infinite !== 'false';

      let currentIndex = 0;
      let autoPlayTimer = null;
      let isDragging = false;
      let startX = 0;

      const slideCount = slides.length;
      if (slideCount <= 1) return;

      // Create dots
      if (dotsContainer && !dotsContainer.children.length) {
        slides.forEach((_, i) => {
          const dot = document.createElement('button');
          dot.className = 'carousel__dot' + (i === 0 ? ' active' : '');
          dot.setAttribute('aria-label', `Pređi na slajd ${i + 1}`);
          dot.dataset.index = i;
          dotsContainer.appendChild(dot);
        });
      }

      const updateSlide = () => {
        const track = carousel.querySelector('.carousel__track');
        if (track) {
          track.style.transform = `translateX(-${currentIndex * 100}%)`;
        }

        // Update dots
        carousel.querySelectorAll('.carousel__dot').forEach((dot, i) => {
          dot.classList.toggle('active', i === currentIndex);
          dot.setAttribute('aria-selected', i === currentIndex);
        });

        // Update buttons
        if (prevBtn) prevBtn.disabled = !infinite && currentIndex === 0;
        if (nextBtn) nextBtn.disabled = !infinite && currentIndex === slides.length - 1;
      };

      const goToSlide = (index) => {
        if (index < 0) {
          currentIndex = infinite ? slides.length - 1 : 0;
        } else if (index >= slides.length) {
          currentIndex = infinite ? 0 : slides.length - 1;
        } else {
          currentIndex = index;
        }
        updateSlide();
      };

      const nextSlide = () => goToSlide(currentIndex + 1);
      const prevSlide = () => goToSlide(currentIndex - 1);

      if (nextBtn) nextBtn.addEventListener('click', nextSlide);
      if (prevBtn) prevBtn.addEventListener('click', prevSlide);

      // Dot navigation
      carousel.querySelectorAll('.carousel__dot').forEach((dot, i) => {
        dot.addEventListener('click', () => goToSlide(parseInt(dot.dataset.index, 10)));
      });

      // Keyboard navigation
      carousel.addEventListener('keydown', (e) => {
        if (e.key === 'ArrowRight') nextSlide();
        else if (e.key === 'ArrowLeft') prevSlide();
      });

      // Touch/swipe support
      if (track) {
        track.addEventListener('pointerdown', (e) => {
          isDragging = true;
          startX = e.clientX;
          track.style.transition = 'none';
        });

        track.addEventListener('pointermove', (e) => {
          if (!isDragging) return;
          const deltaX = e.clientX - startX;
          track.style.transform = `translateX(${-currentIndex * 100 + deltaX / track.offsetWidth * 100}%)`;
        });

        track.addEventListener('pointerup', (e) => {
          if (!isDragging) return;
          isDragging = false;
          track.style.transition = '';
          const deltaX = e.clientX - startX;
          if (Math.abs(deltaX) > 50) {
            deltaX > 0 ? goToSlide(currentIndex - 1) : goToSlide(currentIndex + 1);
          } else {
            updateSlide();
          }
        });
      }

      // Autoplay
      const startAutoplay = () => {
        if (autoplay && !autoPlayTimer) {
          autoPlayTimer = setInterval(nextSlide, interval);
        }
      };

      const stopAutoplay = () => {
        clearInterval(autoPlayTimer);
        autoPlayTimer = null;
      };

      carousel.addEventListener('mouseenter', stopAutoplay);
      carousel.addEventListener('mouseleave', startAutoplay);
      carousel.addEventListener('focusin', stopAutoplay);
      carousel.addEventListener('focusout', startAutoplay);

      startAutoplay();
      updateSlide();
    });
  }

  // ============================================================
  // ACCORDIONS
  // ============================================================
  static initAccordions() {
    document.querySelectorAll('.accordion').forEach(accordion => {
      const single = accordion.classList.contains('accordion--single');
      const items = accordion.querySelectorAll('.accordion__item');

      items.forEach(item => {
        const header = item.querySelector('.accordion__header');
        const content = item.querySelector('.accordion__content');
        const trigger = header?.querySelector('.accordion__trigger');

        if (!header || !content) return;

        header.addEventListener('click', (e) => {
          if (e.target.closest('a, button') && !e.target.closest('.accordion__trigger')) return;
          const isOpen = item.classList.toggle('open');
          header.setAttribute('aria-expanded', isOpen);
          content.style.maxHeight = isOpen ? content.scrollHeight + 'px' : '0';

          if (single && isOpen) {
            accordion.querySelectorAll('.accordion__item').forEach(other => {
              if (other !== item) {
                other.classList.remove('open');
                other.querySelector('.accordion__header')?.setAttribute('aria-expanded', 'false');
                other.querySelector('.accordion__content').style.maxHeight = '0';
              }
            });
          }
        });

        // Keyboard support
        header.addEventListener('keydown', (e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            header.click();
          }
        });

        // Initialize state
        if (item.classList.contains('open')) {
          content.style.maxHeight = content.scrollHeight + 'px';
        }
      });
    });
  }

  // ============================================================
  // TREE VIEWS
  // ============================================================
  static initTreeViews() {
    for (const tree of document.querySelectorAll('.tree-view')) {
      const items = tree.querySelectorAll('.tree-view__item');

      items.forEach(item => {
        const toggle = item.querySelector('.tree-view__toggle');
        const children = item.querySelector('.tree-view__children');

        if (toggle && children) {
          const isOpen = item.classList.contains('open');
          toggle.setAttribute('aria-expanded', isOpen);
          children.style.display = isOpen ? 'block' : 'none';

          toggle.addEventListener('click', (e) => {
            e.stopPropagation();
            const isOpen = item.classList.toggle('open');
            toggle.setAttribute('aria-expanded', isOpen);
            children.style.display = isOpen ? 'block' : 'none';
          });

          // Keyboard
          toggle.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              toggle.click();
            } else if (e.key === 'ArrowRight' && !item.classList.contains('open')) {
              e.preventDefault();
              toggle.click();
            } else if (e.key === 'ArrowLeft' && item.classList.contains('open')) {
              e.preventDefault();
              toggle.click();
            } else if (e.key === 'ArrowDown') {
              e.preventDefault();
              const next = item.nextElementSibling;
              next?.querySelector('.tree-view__toggle')?.focus();
            } else if (e.key === 'ArrowUp') {
              e.preventDefault();
              const prev = item.previousElementSibling;
              prev?.querySelector('.tree-view__toggle')?.focus();
            }
          });
        }

        // Keyboard on item
        item.addEventListener('keydown', (e) => {
          if (e.key === 'ArrowRight' && !item.classList.contains('open') && children) {
            e.preventDefault();
            item.classList.add('open');
            children.style.display = 'block';
            toggle?.setAttribute('aria-expanded', 'true');
          } else if (e.key === 'ArrowLeft' && item.classList.contains('open') && children) {
            e.preventDefault();
            item.classList.remove('open');
            children.style.display = 'none';
            toggle?.setAttribute('aria-expanded', 'false');
          }
        });
      });
    }
  }

  // ============================================================
  // TIMELINES
  // ============================================================
  static initTimelines() {
    document.querySelectorAll('.timeline').forEach(timeline => {
      const items = timeline.querySelectorAll('.timeline__item');

      // Animate on scroll
      const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            entry.target.classList.add('timeline__item--visible');
            observer.unobserve(entry.target);
          }
        });
      }, { threshold: 0.1, rootMargin: '0px 0px -50px 0px' });

      items.forEach(item => observer.observe(item));

      // Expandable timeline items
      timeline.querySelectorAll('.timeline__toggle').forEach(toggle => {
        const content = toggle.nextElementSibling;
        if (!content) return;

        toggle.addEventListener('click', () => {
          const isOpen = toggle.parentElement.classList.toggle('open');
          toggle.setAttribute('aria-expanded', isOpen);
          content.style.maxHeight = isOpen ? content.scrollHeight + 'px' : '0';
        });
      });
    });
  }

  // ============================================================
  // RESPONSIVE TABLE CARDS (Mobile)
  // ============================================================
  static initResponsiveCards() {
    document.querySelectorAll('.data-table--responsive tbody tr').forEach(row => {
      row.classList.add('data-table__row--card');
    });
  }

  // ============================================================
  // TABLE SEARCH/FILTER
  // ============================================================
  static addTableSearch(tableId, searchInputId) {
    const table = document.getElementById(tableId);
    const input = document.getElementById(searchInputId);
    if (!table || !input) return;

    const rows = table.querySelectorAll('tbody tr');
    let debounce;

    input.addEventListener('input', (e) => {
      clearTimeout(debounce);
      debounce = setTimeout(() => {
        const query = e.target.value.toLowerCase();
        rows.forEach(row => {
          const text = row.textContent.toLowerCase();
          row.style.display = text.includes(query) ? '' : 'none';
        });
      }, 150);
    });
  }

  // ============================================================
  // EXPORT FOR ANALYTICS
  // ============================================================
  static trackEvent(eventName, data = {}) {
    if (typeof gtag !== 'undefined') {
      gtag('event', eventName, data);
    }
    if (typeof fbq !== 'undefined') {
      fbq('trackCustom', eventName, data);
    }
  }
}

// Auto-initialize
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => DataDisplay.init());
} else {
  DataDisplay.init();
}

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { DataDisplay };
}

if (typeof window !== 'undefined') {
  window.DataDisplay = DataDisplay;
}