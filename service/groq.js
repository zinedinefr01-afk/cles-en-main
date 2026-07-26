import Groq from "groq-sdk";

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

// Modèle rapide et de bonne qualité pour de la génération de contenu e-commerce
const MODEL = "llama-3.3-70b-versatile";

/**
 * Génère tout le contenu nécessaire pour créer une boutique Shopify
 * à partir d'une simple description du business fournie par le client.
 *
 * @param {string} businessDescription - Ex: "Boutique de bijoux artisanaux faits main, style minimaliste"
 * @param {number} nbProducts - Nombre de produits fictifs/exemples à générer
 * @returns {Promise<object>} Objet JSON structuré prêt à être envoyé à l'API Shopify
 */
export async function generateStoreContent(businessDescription, nbProducts = 5) {
  const systemPrompt = `Tu es un expert en e-commerce et branding qui prépare le contenu complet
d'une boutique Shopify. Tu réponds UNIQUEMENT en JSON valide, sans texte avant/après, sans balises markdown.

Le JSON doit respecter EXACTEMENT ce format :
{
  "storeName": "string",
  "tagline": "string (accrocheur, max 12 mots)",
  "colorPalette": {
    "primary": "#hex",
    "secondary": "#hex",
    "accent": "#hex",
    "background": "#hex"
  },
  "pages": {
    "about": "string (150-250 mots)",
    "homeHero": "string (texte principal de la bannière d'accueil, 1-2 phrases)"
  },
  "products": [
    {
      "title": "string",
      "description": "string (80-120 mots, orienté conversion)",
      "price": number,
      "collection": "string"
    }
  ],
  "seo": {
    "metaTitle": "string (max 60 caractères)",
    "metaDescription": "string (max 155 caractères)"
  }
}`;

  const userPrompt = `Business du client : "${businessDescription}"
Génère ${nbProducts} produits cohérents avec ce business.`;

  const completion = await groq.chat.completions.create({
    model: MODEL,
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ],
    temperature: 0.8,
    response_format: { type: "json_object" },
  });

  const raw = completion.choices[0].message.content;

  try {
    return JSON.parse(raw);
  } catch (err) {
    throw new Error("La réponse de Groq n'était pas un JSON valide : " + raw.slice(0, 200));
  }
}
