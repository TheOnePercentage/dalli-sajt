#!/usr/bin/env python3
"""
Add data-i18n attributes to all public HTML files.
"""

import re
import json
from pathlib import Path

# Load locale keys for matching
locale_keys = {}
for locale in ['sr', 'en']:
    with open(f'/home/alpatron/Documents/Default Project/moonlight-sajt/js/i18n/locales/{locale}.json') as f:
        locale_keys[locale] = json.load(f)

def find_translation_key(text, locale='sr'):
    """Find matching translation key for text."""
    normalized = ' '.join(text.split())
    if len(normalized) < 4:
        return None
    
    data = locale_keys.get(locale, {})
    
    def search(obj, target, prefix=''):
        for key, value in obj.items():
            current = f'{prefix}.{key}' if prefix else key
            if isinstance(value, str):
                if value.strip() == target:
                    return current
                # Fuzzy match: only for substantial phrases with word boundaries
                # Prevents short values like "od" matching inside "Products"/"body"
                if len(value) >= 10 and len(target) >= 10:
                    if re.search(r'\b' + re.escape(value) + r'\b', target):
                        return current
                    if re.search(r'\b' + re.escape(target) + r'\b', value):
                        return current
            elif isinstance(value, dict):
                result = search(value, target, current)
                if result:
                    return result
        return None
    
    return search(data, normalized)

