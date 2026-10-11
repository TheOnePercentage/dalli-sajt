#!/usr/bin/env python3
"""
Automated i18n attribute injection for HTML files.
Adds data-i18n attributes to text content based on translation keys.
"""

import re
import json
from pathlib import Path
from html.parser import HTMLParser

class I18nHTMLParser(HTMLParser):
    def __init__(self, translations):
        super().__init__()
        self.translations = translations
        self.output = []
        self.tag_stack = []
        self.in_script = False
        self.in_style = False
        
    def handle_starttag(self, tag, attrs):
        if tag in ('script', 'style'):
            if tag == 'script':
                self.in_script = True
            elif tag == 'style':
                self.in_style = True
        
        self.tag_stack.append(tag)
        attr_str = ' '.join(f'{k}="{v}"' for k, v in attrs if v is not None)
        self.output.append(f'<{tag}{" " + attr_str if attr_str else ""}>')
        
    def handle_endtag(self, tag):
        if tag in ('script', 'style'):
            if tag == 'script':
                self.in_script = False
            elif tag == 'style':
                self.in_style = False
        
        if self.tag_stack and self.tag_stack[-1] == tag:
            self.tag_stack.pop()
        self.output.append(f'</{tag}>')
        
    def handle_data(self, data):
        if self.in_script or self.in_style:
            self.output.append(data)
            return
            
        # Skip whitespace-only text nodes
        if not data.strip():
            self.output.append(data)
            return
            
        # Skip if inside certain tags that shouldn't be translated
        if self.tag_stack and self.tag_stack[-1] in ('script', 'style', 'code', 'pre', 'svg', 'title', 'meta', 'link'):
            self.output.append(data)
            return
            
        # Try to find matching translation
        key = self._find_translation_key(data.strip())
        if key:
            self.output.append(f'<span data-i18n="{key}">{data}</span>')
        else:
            self.output.append(data)
            
    def _find_translation_key(self, text):
        """Find matching translation key for text."""
        # Normalize text for matching
        normalized = ' '.join(text.split())
        if len(normalized) < 4:
            return None
            
        # Search in translations
        for locale_file in ['sr', 'en']:
            locale_path = Path(f'/home/alpatron/Documents/Default Project/moonlight-sajt/js/i18n/locales/{locale_file}.json')
            if locale_path.exists():
                with open(locale_path) as f:
                    translations = json.load(f)
                
                key = self._search_translations(translations, normalized)
                if key:
                    return key
        return None
    
    def _search_translations(self, obj, target, prefix=''):
        """Recursively search for translation match."""
        for key, value in obj.items():
            current_key = f'{prefix}.{key}' if prefix else key
            if isinstance(value, str):
                if value.strip() == target:
                    return current_key
                # Fuzzy match: only for substantial phrases with word boundaries
                # Prevents short values like "od" matching inside "Products"/"body"
                if len(value) >= 10 and len(target) >= 10:
                    if re.search(r'\b' + re.escape(value) + r'\b', target):
                        return current_key
                    if re.search(r'\b' + re.escape(target) + r'\b', value):
                        return current_key
            elif isinstance(value, dict):
                result = self._search_translations(value, target, current_key)
                if result:
                    return result
        return None
    
    def get_output(self):
        return ''.join(self.output)

def add_i18n_script(html_content):
    """Add i18n script to head if not present."""
    if 'i18n.js' in html_content:
        return html_content
    
    # Add preload link
    if 'i18n/i18n.js' not in html_content:
        html_content = html_content.replace(
            '<meta name="twitter:image:alt" content="DALLI premium garderoba">',
            '<meta name="twitter:image:alt" content="DALLI premium garderoba">\n  <link rel="preload" as="script" href="/js/i18n/i18n.js">'
        )
    
    # Add script before closing head
    if 'i18n/i18n.js' not in html_content:
        html_content = html_content.replace(
            '</head>',
            '  <script src="/js/i18n/i18n.js"></script>\n</head>'
        )
    return html_content

def process_html_file(filepath):
    """Process a single HTML file."""
    print(f"Processing {filepath}...")
    
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # Add i18n script
    content = add_i18n_script(content)
    
    # Write back
    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(content)
    
    print(f"  ✓ Added i18n script to {filepath}")

# Process all HTML files
html_files = [
    '/home/alpatron/Documents/Default Project/moonlight-sajt/index.html',
    '/home/alpatron/Documents/Default Project/moonlight-sajt/about.html',
    '/home/alpatron/Documents/Default Project/moonlight-sajt/advertising.html',
    '/home/alpatron/Documents/Default Project/moonlight-sajt/archive.html',
    '/home/alpatron/Documents/Default Project/moonlight-sajt/blog-index.html',
    '/home/alpatron/Documents/Default Project/moonlight-sajt/blog-post.html',
    '/home/alpatron/Documents/Default Project/moonlight-sajt/cart.html',
    '/home/alpatron/Documents/Default Project/moonlight-sajt/category.html',
    '/home/alpatron/Documents/Default Project/moonlight-sajt/checkout.html',
    '/home/alpatron/Documents/Default Project/moonlight-sajt/complaints.html',
    '/home/alpatron/Documents/Default Project/moonlight-sajt/dukseri.html',
    '/home/alpatron/Documents/Default Project/moonlight-sajt/muska-garderoba.html',
    '/home/alpatron/Documents/Default Project/moonlight-sajt/newsletter.html',
    '/home/alpatron/Documents/Default Project/moonlight-sajt/orders.html',
    '/home/alpatron/Documents/Default Project/moonlight-sajt/products.html',
    '/home/alpatron/Documents/Default Project/moonlight-sajt/profile.html',
    '/home/alpatron/Documents/Default Project/moonlight-sajt/proizvod-carape.html',
    '/home/alpatron/Documents/Default Project/moonlight-sajt/proizvod-dugorukava-majica.html',
    '/home/alpatron/Documents/Default Project/moonlight-sajt/proizvod-muska-duks-hoodie.html',
    '/home/alpatron/Documents/Default Project/moonlight-sajt/proizvod-muska-sportska-trenerka.html',
    '/home/alpatron/Documents/Default Project/moonlight-sajt/proizvod-osnovna-majica.html',
    '/home/alpatron/Documents/Default Project/moonlight-sajt/proizvod-salica-za-kafU.html',
    '/home/alpatron/Documents/Default Project/moonlight-sajt/proizvod-zenska-duks-hoodie.html',
    '/home/alpatron/Documents/Default Project/moonlight-sajt/proizvod-zenska-kapuljaca-trenerka.html',
    '/home/alpatron/Documents/Default Project/moonlight-sajt/settings.html',
    '/home/alpatron/Documents/Default Project/moonlight-sajt/tag.html',
    '/home/alpatron/Documents/Default Project/moonlight-sajt/wishlist.html',
    '/home/alpatron/Documents/Default Project/moonlight-sajt/zenska-garderoba.html',
    '/home/alpatron/Documents/Default Project/moonlight-sajt/proizvod-muski-duks-hoodie.html',
]

if __name__ == '__main__':
    for f in html_files:
        if Path(f).exists():
            process_html_file(f)
    print("\nDone!")