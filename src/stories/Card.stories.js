import { Card } from '../../admin-new/js/components/ui/Card.js';

export default {
  title: 'Components/Card',
  component: Card,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component: 'DALLI Card component with multiple variants: product, content, feature, stats, testimonial, skeleton.',
      },
    },
  },
  argTypes: {
    variant: {
      control: 'select',
      options: ['product', 'content', 'feature', 'stats', 'testimonial', 'skeleton'],
      description: 'Card variant',
    },
    interactive: {
      control: 'boolean',
      description: 'Interactive card',
    },
  },
};

export const ProductCard = {
  args: {
    variant: 'product',
    interactive: true,
    productData: {
      id: 1,
      name: 'Osnovna Majica',
      slug: 'osnovna-majica',
      price: 1290,
      salePrice: 1090,
      currency: 'RSD',
      category: 'majice',
      subcategory: 'kratki-rukav',
      gender: 'unisex',
      description: 'Udobna pamukna majica za svaki dan. 100% organski pamuk, 180g/m².',
      shortDescription: 'Osnovna majica za svakodnevnu nošu',
      images: {
        main: '/images/majica.svg',
        gallery: ['/images/majica-1.svg', '/images/majica-2.svg'],
      },
      colors: [
        { name: 'Bela', hex: '#FFFFFF' },
        { name: 'Crna', hex: '#000000' },
        { name: 'Navy', hex: '#000080' },
        { name: 'Siva', hex: '#808080' }
      ],
      sizes: ['XS', 'S', 'M', 'L', 'XL', 'XXL'],
      rating: 4.8,
      reviewCount: 124,
      badge: { type: 'bestseller', text: 'Bestseller' },
      inStock: true,
      bestseller: true,
    },
    onAddToCart: (id, card) => {
      console.log('Add to cart:', id);
      alert(`Dodato u korpu: ${card.options.productData.name}`);
    },
    onWishlist: (id, card) => {
      console.log('Wishlist toggle:', id);
      const btn = card.element.querySelector('[data-action="wishlist"]');
      btn.classList.toggle('active');
    },
  },
};

export const ProductCardOnSale = {
  args: {
    variant: 'product',
    interactive: true,
    productData: {
      id: 2,
      name: 'Muški Duks',
      slug: 'muski-duks-hoodie',
      price: 4290,
      salePrice: 3490,
      currency: 'RSD',
      category: 'dukseri',
      subcategory: 'kapuljaca',
      gender: 'muski',
      description: 'Gruba pamuk 320 g/m², kenguru džep, dvostruko prešiveni ševovi.',
      shortDescription: 'Muški duks sa kapuljačom',
      images: {
        main: '/images/duks-musk.svg',
        gallery: ['/images/dukseri-1.svg', '/images/dukseri-2.svg'],
      },
      colors: [
        { name: 'Crna', hex: '#000000' },
        { name: 'Navy', hex: '#000080' },
        { name: 'Siva', hex: '#808080' }
      ],
      sizes: ['S', 'M', 'L', 'XL', 'XXL', 'XXXL'],
      rating: 4.9,
      reviewCount: 89,
      badge: { type: 'accent', text: '-19%' },
      inStock: true,
      new: false,
      bestseller: true,
    },
    onAddToCart: (id) => console.log('Add to cart:', id),
    onWishlist: (id) => console.log('Wishlist:', id),
  },
};

export const ProductCardNew = {
  args: {
    variant: 'product',
    interactive: true,
    productData: {
      id: 3,
      name: 'Ženska Trenerka',
      slug: 'zenska-kapuljaca-trenerka',
      price: 3890,
      currency: 'RSD',
      category: 'trenerke',
      subcategory: 'kapuljaca',
      gender: 'zenski',
      description: 'Meka fleece 300 g/m², kapuljača, prilagođen ženskom fitu.',
      shortDescription: 'Ženska trenerka sa kapuljačom',
      images: {
        main: '/images/trenerka-kapuljaca.svg',
        gallery: [],
      },
      colors: [
        { name: 'Roza', hex: '#FFC0CB' },
        { name: 'Bela', hex: '#FFFFFF' },
        { name: 'Siva', hex: '#808080' }
      ],
      sizes: ['XS', 'S', 'M', 'L', 'XL'],
      rating: 4.7,
      reviewCount: 56,
      badge: { type: 'primary', text: 'Novo' },
      inStock: true,
      new: true,
    },
    onAddToCart: (id) => console.log('Add to cart:', id),
    onWishlist: (id) => console.log('Wishlist:', id),
  },
};

