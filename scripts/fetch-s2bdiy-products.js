const axios = require('axios');
const fs = require('fs');

const API_BASE = 'https://opentest.s2bdiy.com';
const APP_KEY = 'wm001';
const APP_SECRET = '7b55d8cf04caf3db9232c98eadeb9cc2';
const OUTPUT_FILE = 'scripts/s2bdiy-products.json';

let accessToken = null;

async function getAccessToken() {
  if (accessToken) return accessToken;
  console.log('Getting access token...');
  const response = await axios.post(`${API_BASE}/open/v1/accessToken`, {
    app_key: APP_KEY,
    app_secret: APP_SECRET
  });
  accessToken = response.data.data.token;
  console.log('Access token obtained');
  return accessToken;
}

async function fetchProducts(page, pageSize) {
  const token = await getAccessToken();
  const response = await axios.get(`${API_BASE}/open/v1/basicProduct`, {
    params: { page, page_size: pageSize },
    headers: { 'Authorization': `Bearer ${token}` }
  });
  const data = response.data.data;
  return {
    products: data.data || [],
    total: data.total,
    lastPage: data.last_page
  };
}

async function fetchAllProducts() {
  let allProducts = [];
  let page = 1;
  let hasMore = true;
  const pageSize = 20;
  
  while (hasMore) {
    console.log(`Fetching page ${page}...`);
    const result = await fetchProducts(page, pageSize);
    allProducts = allProducts.concat(result.products);
    console.log(`Fetched ${allProducts.length} / ${result.total}`);
    hasMore = page < result.lastPage;
    page++;
    await new Promise(r => setTimeout(r, 200));
  }
  
  console.log(`\nTotal: ${allProducts.length} products`);
  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(allProducts, null, 2));
  console.log(`Saved to ${OUTPUT_FILE}`);
}

fetchAllProducts().catch(console.error);
