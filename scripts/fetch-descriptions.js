const axios = require('axios');
const fs = require('fs');

const API_BASE = 'https://opentest.s2bdiy.com';
const APP_KEY = 'wm001';
const APP_SECRET = '7b55d8cf04caf3db9232c98eadeb9cc2';

let accessToken = null;

async function getAccessToken() {
  if (accessToken) return accessToken;
  const response = await axios.post(`${API_BASE}/open/v1/accessToken`, {
    app_key: APP_KEY,
    app_secret: APP_SECRET
  });
  accessToken = response.data.data.token;
  return accessToken;
}

function stripHtml(html) {
  if (!html) return '';
  return html.replace(/<[^>]*>/g, ' ').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim();
}

async function fetchProductDetail(productId) {
  const token = await getAccessToken();
  const response = await axios.get(`${API_BASE}/open/v1/basicProduct/${productId}`, {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  return response.data.data;
}

async function fetchAllDescriptions() {
  // Load existing products to get supplier IDs
  const products = JSON.parse(fs.readFileSync('scripts/s2bdiy-products.json', 'utf8'));
  console.log(`Loaded ${products.length} products`);
  
  const descriptions = {};
  let fetched = 0;
  let errors = 0;
  
  for (let i = 0; i < products.length; i++) {
    const p = products[i];
    
    try {
      const detail = await fetchProductDetail(p.id);
      const enDesc = stripHtml(detail.en_desc || '');
      const cnDesc = stripHtml(detail.desc || '');
      
      descriptions[p.id] = {
        en_desc: enDesc,
        cn_desc: cnDesc,
        description: enDesc || cnDesc
      };
      fetched++;
      
    } catch (err) {
      errors++;
      // Reset token on auth error
      if (err.message.includes('401')) accessToken = null;
    }
    
    if ((i + 1) % 20 === 0) {
      console.log(`Progress: ${i + 1} / ${products.length} (fetched: ${fetched}, errors: ${errors})`);
      // Save progress
      fs.writeFileSync('scripts/s2bdiy-descriptions.json', JSON.stringify(descriptions, null, 2));
    }
    
    await new Promise(r => setTimeout(r, 200));
  }
  
  fs.writeFileSync('scripts/s2bdiy-descriptions.json', JSON.stringify(descriptions, null, 2));
  console.log(`\nDone! Fetched: ${fetched}, Errors: ${errors}`);
  console.log('Saved to scripts/s2bdiy-descriptions.json');
}

fetchAllDescriptions().catch(console.error);
