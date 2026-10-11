const esbuild = require('esbuild');
const fs = require('fs');
const path = require('path');

// Files that pass node --check and are ready for build
const workingFiles = [
  'admin-new/js/components/ui/LoyaltyGamification.js',
  'admin-new/js/components/ui/PersonalizationEngine.js',
  'admin-new/js/components/ui/Analytics.js',
  'admin-new/js/components/ui/AdminComponents.js',
  'admin-new/js/components/ui/DataDisplay.js',
  'admin-new/js/components/ui/MLEngine.js',
  'admin-new/js/components/ui/I18n.js',
  'admin-new/js/components/ui/UtilityLayout.js',
  'admin-new/js/components/ui/FormControl.js',
  'admin-new/js/components/ui/OmnichannelPOS.js',
  'admin-new/js/components/ui/Navigation.js',
  'admin-new/js/components/ui/Card.js',
  'admin-new/js/components/ui/ABTestingFramework.js',
  'admin-new/js/components/ui/SEO.js',
  'admin/widgets/redirect-manager.js',
  'admin/widgets/system-test.js',
  'admin/widgets/competitor-gap.js',
  'admin/widgets/currency-manager.js',
  'admin-new/js/seo/core-web-vitals/models.js',
];

const problematicFiles = {
  'admin/widgets/link-auditor-ui.js': 'Bracket balancing issues in React.createElement chains',
  'admin/widgets/promotions-manager.js': 'Extra ) in table wrapper closing',
  'admin/widgets/markets-regions.js': 'Unexpected } in renderContent function',
  'admin/widgets/language-manager.js': 'Unexpected ; in React.createElement chain',
  'admin-new/js/seo/core-web-vitals/dashboard.js': 'TypeScript syntax (interfaces, type annotations)',
  'admin-new/js/seo/core-web-vitals/scoring.js': 'TypeScript syntax (interfaces, type annotations)',
  'admin-new/js/seo/core-web-vitals/index.js': 'TypeScript syntax (as any cast)',
};

async function runBuild() {
  console.log('🔨 Building widget bundle...\n');
  
  const outDir = path.join(__dirname, 'dist', 'widgets');
  fs.mkdirSync(outDir, { recursive: true });
  
  let success = 0;
  let failed = 0;
  
  for (const file of workingFiles) {
    const inputPath = path.join(__dirname, file);
    const outFile = path.basename(file, '.js') + '.min.js';
    const outputPath = path.join(outDir, outFile);
    
    if (!fs.existsSync(inputPath)) {
      console.log('⚠️  Missing: ' + file);
      failed++;
      continue;
    }
    
    try {
      await esbuild.build({
        entryPoints: [inputPath],
        bundle: true,
        outfile: outputPath,
        format: 'esm',
        target: 'es2020',
        minify: true,
        sourcemap: true,
        platform: 'browser',
        define: {
          'process.env.NODE_ENV': '"production"'
        },
        banner: {
          js: '/* ' + path.basename(file) + ' - Built ' + new Date().toISOString() + ' */'
        }
      });
      console.log('✅ ' + file + ' -> ' + outFile);
      success++;
    } catch (e) {
      console.log('❌ ' + file + ': ' + e.message);
      failed++;
    }
  }
  
  console.log('\n📊 Build Summary: ' + success + ' succeeded, ' + failed + ' failed');
  
  console.log('\n⚠️  Files needing manual fixes:');
  for (const [file, issue] of Object.entries(problematicFiles)) {
    console.log('  - ' + file + ': ' + issue);
  }
  
  // Create index file
  const indexContent = '// Widget bundle index - auto-generated\n' +
    workingFiles.map(f => {
      const name = path.basename(f, '.js');
      return 'export { default as ' + name + ' } from \'./' + path.basename(f, '.js') + '.min.js\';';
    }).join('\n') +
    '\n\nexport const WIDGET_STATUS = {\n' +
    '  working: ' + JSON.stringify(workingFiles.map(f => path.basename(f, '.js')), null, 2) + ',\n' +
    '  problematic: ' + JSON.stringify(problematicFiles, null, 2) + '\n' +
  '};';
  
  fs.writeFileSync(path.join(outDir, 'index.js'), indexContent);
  console.log('\n📦 Index file created at dist/widgets/index.js');
}

runBuild().catch(e => {
  console.error('Build failed:', e);
  process.exit(1);
});
