/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI, Type } from '@google/genai';
import { curatedMovies, curatedMoods } from './src/data/movies.js';
import { Movie, Review } from './src/types.js';

// Lazy initialization of Gemini to prevent startup crash if API key is missing.
let aiInstance: GoogleGenAI | null = null;
function getGeminiClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY is not defined in your Secrets / environment.');
  }
  if (!aiInstance) {
    aiInstance = new GoogleGenAI({
      apiKey: apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        }
      }
    });
  }
  return aiInstance;
}

// In-Memory Reviews Repository
const mockReviews: Review[] = [
  {
    id: "r1",
    movieId: "1",
    userName: "CinemaSavant",
    userAvatar: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=100&q=80",
    rating: 5,
    comment: "An absolute magnum opus from Nolan. Hans Zimmer's organ swells combined with the visual scale of Gargantua makes it one of the greatest cinematic experiences in modern history.",
    date: "2026-06-01",
    likes: 342
  },
  {
    id: "r2",
    movieId: "1",
    userName: "Letterboxd_Lover",
    userAvatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=100&q=80",
    rating: 4.5,
    comment: "The father-daughter relationship between Cooper and Murph is the emotional anchor of this space epic. Gets better with every single rewatch.",
    date: "2026-06-03",
    likes: 124
  },
  {
    id: "r3",
    movieId: "2",
    userName: "SpiceMelange",
    userAvatar: "https://images.unsplash.com/photo-1599566150163-29194dcaad36?auto=format&fit=crop&w=100&q=80",
    rating: 5,
    comment: "Denis Villeneuve did the impossible. This is our generation's Lord of the Rings. The sound design, scale, and cinematography are beyond peer.",
    date: "2026-06-04",
    likes: 512
  },
  {
    id: "r4",
    movieId: "3",
    userName: "DreamArchitect",
    userAvatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=100&q=80",
    rating: 4.5,
    comment: "A magnificent heist film structured as nested subconscious loops. The real kicker is that the action translates so naturally to deeper grief and coping.",
    date: "2026-05-28",
    likes: 98
  },
  {
    id: "r5",
    movieId: "7",
    userName: "Heisenberg99",
    userAvatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=100&q=80",
    rating: 5,
    comment: "The template for what television should look like. Premeditated writing, zero fat, flawless character arcs from Walt to Jesse. Peak television.",
    date: "2026-06-02",
    likes: 275
  }
];

