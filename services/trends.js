import googleTrends from "google-trends-api";

/**
 * Convertit un score d'intérêt Google Trends (0-100) en verdict simple.
 */
function scoreToVerdict(score) {
  if (score >= 70) return "🔥 Très tendance";
  if (score >= 40) return "📈 En croissance";
  if (score >= 15) return "➖ Stable";
  return "❄️ Peu de recherches";
}

/**
 * Analyse la tendance d'un mot-clé sur les 3 derniers mois (France par défaut).
 * Gratuit, basé sur Google Trends (non-officiel).
 *
 * @param {string} keyword - Le produit/mot-clé à analyser, ex: "gourde inox"
 * @param {string} geo - Code pays, ex: "FR", "US". Vide = mondial.
 */
export async function analyzeTrend(keyword, geo = "FR") {
  const endTime = new Date();
  const startTime = new Date();
  startTime.setMonth(startTime.getMonth() - 3);

  const rawResults = await googleTrends.interestOverTime({
    keyword,
    startTime,
    endTime,
    geo,
  });

  const parsed = JSON.parse(rawResults);
  const timelineData = parsed.default.timelineData;

  if (!timelineData || timelineData.length === 0) {
    return {
      keyword,
      verdict: "❓ Pas assez de données",
      currentScore: 0,
      trend: "inconnu",
    };
  }

  // Score actuel = dernier point de la période
  const currentScore = timelineData[timelineData.length - 1].value[0];

  // Score d'il y a 3 mois, pour voir si ça monte ou descend
  const pastScore = timelineData[0].value[0];

  let trend = "stable";
  if (currentScore > pastScore * 1.2) trend = "hausse";
  else if (currentScore < pastScore * 0.8) trend = "baisse";

  return {
    keyword,
    currentScore,
    pastScore,
    trend,
    verdict: scoreToVerdict(currentScore),
    note: "Score d'intérêt relatif Google Trends (0-100), pas un volume de recherche exact.",
  };
}
