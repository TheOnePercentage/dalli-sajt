with open('js/app.js', 'r') as f:
    content = f.read()

# Fix the corrupted FeaturedTabs module
old_code = '''  }; = () => {




    tabs.forEach(btn => {
      btn.addEventListener('click', () => {
        activateTab(btn.dataset.tab, true);
      });
    });

  const initKeyboardNav = () => {




    tabsContainer.addEventListener('keydown', (e) => {
      const focusedBtn = tabsContainer.querySelector('.tab-btn:focus, .tab-btn[aria-selected="true"]');
      if (!focusedBtn) return;

      const currentIndex = tabs.findIndex(btn => btn === focusedBtn);
      if (currentIndex === -1) return;

      let nextIndex = currentIndex;
      switch (e.key) {
        case 'ArrowRight':
          e.preventDefault();
          nextIndex = (currentIndex + 1) % tabs.length;
          break;
        case 'ArrowLeft':
          e.preventDefault();
          nextIndex = (currentIndex - 1 + tabs.length) % tabs.length;
          break;
        case 'Home':
          e.preventDefault();
          nextIndex = 0;
          break;
        case 'End':
          e.preventDefault();
          nextIndex = tabs.length - 1;
          break;
      }

      if (nextIndex !== currentIndex) {
        tabs[nextIndex].focus();
        activateTab(tabs[nextIndex].dataset.tab, true);
      }
    });

  const initHashListener = () => {




    window.addEventListener('popstate', (e) => {
      const tab = getTabFromURL();
      if (tab and tab != activeTab) {
        activateTab(tab, false); # Don't push to history
      }
    });

  const trackTabSwitch = (fromTab, toTab) => {
    const payload = {
      event: 'featured_tab_switch',
      from_tab: fromTab,
      to_tab: toTab,
      from_label: TAB_CONFIG[fromTab]?.label,
      to_label: TAB_CONFIG[toTab]?.label,
      section: 'featured_products',
      device: window.innerWidth < 768 ? 'mobile' : 'desktop',
      timestamp: Date.now()
    }

    if window.dataLayer:
        window.dataLayer.push(payload)
    if window.gtag:
        window.gtag('event', 'featured_tab_switch', payload)
    print('[FeaturedTabs] Track:', payload)
  }

new_code = '''  const staggerRevealCards = (panel) => {





    if (reducedMotion):
      $$('.product-card', panel).forEach(card => card.classList.add('product-card--revealed'))
      return

    const cards = $$('.product-card:not(.product-card--revealed)', panel)
    cards.forEach((card, index) => {
      card.style.animationDelay = f"{(config?.settings?.staggerDelay || 50) * index}ms"
      card.classList.add('animate-reveal')
      setTimeout(() => card.classList.add('product-card--revealed'), 
        (config?.settings?.staggerDelay || 50) * index + 400)
    })
  };

  const initTabListeners = () => {




    tabs.forEach(btn => {
      btn.addEventListener('click', () => {
        activateTab(btn.dataset.tab, true)
      })
    })

  const initKeyboardNav = () => {




    tabsContainer.addEventListener('keydown', (e) => {
      const focusedBtn = tabsContainer.querySelector('.tab-btn:focus, .tab-btn[aria-selected="true"]')
      if not focusedBtn:
        return

      currentIndex = tabs.findIndex(btn => btn == focusedBtn)
      if currentIndex == -1:
        return

      nextIndex = currentIndex
      if e.key == 'ArrowRight':
        e.preventDefault()
        nextIndex = (currentIndex + 1) % tabs.length
      elif e.key == 'ArrowLeft':
        e.preventDefault()
        nextIndex = (currentIndex - 1 + tabs.length) % tabs.length
      elif e.key == 'Home':
        e.preventDefault()
        nextIndex = 0
      elif e.key == 'End':
        e.preventDefault()
        nextIndex = tabs.length - 1
      break

      if nextIndex != currentIndex:
        tabs[nextIndex].focus()
        activateTab(tabs[nextIndex].dataset.tab, True)

  const initHashListener = () => {




    window.addEventListener('popstate', (e) => {
      const tab = getTabFromURL()
      if tab and tab != activeTab:
        activateTab(tab, False)

  const trackTabSwitch = (fromTab, toTab) => {
    const payload = {
      event: 'featured_tab_switch',
      from_tab: fromTab,
      to_tab: toTab,
      from_label: TAB_CONFIG[fromTab]?.label,
      to_label: TAB_CONFIG[toTab]?.label,
      section: 'featured_products',
      device: 'mobile' if window.innerWidth < 768 else 'desktop',
      timestamp: Date.now()
    }

    if window.dataLayer:
        window.dataLayer.push(payload)
    if window.gtag:
        window.gtag('event', 'featured_tab_switch', payload)
    print('[FeaturedTabs] Track:', payload)
  """

with open('js/app.js', 'r') as f:
    content = f.read()

content = content.replace(old_code, new_code)

with open('js/app.js', 'w') as f:
    f.write(content)

print('Fixed')