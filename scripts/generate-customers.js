// generate-customers.js
// Mock customers data generator for analytics dashboard

const firstNames = ['Marko', 'Ana', 'Nikola', 'Jelena', 'Stefan', 'Milica', 'Aleksandar', 'Sara', 'Petar', 'Marija', 'Luka', 'Teodora', 'Filip', 'Ivana', 'Nemanja'];
const lastNames = ['Petrović', 'Jovanović', 'Đorđević', 'Stanković', 'Milošević', 'Radović', 'Vuković', 'Nikolić', 'Stojanović', 'Pavlović', 'Ilić', 'Kovačević', 'Simović', 'Mirić', 'Đukić'];
const cities = ['Beograd', 'Novi Sad', 'Niš', 'Kragujevac', 'Subotica', 'Zrenjanin', 'Pančevo', 'Čačak', 'Kraljevo', 'Smederevo'];
const segments = ['vip', 'loyal', 'regular', 'new', 'at_risk', 'lost'];

export const customers = (count = 100) => {
  return Array.from({ length: count }, (_, i) => {
    const firstName = firstNames[Math.floor(Math.random() * firstNames.length)];
    const lastName = lastNames[Math.floor(Math.random() * lastNames.length)];
    const email = `${firstName.toLowerCase()}.${lastName.toLowerCase()}${i}@email.com`;
    const phone = `+381 6${Math.floor(Math.random() * 9)} ${Math.floor(Math.random() * 900) + 100} ${Math.floor(Math.random() * 9000) + 1000}`;
    const city = cities[Math.floor(Math.random() * cities.length)];
    const segment = segments[Math.floor(Math.random() * segments.length)];
    const orderCount = Math.floor(Math.random() * 20);
    const totalSpent = orderCount * (Math.floor(Math.random() * 5000) + 2000);
    const lastOrderDate = orderCount > 0 ? new Date(Date.now() - Math.random() * 90 * 86400000) : null;
    const registeredDate = new Date(Date.now() - Math.random() * 730 * 86400000);
    const status = orderCount === 0 ? 'new' : lastOrderDate && (Date.now() - lastOrderDate.getTime()) > 90 * 86400000 ? 'inactive' : 'active';

    return {
      id: `CUST-${String(i + 1).padStart(5, '0')}`,
      firstName,
      lastName,
      email,
      phone,
      city,
      segment,
      orderCount,
      totalSpent,
      avgOrderValue: orderCount > 0 ? totalSpent / orderCount : 0,
      lastOrderDate: lastOrderDate?.toISOString(),
      registeredDate: registeredDate.toISOString(),
      status,
      tags: segment === 'vip' ? ['VIP'] : segment === 'loyal' ? ['Loijalac'] : [],
      notes: Math.random() > 0.8 ? 'Prefers express shipping. Prefers black color.' : ''
    };
  });
};