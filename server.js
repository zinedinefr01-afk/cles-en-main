import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { generateStoreContent } from "./services/groq.js";
import { testShopifyConnection, listProducts, createProduct } from "./services/shopify.js";
import { analyzeTrend } from "./services/trends.js";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static("public"));


// Petit check de santé (Render s'en sert pour vérifier que le service tourne)
app.get("/", (req, res) => {
  res.json({ status: "ok", service: "shopify-ai-saas" });
});

/**
 * POST /api/generate-store
 * Body: { "businessDescription": "...", "nbProducts": 5 }
 */
app.post("/api/generate-store", async (req, res) => {
  const { businessDescription, nbProducts } = req.body;

  if (!businessDescription || businessDescription.trim().length < 5) {
    return res.status(400).json({
      error: "Merci de fournir une description du business (businessDescription).",
    });
  }

  try {
    const storeContent = await generateStoreContent(businessDescription, nbProducts || 5);
    res.json(storeContent);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erreur lors de la génération.", details: err.message });
  }
});

/**
 * GET /api/test-shopify
 * Vérifie la connexion à la boutique Shopify (lecture seule, ne modifie rien).
 */
app.get("/api/test-shopify", async (req, res) => {
  try {
    const shopInfo = await testShopifyConnection();
    res.json({ connected: true, shop: shopInfo });
  } catch (err) {
    console.error(err);
    res.status(500).json({ connected: false, error: err.message });
  }
});

/**
 * GET /api/test-shopify/products
 * Liste les 5 premiers produits existants (lecture seule).
 */
app.get("/api/test-shopify/products", async (req, res) => {
  try {
    const products = await listProducts(5);
    res.json({ products });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/test-shopify/create-product
 * ⚠️ ÉCRITURE : crée un vrai produit (en brouillon, non publié) dans la boutique.
 * Body: { "title": "...", "description": "...", "price": 19.99, "collection": "..." }
 */
app.post("/api/test-shopify/create-product", async (req, res) => {
  const { title, description, price, collection } = req.body;

  if (!title) {
    return res.status(400).json({ error: "Le champ 'title' est requis." });
  }

  try {
    const created = await createProduct({ title, description, price, collection });
    res.json({ success: true, product: created });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * GET /api/trend?keyword=gourde+inox&geo=FR
 * Analyse la popularité d'un mot-clé via Google Trends (gratuit).
 */
app.get("/api/trend", async (req, res) => {
  const { keyword, geo } = req.query;

  if (!keyword) {
    return res.status(400).json({ error: "Le paramètre 'keyword' est requis." });
  }

  try {
    const result = await analyzeTrend(keyword, geo || "FR");
    res.json(result);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erreur lors de l'analyse de tendance.", details: err.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`✅ Serveur lancé sur le port ${PORT}`);
});
