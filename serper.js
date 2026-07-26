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
 * Fait une vraie recherche produit : résultats Google + Shopping + Actualités.
 * Retourne des chiffres réels (pas une estimation), tirés de Google en direct.
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

  const shoppingListings = (shoppingData.shopping || []).slice(0, 5).map((item) => ({
    title: item.title,
    source: item.source,
    price: item.price,
  }));

  const recentNews = (newsData.news || []).slice(0, 5).map((item) => ({
    title: item.title,
    source: item.source,
    date: item.date,
  }));

  return {
    keyword,
    totalGoogleResults: totalResults,
    competitorCount: shoppingListings.length,
    competitorListings: shoppingListings,
    recentNewsCount: recentNews.length,
    recentNews,
    note: "Données réelles issues de Google via Serper.dev — pas une estimation.",
  };
}