export const ContentCard = {
  args: {
    variant: 'content',
    interactive: true,
    content: {
      title: 'Garderoba Srbija - Brza Dostava',
      description: 'DALLI je domaći brend sa brzim dostavom po celoj Srbiji. Besplatna dostava za porudžbine preko 5.000 RSD. Isporučujemo u Beograd, Novi Sad, Niš, Kragujevac i sve manje gradove u roku 1-3 radna dana.',
      image: '/images/category-musk.svg',
      link: '/muska-garderoba.html',
      category: 'Dostava',
      badge: { type: 'primary', text: 'Dostava' },
    },
  },
};

export const FeatureCard = {
  args: {
    variant: 'feature',
    interactive: true,
    content: {
      title: 'Besplatna Dostava',
      description: 'Za porudžbine preko 5.000 RSD',
      icon: '🚚',
      link: '/shipping.html',
    },
  },
};

export const StatsCard = {
  args: {
    variant: 'stats',
    content: {
      label: 'Ukupni prihod',
      value: '12.5M RSD',
      change: 12.5,
      trend: 'positive',
      icon: '💰',
    },
  },
};

export const TestimonialCard = {
  args: {
    variant: 'testimonial',
    content: {
      quote: 'Najbolja majica koju sam ikada imao! Kvalitet pamuka je nenadmaqan, a presek savršen. Naručio sam još 3 komada.',
      author: 'Marko Petrović',
      role: 'Zadovoljan kupac',
      avatar: '/images/avatars/marko.jpg',
      rating: 5,
      verified: true,
    },
  },
};

export const SkeletonCards = {
  render: () => {
    const container = document.createElement('div');
    container.style.display = 'grid';
    container.style.gridTemplateColumns = 'repeat(auto-fill, minmax(280px, 1fr))';
    container.style.gap = 'var(--space-4)';
    
    ['product', 'content', 'feature', 'stats'].forEach((variant, i) => {
      const skeleton = Card.createSkeleton(variant);
      container.appendChild(skeleton);
    });
    
    return container;
  },
};

export const ProductGrid = {
  render: () => {
    const products = [
      {
        id: 1,
        name: 'Osnovna Majica',
        slug: 'osnovna-majica',
        price: 1290,
        salePrice: null,
        currency: 'RSD',
        category: 'majice',
        subcategory: 'kratki-rukav',
        gender: 'unisex',
        images: { main: '/images/majica.svg' },
        colors: [{ name: 'Bela', hex: '#FFFFFF' }, { name: 'Crna', hex: '#000000' }],
        sizes: ['XS', 'S', 'M', 'L', 'XL'],
        rating: 4.8,
        reviewCount: 124,
        badge: null,
        inStock: true,
      },
      {
        id: 2,
        name: 'Muški Duks',
        slug: 'muski-duks-hoodie',
        price: 4290,
        salePrice: 3490,
        currency: 'RSD',
        category: 'dukseri',
        subcategory: 'kapuljaca',
        gender: 'muski',
        images: { main: '/images/duks-musk.svg' },
        colors: [{ name: 'Crna', hex: '#000000' }, { name: 'Navy', hex: '#000080' }],
        sizes: ['S', 'M', 'L', 'XL', 'XXL'],
        rating: 4.9,
        reviewCount: 89,
        badge: { type: 'accent', text: '-19%' },
        inStock: true,
        bestseller: true,
      },
      {
        id: 3,
        name: 'Ženska Trenerka',
        slug: 'zenska-kapuljaca-trenerka',
        price: 3890,
        currency: 'RSD',
        images: { main: '/images/trenerka-kapuljaca.svg' },
        colors: [{ name: 'Roza', hex: '#FFC0CB' }],
        sizes: ['XS', 'S', 'M', 'L', 'XL'],
        rating: 4.7,
        reviewCount: 56,
        badge: { type: 'primary', text: 'Novo' },
        inStock: true,
        new: true,
      },
      {
        id: 4,
        name: 'Osnovna Majica - Crna',
        slug: 'osnovna-majica-crna',
        price: 1290,
        currency: 'RSD',
        images: { main: '/images/majica-crna.svg' },
        colors: [{ name: 'Crna', hex: '#000000' }],
        sizes: ['S', 'M', 'L'],
        rating: 4.6,
        reviewCount: 34,
        inStock: true,
      },
    ];
    
    const container = document.createElement('div');
    container.style.display = 'grid';
    container.style.gridTemplateColumns = 'repeat(auto-fill, minmax(280px, 1fr))';
    container.style.gap = 'var(--space-4)';
    container.setAttribute('role', 'list');
    container.setAttribute('aria-label', 'Proizvodi');
    
    products.forEach(product => {
      const card = Card.createProduct(product, {
        onAddToCart: (id) => console.log('Add to cart:', id),
        onWishlist: (id) => console.log('Wishlist:', id),
      });
      container.appendChild(card.element);
    });
    
    return container;
  },
};

