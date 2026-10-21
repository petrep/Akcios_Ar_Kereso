/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import express from 'express';
import { GoogleGenAI } from '@google/genai';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(express.json());

const PORT = Number(process.env.PORT) || 3000;

// Initialize GoogleGenAI client (Server-side only)
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    },
  },
});

// Interfaces representing Java-style DTOs
interface ProductSearchRequest {
  query: string;
  category?: string;
  maxPrice?: number;
}

interface WebshopOffer {
  id: string;
  productName: string;
  shopName: string;
  shopLogo: string;
  currentPriceHuf: number;
  originalPriceHuf: number;
  discountPercent: number;
  inStock: boolean;
  shippingCostHuf: number;
  rating: number;
  reviewCount: number;
  productUrl: string;
  imageUrl: string;
  couponCode?: string;
  priceHistory: { date: string; price: number }[];
  specs: Record<string, string>;
  description: string;
}

interface ProductSearchResponse {
  query: string;
  timestamp: string;
  offers: WebshopOffer[];
  aiBuyingTip: string;
}

// REST Controller / Service simulation
app.post('/api/v1/products/search', async (req, res) => {
  try {
    const { query, category, maxPrice } = req.body as ProductSearchRequest;

    if (!query || query.trim() === '') {
      return res.status(400).json({ error: 'Product query is required.' });
    }

    // Use Gemini 3.8 Flash with Google Search grounding to find real Hungarian prices & webshops
    const prompt = `
      You are an expert Hungarian price comparison engine (ÁrVadász). 
      The user is searching for this product in Hungarian webshops (e.g., eMAG, Alza, MediaMarkt, Pepco, Praktiker, IKEA, Aqua, Konzolvilág, Mall.hu, Auchan, Rossmann, etc.): "${query}".
      ${category ? `Category filter: ${category}` : ''}
      ${maxPrice ? `Maximum budget: ${maxPrice} HUF` : ''}

      Please search current Hungarian market prices and return 5 to 8 realistic, accurate product offers from different top Hungarian webshops.
      Return the response STRICTLY as a JSON object matching this TypeScript interface without any markdown backticks:
      {
        "aiBuyingTip": "A helpful expert shopping tip in Hungarian about when and where to buy this product, whether the current discounts are good, and what to watch out for.",
        "offers": [
          {
            "id": "unique_string_id",
            "productName": "Exact product title in Hungarian",
            "shopName": "e.g. Alza.hu, eMAG.hu, MediaMarkt, etc.",
            "shopLogo": "short code like alza, emag, mediamarkt, ikea, praktiker, aqua",
            "currentPriceHuf": 129900,
            "originalPriceHuf": 159900,
            "discountPercent": 19,
            "inStock": true,
            "shippingCostHuf": 1490,
            "rating": 4.8,
            "reviewCount": 142,
            "productUrl": "https://www.example.hu",
            "imageUrl": "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=500&auto=format&fit=crop&q=60",
            "couponCode": "AKCIO2026",
            "priceHistory": [
              { "date": "2026-09-21", "price": 159900 },
              { "date": "2026-10-01", "price": 149900 },
              { "date": "2026-10-15", "price": 139900 },
              { "date": "2026-10-21", "price": 129900 }
            ],
            "specs": {
              "Garancia": "2 év",
              "Állapot": "Új",
              "Szállítás": "1-2 munkanap"
            },
            "description": "Short description of the offer in Hungarian."
          }
        ]
      }
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: prompt,
      tools: [{ googleSearch: {} }],
      config: {
        responseMimeType: 'application/json',
        temperature: 0.2,
      },
    } as any);

    const text = response.text || '{}';
    // Clean potential markdown wrap if any
    const cleanJson = text.replace(/```json/g, '').replace(/```/g, '').trim();
    const data = JSON.parse(cleanJson);

    const result: ProductSearchResponse = {
      query,
      timestamp: new Date().toISOString(),
      offers: data.offers || [],
      aiBuyingTip: data.aiBuyingTip || 'Összehasonlítottuk a legnépszerűbb magyar webshopok árait.',
    };

    return res.json(result);
  } catch (error: any) {
    console.error('Product search error:', error);
    return res.status(500).json({ error: error.message || 'Failed to fetch product prices.' });
  }
});

// Trending deals endpoint
app.post('/api/v1/deals/trending', async (req, res) => {
  try {
    const prompt = `
      Generate 6 hot trending discounted products currently popular in Hungarian webshops (e.g. smart phones, coffee makers, wireless headphones, smart watches, air fryers, gaming monitors).
      Return the response STRICTLY as a JSON array of objects matching this structure without any markdown backticks:
      [
        {
          "id": "trend-1",
          "productName": "Xiaomi Smart Air Fryer Pro 4L",
          "category": "Háztartás",
          "shopName": "eMAG.hu",
          "currentPriceHuf": 37990,
          "originalPriceHuf": 54990,
          "discountPercent": 31,
          "imageUrl": "https://images.unsplash.com/photo-1556911220-e15b29be8c8f?w=500&auto=format&fit=crop&q=60",
          "rating": 4.9,
          "reviewCount": 320
        }
      ]
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: prompt,
      tools: [{ googleSearch: {} }],
      config: {
        responseMimeType: 'application/json',
        temperature: 0.3,
      },
    } as any);

    const text = response.text || '[]';
    const cleanJson = text.replace(/```json/g, '').replace(/```/g, '').trim();
    const deals = JSON.parse(cleanJson);

    return res.json({ deals });
  } catch (error: any) {
    console.error('Trending deals error:', error);
    return res.status(500).json({ error: error.message || 'Failed to fetch trending deals.' });
  }
});

// Price alert subscription endpoint
app.post('/api/v1/price-alerts/subscribe', async (req, res) => {
  const { email, productName, targetPriceHuf, shopName } = req.body;
  if (!email || !productName) {
    return res.status(400).json({ error: 'Email and product name are required.' });
  }
  // Simulate successful database/alert registration
  return res.json({
    success: true,
    message: `Árértesítő sikeresen beállítva ${email} címre erre a termékre: ${productName} (Célár: ${targetPriceHuf ? targetPriceHuf.toLocaleString() + ' Ft' : 'Bármilyen árcsökkenés'})`,
  });
});

app.get('/api/v1/health', (req, res) => {
  res.json({ status: 'UP', service: 'ÁrVadász Backend (Java-inspired Architecture)' });
});

// Setup Vite middleware in development or serve static build in production
if (process.env.NODE_ENV !== 'production') {
  const { createServer: createViteServer } = await import('vite');
  const vite = await createViteServer({
    server: { middlewareMode: true },
    appType: 'spa',
  });
  app.use(vite.middlewares);
} else {
  app.use(express.static(path.join(__dirname, 'dist')));
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'dist', 'index.html'));
  });
}

app.listen(PORT, '0.0.0.0', () => {
  console.log(`ÁrVadász server running on http://0.0.0.0:${PORT}`);
});
