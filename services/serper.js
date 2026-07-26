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
 * Construit un lien direct vers la bibliothèque publicitaire TikTok (Europe uniquement).
 * mode "keyword" = recherche par mot-clé produit (query_type=2)
 * mode "advertiser" = recherche par nom de marque (query_type=1)
 */
function buildTikTokAdsLibraryUrl(query, mode = "keyword") {
  const queryType = mode === "advertiser" ? "1" : "2";
  const params = new URLSearchParams({ region: "all", adv_name: query, query_type: queryType });
  return `https://library.tiktok.com/ads?${params.toString()}`;
}

/**
 * Construit un lien direct vers la Meta Ads Library (Facebook + Instagram), par mot-clé.
 * Gratuit, sans compte requis, recherche mondiale.
 */
function buildMetaAdsLibraryUrl(query) {
  const params = new URLSearchParams({
    active_status: "active",
    ad_type: "all",
    country: "ALL",
    q: query,
    search_type: "keyword_unordered",
  });
  return `https://www.facebook.com/ads/library/?${params.toString()}`;
}

/**
 * Fait une vraie recherche produit : résultats Google + Shopping + Actualités,
 * enrichie avec détection Shopify (Shopping ET résultats organiques) + lien TikTok Ads.
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
  const rawOrganic = (searchData.organic || []).slice(0, 6);

  // On vérifie Shopify sur les deux sources en parallèle : Shopping (gros comparateurs)
  // ET résultats organiques (souvent là où se cachent les petites boutiques dropshipping)
  const [shoppingListings, organicListings] = await Promise.all([
    Promise.all(
      rawShopping.map(async (item) => {
        const { isShopify, brandName } = item.link
          ? await detectShopify(item.link)
          : { isShopify: null, brandName: null };
        return {
          title: item.title,
          source: item.source,
          price: item.price,
          link: item.link,
          isShopify,
          brandName,
          origin: "shopping",
        };
      })
    ),
    Promise.all(
      rawOrganic.map(async (item) => {
        const { isShopify, brandName } = item.link
          ? await detectShopify(item.link)
          : { isShopify: null, brandName: null };
        return {
          title: item.title,
          source: new URL(item.link).hostname,
          price: null,
          link: item.link,
          isShopify,
          brandName,
          origin: "organique",
        };
      })
    ),
  ]);

  const allListings = [...shoppingListings, ...organicListings].map((item) => ({
    ...item,
    tiktokAdsLibraryUrl: buildTikTokAdsLibraryUrl(item.brandName || item.source || keyword, "advertiser"),
    metaAdsLibraryUrl: buildMetaAdsLibraryUrl(item.brandName || item.source || keyword),
  }));

  const shopifyCompetitors = allListings.filter((s) => s.isShopify === true);

  const recentNews = (newsData.news || []).slice(0, 5).map((item) => ({
    title: item.title,
    source: item.source,
    date: item.date,
  }));

  return {
    keyword,
    totalGoogleResults: totalResults,
    competitorCount: allListings.length,
    shopifyCompetitorCount: shopifyCompetitors.length,
    competitorListings: allListings,
    recentNewsCount: recentNews.length,
    recentNews,
    // Recherche directe par mot-clé produit — bien plus utile que par marque
    // pour repérer les boutiques dropshipping qui vivent surtout de pub TikTok
    keywordTikTokAdsUrl: buildTikTokAdsLibraryUrl(keyword, "keyword"),
    keywordMetaAdsUrl: buildMetaAdsLibraryUrl(keyword),
    note: "Détection Shopify sur résultats Shopping + organiques. Les petites boutiques dropshipping n'apparaissent pas toujours sur Google (elles vivent de pub, pas de SEO) — les recherches TikTok/Meta par mot-clé sont souvent plus fiables pour les repérer. Bibliothèque TikTok Ads limitée à l'Europe ; Meta Ads Library couvre plus largement.",
  };
}
