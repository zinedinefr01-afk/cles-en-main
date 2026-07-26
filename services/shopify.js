/**
 * Service de connexion à l'API Admin Shopify.
 * ⚠️ Pour l'instant, uniquement des fonctions de LECTURE (aucune modification possible).
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

/**
 * Test simple : récupère les informations générales de la boutique.
 * Lecture seule, ne modifie rien.
 */
export async function testShopifyConnection() {
  const url = `${getShopifyBaseUrl()}/shop.json`;

  const response = await fetch(url, {
    method: "GET",
    headers: getShopifyHeaders(),
  });

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
    productCount: undefined, // récupéré séparément si besoin
  };
}

/**
 * Liste les produits existants (lecture seule).
 */
export async function listProducts(limit = 5) {
  const url = `${getShopifyBaseUrl()}/products.json?limit=${limit}`;

  const response = await fetch(url, {
    method: "GET",
    headers: getShopifyHeaders(),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Erreur Shopify (${response.status}) : ${errorText}`);
  }

  const data = await response.json();
  return data.products.map((p) => ({ id: p.id, title: p.title, status: p.status }));
}
