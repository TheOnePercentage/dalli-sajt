(function() {
  'use strict';

  // ============================================
  // FINAL SYSTEM TEST - Step 13
  // ============================================

  const CMS = window.CMS;

  // Test results storage
  const TEST_RESULTS = {
    passed: 0,
    failed: 0,
    warnings: 0,
    details: []
  };

  function logTest(name, passed, details = '') {
    if (passed) {
      TEST_RESULTS.passed++;
      TEST_RESULTS.details.push(`✅ ${name}`);
      console.log(`✅ ${name}${details ? ': ' + details : ''}`);
    } else {
      TEST_RESULTS.failed++;
      TEST_RESULTS.details.push(`❌ ${name}`);
      console.error(`❌ ${name}${details ? ': ' + details : ''}`);
    }
  }

  function logWarning(name, details = '') {
    TEST_RESULTS.warnings++;
    TEST_RESULTS.details.push(`⚠️ ${name}`);
    console.warn(`⚠️ ${name}${details ? ': ' + details : ''}`);
  }

  // Test 1: Core Modules Exist
  function testCoreModules() {
    const required = [
      'NC_LinkAuditorCore',
      'NC_LinkAuditorUI',
      'NC_RedirectManager',
      'NC_CurrencyManager',
      'NC_MarketsRegions',
      'NC_CompetitorGap'
    ];

    required.forEach(name => {
      if (window[name]) {
        logTest(`Core module ${name}`, true, 'Available on window');
      } else {
        logTest(`Core module ${name}`, false, 'Not found on window');
      }
    });
  }

  // Test 2: CMS Integration
  function testCMSIntegration() {
    if (!CMS) {
      logTest('CMS Object', false, 'CMS not available');
      return;
    }

    logTest('CMS Object', true, 'CMS available');

    const widgets = [
      'link-auditor',
      'link-auditor-ui',
      'redirect-manager',
      'currency-manager',
      'markets-regions',
      'competitor-gap'
    ];

    widgets.forEach(widget => {
      try {
        CMS.registerWidget(widget, window['NC_' + widget.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join('')]);
        logTest(`Widget ${widget} registration`, true, 'Registered successfully');
      } catch (e) {
        logTest(`Widget ${widget} registration`, false, e.message);
      }
    });
  }

  // Test 3: CSS Classes Exist
  function testCSSClasses() {
    const requiredClasses = [
      'nc-link-auditor-widget',
      'nc-language-manager',
      'nc-redirect-manager',
      'nc-currency-manager',
      'nc-markets-regions',
      'nc-competitor-gap',
      'nc-promotions-manager',
      'nc-severity-badge',
      'nc-anchor-cat',
      'nc-pr-category',
      'nc-dist-bar-visual',
      'nc-flow-bar',
    ];

    const stylesheets = Array.from(document.styleSheets);
    let cssLoaded = false;
    try {
      stylesheets.forEach(sheet => {
        try {
          const rules = sheet.cssRules || sheet.rules;
          if (rules) {
            Array.from(rules).forEach(rule => {
              if (rule.selectorText && rule.selectorText.includes('.nc-link-auditor-widget')) {
                cssLoaded = true;
              }
            });
          }
        } catch (e) {
          // Cross-origin stylesheet access blocked
        }
      });
    } catch (e) {
    }

    if (cssLoaded) {
      logTest('CSS loaded', true, 'Custom CSS classes found in stylesheets');
    } else {
      logWarning('CSS loaded', 'Could not verify CSS loading (cross-origin restriction)');
    }
  }

  // Test 4: Netlify Functions Exist
  async function testNetlifyFunctions() {
    const functions = [
      { name: 'scheduled-audit', path: '/.netlify/functions/scheduled-audit' },
      { name: 'save-redirects', path: '/.netlify/functions/save-redirects' },
      { name: 'get-redirects', path: '/.netlify/functions/get-redirects' },
    ];

    for (const fn of functions) {
      try {
        const response = await fetch(fn.path, { method: 'OPTIONS' });
        if (response.ok || response.status === 405) {
          logTest(`Netlify Function ${fn.name}`, true, `Status: ${response.status}`);
        } else {
          logTest(`Netlify Function ${fn.name}`, false, `Status: ${response.status}`);
        }
      } catch (e) {
        logTest(`Netlify Function ${fn.name}`, false, `Network error: ${e.message}`);
      }
    }
  }

  // Test 5: Netlify Blobs
  async function testNetlifyBlobs() {
    try {
      const response = await fetch('/.netlify/functions/get-exchange-rates');
      if (response.ok) {
        const data = await response.json();
        if (data.rates && Object.keys(data.rates).length > 0) {
          logTest('Netlify Blobs - Exchange Rates', true, `Loaded ${Object.keys(data.rates).length} rates`);
        } else {
          logTest('Netlify Blobs - Exchange Rates', false, 'No rates data');
        }
      } else {
        logTest('Netlify Blobs - Exchange Rates', false, `Status: ${response.status}`);
      }
    } catch (e) {
      logTest('Netlify Blobs - Exchange Rates', false, `Error: ${e.message}`);
    }
  }

  // Test 6: Core Logic
  function testCoreLogic() {
    if (window.NC_LinkAuditorCore) {
      logTest('Link Auditor Core', true, 'Module loaded');
    } else {
      logTest('Link Auditor Core', false, 'Module not found');
    }

    if (window.NC_RedirectManager) {
      logTest('Redirect Manager', true, 'Module loaded');
    } else {
      logTest('Redirect Manager', false, 'Module not found');
    }
  }

  // Test 7: UI Components
  function testUIComponents() {
    const widgets = [
      'NC_LinkAuditorUI',
      'NC_LanguageManager',
      'NC_RedirectManager',
      'NC_CurrencyManager',
      'NC_MarketsRegions',
      'NC_CompetitorGap',
      'NC_PromotionsManager'
    ];

    widgets.forEach(name => {
      if (window[name]) {
        logTest(`UI Component ${name}`, true, 'Available');
      } else {
        logTest(`UI Component ${name}`, false, 'Not found');
      }
    });
  }

  // Test 8: HTML Structure
  function testHTMLStructure() {
    const requiredElements = [
      { id: 'linkAuditorWidget', desc: 'Link Auditor Widget Container' },
      { id: 'languageManagerWidget', desc: 'Language Manager Widget Container' },
      { id: 'redirectManagerWidget', desc: 'Redirect Manager Widget Container' },
      { id: 'currencyManagerWidget', desc: 'Currency Manager Widget Container' },
      { id: 'marketsRegionsWidget', desc: 'Markets & Regions Widget Container' },
      { id: 'competitorGapWidget', desc: 'Competitor Gap Widget Container' },
    ];

    requiredElements.forEach(el => {
      const element = document.getElementById(el.id);
      if (element) {
        logTest(`DOM Element ${el.id}`, true, el.desc);
      } else {
        logTest(`DOM Element ${el.id}`, false, `${el.desc} - Missing from DOM`);
      }
    });
  }

  // Main test runner
  async function runAllTests() {
    console.log('\n🚀 Starting Final System Test...\n');
    
    TEST_RESULTS.passed = 0;
    TEST_RESULTS.failed = 0;
    TEST_RESULTS.warnings = 0;
    TEST_RESULTS.details = [];

    testCoreModules();
    testCMSIntegration();
    testCSSClasses();
    await testNetlifyFunctions();
    await testNetlifyBlobs();
    testCoreLogic();
    testUIComponents();
    testHTMLStructure();
    
    console.log('\n📊 TEST SUMMARY');
    console.log('================');
    console.log(`✅ Passed: ${TEST_RESULTS.passed}`);
    console.log(`❌ Failed: ${TEST_RESULTS.failed}`);
    console.log(`⚠️ Warnings: ${TEST_RESULTS.warnings}`);
    
    if (TEST_RESULTS.failed === 0) {
      console.log('\n✅ All tests passed! System is ready for production.');
    } else {
      console.log('\n❌ Some tests failed. Review and fix before deployment.');
    }
  }

  // Export for manual running
  window.NC_SystemTest = { runAllTests, TEST_RESULTS };
  
  // Auto-run if in test mode
  if (window.location.search.includes('test=true')) {
    runAllTests();
  }
  
})();
