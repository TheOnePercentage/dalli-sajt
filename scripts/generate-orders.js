// generate-orders.js
// Mock orders data generator for analytics dashboard

const PROJECT_DATA = {
  customers: [
    { name: 'Marko Petrović', email: 'marko.p@email.com', phone: '+381 60 123 4567' },
    { name: 'Ana Jovanović', email: 'ana.j@email.com', phone: '+381 61 234 5678' },
    { name: 'Nikola Đorđević', email: 'nikola.d@email.com', phone: '+381 62 345 6789' },
    { name: 'Jelena Stanković', email: 'jelena.s@email.com', phone: '+381 63 456 7890' },
    { name: 'Stefan Milošević', email: 'stefan.m@email.com', phone: '+381 64 567 8901' },
    { name: 'Milica Radović', email: 'milica.r@email.com', phone: '+381 65 678 9012' },
    { name: 'Aleksandar Vuković', email: 'aleksandar.v@email.com', phone: '+381 66 789 0123' }
  ],
  products: [
    { name: 'Osnovna Majica', price: 1290 },
    { name: 'Dugorukava Majica', price: 1590 },
    { name: 'Muška Sportska Trenerka', price: 3490 },
    { name: 'Ženska Kapuljača Trenerka', price: 3890 },
    { name: 'Muški Duks (Hoodie)', price: 4290 },
    { name: 'Ženski Duks (Hoodie)', price: 3990 }
  ]
};

const statuses = ['new', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled'];

const products = [...PROJECT_DATA.products];
const customers = [...PROJECT_DATA.customers];

export const orders = (count = 50) => {
  return Array.from({ length: count }, (_, i) => {
    const customer = customers[Math.floor(Math.random() * customers.length)];
    const numItems = Math.floor(Math.random() * 4) + 1;
    const items = Array.from({ length: numItems }, () => {
      const p = products[Math.floor(Math.random() * products.length)];
      return { ...p, qty: Math.floor(Math.random() * 3) + 1 };
    });
    const subtotal = items.reduce((sum, item) => sum + item.price * item.qty, 0);
    const shipping = subtotal > 10000 ? 0 : 390;
    const status = statuses[Math.floor(Math.random() * statuses.length)];
    const date = new Date(Date.now() - Math.random() * 30 * 86400000);

    return {
      id: `ORD-${2024}-${String(i + 1).padStart(4, '0')}`,
      customer: { ...customer, address: 'Bulevar kralja Aleksandra 73', city: 'Beograd', postalCode: '11000' },
      items,
      subtotal,
      shipping,
      total: subtotal + shipping,
      payment: Math.random() > 0.5 ? 'cod' : 'bank',
      status,
      date: date.toISOString(),
      notes: Math.random() > 0.7 ? 'Hitna isporuka, pozvati pre dolaska' : ''
    };
  }).sort((a, b) => new Date(b.date) - new Date(a.date));
};