def add_i18n_to_html(content):
    """Add data-i18n attributes to HTML content."""
    
    # Common patterns to replace
    replacements = {
        # Navigation
        '<span itemprop="name">Početna</span>': '<span itemprop="name" data-i18n="common.home">Početna</span>',
        '<span itemprop="name">Svi Proizvodi</span>': '<span itemprop="name" data-i18n="common.products">Svi Proizvodi</span>',
        '<span itemprop="name">Muška Garderoba</span>': '<span itemprop="name" data-i18n="categories.men.title">Muška Garderoba</span>',
        '<span itemprop="name">Ženska Garderoba</span>': '<span itemprop="name" data-i18n="categories.women.title">Ženska Garderoba</span>',
        '<span itemprop="name">Duksevi</span>': '<span itemprop="name" data-i18n="categories.hoodies.title">Duksevi</span>',
        '<span itemprop="name">Korpa</span>': '<span itemprop="name" data-i18n="common.cart">Korpa</span>',
        '<span itemprop="name">Početna</span>': '<span itemprop="name" data-i18n="common.home">Početna</span>',
        
        # Breadcrumbs
        '<span itemprop="name">Početna</span>': '<span itemprop="name" data-i18n="common.home">Početna</span>',
        '<span class="breadcrumb-current" itemprop="name">': '<span class="breadcrumb-current" itemprop="name" data-i18n="',
        
        # Header
        '<span class="tagline">Muška i Ženska Garderoba</span>': '<span class="tagline" data-i18n="header.tagline">Muška i Ženska Garderoba</span>',
        
        # Hero sections
        '<h1>Duksevi (Hoodie)</h1>': '<h1 data-i18n="categories.hoodies.title">Duksevi (Hoodie)</h1>',
        '<h2 id="subcat-title" class="section-title" style="display:none;">Podkategorije</h2>': '<h2 id="subcat-title" class="section-title" style="display:none;" data-i18n="common.categories">Podkategorije</h2>',
        
        # Subcategory links
        '<span>Muški Duksevi</span>': '<span data-i18n="categories.hoodies.men">Muški Duksevi</span>',
        '<span>Ženski Duksevi</span>': '<span data-i18n="categories.hoodies.women">Ženski Duksevi</span>',
        
        # SEO Content
        '<h2 id="seo-title" class="section-title" style="display: none;">Zašto DALLI za duksevi (hoodie)</h2>': '<h2 id="seo-title" class="section-title" style="display: none;" data-i18n="seo.title">Zašto DALLI za duksevi (hoodie)</h2>',
        '<h3>🇷🇸 Brza Dostava po Srbiji</h3>': '<h3 data-i18n="features.delivery.title">🇷🇸 Brza Dostava po Srbiji</h3>',
        '<p>Isporučujemo po celoj Srbiji u roku 1-3 radna dana. Besplatna dostava za porudžbine preko 5.000 RSD.</p>': '<p data-i18n="features.delivery.desc">Isporučujemo po celoj Srbiji u roku 1-3 radna dana. Besplatna dostava za porudžbine preko 5.000 RSD.</p>',
        '<h3>🔄 30 Dana za Vraćanje</h3>': '<h3 data-i18n="features.returns.title">🔄 30 Dana za Vraćanje</h3>',
        '<p>Niste sigurni u veličinu? Vratite proizvod u roku od 30 dana. Troškove povratne dostave pokrivamo mi.</p>': '<p data-i18n="features.returns.desc">Niste sigurni u veličinu? Vratite proizvod u roku od 30 dana. Troškove povratne dostave pokrivamo mi.</p>',
        '<h3>💳 Plaćanje Pri Preuzimanju</h3>': '<h3 data-i18n="features.cod.title">💳 Plaćanje Pri Preuzimanju</h3>',
        '<p>Kupujete bez rizika - plaćate tek kad paket stigne u ruke. Gotovina ili kartica kod kurira.</p>': '<p data-i18n="features.cod.desc">Kupujete bez rizika - plaćate tek kad paket stigne u ruke. Gotovina ili kartica kod kurira.</p>',
        '<h3>🧵 Kvalitet Prvo</h3>': '<h3 data-i18n="features.quality.title">🧵 Kvalitet Prvo</h3>',
        '<p>100% organski pamuk, gruba tkanina 320g/m² za duksevi, vaprotek tehnologija za trenerke.</p>': '<p data-i18n="features.quality.desc">100% organski pamuk, gruba tkanina 320g/m² za duksevi, vaprotek tehnologija za trenerke.</p>',
        
        # FAQ
        '<h2 id="faq-title" class="section-title">Često postavljana pitanja o duksevima (hoodie)</h2>': '<h2 id="faq-title" class="section-title" data-i18n="faq.title">Često postavljana pitanja o duksevima (hoodie)</h2>',
        
        # Buttons
        '<button class="btn btn-secondary" id="cookieReject">Odbij sve</button>': '<button class="btn btn-secondary" id="cookieReject" data-i18n="cookieConsent.rejectAll">Odbij sve</button>',
        '<button class="btn btn-primary" id="cookieAccept">Prihvati sve</button>': '<button class="btn btn-primary" id="cookieAccept" data-i18n="cookieConsent.acceptAll">Prihvati sve</button>',
        '<button class="btn btn-ghost" id="cookieSettings">Podešavanja</button>': '<button class="btn btn-ghost" id="cookieSettings" data-i18n="cookieConsent.settings">Podešavanja</button>',
        
        # Footer
        '<span class="tagline">Muška i Ženska Garderoba</span>': '<span class="tagline" data-i18n="header.tagline">Muška i Ženska Garderoba</span>',
    }
    
    for old, new in replacements.items():
        content = content.replace(old, new)
    
    return content

def process_file(filepath):
    """Process a single HTML file."""
    print(f"Processing {filepath}...")
    
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # Ensure i18n script is present
    if 'i18n.js' not in content:
        # Add preload
        content = content.replace(
            '<meta name="twitter:image:alt" content="DALLI premium garderoba">',
            '<meta name="twitter:image:alt" content="DALLI premium garderoba">\n  <link rel="preload" as="script" href="/js/i18n/i18n.js">'
        )
        # Add script tag
        content = content.replace(
            '</head>',
            '  <script src="/js/i18n/i18n.js"></script>\n</head>'
        )
    
    # Add data-i18n attributes
    content = add_i18n_to_html(content)
    
    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(content)
    
    print(f"  ✓ Processed {filepath}")

# List of HTML files to process
html_files = [
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
]

if __name__ == '__main__':
    for f in html_files:
        if Path(f).exists():
            process_file(f)
    print("\nDone!")