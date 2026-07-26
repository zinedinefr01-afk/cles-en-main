/**
 * Service de recherche réelle via Serper.dev (vraies données Google, pas une estimation).
 * Nécessite SERPER_API_KEY dans les variables d'environnement.
 * Gratuit jusqu'à 2500 recherches, puis payant.
 */

const SERPER_URL = "https://google.serper.dev/search";

async function callSerper(query, type = "search") {
  const apiKey = process.env.SERPER_API_KEY;
  if (!apiKey) {
    throw new Error("SERPER_API_KEY manquant — recherche réelle désactivée.");
  }

  const url = type === "shopping"
    ? "https://google.serper.dev/shopping"
    : type === "news"
    ? "https://google.serper.dev/news"
    : SERPER_URL;

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "X-API-KEY": apiKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ q: query, gl: "fr", hl: "fr" }),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Erreur Serper (${response.status}) : ${errText}`);
  }

  return response.json();
}

/**
 * Vérifie si une URL correspond à une vraie boutique Shopify,
 * en inspectant le code source de la page (technique légale, gratuite).
 */
async function detectShopify(url) {
  try {
    const response = await fetch(url, {
      signal: AbortSignal.timeout(6000),
      headers: { "User-Agent": "Mozilla/5.0 (compatible; StoreResearchBot/1.0)" },
    });
    const html = await response.text();

    const isShopify =
      html.includes("cdn.shopify.com") ||
      html.includes("Shopify.theme") ||
      html.includes("shopify-features") ||
      html.includes("myshopify.com");

    // Tente d'extraire le nom de la marque (utile pour la recherche TikTok Ads)
    const titleMatch = html.match(/<title>(.*?)<\/title>/i);
    const brandName = titleMatch ? titleMatch[1].split(/[-|–]/)[0].trim() : null;

    return { isShopify, brandName };
  } catch {
    return { isShopify: null, brandName: null };
  }
}

/**
 * Construit un lien direct vers la bibliothèque publicitaire TikTok (Europe uniquement),
 * pré-rempli avec le nom de marque ou le mot-clé.
 */
function buildTikTokAdsLibraryUrl(query) {
  const params = new URLSearchParams({ region: "all", adv_name: query, query_type: "1" });
  return `https://library.tiktok.com/ads?${params.toString()}`;
}

/**
 * Fait une vraie recherche produit : résultats Google + Shopping + Actualités,
 * enrichie avec détection Shopify + lien TikTok Ads par concurrent.
 */
export async function realProductResearch(keyword) {
  const [searchData, shoppingData, newsData] = await Promise.all([
    callSerper(keyword, "search"),
    callSerper(keyword, "shopping").catch(() => ({ shopping: [] })),
    callSerper(keyword, "news").catch(() => ({ news: [] })),
  ]);

  const totalResults = searchData.searchInformation?.totalResults
    ? parseInt(searchData.searchInformation.totalResults, 10)
    : null;

  const rawShopping = (shoppingData.shopping || []).slice(0, 6);

  // Pour chaque concurrent, on vérifie en parallèle si c'est du Shopify
  const shoppingListings = await Promise.all(
    rawShopping.map(async (item) => {
      const { isShopify, brandName } = item.link
        ? await detectShopify(item.link)
        : { isShopify: null, brandName: null };

      const tiktokQuery = brandName || item.source || keyword;

      return {
        title: item.title,
        source: item.source,
        price: item.price,
        link: item.link,
        isShopify,
        tiktokAdsLibraryUrl: buildTikTokAdsLibraryUrl(tiktokQuery),
      };
    })
  );

  const shopifyCompetitors = shoppingListings.filter((s) => s.isShopify === true);

  const recentNews = (newsData.news || []).slice(0, 5).map((item) => ({
    title: item.title,
    source: item.source,
    date: item.date,
  }));

  return {
    keyword,
    totalGoogleResults: totalResults,
    competitorCount: shoppingListings.length,
    shopifyCompetitorCount: shopifyCompetitors.length,
    competitorListings: shoppingListings,
    recentNewsCount: recentNews.length,
    recentNews,
    generalTikTokAdsUrl: buildTikTokAdsLibraryUrl(keyword),
    note: "Données réelles issues de Google via Serper.dev. Détection Shopify basée sur le code source des sites. Bibliothèque TikTok Ads limitée à l'Europe pour l'instant.",
  };
}
