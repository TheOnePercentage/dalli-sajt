#!/usr/bin/env node
/**
 * Location Pages Generator
 * Generates individual HTML pages for each store location from template
 * Usage: node scripts/generate-location-pages.js
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.join(__dirname, '..', 'data');
const TEMPLATE_FILE = path.join(__dirname, '..', 'templates', 'location-template.html');
const OUTPUT_DIR = path.join(__dirname, '..', 'public', 'locations');

function loadJSON(file) {
  const content = fs.readFileSync(path.join(DATA_DIR, file), 'utf-8');
  return JSON.parse(content);
}

function loadTemplate() {
  return fs.readFileSync(TEMPLATE_FILE, 'utf-8');
}

function getTypeLabel(type) {
  const labels = {
    'flagship': 'Flagman Store',
    'mall': 'Trgovački Centar',
    'popup': 'Pop-up Store',
    'outlet': 'Outlet'
  };
  return labels[type] || type;
}

function getCurrentStatus(openingHours) {
  if (!openingHours || !Array.isArray(openingHours)) return 'Radno vreme nedostupno';
  
  const now = new Date();
  const day = now.toLocaleDateString('en-US', { weekday: 'long' });
  const currentTime = now.getHours() * 60 + now.getMinutes();
  
  const todayHours = openingHours.find(h => h.dayOfWeek === day);
  if (!todayHours) return 'Zatvoreno danas';
  
  const openTime = timeToMinutes(todayHours.opens);
  const closeTime = timeToMinutes(todayHours.closes);
  
  if (currentTime >= openTime && currentTime < closeTime) {
    const remaining = closeTime - currentTime;
    const hours = Math.floor(remaining / 60);
    const mins = remaining % 60;
    return `Otvoreno do ${todayHours.closes} (${hours}h ${mins}min)`;
  } else {
    return `Zatvoreno (otvara se ${todayHours.opens})`;
  }
}

function timeToMinutes(timeStr) {
  const [hours, minutes] = timeStr.split(':').map(Number);
  return hours * 60 + minutes;
}

function resolveImage(src, outputDir) {
  if (!src) return '/images/hero/hero-desktop.jpg';
  if (/^https?:/.test(src)) return src;
  const candidate = path.join(outputDir, src.replace(/^\//, ''));
  return fs.existsSync(candidate) ? src : '/images/hero/hero-desktop.jpg';
}

function renderTemplate(template, data) {
  let html = template;
  
  // Replace simple variables: triple braces FIRST ({{{key}}}), then double ({{key}})
  for (const [key, value] of Object.entries(data)) {
    if (typeof value === 'string' || typeof value === 'number') {
      const regexTriple = new RegExp(`\\{\\{\\{\\s*${key}\\s*\\}\\}\\}`, 'g');
      const regexDouble = new RegExp(`\\{\\{\\s*${key}\\s*\\}\\}`, 'g');
      html = html.replace(regexTriple, String(value));
      html = html.replace(regexDouble, String(value));
    }
  }
  
  // Handle arrays with {{#each}} - basic implementation
  if (data.openingHours && Array.isArray(data.openingHours)) {
    const hoursHtml = data.openingHours.map(h => `
      <div class="hours-row">
        <span class="day">${h.dayOfWeek}</span>
        <span class="time">${h.opens} - ${h.closes}</span>
      </div>
    `).join('\n');
    html = html.replace(/\{\{#each openingHours\}\}[\s\S]*?\{\{\/each\}\}/g, hoursHtml);
  }
  
  // Special Hours
  if (data.specialHours && Array.isArray(data.specialHours) && data.specialHours.length > 0) {
    const specialHtml = data.specialHours.map(h => `
      <li>${h.date}: ${h.opens} - ${h.closes} (${h.note})</li>
    `).join('\n');
    html = html.replace(/\{\{#if specialHours\}\}[\s\S]*?\{\{\/if\}\}/g, 
      `<div class="special-hours"><h4>Specijalno radno vreme:</h4><ul>${data.specialHours.map(h => `<li>${h.date}: ${h.opens} - ${h.closes} (${h.note})</li>`).join('\n')}</ul></div>`);
  } else {
    html = html.replace(/\{\{#if specialHours\}\}[\s\S]*?\{\{\/if\}\}/g, '');
  }
  
  // Services
  if (data.services && Array.isArray(data.services)) {
    const servicesHtml = data.services.map(s => `<li><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><polyline points="20 6 9 17 4 12"/></svg> ${s}</li>`).join('\n');
    html = html.replace(/\{\{#each services\}\}[\s\S]*?\{\{\/each\}\}/g, servicesHtml);
  }
  
  // Features
  if (data.features && Array.isArray(data.features)) {
    const featuresHtml = data.features.map(f => `<li><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><polyline points="20 6 9 17 4 12"/></svg> ${f}</li>`).join('\n');
    html = html.replace(/\{\{#each features\}\}[\s\S]*?\{\{\/each\}\}/g, featuresHtml);
  }
  
  // Handle if blocks for specialHours
  if (!data.specialHours || data.specialHours.length === 0) {
    html = html.replace(/\{\{#if specialHours\}\}[\s\S]*?\{\{\/if\}\}/g, '');
  }
  
  // Replace any remaining unmatched placeholders
  html = html.replace(/\{\{\s*\w+\s*\}\}/g, '');
  html = html.replace(/\{\{#each\s+\w+\}\}[\s\S]*?\{\{\/each\}\}/g, '');
  html = html.replace(/\{\{#if\s+\w+\}\}[\s\S]*?\{\{\/if\}\}/g, '');
  html = html.replace(/\{\{\/each\}\}/g, '');
  html = html.replace(/\{\{\/if\}\}/g, '');
  
  return html;
}

async function main() {
  console.log('Generating location pages...');
  
  // Load data
  const locationsData = JSON.parse(fs.readFileSync('/home/alpatron/Documents/Default Project/moonlight-sajt/data/locations.json', 'utf-8'));
  const locations = locationsData.locations;
  
  // Load template
  const template = loadTemplate();
  
  // Create output directory
  if (!fs.existsSync('/home/alpatron/Documents/Default Project/moonlight-sajt/public/locations')) {
    fs.mkdirSync('/home/alpatron/Documents/Default Project/moonlight-sajt/public/locations', { recursive: true });
  }
  
  for (const location of locations) {
    // Load schema for this location
    const schemaFile = path.join('/home/alpatron/Documents/Default Project/moonlight-sajt/public/schemas/local-business/', `${location.slug}.json`);
    let localBusinessSchema = '{}';
    if (fs.existsSync(schemaFile)) {
      localBusinessSchema = fs.readFileSync(schemaFile, 'utf-8');
    }
    
    // Prepare data for template
    const templateData = {
      slug: location.slug,
      name: location.name,
      type: location.type,
      typeLabel: getTypeLabel(location.type),
      address: `${location.address.streetAddress}, ${location.address.postalCode} ${location.address.addressLocality}`,
      addressLocality: location.address.addressLocality,
      streetAddress: location.address.streetAddress,
      postalCode: location.address.postalCode,
      addressRegion: location.address.addressRegion,
      addressCountry: location.address.addressCountry,
      phone: location.phone,
      email: location.email,
      heroImage: resolveImage(location.images?.exterior || '/images/locations/default-hero.jpg', '/home/alpatron/Documents/Default Project/moonlight-sajt/public'),
      description: location.description,
      googlePlaceId: location.googlePlaceId,
      googleMapsUrl: location.googleMapsUrl,
      longitude: location.geo.longitude,
      latitude: location.geo.latitude,
      localBusinessSchema: localBusinessSchema,
      currentStatus: getCurrentStatus(location.openingHours),
      openingHours: location.openingHours,
      specialHours: location.specialHours,
      services: location.services,
      features: location.features
    };
    
    const html = renderTemplate(template, templateData);
    
    const outputPath = path.join('/home/alpatron/Documents/Default Project/moonlight-sajt/public/locations', `${location.slug}.html`);
    fs.writeFileSync(outputPath, html);
    console.log(`Generated: ${location.slug}.html`);
  }
  
  // Generate locations index page
  const indexTemplate = `
<!DOCTYPE html>
<html lang="sr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta name="robots" content="index, follow">
    <link rel="canonical" href="https://dalli.rs/locations/">
    <title>Store Locator | DALLI</title>
    <meta name="description" content="Pronađite najbliži DALLI store. 5 lokacija u Srbiji sa punim radnim vremenom, kontaktima i uslugama.">
</head>
<body>
    <header class="header" role="banner">
        <div class="container">
            <div class="logo">
                <a href="/" aria-label="DALLI - Početna"><h1>DALLI</h1></a>
                <span class="tagline">Store Locator</span>
            </div>
            <nav class="nav" role="navigation" aria-label="Glavna navigacija">
                <a href="/" class="nav-link">Početna</a>
                <a href="/casual/" class="nav-link">Svi Proizvodi</a>
                <a href="/collections/" class="nav-link">Kolekcije</a>
                <a href="/locations/" class="nav-link active">Store Locator</a>
                <a href="/cart.html" class="nav-link cart-link" aria-label="Korpa"><span class="cart-count" id="cartCount">0</span></a>
            </nav>
        </div>
    </header>
    <main class="main" role="main">
        <store-locator max-results="10"></store-locator>
    </main>
    <footer class="footer"><div class="container"><p>&copy; 2026 DALLI.</p></div></footer>
</body>
</html>`;
  
  fs.writeFileSync('/home/alpatron/Documents/Default Project/moonlight-sajt/public/locations/index.html', indexTemplate);
  console.log('Generated: locations/index.html');
  
  console.log('\nAll location pages generated successfully!');
}

main().catch(console.error);