export const SkeletonLoading = {
  render: () => {
    const container = document.createElement('div');
    container.style.display = 'grid';
    container.style.gridTemplateColumns = 'repeat(auto-fill, minmax(280px, 1fr))';
    container.style.gap = 'var(--space-4)';
    container.className = 'skeleton-grid';
    container.setAttribute('role', 'list');
    container.setAttribute('aria-label', 'Učitavanje proizvoda...');
    
    for (let i = 0; i < 8; i++) {
      const skeleton = Card.createSkeleton('product');
      container.appendChild(skeleton);
    }
    
    return container;
  },
};

export const FeaturedProductsTabs = {
  render: () => {
    const container = document.createElement('div');
    container.style.maxWidth = '1200px';
    
    container.innerHTML = `
      <header class="section-header animate-fade-in">
        <div class="section-header__main">
          <h2 id="featured-title" class="section-title">Naši Omiljeni Proizvodi</h2>
          <p class="section-subtitle">Izabrali smo najbolje za vas — kvalitet koja se oseti</p>
        </div>
        <div class="section-header__tabs" role="tablist" aria-label="Filtriranje proizvoda" id="featuredTabs">
          <button class="tab-btn active" role="tab" aria-selected="true" aria-controls="panel-favorites" data-tab="favorites">Naši Favoriti</button>
          <button class="tab-btn" role="tab" aria-selected="false" aria-controls="panel-bestsellers" data-tab="bestsellers">Bestsellery</button>
          <button class="tab-btn" role="tab" aria-selected="false" aria-controls="panel-new" data-tab="new">Novo u Ponudi</button>
        </div>
      </header>

      <div class="tab-panels" id="tabPanels">
        <div class="tab-panel active" id="panel-favorites" role="tabpanel" aria-labelledby="tab-favorites">
          <div class="product-grid" id="featuredProductsFavorites" role="list" aria-label="Preporučeni proizvodi"></div>
        </div>
        <div class="tab-panel hidden" id="panel-bestsellers" role="tabpanel" aria-labelledby="tab-bestsellers">
          <div class="product-grid" id="featuredProductsBestsellers" role="list" aria-label="Najprodavaniji proizvodi"></div>
        </div>
        <div class="tab-panel hidden" id="panel-new" role="tabpanel" aria-labelledby="tab-new">
          <div class="product-grid" id="featuredProductsNew" role="list" aria-label="Novi proizvodi"></div>
        </div>
      </div>

      <div class="text-center" style="margin-top: var(--space-8);">
        <a href="/proizvodi.html" class="btn btn-secondary" data-track="featured_view_all">Svi Proizvodi</a>
      </div>
    `;
    
    return container;
  },
};