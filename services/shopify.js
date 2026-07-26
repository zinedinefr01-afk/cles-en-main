/**
 * Service de connexion à l'API Admin Shopify.
 */

const SHOPIFY_API_VERSION = "2025-01";

function getShopifyBaseUrl() {
  const domain = process.env.SHOPIFY_STORE_DOMAIN;
  if (!domain) {
    throw new Error("SHOPIFY_STORE_DOMAIN manquant dans les variables d'environnement.");
  }
  return `https://${domain}/admin/api/${SHOPIFY_API_VERSION}`;
}

function getShopifyHeaders() {
  const token = process.env.SHOPIFY_ACCESS_TOKEN;
  if (!token) {
    throw new Error("SHOPIFY_ACCESS_TOKEN manquant dans les variables d'environnement.");
  }
  return {
    "X-Shopify-Access-Token": token,
    "Content-Type": "application/json",
  };
}

export async function testShopifyConnection() {
  const url = `${getShopifyBaseUrl()}/shop.json`;
  const response = await fetch(url, { method: "GET", headers: getShopifyHeaders() });
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Erreur Shopify (${response.status}) : ${errorText}`);
  }
  const data = await response.json();
  return {
    shopName: data.shop.name,
    domain: data.shop.domain,
    email: data.shop.email,
    currency: data.shop.currency,
  };
}

export async function listProducts(limit = 5) {
  const url = `${getShopifyBaseUrl()}/products.json?limit=${limit}`;
  const response = await fetch(url, { method: "GET", headers: getShopifyHeaders() });
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Erreur Shopify (${response.status}) : ${errorText}`);
  }
  const data = await response.json();
  return data.products.map((p) => ({ id: p.id, title: p.title, status: p.status }));
}

export async function createProduct(product) {
  const url = `${getShopifyBaseUrl()}/products.json`;
  const body = {
    product: {
      title: product.title,
      body_html: `<p>${product.description}</p>`,
      status: "draft",
      variants: [{ price: product.price?.toString() || "0.00" }],
      product_type: product.collection || "Général",
    },
  };
  const response = await fetch(url, {
    method: "POST",
    headers: getShopifyHeaders(),
    body: JSON.stringify(body),
  });
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Erreur Shopify (${response.status}) : ${errorText}`);
  }
  const data = await response.json();
  return { id: data.product.id, title: data.product.title, status: data.product.status };
}