const reviewsStore = [...mockReviews];

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Middleware for parsing JSON requests
  app.use(express.json());

  // API ROUTE: Get all movies with option search and filtering
  app.get('/api/movies', (req, res) => {
    try {
      const { search, genre, type, rating } = req.query;
      let results = [...curatedMovies];

      if (search) {
        const query = String(search).toLowerCase();
        results = results.filter(m => 
          m.title.toLowerCase().includes(query) ||
          m.description.toLowerCase().includes(query) ||
          m.director.toLowerCase().includes(query) ||
          m.cast.some(actor => actor.toLowerCase().includes(query))
        );
      }

      if (genre) {
        const genreStr = String(genre).toLowerCase();
        results = results.filter(m => 
          m.genres.some(g => g.toLowerCase() === genreStr)
        );
      }

      if (type) {
        const typeStr = String(type).toLowerCase();
        if (typeStr === 'movie' || typeStr === 'tv') {
          results = results.filter(m => m.type === typeStr);
        }
      }

      if (rating) {
        const minRating = parseFloat(String(rating));
        if (!isNaN(minRating)) {
          results = results.filter(m => m.rating >= minRating);
        }
      }

      res.json({ success: true, movies: results });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // API ROUTE: Get single movie details
  app.get('/api/movies/:id', (req, res) => {
    try {
      const movie = curatedMovies.find(m => m.id === req.params.id);
      if (!movie) {
        return res.status(404).json({ success: false, message: 'Movie not found' });
      }
      res.json({ success: true, movie });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // API ROUTE: Get reviews for a movie
  app.get('/api/movies/:id/reviews', (req, res) => {
    try {
      const results = reviewsStore.filter(r => r.movieId === req.params.id);
      res.json({ success: true, reviews: results });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // API ROUTE: Create review for a movie
  app.post('/api/movies/:id/reviews', (req, res) => {
    try {
      const { userName, rating, comment } = req.body;
      const movieId = req.params.id;

      if (!userName || !rating || !comment) {
        return res.status(400).json({ success: false, error: 'Missing required parameters (userName, rating, comment).' });
      }

      const newReview: Review = {
        id: `r-${Date.now()}`,
        movieId,
        userName,
        userAvatar: `https://images.unsplash.com/photo-${1500000000000 + Math.floor(Math.random() * 999999)}?auto=format&fit=crop&w=100&q=80`,
        rating: Math.min(5, Math.max(1, parseFloat(rating))),
        comment,
        date: new Date().toISOString().split('T')[0],
        likes: 0
      };

      reviewsStore.unshift(newReview);
      res.json({ success: true, review: newReview });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // API ROUTE: Increment review likes
  app.post('/api/reviews/:id/like', (req, res) => {
    try {
      const review = reviewsStore.find(r => r.id === req.params.id);
      if (!review) {
        return res.status(404).json({ success: false, message: 'Review not found' });
      }
      review.likes += 1;
      res.json({ success: true, likes: review.likes });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // API ROUTE: AI-powered mood/preference discovery
  app.post('/api/gemini/recommend', async (req, res) => {
    try {
      const { mood, preferredGenres, typePreference } = req.body;
      const hasKey = !!process.env.GEMINI_API_KEY;

      if (!hasKey) {
        // Fallback recommendations if API key lacks
        const fallbackRecommendations = curatedMovies
          .filter(m => {
            if (typePreference && typePreference !== 'all') {
              if (m.type !== typePreference) return false;
            }
            if (preferredGenres && preferredGenres.length > 0) {
              return m.genres.some(g => preferredGenres.includes(g));
            }
            return true;
          })
          .slice(0, 4)
          .map(m => ({
            id: m.id,
            title: m.title,
            explanation: `Selected as a fallback match because it belongs to the '${m.genres[0]}' genre and fits your preferences. (Connect a real Gemini API Key in the Secrets Panel to get custom AI recommendations!)`,
            genres: m.genres,
            matchedCuratedId: m.id
          }));

        return res.json({
          success: true,
          recommendations: fallbackRecommendations,
          isAIReal: false
        });
      }

      // We have a live key! Ask Gemini to draft custom intelligent explanations.
      const client = getGeminiClient();
      const prompt = `You are the ultimate CineMatch AI Movie Matchmaker assistant.
Given the user preferences:
- Mood: ${mood || 'None specified'}
- Preferred genres: ${(preferredGenres || []).join(', ')}
- Type Preference: ${typePreference || 'all'}

Produce 5 highly tailored movie or TV show recommendations based on your vast encyclopedic film knowledge.
For each recommendation, assign a specific "matchedCuratedId" ONLY if it strongly matches one of the following curated titles in our catalog. If it is an outside film, set "matchedCuratedId" to null.
Curated database movie titles and their IDs:
${curatedMovies.map(m => `- ID: ${m.id}, Title: "${m.title}", Genres: ${m.genres.join(', ')}`).join('\n')}

Format as a strict JSON array. Each element must contain "title" (string), "explanation" (string explaining how it matches their mood/genre), "releaseYear" (integer), "genres" (array of strings), and "matchedCuratedId" (string or null). Do not wrap in markdown quotes outer than application/json format.`;

      const response = await client.models.generateContent({
        model: 'gemini-3.5-flash',
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                title: { type: Type.STRING },
                explanation: { type: Type.STRING },
                releaseYear: { type: Type.INTEGER },
                genres: {
                  type: Type.ARRAY,
                  items: { type: Type.STRING }
                },
                matchedCuratedId: { type: Type.STRING, description: "ID from our curated catalog if it matches, otherwise null" }
              },
              required: ["title", "explanation", "releaseYear", "genres", "matchedCuratedId"]
            }
          }
        }
      });

      const responseText = response.text || "[]";
      const recommendations = JSON.parse(responseText.trim());

      res.json({ success: true, recommendations, isAIReal: true });
    } catch (error: any) {
      console.error("Gemini Recommend Error:", error);
      res.status(500).json({ success: false, message: error.message });
    }
  });

  // API ROUTE: Interactive AI Movie Assistant Chat
  app.post('/api/gemini/chat', async (req, res) => {
    try {
      const { messages } = req.body; // Array of { role: 'user'|'model', text: string }
      const hasKey = !!process.env.GEMINI_API_KEY;

      if (!hasKey) {
        return res.json({
          success: true,
          reply: "Hello! I am your AI Cinema Companion. I see that your **GEMINI_API_KEY** wasn't loaded in the **Secrets/Settings panel** of AI Studio yet, so I'm currently running in Demo Mode. \n\nOnce loaded, I will unleash full-fledged encyclopedic conversational suggestions! For now, feel free to explore our premium cinematic catalog, add films to your Watchlist, and write reviews!",
          suggestedMovies: [curatedMovies[0], curatedMovies[1]],
          isAIReal: false
        });
      }

      const client = getGeminiClient();

      // Structure historical values as GenAI expects { role: 'user'|'model', parts: [{ text: string }] }
      const contents = messages.map((m: any) => ({
        role: m.role === 'user' ? 'user' : 'model',
        parts: [{ text: m.text }]
      }));

      const systemInstruction = `You are a film scholar and CineMatch's chief movie guru.
You have access to a small catalog of curated high-quality movies of which you can suggest IDs directly if relevant, or you can suggest absolute any masterwork movie ever made.
Our Curated Movie Catalog:
${curatedMovies.map(m => `- ID: "${m.id}", Title: "${m.title}", G: ${m.genres.join(', ')}`).join('\n')}

Always have a friendly, passionate, cinephile tone (inspired by Letterboxd critics and IMDb curators).
Limit responses to 2-3 short paragraphs filled with beautiful insights.
Format also suggested movie IDs if the user asks for films present in our catalog (e.g., mention Interstellar, Dune: Part Two, Stranger Things etc.).`;

      const response = await client.models.generateContent({
        model: 'gemini-3.5-flash',
        contents: contents,
        config: {
          systemInstruction: systemInstruction,
          temperature: 0.8
        }
      });

      const replyText = response.text || "I apologize, my film spool hit an error. Feel free to refine your suggestion!";

      // Scan response for keywords to propose quick curated connections
      const lowercaseReply = replyText.toLowerCase();
      const suggestedMovies: Movie[] = [];
      curatedMovies.forEach(m => {
        if (lowercaseReply.includes(m.title.toLowerCase()) && suggestedMovies.length < 2) {
          suggestedMovies.push(m);
        }
      });

      res.json({ success: true, reply: replyText, suggestedMovies, isAIReal: true });
    } catch (error: any) {
      console.error("Gemini Chat Error:", error);
      res.status(500).json({ success: false, message: error.message });
    }
  });

  // Serve Vite in development
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Express server running on http://localhost:${PORT}`);
  });
}

startServer();
