import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { generateStoreContent } from "./services/groq.js";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

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

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`✅ Serveur lancé sur le port ${PORT}`);
});
