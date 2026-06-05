/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef, FormEvent } from 'react';
import { 
  Play, 
  Plus, 
  Check, 
  Heart, 
  Eye, 
  Star, 
  Search, 
  Tv, 
  Film, 
  Sparkles, 
  MessageSquare, 
  Send, 
  X, 
  Info, 
  Clock, 
  User, 
  TrendingUp, 
  Compass, 
  ChevronRight, 
  ThumbsUp, 
  Filter, 
  Loader2,
  Bookmark,
  Sparkle
} from 'lucide-react';
import { Movie, WatchlistItem, Review, UserProfile, Message, MoodType } from './types';
import { curatedMoods } from './data/movies';

export default function App() {
  // Navigation State
  const [activeTab, setActiveTab] = useState<'home' | 'movies' | 'tv' | 'watchlist' | 'profile'>('home');
  const [selectedMovieId, setSelectedMovieId] = useState<string | null>(null);

  // Core Data States
  const [movies, setMovies] = useState<Movie[]>([]);
  const [loadingMovies, setLoadingMovies] = useState<boolean>(true);
  const [selectedMovie, setSelectedMovie] = useState<Movie | null>(null);
  const [movieReviews, setMovieReviews] = useState<Review[]>([]);
  const [loadingReviews, setLoadingReviews] = useState<boolean>(false);

  // Watchlist & Favorites Management (Backed by localStorage)
  const [watchlist, setWatchlist] = useState<WatchlistItem[]>(() => {
    const saved = localStorage.getItem('cinematch_watchlist');
    return saved ? JSON.parse(saved) : [
      { movieId: "1", status: "favorite" as const, addedAt: new Date().toISOString() },
      { movieId: "2", status: "watchlist" as const, addedAt: new Date().toISOString() }
    ];
  });

  // User Profile State (Backed by localStorage)
  const [profile, setProfile] = useState<UserProfile>(() => {
    const saved = localStorage.getItem('cinematch_profile');
    if (saved) return JSON.parse(saved);
    return {
      name: "Alex Mercer",
      avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80",
      bio: "Die-hard Christopher Nolan fan, enthusiast of psychological thrillers, and amateur screenplay reader. Always looking for deep screenwriters and gorgeous color palettes.",
      favoriteGenres: ["Sci-Fi", "Drama", "Thriller"],
      watchTime: 1240, // minutes
      moviesCount: 8,
      tvCount: 3
    };
  });

  // Movie Browsing & Search States
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedGenre, setSelectedGenre] = useState<string>('All');
  const [minRatingFilter, setMinRatingFilter] = useState<number>(0);
  const [releaseYearFilter, setReleaseYearFilter] = useState<string>('All');

  // AI Discover Tool State
  const [aiMood, setAiMood] = useState<string>('');
  const [aiGenres, setAiGenres] = useState<string[]>([]);
  const [aiTypePreference, setAiTypePreference] = useState<'all' | 'movie' | 'tv'>('all');
  const [aiRecommendations, setAiRecommendations] = useState<any[]>([]);
  const [generatingAiRecs, setGeneratingAiRecs] = useState<boolean>(false);
  const [aiRealStatus, setAiRealStatus] = useState<boolean | null>(null);

  // Interactive Review Submission Panel State
  const [newReviewRating, setNewReviewRating] = useState<number>(5);
  const [newReviewText, setNewReviewText] = useState<string>('');
  const [submittingReview, setSubmittingReview] = useState<boolean>(false);

  // Live AI Movie assistant / Chat companion
  const [isChatOpen, setIsChatOpen] = useState<boolean>(false);
  const [chatMessages, setChatMessages] = useState<Message[]>([]);
  const [currentChatInput, setCurrentChatInput] = useState<string>('');
  const [isGeneratingChat, setIsGeneratingChat] = useState<boolean>(false);

  // Full-screen YouTube Video Player Modal
  const [activeTrailerId, setActiveTrailerId] = useState<string | null>(null);

  // Auto-ref for scrolling chat
  const chatBottomRef = useRef<HTMLDivElement>(null);

  // Unique list of all genres in the catalog for filtration
  const [allGenres, setAllGenres] = useState<string[]>([]);

  // Initialize Data on Load
  useEffect(() => {
    fetchMovies();
    // Default chat greetings
    setChatMessages([
      {
        id: 'welcome',
        role: 'model',
        text: "Salutations, cinephile! 🎬 I am your CineMatch AI Cinema Companion. Type something you are craving -- a specific genre, a particular filmmaker's aesthetic, or even a vague vibe -- and I will match you with the perfect screens!",
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }
    ]);
  }, []);

  // Save Watchlist and Profile changes
  useEffect(() => {
    localStorage.setItem('cinematch_watchlist', JSON.stringify(watchlist));
  }, [watchlist]);

  useEffect(() => {
    localStorage.setItem('cinematch_profile', JSON.stringify(profile));
  }, [profile]);

  // Scroll Chat to Bottom
  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages, isChatOpen]);

  // Fetch Movies from Express backend
  const fetchMovies = async () => {
    try {
      setLoadingMovies(true);
      const res = await fetch('/api/movies');
      const data = await res.json();
      if (data.success) {
        setMovies(data.movies);
        // Find all unique genres
        const genresSet = new Set<string>();
        data.movies.forEach((m: Movie) => m.genres.forEach(g => genresSet.add(g)));
        setAllGenres(Array.from(genresSet));
      }
    } catch (e) {
      console.error("Error fetching movies Catalog:", e);
    } finally {
      setLoadingMovies(false);
    }
  };

  // Fetch reviews for specific movie
  const fetchReviewsForMovie = async (movieId: string) => {
    try {
      setLoadingReviews(true);
      const res = await fetch(`/api/movies/${movieId}/reviews`);
      const data = await res.json();
      if (data.success) {
        setMovieReviews(data.reviews);
      }
    } catch (e) {
      console.error("Error fetching movie reviews:", e);
    } finally {
      setLoadingReviews(false);
    }
  };

  // Select movie to view details
  const handleSelectMovie = async (id: string) => {
    const movie = movies.find(m => m.id === id);
    if (movie) {
      setSelectedMovie(movie);
      setSelectedMovieId(id);
      fetchReviewsForMovie(id);
      // scroll detail modal upward
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  // Submit dynamic review to server
  const submitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMovieId || !newReviewText.trim()) return;

    try {
      setSubmittingReview(true);
      const res = await fetch(`/api/movies/${selectedMovieId}/reviews`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userName: profile.name,
          rating: newReviewRating,
          comment: newReviewText,
        })
      });
      const data = await res.json();
      if (data.success) {
        // Prepend to current reviews list
        setMovieReviews(prev => [data.review, ...prev]);
        setNewReviewText('');
        // Dynamic stats update
        setProfile(prev => ({
          ...prev,
          moviesCount: prev.moviesCount + 1,
          watchTime: prev.watchTime + (selectedMovie?.runtime || 120)
        }));
      }
    } catch (err) {
      console.error("Error submitting review:", err);
    } finally {
      setSubmittingReview(false);
    }
  };

  // Increment review likes
  const handleLikeReview = async (reviewId: string) => {
    try {
      const res = await fetch(`/api/reviews/${reviewId}/like`, { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        setMovieReviews(prev => prev.map(r => r.id === reviewId ? { ...r, likes: data.likes } : r));
      }
    } catch (err) {
      console.error("Error liking review:", err);
    }
  };

  // Add/Toggle watchlist status
  const toggleWatchlist = (movieId: string, status: 'watchlist' | 'watched' | 'favorite') => {
    setWatchlist(prev => {
      const existingIdx = prev.findIndex(item => item.movieId === movieId);
      if (existingIdx > -1) {
        const item = prev[existingIdx];
        if (item.status === status) {
          // If already exact status, remove it completely from watchlist
          return prev.filter(i => i.movieId !== movieId);
        } else {
          // Update status
          const updated = [...prev];
          updated[existingIdx] = { ...item, status };
          return updated;
        }
      } else {
        // Add new
        return [...prev, { movieId, status, addedAt: new Date().toISOString() }];
      }
    });
  };

  // Check watch status helper
  const getWatchStatus = (movieId: string) => {
    const item = watchlist.find(w => w.movieId === movieId);
    return item ? item.status : null;
  };

  // Trigger Mood recommendation via standard API/Gemini API key
  const triggerAiDiscover = async () => {
    try {
      setGeneratingAiRecs(true);
      const res = await fetch('/api/gemini/recommend', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mood: aiMood,
          preferredGenres: aiGenres,
          typePreference: aiTypePreference
        })
      });
      const data = await res.json();
      if (data.success) {
        setAiRecommendations(data.recommendations);
        setAiRealStatus(data.isAIReal);
      }
    } catch (err) {
      console.error("AI discovery failed:", err);
    } finally {
      setGeneratingAiRecs(false);
    }
  };

  // Send message to cinematic AI Companion conversationally
  const triggerChatSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentChatInput.trim()) return;

    const userMsg: Message = {
      id: `u-${Date.now()}`,
      role: 'user',
      text: currentChatInput,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setChatMessages(prev => [...prev, userMsg]);
    const inputToSend = currentChatInput;
    setCurrentChatInput('');
    setIsGeneratingChat(true);

    try {
      // Gather small historical context
      const chatHistory = [...chatMessages, userMsg].map(m => ({
        role: m.role,
        text: m.text
      }));

      const res = await fetch('/api/gemini/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: chatHistory })
      });
      const data = await res.json();
      if (data.success) {
        setChatMessages(prev => [...prev, {
          id: `ai-${Date.now()}`,
          role: 'model',
          text: data.reply,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          suggestedMovies: data.suggestedMovies
        }]);
      }
    } catch (err) {
      console.error("Chat companion failed:", err);
      setChatMessages(prev => [...prev, {
        id: `ai-${Date.now()}`,
        role: 'model',
        text: "I met a brief projection error in the cinema booth. Please check if your Gemini Secret API key is active or try again shortly!",
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }]);
    } finally {
      setIsGeneratingChat(false);
    }
  };

  // Toggle mood pills
  const handleToggleAiGenre = (g: string) => {
    setAiGenres(prev => 
      prev.includes(g) ? prev.filter(item => item !== g) : [...prev, g]
    );
  };

  // Filter movies catalog for Movies or TV Views
  const getFilteredCatalog = (type: 'all' | 'movie' | 'tv') => {
    return movies.filter(m => {
      // Type matching
      if (type !== 'all' && m.type !== type) return false;
      // Search Box matching
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const matchesSearch = 
          m.title.toLowerCase().includes(query) ||
          m.description.toLowerCase().includes(query) ||
          m.director.toLowerCase().includes(query) ||
          m.genres.some(g => g.toLowerCase().includes(query)) ||
          m.cast.some(c => c.toLowerCase().includes(query));
        if (!matchesSearch) return false;
      }
      // Genre filter matching
      if (selectedGenre !== 'All' && !m.genres.includes(selectedGenre)) return false;
      // Rating matching
      if (m.rating < minRatingFilter) return false;
      // Release year matching
      if (releaseYearFilter !== 'All') {
        if (releaseYearFilter === 'New Release') {
          if (m.releaseYear < 2023) return false;
        } else if (releaseYearFilter === 'Classic') {
          if (m.releaseYear >= 2015) return false;
        }
      }
      return true;
    });
  };

  // Watchlist filtered results
  const getWatchlistCatalog = (statusFilter: 'watchlist' | 'watched' | 'favorite' | 'all') => {
    return watchlist
      .filter(item => statusFilter === 'all' || item.status === statusFilter)
      .map(item => {
        const movie = movies.find(m => m.id === item.movieId);
        return { movie, ...item };
      })
      .filter(entry => entry.movie !== undefined) as Array<{ movie: Movie; status: 'watchlist' | 'watched' | 'favorite'; addedAt: string }>;
  };

  // Featured film on Hero Carousel
  const heroMovie = movies.find(m => m.id === "1") || movies[0];

  return (
    <div className="relative min-h-screen bg-[#07070d] text-slate-100 flex flex-col font-sans selection:bg-red-600 selection:text-white">
      {/* Background Ambience Halo */}
      <div className="absolute top-0 left-0 right-0 h-[600px] bg-gradient-to-b from-[#250d0d] via-[#09090e] to-transparent opacity-40 pointer-events-none -z-10" />

      {/* Primary Top Bar */}
      <nav id="navbar-id" className="sticky top-0 z-40 bg-[#07070d]/80 backdrop-blur-md border-b border-white/5 px-4 lg:px-8 py-3 flex items-center justify-between">
        <div className="flex items-center gap-8">
          {/* Logo */}
          <div className="flex items-center gap-2 cursor-pointer" onClick={() => { setActiveTab('home'); setSelectedMovieId(null); }}>
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-red-600 to-amber-600 flex items-center justify-center shadow-lg shadow-red-600/20">
              <Film className="w-5.5 h-5.5 text-white" />
            </div>
            <div>
              <span className="font-display font-black text-xl tracking-tight bg-gradient-to-r from-white via-slate-100 to-red-500 bg-clip-text text-transparent">
                CINEMATCH
              </span>
              <span className="block text-[9px] text-red-500 font-mono tracking-widest font-bold -mt-1 uppercase">AI PLATFORM</span>
            </div>
          </div>

          {/* Desktop Navigation Links */}
          <div className="hidden md:flex items-center gap-1">
            <button 
              id="btn-nav-home"
              onClick={() => { setActiveTab('home'); setSelectedMovieId(null); }}
              className={`px-4 py-2 rounded-lg font-medium text-sm transition-all duration-200 ${activeTab === 'home' ? 'text-red-500 bg-white/5' : 'text-slate-400 hover:text-white hover:bg-white/2'}`}
            >
              Discover
            </button>
            <button 
              id="btn-nav-movies"
              onClick={() => { setActiveTab('movies'); setSelectedMovieId(null); }}
              className={`px-4 py-2 rounded-lg font-medium text-sm transition-all duration-200 ${activeTab === 'movies' ? 'text-red-500 bg-white/5' : 'text-slate-400 hover:text-white hover:bg-white/2'}`}
            >
              Movies
            </button>
            <button 
              id="btn-nav-tv"
              onClick={() => { setActiveTab('tv'); setSelectedMovieId(null); }}
              className={`px-4 py-2 rounded-lg font-medium text-sm transition-all duration-200 ${activeTab === 'tv' ? 'text-red-500 bg-white/5' : 'text-slate-400 hover:text-white hover:bg-white/2'}`}
            >
              TV Shows
            </button>
            <button 
              id="btn-nav-watchlist"
              onClick={() => { setActiveTab('watchlist'); setSelectedMovieId(null); }}
              className={`px-4 py-2 rounded-lg font-medium text-sm transition-all duration-200 ${activeTab === 'watchlist' ? 'text-red-500 bg-white/5' : 'text-slate-400 hover:text-white hover:bg-white/2'}`}
            >
              Watchlist
              {watchlist.length > 0 && <span className="ml-1.5 px-1.5 py-0.5 text-[10px] bg-red-600 text-white rounded-full font-mono">{watchlist.length}</span>}
            </button>
          </div>
        </div>

        {/* Right side Profile & Custom Quick actions */}
        <div className="flex items-center gap-4">
          {/* Quick Search Trigger */}
          <div className="relative max-w-xs hidden sm:block">
            <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
            <input 
              type="text" 
              placeholder="Search cinematic title..." 
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                if (activeTab === 'home' || activeTab === 'watchlist') {
                  setActiveTab('movies');
                }
              }}
              className="bg-white/5 hover:bg-white/8 focus:bg-[#0d0d17] border border-white/10 rounded-full pl-9 pr-4 py-1.5 text-xs text-white placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-red-500 transition-all w-48 focus:w-64"
            />
          </div>

          {/* AI Advisor Button Banner */}
          <button 
            id="btn-trigger-ai"
            onClick={() => setIsChatOpen(prev => !prev)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-gradient-to-r from-red-600/20 to-amber-600/20 border border-red-500/30 text-amber-400 hover:border-red-500/80 transition-all shadow-glow hover:shadow-red-500/25 duration-300 group cursor-pointer"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-400 group-hover:rotate-12 transition-transform duration-200 animate-pulse" />
            <span className="hidden xs:inline">Screening Assistant</span>
          </button>

          {/* User Nav Profile */}
          <div 
            id="nav-profile-trigger"
            onClick={() => { setActiveTab('profile'); setSelectedMovieId(null); }}
            className={`flex items-center gap-2 cursor-pointer p-1 rounded-full border transition-all ${activeTab === 'profile' ? 'border-red-500' : 'border-transparent hover:border-white/20'}`}
          >
            <img 
              src={profile.avatar} 
              alt={profile.name} 
              className="w-8 h-8 rounded-full object-cover grayscale-15"
            />
          </div>
        </div>
      </nav>

      {/* Main Container */}
      <main className="flex-1 w-full max-w-7xl mx-auto px-4 lg:px-8 py-6 z-10">
        
        {/* VIEW 1: HOME PAGE */}
        {activeTab === 'home' && !selectedMovieId && (
          <div className="space-y-12 animate-fade-in">
            {/* HERO DISK CAROUSEL/BILLBOARD BANNER */}
            {heroMovie && (
              <div id="hero-banner" className="relative group rounded-3xl overflow-hidden glass-panel border border-white/10 min-h-[480px] lg:min-h-[560px] flex flex-col justify-end p-6 md:p-12 lg:p-16">
                {/* Backdrop cover with elegant cinematic dimmers */}
                <div 
                  className="absolute inset-0 bg-cover bg-center group-hover:scale-102 transition-transform duration-1000"
                  style={{ backgroundImage: `linear-gradient(to top, rgba(7, 7, 13, 1) 0%, rgba(7, 7, 13, 0.6) 40%, rgba(7, 7, 13, 0.1) 100%), url(${heroMovie.backdropUrl})` }}
                />

                {/* Left Side Highlight Tag */}
                <div className="absolute top-6 left-6 flex gap-2">
                  <span className="px-3 py-1 text-xs font-mono font-bold bg-[#07070d]/60 text-amber-500 rounded-full border border-amber-500/30 backdrop-blur-md flex items-center gap-1">
                    <Star className="w-3 h-3 fill-amber-500" /> TOP SELECTION
                  </span>
                  <span className="px-3 py-1 text-xs font-mono font-bold bg-red-600 text-white rounded-full shadow-lg shadow-red-500/20">
                    SENSATIONAL
                  </span>
                </div>

                <div className="max-w-2xl relative space-y-4">
                  <p className="text-red-500 uppercase tracking-widest font-mono text-xs font-bold">Featured Production</p>
                  <h1 className="font-display font-extrabold text-4xl md:text-5xl lg:text-6xl text-white tracking-tight leading-none drop-shadow-md">
                    {heroMovie.title}
                  </h1>

                  <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs md:text-sm text-slate-300 font-medium">
                    <span className="flex items-center text-amber-400 gap-1 font-semibold">
                      <Star className="w-4 h-4 fill-amber-400 text-amber-400" /> {heroMovie.rating} / 10
                    </span>
                    <span>•</span>
                    <span>{heroMovie.releaseYear}</span>
                    <span>•</span>
                    <span className="border border-white/20 px-1.5 py-0.5 rounded text-xs uppercase font-mono">{heroMovie.language}</span>
                    <span>•</span>
                    <span>{heroMovie.runtime} Min</span>
                  </div>

                  <p className="text-slate-300 text-sm md:text-base leading-relaxed max-w-xl line-clamp-3">
                    {heroMovie.description}
                  </p>

                  <div className="flex flex-wrap items-center gap-3 pt-4">
                    <button 
                      onClick={() => setActiveTrailerId(heroMovie.trailerUrl)}
                      className="px-6 py-3 rounded-full font-bold text-sm bg-red-600 hover:bg-red-700 text-white shadow-lg shadow-red-600/30 flex items-center gap-2 transition-all hover:scale-105 duration-200 cursor-pointer"
                    >
                      <Play className="w-4 h-4 fill-white" /> Play Cinematic Trailer
                    </button>
                    <button 
                      onClick={() => handleSelectMovie(heroMovie.id)}
                      className="px-6 py-3 rounded-full font-bold text-sm bg-white/10 hover:bg-white/15 text-white flex items-center gap-1.5 transition-all outline-none border border-white/5"
                    >
                      <Info className="w-4 h-4" /> Comprehensive Info
                    </button>
                    <button 
                      onClick={() => toggleWatchlist(heroMovie.id, 'watchlist')}
                      className={`p-3 rounded-full transition-all border ${getWatchStatus(heroMovie.id) === 'watchlist' ? 'bg-amber-600/20 border-amber-500 text-amber-400' : 'bg-white/5 border-white/5 text-white hover:bg-white/10'}`}
                      title="Add to Watchlist"
                    >
                      {getWatchStatus(heroMovie.id) === 'watchlist' ? <Check className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                    </button>
                    <button 
                      onClick={() => toggleWatchlist(heroMovie.id, 'favorite')}
                      className={`p-3 rounded-full transition-all border ${getWatchStatus(heroMovie.id) === 'favorite' ? 'bg-red-600/20 border-red-500 text-red-400' : 'bg-white/5 border-white/5 text-white hover:bg-white/10'}`}
                      title="Add to Favorites"
                    >
                      <Heart className="w-4 h-4" fill={getWatchStatus(heroMovie.id) === 'favorite' ? "currentColor" : "none"} />
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* MOOD-BASED AI GENERATION / DISCOVERY WIDGET */}
            <div className="glass-panel rounded-3xl p-6 lg:p-8 border border-white/5 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-red-600/10 blur-[80px] rounded-full pointer-events-none" />
              
              <div className="flex items-start justify-between mb-6 flex-wrap gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-amber-400">
                    <Sparkles className="w-5 h-5 animate-spin duration-3000" />
                    <span className="font-mono text-xs font-extrabold tracking-widest uppercase">Intelligent Cinematic Matching</span>
                  </div>
                  <h2 className="text-2xl md:text-3xl font-display font-extrabold text-white">
                    What's your current projection mood?
                  </h2>
                  <p className="text-slate-400 text-sm max-w-2xl">
                    Select a movie aesthetic, pick genres if you choose, and see smart suggestions. Our system leverages real-time state analysis with direct deep Gemini queries.
                  </p>
                </div>

                <div className="flex items-center bg-[#07070d] p-1 rounded-full border border-white/10 text-xs font-medium">
                  <button 
                    onClick={() => setAiTypePreference('all')}
                    className={`px-3 py-1 rounded-full transition-all ${aiTypePreference === 'all' ? 'bg-red-600 text-white' : 'text-slate-400 hover:text-white'}`}
                  >
                    All Types
                  </button>
                  <button 
                    onClick={() => setAiTypePreference('movie')}
                    className={`px-3 py-1 rounded-full transition-all ${aiTypePreference === 'movie' ? 'bg-red-600 text-white' : 'text-slate-400 hover:text-white'}`}
                  >
                    Movies
                  </button>
                  <button 
                    onClick={() => setAiTypePreference('tv')}
                    className={`px-3 py-1 rounded-full transition-all ${aiTypePreference === 'tv' ? 'bg-red-600 text-white' : 'text-slate-400 hover:text-white'}`}
                  >
                    TV Shows
                  </button>
                </div>
              </div>

              {/* Mood Grid Choice */}
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
                {curatedMoods.map((m) => (
                  <button
                    key={m.id}
                    onClick={() => setAiMood(m.label === aiMood ? '' : m.label)}
                    className={`p-4 rounded-2xl flex flex-col items-center justify-center text-center gap-2 border text-xs font-semibold cursor-pointer transition-all duration-300 ${aiMood === m.label ? 'bg-red-600/20 border-red-500 text-white shadow-lg' : 'bg-[#0a0a14] border-white/5 text-slate-400 hover:text-white hover:border-white/10'}`}
                  >
                    <span className="text-2xl">{m.icon}</span>
                    <span>{m.label}</span>
                  </button>
                ))}
              </div>

              {/* Optional Genres Multi-select Selector */}
              <div className="space-y-2 mb-6">
                <span className="text-xs text-slate-400 font-mono font-bold uppercase">Optionally Layer Genres:</span>
                <div className="flex flex-wrap gap-2">
                  {allGenres.map((g) => {
                    const isSelected = aiGenres.includes(g);
                    return (
                      <button
                        key={g}
                        onClick={() => handleToggleAiGenre(g)}
                        className={`text-xs px-3 py-1.5 rounded-full border transition-all cursor-pointer ${isSelected ? 'bg-amber-500/20 border-amber-500 text-amber-400' : 'bg-[#050508]/40 border-white/5 text-slate-400 hover:text-white hover:border-white/10'}`}
                      >
                        {g}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Action Button */}
              <div className="flex items-center justify-between border-t border-white/5 pt-6 flex-wrap gap-4">
                <div className="text-xs text-slate-400 font-medium">
                  {aiRecommendations.length > 0 && (
                    <span className="flex items-center gap-1.5">
                      <Sparkles className="w-4 h-4 text-amber-400" />
                      Showing {aiRecommendations.length} customized predictions 
                      {aiRealStatus ? (
                        <span className="text-green-400 bg-green-950/40 px-2 py-0.5 rounded font-mono font-bold uppercase text-[9px] border border-green-500/20">Active Live AI</span>
                      ) : (
                        <span className="text-amber-400 bg-amber-950/40 px-2 py-0.5 rounded font-mono font-bold uppercase text-[9px] border border-amber-500/20">Demo AI Fallback</span>
                      )}
                    </span>
                  )}
                </div>

                <button
                  id="btn-generate-ai"
                  onClick={triggerAiDiscover}
                  disabled={generatingAiRecs || (!aiMood && aiGenres.length === 0)}
                  className="px-6 py-3 rounded-full font-bold text-sm bg-gradient-to-r from-red-600 to-amber-600 text-white shadow-lg shadow-red-600/30 flex items-center gap-2 hover:scale-102 transition-all disabled:opacity-50 disabled:pointer-events-none cursor-pointer"
                >
                  {generatingAiRecs ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin text-white" />
                      Synchronizing Film Reels...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4 text-white" />
                      Generate Instant AI Platform Recommendations
                    </>
                  )}
                </button>
              </div>

              {/* AI RECOMMENDATIONS LIST */}
              {aiRecommendations.length > 0 && (
                <div className="mt-8 pt-8 border-t border-white/5 grid md:grid-cols-2 lg:grid-cols-3 gap-4 animate-fade-in">
                  {aiRecommendations.map((rec, index) => {
                    const matchedMovie = rec.matchedCuratedId ? movies.find(m => m.id === rec.matchedCuratedId) : null;
                    return (
                      <div 
                        key={index} 
                        className="bg-[#05050a]/80 rounded-2xl p-5 border border-white/5 hover:border-amber-500/30 transition-all flex flex-col justify-between group h-full relative"
                      >
                        <div className="space-y-3">
                          <div className="flex items-start justify-between">
                            <div>
                              <h3 className="font-display font-extrabold text-white text-lg tracking-tight group-hover:text-amber-400 transition-colors">
                                {rec.title}
                              </h3>
                              <p className="text-slate-400 text-xs font-medium mt-0.5 font-mono">
                                Year: {rec.releaseYear || rec.year || 2024}
                              </p>
                            </div>
                            <span className="text-[10px] uppercase font-mono font-bold px-2 py-0.5 bg-white/5 text-slate-300 rounded border border-white/10">
                              Suggestion #{index + 1}
                            </span>
                          </div>

                          <p className="text-slate-300 text-xs leading-relaxed italic">
                            "{rec.explanation}"
                          </p>

                          <div className="flex flex-wrap gap-1">
                            {rec.genres && rec.genres.map((g: string) => (
                              <span key={g} className="text-[10px] bg-red-950/20 text-red-400 px-2 py-0.5 rounded font-semibold border border-red-950/40">{g}</span>
                            ))}
                          </div>
                        </div>

                        <div className="border-t border-white/5 pt-4 mt-4 flex items-center justify-between">
                          {matchedMovie ? (
                            <button
                              onClick={() => handleSelectMovie(matchedMovie.id)}
                              className="text-xs font-bold text-amber-500 hover:text-white flex items-center gap-1 group/btn cursor-pointer"
                            >
                              View Premium Profile
                              <ChevronRight className="w-3.5 h-3.5 group-hover/btn:translate-x-0.5 transition-transform" />
                            </button>
                          ) : (
                            <span className="text-[10px] text-slate-500 font-mono italic">
                              External encyclopedia match
                            </span>
                          )}

                          {matchedMovie && (
                            <button
                              onClick={() => toggleWatchlist(matchedMovie.id, 'watchlist')}
                              className="text-xs font-mono px-2.5 py-1 rounded-full bg-white/5 border border-white/10 hover:border-red-500 text-slate-300 hover:text-white transition-all flex items-center gap-1 cursor-pointer"
                            >
                              <Plus className="w-3 h-3" /> Watchlist
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* SECTION: TRENDING & HIGHLIGHTS */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-red-500" />
                  <h2 className="font-display font-extrabold text-xl md:text-2xl text-white tracking-tight">
                    Trending Blockbusters & TV Dramas
                  </h2>
                </div>
                <button 
                  onClick={() => setActiveTab('movies')}
                  className="text-xs font-semibold text-red-500 hover:text-white transition-colors"
                >
                  View All Catalogue
                </button>
              </div>

              {/* Grid or Horizontal Carousel for Movies */}
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-5">
                {movies.slice(0, 5).map((m) => {
                  const watchStatus = getWatchStatus(m.id);
                  return (
                    <div 
                      key={m.id}
                      onClick={() => handleSelectMovie(m.id)}
                      className="group cursor-pointer rounded-2xl overflow-hidden bg-[#0a0a14]/60 border border-white/5 flex flex-col justify-between hover:border-red-500/50 transition-all duration-300 select-none pb-3"
                    >
                      <div className="relative aspect-[2/3] overflow-hidden mb-3">
                        <img 
                          src={m.posterUrl} 
                          alt={m.title} 
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        />
                        {/* Rating Overlay */}
                        <div className="absolute top-2 left-2 px-2 py-0.5 rounded bg-[#07070d]/80 text-amber-500 border border-amber-500/30 text-[10px] font-bold font-mono backdrop-blur-md flex items-center gap-0.5">
                          <Star className="w-3 h-3 fill-amber-500" /> {m.rating}
                        </div>

                        {/* Watchlist Quick add overlay */}
                        <div className="absolute top-2 right-2 flex gap-1">
                          {watchStatus && (
                            <span className={`p-1.5 rounded-full text-xs backdrop-blur-md ${watchStatus === 'favorite' ? 'bg-red-600 text-white' : 'bg-amber-600 text-white'}`}>
                              {watchStatus === 'favorite' ? <Heart className="w-3.5 h-3.5 fill-current" /> : <Check className="w-3.5 h-3.5" />}
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="px-3 space-y-1">
                        <span className="text-[10px] font-bold font-mono tracking-wider uppercase text-red-500">
                          {m.type === 'tv' ? 'TV Season' : 'Feature Film'}
                        </span>
                        <h3 className="font-display font-bold text-sm text-white group-hover:text-red-500 transition-colors line-clamp-1">
                          {m.title}
                        </h3>
                        <p className="text-[11px] text-slate-400 font-mono">
                          {m.releaseYear} • {m.genres[0]}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* SECTION: GENRES FILTER COMPASS */}
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Compass className="w-5 h-5 text-amber-500" />
                <h2 className="font-display font-extrabold text-xl md:text-2xl text-white tracking-tight">
                  Explore by Creative Dimension
                </h2>
              </div>

              <div className="flex flex-wrap gap-2">
                {['All', ...allGenres].map((genre) => (
                  <button
                    key={genre}
                    onClick={() => {
                      setSelectedGenre(genre);
                      setActiveTab('movies');
                    }}
                    className={`px-4 py-2 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${genre === 'All' ? 'bg-red-600/10 border-red-500 text-red-400' : 'bg-[#0a0a14] border-white/5 text-slate-400 hover:text-slate-200'}`}
                  >
                    {genre}
                  </button>
                ))}
              </div>
            </div>

            {/* SECTION: DISNEY+/NETFLIX METRICS BANNER */}
            <div className="grid md:grid-cols-3 gap-6">
              <div className="glass-panel rounded-2xl p-6 border border-white/5 space-y-2">
                <span className="text-amber-500 font-bold block text-2xl font-display">15+ Masterpieces</span>
                <p className="text-slate-300 font-medium text-sm">Finely curated database of classic and new award winners.</p>
              </div>
              <div className="glass-panel rounded-2xl p-6 border border-white/5 space-y-2">
                <span className="text-red-500 font-bold block text-2xl font-display">Gemini-3.5-Flash</span>
                <p className="text-slate-300 font-medium text-sm">Deep cinema analysis of character arcs and screenplay vibes.</p>
              </div>
              <div className="glass-panel rounded-2xl p-6 border border-white/5 space-y-2">
                <span className="text-amber-500 font-bold block text-2xl font-display">Persistent Sync</span>
                <p className="text-slate-300 font-medium text-sm">Track watch lists, write reviews and view local play history states.</p>
              </div>
            </div>

          </div>
        )}

        {/* VIEW 2: MOVIES GRID PAGE */}
        {activeTab === 'movies' && !selectedMovieId && (
          <div className="space-y-8 animate-fade-in">
            {/* Header / Search Controls */}
            <div className="space-y-4">
              <h1 className="font-display font-extrabold text-3xl md:text-4xl text-white tracking-tight">
                Premium Movies Catalog
              </h1>
              <p className="text-slate-400 text-sm">
                Unlock high-fidelity titles, curated lists, and filter reviews directly.
              </p>

              {/* Filters Panel */}
              <div className="grid sm:grid-cols-2 md:grid-cols-4 gap-4 p-4 rounded-2xl bg-[#090910] border border-white/5">
                {/* Search Text Box */}
                <div className="space-y-1">
                  <label className="text-[10px] uppercase font-mono tracking-wider font-bold text-slate-400">Search Keywords</label>
                  <div className="relative">
                    <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-500" />
                    <input 
                      type="text" 
                      placeholder="Title, Director, Actor..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full bg-[#05050a] border border-white/10 rounded-xl pl-9 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-red-500"
                    />
                  </div>
                </div>

                {/* Genre Select Dropdown */}
                <div className="space-y-1">
                  <label className="text-[10px] uppercase font-mono tracking-wider font-bold text-slate-400">Creative Genre</label>
                  <select
                    value={selectedGenre}
                    onChange={(e) => setSelectedGenre(e.target.value)}
                    className="w-full bg-[#05050a] border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:ring-1 focus:ring-red-500"
                  >
                    <option value="All">All Genres</option>
                    {allGenres.map(g => (
                      <option key={g} value={g}>{g}</option>
                    ))}
                  </select>
                </div>

                {/* Rating Filter Slider */}
                <div className="space-y-1">
                  <div className="flex justify-between items-center">
                    <label className="text-[10px] uppercase font-mono tracking-wider font-bold text-slate-400">Minimum Rating</label>
                    <span className="text-[10px] font-bold text-amber-500 font-mono">{minRatingFilter}+ ⭐</span>
                  </div>
                  <input 
                    type="range" 
                    min="0" 
                    max="9.5" 
                    step="0.5"
                    value={minRatingFilter}
                    onChange={(e) => setMinRatingFilter(parseFloat(e.target.value))}
                    className="w-full accent-red-600 bg-[#05050a] h-1.5 rounded-lg appearance-none cursor-pointer mt-3"
                  />
                </div>

                {/* Release Era choice */}
                <div className="space-y-1">
                  <label className="text-[10px] uppercase font-mono tracking-wider font-bold text-slate-400">Release Era</label>
                  <select
                    value={releaseYearFilter}
                    onChange={(e) => setReleaseYearFilter(e.target.value)}
                    className="w-full bg-[#05050a] border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:ring-1 focus:ring-red-500"
                  >
                    <option value="All">All Eras</option>
                    <option value="New Release">New Releases (2023+)</option>
                    <option value="Classic">Contemporary (Pre-2015)</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Results Grid */}
            {getFilteredCatalog('movie').length > 0 ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6">
                {getFilteredCatalog('movie').map((m) => {
                  const status = getWatchStatus(m.id);
                  return (
                    <div 
                      key={m.id}
                      onClick={() => handleSelectMovie(m.id)}
                      className="group cursor-pointer rounded-2xl overflow-hidden bg-[#0a0a14]/60 border border-white/5 flex flex-col justify-between hover:border-red-500/50 transition-all duration-300 pb-3 h-full"
                    >
                      <div className="relative aspect-[2/3] overflow-hidden mb-3">
                        <img 
                          src={m.posterUrl} 
                          alt={m.title} 
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        />
                        <div className="absolute top-2 left-2 px-2 py-0.5 rounded bg-[#07070d]/80 text-amber-500 border border-amber-500/30 text-[10px] font-bold font-mono backdrop-blur-md flex items-center gap-0.5">
                          <Star className="w-3 h-3 fill-amber-500" /> {m.rating}
                        </div>
                        {status && (
                          <div className="absolute top-2 right-2">
                            <span className={`p-1 text-[9px] rounded font-mono font-bold border ${status === 'favorite' ? 'bg-red-600/90 text-white border-red-500' : 'bg-amber-600/90 text-white border-amber-500'}`}>
                              {status === 'favorite' ? 'FAVE' : 'WATCHLIST'}
                            </span>
                          </div>
                        )}
                      </div>

                      <div className="px-3 space-y-1.5 flex-1 flex flex-col justify-between">
                        <div>
                          <h3 className="font-display font-bold text-sm text-white group-hover:text-red-500 transition-colors line-clamp-1">
                            {m.title}
                          </h3>
                          <div className="flex flex-wrap gap-1 mt-1">
                            {m.genres.slice(0, 2).map(g => (
                              <span key={g} className="text-[9px] px-1.5 py-0.5 bg-[#050510] text-[#8e9bb0] rounded border border-white/5">{g}</span>
                            ))}
                          </div>
                        </div>
                        <div className="pt-2 flex items-center justify-between border-t border-white/5 text-[10px] text-slate-400 font-mono">
                          <span>{m.releaseYear}</span>
                          <span>{m.runtime} Mins</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-16 space-y-4 bg-white/2 rounded-2xl border border-white/5">
                <Film className="w-12 h-12 text-slate-600 mx-auto" />
                <p className="text-slate-400">No movies match your selected search queries or parameters.</p>
                <button 
                  onClick={() => {
                    setSearchQuery('');
                    setSelectedGenre('All');
                    setMinRatingFilter(0);
                    setReleaseYearFilter('All');
                  }}
                  className="px-4 py-2 bg-white/10 hover:bg-white/15 text-white font-semibold text-xs rounded-full"
                >
                  Clear Discovery Filters
                </button>
              </div>
            )}
          </div>
        )}

        {/* VIEW 3: TV SHOWS PAGE */}
        {activeTab === 'tv' && !selectedMovieId && (
          <div className="space-y-8 animate-fade-in">
            {/* Header / Search Controls */}
            <div className="space-y-4">
              <h1 className="font-display font-extrabold text-3xl md:text-4xl text-white tracking-tight">
                Award-Winning TV Dramas
              </h1>
              <p className="text-slate-400 text-sm">
                Explore binge-worthy miniseries, multi-season blockbusters, and animation favorites.
              </p>

              {/* TV Filters Panel */}
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 p-4 rounded-2xl bg-[#090910] border border-white/5">
                {/* Search Text Box */}
                <div className="space-y-1">
                  <label className="text-[10px] uppercase font-mono tracking-wider font-bold text-slate-400">Search Series</label>
                  <div className="relative">
                    <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-500" />
                    <input 
                      type="text" 
                      placeholder="Title, writer, cast..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full bg-[#05050a] border border-white/10 rounded-xl pl-9 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none"
                    />
                  </div>
                </div>

                {/* Genre Select Dropdown */}
                <div className="space-y-1">
                  <label className="text-[10px] uppercase font-mono tracking-wider font-bold text-slate-400">Category Genre</label>
                  <select
                    value={selectedGenre}
                    onChange={(e) => setSelectedGenre(e.target.value)}
                    className="w-full bg-[#05050a] border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
                  >
                    <option value="All">All TV Genres</option>
                    {allGenres.map(g => (
                      <option key={g} value={g}>{g}</option>
                    ))}
                  </select>
                </div>

                {/* Quick reset of search */}
                <div className="flex items-end">
                  <button
                    onClick={() => {
                      setSearchQuery('');
                      setSelectedGenre('All');
                    }}
                    className="w-full py-2 bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 hover:text-white rounded-xl text-xs font-semibold"
                  >
                    Reset TV Filter Fields
                  </button>
                </div>
              </div>
            </div>

            {/* Results Grid */}
            {getFilteredCatalog('tv').length > 0 ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6">
                {getFilteredCatalog('tv').map((m) => {
                  const status = getWatchStatus(m.id);
                  return (
                    <div 
                      key={m.id}
                      onClick={() => handleSelectMovie(m.id)}
                      className="group cursor-pointer rounded-2xl overflow-hidden bg-[#0a0a14]/60 border border-white/5 flex flex-col justify-between hover:border-red-500/50 transition-all duration-300 pb-3 h-full"
                    >
                      <div className="relative aspect-[2/3] overflow-hidden mb-3">
                        <img 
                          src={m.posterUrl} 
                          alt={m.title} 
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        />
                        <div className="absolute top-2 left-2 px-2 py-0.5 rounded bg-[#07070d]/80 text-amber-500 border border-amber-500/30 text-[10px] font-bold font-mono backdrop-blur-md flex items-center gap-0.5">
                          <Star className="w-3 h-3 fill-amber-500" /> {m.rating}
                        </div>
                        {status && (
                          <div className="absolute top-2 right-2">
                            <span className={`p-1 text-[9px] rounded font-mono font-bold border ${status === 'favorite' ? 'bg-red-600/90 text-white border-red-500' : 'bg-amber-600/90 text-white border-amber-500'}`}>
                              {status === 'favorite' ? 'FAVE' : 'WATCHLIST'}
                            </span>
                          </div>
                        )}
                      </div>

                      <div className="px-3 space-y-1.5 flex-1 flex flex-col justify-between">
                        <div>
                          <h3 className="font-display font-bold text-sm text-white group-hover:text-red-500 transition-colors line-clamp-1">
                            {m.title}
                          </h3>
                          <div className="flex flex-wrap gap-1 mt-1">
                            {m.genres.slice(0, 2).map(g => (
                              <span key={g} className="text-[9px] px-1.5 py-0.5 bg-[#050510] text-[#8e9bb0] rounded border border-white/5">{g}</span>
                            ))}
                          </div>
                        </div>
                        <div className="pt-2 flex items-center justify-between border-t border-white/5 text-[10px] text-slate-400 font-mono">
                          <span>{m.releaseYear}</span>
                          <span>~{m.runtime} Mins/Ep</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-16 space-y-4 bg-white/2 rounded-2xl border border-white/5">
                <Tv className="w-12 h-12 text-slate-600 mx-auto" />
                <p className="text-slate-400">No premium television series match your search parameters.</p>
              </div>
            )}
          </div>
        )}

        {/* VIEW 4: MOVIE DETAILS (MODAL FOCUS SIMULATED VIEW) */}
        {selectedMovieId && selectedMovie && (
          <div className="space-y-10 animate-fade-in pb-12">
            {/* Back path trigger */}
            <button 
              onClick={() => setSelectedMovieId(null)}
              className="px-4 py-2 bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white rounded-lg text-xs font-semibold flex items-center gap-1 cursor-pointer border border-white/5"
            >
              ← Return to Catalogue (Back)
            </button>

            {/* Backcover Cover Hero Frame */}
            <div className="relative rounded-3xl overflow-hidden glass-panel border border-white/10 min-h-[400px] md:min-h-[480px] flex flex-col justify-end p-6 md:p-12">
              <div 
                className="absolute inset-0 bg-cover bg-center"
                style={{ backgroundImage: `linear-gradient(to top, rgba(7, 7, 13, 1) 0%, rgba(7, 7, 13, 0.4) 60%, rgba(7, 7, 13, 0.1) 100%), url(${selectedMovie.backdropUrl})` }}
              />

              <div className="relative space-y-4 max-w-3xl">
                <span className="px-3 py-1 text-xs font-mono font-bold bg-amber-500 text-black rounded-lg">
                  {selectedMovie.type === 'movie' ? 'FEATURE FILM' : 'TV SEASON'}
                </span>

                <h1 className="font-display font-extrabold text-3xl md:text-5xl text-white tracking-tight drop-shadow-lg">
                  {selectedMovie.title}
                </h1>

                {selectedMovie.tagline && (
                  <p className="text-amber-400 font-medium italic text-sm md:text-base">
                    "{selectedMovie.tagline}"
                  </p>
                )}

                <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-slate-300 font-mono">
                  <span className="flex items-center text-amber-500 gap-1 font-bold">
                    <Star className="w-4 h-4 fill-amber-500" /> {selectedMovie.rating}/10 ({selectedMovie.ratingCount.toLocaleString()} votes)
                  </span>
                  <span>•</span>
                  <span>Year: {selectedMovie.releaseYear}</span>
                  <span>•</span>
                  <span>System Popularity: #{selectedMovie.popularity}</span>
                  <span>•</span>
                  <span>Language: {selectedMovie.language || 'English'}</span>
                </div>

                <div className="flex flex-wrap gap-2 pt-1">
                  {selectedMovie.genres.map(g => (
                    <span key={g} className="text-xs px-3 py-1 rounded-full bg-red-600/10 text-red-400 font-bold border border-red-500/20">{g}</span>
                  ))}
                </div>

                <div className="flex flex-wrap items-center gap-3 pt-4">
                  <button 
                    onClick={() => setActiveTrailerId(selectedMovie.trailerUrl)}
                    className="px-5 py-2.5 rounded-full text-xs font-bold bg-red-600 hover:bg-red-700 text-white flex items-center gap-1.5 transition-transform hover:scale-105 duration-200 cursor-pointer shadow-lg"
                  >
                    <Play className="w-3.5 h-3.5 fill-white" /> Activate Trailer
                  </button>

                  <button 
                    onClick={() => toggleWatchlist(selectedMovie.id, 'watchlist')}
                    className={`px-4 py-2.5 rounded-full text-xs font-semibold border flex items-center gap-1.5 transition-all ${getWatchStatus(selectedMovie.id) === 'watchlist' ? 'bg-amber-600/20 border-amber-500 text-amber-400' : 'bg-white/5 border-white/5 text-white hover:bg-white/10'}`}
                  >
                    {getWatchStatus(selectedMovie.id) === 'watchlist' ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-amber-400" /> On Watchlist
                      </>
                    ) : (
                      <>
                        <Plus className="w-3.5 h-3.5" /> Post to Watchlist
                      </>
                    )}
                  </button>

                  <button 
                    onClick={() => toggleWatchlist(selectedMovie.id, 'favorite')}
                    className={`px-4 py-2.5 rounded-full text-xs font-semibold border flex items-center gap-1.5 transition-all ${getWatchStatus(selectedMovie.id) === 'favorite' ? 'bg-red-600/20 border-red-500 text-red-400' : 'bg-white/5 border-white/5 text-slate-300 hover:text-white'}`}
                  >
                    <Heart className="w-3.5 h-3.5" fill={getWatchStatus(selectedMovie.id) === 'favorite' ? "currentColor" : "none"} /> Mark Favorite
                  </button>
                </div>
              </div>
            </div>

            {/* Layout Split: Synopsis & reviews */}
            <div className="grid lg:grid-cols-3 gap-8">
              {/* Left Column: Synopsis, Director, Cast */}
              <div className="lg:col-span-2 space-y-8">
                <div className="glass-panel p-6 lg:p-8 rounded-2xl border border-white/5 space-y-4">
                  <h3 className="font-display font-bold text-lg text-white border-b border-white/5 pb-2">
                    Plot Synopsis
                  </h3>
                  <p className="text-slate-300 text-sm leading-relaxed">
                    {selectedMovie.description}
                  </p>

                  <div className="grid sm:grid-cols-2 gap-4 pt-4 border-t border-white/5 text-xs">
                    <div>
                      <span className="text-slate-500 font-mono uppercase block">Directed By</span>
                      <span className="text-white font-medium">{selectedMovie.director}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 font-mono uppercase block">Principal Cast</span>
                      <span className="text-white font-medium">{selectedMovie.cast.join(', ')}</span>
                    </div>
                  </div>
                </div>

                {/* Submitting Review Section */}
                <div className="glass-panel p-6 rounded-2xl border border-white/5 space-y-4">
                  <h3 className="font-display font-bold text-lg text-white">
                    Submit Your Screen Review Or Rating
                  </h3>

                  <form onSubmit={submitReview} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-xs text-slate-400 font-mono uppercase block mb-1">Your Author Name</label>
                        <input 
                          type="text" 
                          disabled
                          value={profile.name}
                          className="w-full bg-[#05050a]/60 border border-white/5 rounded-lg px-3 py-1.5 text-xs text-slate-400"
                        />
                      </div>
                      <div>
                        <label className="text-xs text-slate-400 font-mono uppercase block mb-1">Cinematic Rating</label>
                        <select
                          value={newReviewRating}
                          onChange={(e) => setNewReviewRating(parseFloat(e.target.value))}
                          className="w-full bg-[#050510] border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-white"
                        >
                          <option value="5">⭐⭐⭐⭐⭐ Outstanding (5/5)</option>
                          <option value="4.5">⭐⭐⭐⭐ Excellent (4.5/5)</option>
                          <option value="4">⭐⭐⭐⭐ Good (4/5)</option>
                          <option value="3">⭐⭐⭐ Meddling (3/5)</option>
                          <option value="2">⭐⭐ Fair (2/5)</option>
                          <option value="1">⭐ Flawed (1/5)</option>
                        </select>
                      </div>
                    </div>

                    <div>
                      <label className="text-xs text-slate-400 font-mono uppercase block mb-1">Commentary / Review</label>
                      <textarea
                        rows={3}
                        required
                        placeholder="Detail the score, screenplay, lighting, pacing or visual direction..."
                        value={newReviewText}
                        onChange={(e) => setNewReviewText(e.target.value)}
                        className="w-full bg-[#050510] border border-white/10 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-red-500 leading-relaxed"
                      />
                    </div>

                    <div className="flex justify-between items-center">
                      <span className="text-[10px] text-slate-500">Writing as {profile.name}. Submission persists to state database.</span>
                      <button
                        type="submit"
                        disabled={submittingReview || !newReviewText.trim()}
                        className="px-4 py-2 rounded-xl text-xs font-bold bg-white text-black hover:bg-slate-200 transition-colors disabled:opacity-50 cursor-pointer"
                      >
                        {submittingReview ? 'Dispatching...' : 'Publish Commentary'}
                      </button>
                    </div>
                  </form>
                </div>
              </div>

              {/* Right Column: Community Ratings & Reviews */}
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <Star className="w-5 h-5 text-amber-500" />
                  <h3 className="font-display font-extrabold text-lg text-white">
                    Letterboxd & IMDb Reviews
                  </h3>
                </div>

                {loadingReviews ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="w-6 h-6 animate-spin text-red-500" />
                  </div>
                ) : movieReviews.length > 0 ? (
                  <div className="space-y-4 max-h-[500px] overflow-y-auto pr-2">
                    {movieReviews.map((review) => (
                      <div key={review.id} className="bg-[#0c0c16] rounded-xl p-4 border border-white/5 space-y-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <img 
                              src={review.userAvatar} 
                              alt={review.userName} 
                              className="w-6.5 h-6.5 rounded-full object-cover"
                            />
                            <span className="text-xs font-bold text-slate-200">{review.userName}</span>
                          </div>
                          <span className="text-[10px] font-mono text-amber-500 font-bold bg-amber-950/20 px-1.5 py-0.5 rounded">
                            {review.rating} ⭐
                          </span>
                        </div>

                        <p className="text-slate-300 text-xs leading-relaxed font-sans">
                          {review.comment}
                        </p>

                        <div className="flex items-center justify-between text-[10px] text-slate-500">
                          <span>{review.date}</span>
                          <button 
                            onClick={() => handleLikeReview(review.id)}
                            className="flex items-center gap-1 hover:text-red-500 transition-colors cursor-pointer"
                          >
                            <ThumbsUp className="w-3 h-3" /> {review.likes} Likes
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12 bg-white/2 rounded-xl border border-white/5">
                    <MessageSquare className="w-8 h-8 text-slate-600 mx-auto mb-2" />
                    <p className="text-xs text-slate-400">Be the first to pen a review for this production!</p>
                  </div>
                )}
              </div>
            </div>

            {/* SECTION: SIMILAR DISCOVERIES RECOMMENDED CAROUSEL */}
            <div className="space-y-4 pt-10 border-t border-white/5">
              <h3 className="font-display font-extrabold text-xl text-white tracking-tight">
                Recommended Similar Content
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 gap-4">
                {movies
                  .filter(m => m.id !== selectedMovieId && m.genres.some(g => selectedMovie.genres.includes(g)))
                  .slice(0, 5)
                  .map(m => (
                    <div 
                      key={m.id}
                      onClick={() => handleSelectMovie(m.id)}
                      className="group cursor-pointer rounded-xl overflow-hidden bg-[#090910] border border-white/5 pb-2"
                    >
                      <img 
                        src={m.posterUrl} 
                        alt={m.title} 
                        className="w-full aspect-[2/3] object-cover group-hover:opacity-80 transition-opacity"
                      />
                      <div className="p-2">
                        <h4 className="text-xs font-bold text-white group-hover:text-red-500 line-clamp-1">{m.title}</h4>
                        <span className="text-[10px] text-slate-500 font-mono">{m.releaseYear}</span>
                      </div>
                    </div>
                  ))}
              </div>
            </div>

          </div>
        )}

        {/* VIEW 5: WATCHLIST MANAGEMENT */}
        {activeTab === 'watchlist' && (
          <div className="space-y-8 animate-fade-in">
            <div className="space-y-2">
              <h1 className="font-display font-extrabold text-3xl md:text-4xl text-white tracking-tight">
                My Custom Screening Rooms
              </h1>
              <p className="text-slate-400 text-sm">
                Manage your tailored playlists, favorited classics, and view histories.
              </p>
            </div>

            {/* Categorized Lists */}
            <div className="grid lg:grid-cols-3 gap-8">
              {/* Block 1: Watchlist (To Watch) */}
              <div className="space-y-4">
                <div className="flex items-center justify-between border-b border-amber-500/20 pb-2">
                  <div className="flex items-center gap-2">
                    <Bookmark className="w-5 h-5 text-amber-500" />
                    <h2 className="font-display font-extrabold text-lg text-white">To Watch Later</h2>
                  </div>
                  <span className="px-2 py-0.5 bg-amber-950/30 text-amber-400 font-mono text-xs rounded border border-amber-500/10">
                    {getWatchlistCatalog('watchlist').length} Items
                  </span>
                </div>

                {getWatchlistCatalog('watchlist').length > 0 ? (
                  <div className="space-y-3">
                    {getWatchlistCatalog('watchlist').map(({ movie }) => (
                      <div key={movie.id} className="p-3 bg-[#0a0a14] rounded-xl border border-white/5 flex gap-3 items-center hover:border-amber-500/30 transition-all">
                        <img src={movie.posterUrl} alt={movie.title} className="w-12 h-16 rounded object-cover cursor-pointer" onClick={() => handleSelectMovie(movie.id)} />
                        <div className="flex-1 min-w-0">
                          <h4 className="text-xs font-bold text-white hover:text-amber-400 transition-colors line-clamp-1 cursor-pointer" onClick={() => handleSelectMovie(movie.id)}>
                            {movie.title}
                          </h4>
                          <span className="text-[10px] text-slate-400 font-mono block">{movie.releaseYear} • {movie.genres[0]}</span>
                          <span className="text-[10px] text-slate-500 font-mono block">Runtime: {movie.runtime} Mins</span>
                        </div>
                        <div className="flex flex-col gap-1">
                          <button 
                            onClick={() => toggleWatchlist(movie.id, 'watched')}
                            className="p-1 px-2 rounded bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white text-[10px] font-semibold"
                            title="Mark Watched"
                          >
                            Set Watched
                          </button>
                          <button 
                            onClick={() => toggleWatchlist(movie.id, 'watchlist')}
                            className="p-1 text-slate-500 hover:text-red-500 text-[10px] font-mono text-right"
                          >
                            Remove
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="py-8 text-center text-xs text-slate-500 bg-white/1 rounded-xl border border-dashed border-white/5">
                    No movies placed in Watchlist rooms yet.
                  </div>
                )}
              </div>

              {/* Block 2: Watched History */}
              <div className="space-y-4">
                <div className="flex items-center justify-between border-b border-green-500/20 pb-2">
                  <div className="flex items-center gap-2">
                    <Check className="w-5 h-5 text-green-500" />
                    <h2 className="font-display font-extrabold text-lg text-white">Playback History</h2>
                  </div>
                  <span className="px-2 py-0.5 bg-green-950/30 text-green-400 font-mono text-xs rounded border border-green-500/10">
                    {getWatchlistCatalog('watched').length} Screened
                  </span>
                </div>

                {getWatchlistCatalog('watched').length > 0 ? (
                  <div className="space-y-3">
                    {getWatchlistCatalog('watched').map(({ movie }) => (
                      <div key={movie.id} className="p-3 bg-[#0a0a14] rounded-xl border border-white/5 flex gap-3 items-center hover:border-green-500/30 transition-all">
                        <img src={movie.posterUrl} alt={movie.title} className="w-12 h-16 rounded object-cover cursor-pointer" onClick={() => handleSelectMovie(movie.id)} />
                        <div className="flex-1 min-w-0">
                          <h4 className="text-xs font-bold text-white hover:text-green-400 transition-colors line-clamp-1 cursor-pointer" onClick={() => handleSelectMovie(movie.id)}>
                            {movie.title}
                          </h4>
                          <span className="text-[10px] text-slate-400 font-mono block">{movie.releaseYear} • {movie.genres[0]}</span>
                          <span className="text-[10px] text-green-500 font-mono block">Finished Playback ✓</span>
                        </div>
                        <div className="flex flex-col gap-1">
                          <button 
                            onClick={() => toggleWatchlist(movie.id, 'favorite')}
                            className="p-1 px-2 rounded bg-red-600/20 text-red-400 text-[10px] font-bold"
                          >
                            + Favorite
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="py-8 text-center text-xs text-slate-500 bg-white/1 rounded-xl border border-dashed border-white/5">
                    No playback history written yet. Mark a film as watched!
                  </div>
                )}
              </div>

              {/* Block 3: Gold Favorites */}
              <div className="space-y-4">
                <div className="flex items-center justify-between border-b border-red-500/20 pb-2">
                  <div className="flex items-center gap-2">
                    <Heart className="w-5 h-5 text-red-500 fill-current" />
                    <h2 className="font-display font-extrabold text-lg text-white">Pure Favorites</h2>
                  </div>
                  <span className="px-2 py-0.5 bg-red-950/30 text-red-400 font-mono text-xs rounded border border-red-500/10">
                    {getWatchlistCatalog('favorite').length} Selected
                  </span>
                </div>

                {getWatchlistCatalog('favorite').length > 0 ? (
                  <div className="space-y-3">
                    {getWatchlistCatalog('favorite').map(({ movie }) => (
                      <div key={movie.id} className="p-3 bg-[#0a0a14] rounded-xl border border-white/5 flex gap-3 items-center hover:border-red-500/30 transition-all">
                        <img src={movie.posterUrl} alt={movie.title} className="w-12 h-16 rounded object-cover cursor-pointer" onClick={() => handleSelectMovie(movie.id)} />
                        <div className="flex-1 min-w-0">
                          <h4 className="text-xs font-bold text-white hover:text-red-400 transition-colors line-clamp-1 cursor-pointer" onClick={() => handleSelectMovie(movie.id)}>
                            {movie.title}
                          </h4>
                          <span className="text-[10px] text-slate-400 font-mono block">{movie.releaseYear} • {movie.genres[0]}</span>
                          <span className="text-[10px] text-amber-500 font-mono block">Golden Masterpiece ⭐</span>
                        </div>
                        <button 
                          onClick={() => toggleWatchlist(movie.id, 'favorite')}
                          className="text-slate-500 hover:text-red-500 text-xs p-1"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="py-8 text-center text-xs text-slate-500 bg-white/1 rounded-xl border border-dashed border-white/5">
                    No golden favorites selected yet. Go rate elements 5 Stars!
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* VIEW 6: USER PROFILE DASHBOARD */}
        {activeTab === 'profile' && (
          <div className="space-y-8 animate-fade-in">
            <h1 className="font-display font-extrabold text-3xl md:text-4xl text-white tracking-tight">
              Savant Cinephile Profile
            </h1>

            <div className="grid lg:grid-cols-3 gap-8">
              {/* Profile Card and Edit Form */}
              <div className="glass-panel rounded-2xl p-6 lg:p-8 border border-white/5 space-y-6 h-fit">
                <div className="flex flex-col items-center text-center space-y-4">
                  <div className="relative">
                    <img 
                      src={profile.avatar} 
                      alt={profile.name} 
                      className="w-24 h-24 rounded-full object-cover border-2 border-red-500 shadow-xl shadow-red-500/20"
                    />
                    <span className="absolute bottom-1 right-1 p-1 bg-red-600 rounded-full font-mono text-[9px] text-white font-bold tracking-widest uppercase">
                      PRO
                    </span>
                  </div>

                  <div>
                    <h2 className="font-display font-bold text-xl text-white">{profile.name}</h2>
                    <p className="text-xs text-slate-400 mt-1 font-mono">Member Since June 2026</p>
                  </div>

                  <p className="text-slate-300 text-xs italic leading-relaxed">
                    "{profile.bio}"
                  </p>
                </div>

                <div className="border-t border-white/5 pt-4 space-y-3">
                  <span className="text-[10px] text-slate-500 uppercase tracking-widest font-mono font-bold block">Edit Profile Data:</span>
                  
                  <div className="space-y-2">
                    <label className="text-xs text-slate-400 block">Name</label>
                    <input 
                      type="text" 
                      value={profile.name}
                      onChange={(e) => setProfile(prev => ({ ...prev, name: e.target.value }))}
                      className="w-full bg-[#050510] border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs text-slate-400 block">Profile Avatar Image Link</label>
                    <input 
                      type="text" 
                      value={profile.avatar}
                      onChange={(e) => setProfile(prev => ({ ...prev, avatar: e.target.value }))}
                      className="w-full bg-[#050510] border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white text-ellipsis"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs text-slate-400 block">Short Bio</label>
                    <textarea 
                      rows={3}
                      value={profile.bio}
                      onChange={(e) => setProfile(prev => ({ ...prev, bio: e.target.value }))}
                      className="w-full bg-[#050510] border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white text-slate-350"
                    />
                  </div>
                </div>
              </div>

              {/* Stats & Genres Selection */}
              <div className="lg:col-span-2 space-y-6">
                {/* Statistics block */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="bg-[#0a0a14] rounded-2xl p-5 border border-white/5 text-center">
                    <span className="block text-slate-400 text-xs font-mono">Total Watchtime</span>
                    <span className="block text-2xl font-bold text-red-500 font-display mt-1">{profile.watchTime} Mins</span>
                    <span className="block text-[10px] text-slate-500 font-mono">~{(profile.watchTime/60).toFixed(1)} Hours</span>
                  </div>

                  <div className="bg-[#0a0a14] rounded-2xl p-5 border border-white/5 text-center">
                    <span className="block text-slate-400 text-xs font-mono">Screenings Reviewed</span>
                    <span className="block text-2xl font-bold text-amber-500 font-display mt-1">{profile.moviesCount} Titles</span>
                    <span className="block text-[10px] text-slate-500 font-mono">In-Memory Database</span>
                  </div>

                  <div className="bg-[#0a0a14] rounded-2xl p-5 border border-white/5 text-center">
                    <span className="block text-slate-400 text-xs font-mono">Series Logged</span>
                    <span className="block text-2xl font-bold text-white font-display mt-1">{profile.tvCount} Series</span>
                    <span className="block text-[10px] text-slate-500 font-mono">Simulated TV History</span>
                  </div>

                  <div className="bg-[#0a0a14] rounded-2xl p-5 border border-white/5 text-center">
                    <span className="block text-slate-400 text-xs font-mono">Watchlist Queue</span>
                    <span className="block text-2xl font-bold text-red-500 font-display mt-1">{watchlist.length} Elements</span>
                    <span className="block text-[10px] text-slate-500 font-mono">Local State persistent</span>
                  </div>
                </div>

                {/* Favorite Genres Choice card */}
                <div className="glass-panel rounded-2xl p-6 border border-white/5 space-y-4">
                  <div className="flex items-center gap-2">
                    <Sparkle className="w-5 h-5 text-amber-400 animate-pulse" />
                    <h3 className="font-display font-extrabold text-lg text-white">Preferred Screenplay Genres</h3>
                  </div>
                  <p className="text-slate-400 text-xs leading-relaxed">
                    Selecting your preferred screening genres below alters the initial context values parameters for the CineMatch AI engine!
                  </p>

                  <div className="flex flex-wrap gap-2">
                    {allGenres.map((g) => {
                      const isFave = profile.favoriteGenres.includes(g);
                      return (
                        <button
                          key={g}
                          onClick={() => {
                            setProfile(prev => {
                              const favoriteGenres = prev.favoriteGenres.includes(g)
                                ? prev.favoriteGenres.filter(item => item !== g)
                                : [...prev.favoriteGenres, g];
                              return { ...prev, favoriteGenres };
                            });
                          }}
                          className={`text-xs px-3 py-1.5 rounded-xl border transition-all cursor-pointer ${isFave ? 'bg-red-600/20 border-red-500 text-white font-bold' : 'bg-[#050510] border-white/5 text-slate-400 hover:text-white'}`}
                        >
                          {g} {isFave ? '✓' : ''}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Quick actions catalog shortcuts */}
                <div className="flex items-center justify-between p-5 rounded-2xl bg-[#0e0e1b] border border-white/5">
                  <div className="space-y-1">
                    <h4 className="text-sm font-bold text-white">Reset Application Sandbox?</h4>
                    <p className="text-slate-400 text-xs">This will restore the original movie database and wipe reviews memory.</p>
                  </div>
                  <button
                    onClick={() => {
                      localStorage.clear();
                      window.location.reload();
                    }}
                    className="px-4 py-2 bg-red-600/20 hover:bg-red-600 border border-red-500/20 text-red-300 hover:text-white rounded-xl text-xs font-semibold cursor-pointer"
                  >
                    Wipe State Sandbox
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

      </main>

      {/* FOOTER COUPLING */}
      <footer className="border-t border-white/5 bg-[#06060c] py-8 text-center text-xs text-slate-500 space-y-2 mt-20 z-10 font-mono">
        <p>© 2026 CineMatch Premium Platform. Multi-Platform Netflix Experience.</p>
        <p className="text-slate-600">Built with React, Express, and Google Gemini Integration.</p>
      </footer>

      {/* FLOOR COMPANION CHAT DRAWER */}
      {/* Floating Sparkles Toggle Bubble Button */}
      <button 
        id="chat-bubble-toggle"
        onClick={() => setIsChatOpen(prev => !prev)}
        className="fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full bg-gradient-to-br from-red-600 via-red-500 to-amber-500 flex items-center justify-center text-white shadow-2xl hover:scale-110 active:scale-95 transition-all cursor-pointer group"
      >
        {isChatOpen ? (
          <X className="w-6 h-6 animate-fade-in" />
        ) : (
          <span className="relative">
            <MessageSquare className="w-6 h-6" />
            <span className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-amber-500 rounded-full text-[9px] font-mono font-bold text-slate-900 border border-black flex items-center justify-center select-none animate-bounce">
              AI
            </span>
          </span>
        )}
      </button>

      {/* Elegant Cinematic Drawer Panel */}
      {isChatOpen && (
        <div 
          id="chat-ai-drawer"
          className="fixed bottom-24 right-6 z-50 w-[350px] sm:w-[420px] max-w-[calc(100vw-32px)] h-[550px] bg-[#0c0c16]/95 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl flex flex-col justify-between overflow-hidden animate-fade-in"
        >
          {/* Header */}
          <div className="bg-gradient-to-r from-red-600/30 to-amber-600/30 px-4 py-3 flex items-center justify-between border-b border-white/5">
            <div className="flex items-center gap-2">
              <div className="p-1 rounded bg-amber-500/20">
                <Sparkles className="w-4 h-4 text-amber-400 animate-spin duration-5000" />
              </div>
              <div>
                <h4 className="font-display font-extrabold text-sm text-white tracking-tight">AI Cinema Screen Scholar</h4>
                <div className="flex items-center gap-1">
                  <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-ping" />
                  <span className="text-[10px] text-slate-400 font-mono">Gemini-3.5-Flash Live Agent</span>
                </div>
              </div>
            </div>
            
            <button 
              onClick={() => setIsChatOpen(false)}
              className="p-1 text-slate-400 hover:text-white rounded-full bg-white/5"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Conversation Feed */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 font-sans text-xs">
            {chatMessages.map((msg) => (
              <div 
                key={msg.id}
                className={`flex flex-col space-y-1 ${msg.role === 'user' ? 'items-end' : 'items-start'}`}
              >
                <div className="flex items-center gap-1.5 text-[9px] text-slate-500 font-mono">
                  <span>{msg.role === 'user' ? 'You' : 'Scholar Assistant'}</span>
                  <span>•</span>
                  <span>{msg.timestamp}</span>
                </div>

                <div 
                  className={`p-3 rounded-2xl max-w-[90%] leading-relaxed whitespace-pre-wrap ${
                    msg.role === 'user' 
                      ? 'bg-red-600 text-white rounded-br-none' 
                      : 'bg-white/5 border border-white/10 text-slate-200 rounded-bl-none'
                  }`}
                >
                  {msg.text}

                  {/* Suggest inline movies cards if returned */}
                  {msg.suggestedMovies && msg.suggestedMovies.length > 0 && (
                    <div className="mt-3 pt-3 border-t border-white/5 space-y-2">
                      <p className="text-[10px] uppercase font-mono font-bold text-amber-400 flex items-center gap-1">
                        <Film className="w-3.5 h-3.5" /> Curated Catalog Shortcuts:
                      </p>
                      
                      <div className="grid grid-cols-2 gap-2">
                        {msg.suggestedMovies.map((sm) => (
                          <div 
                            key={sm.id}
                            onClick={() => {
                              handleSelectMovie(sm.id);
                              setIsChatOpen(false);
                            }}
                            className="bg-[#05050e] border border-white/10 p-2 rounded-xl hover:border-red-500 transition-all cursor-pointer flex flex-col justify-between"
                          >
                            <span className="font-bold text-slate-100 block truncate leading-tight">{sm.title}</span>
                            <span className="text-[9px] text-amber-500 font-bold block mt-1">⭐ {sm.rating} Rating</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))}

            {isGeneratingChat && (
              <div className="flex items-center gap-2 text-slate-400 italic">
                <Loader2 className="w-3.5 h-3.5 animate-spin text-red-500" />
                <span>Scholar Agent parsing screening scripts...</span>
              </div>
            )}

            <div ref={chatBottomRef} />
          </div>

          {/* Chat Form Entry */}
          <form onSubmit={triggerChatSubmit} className="p-3 bg-[#07070e] border-t border-white/5 flex gap-2">
            <input 
              type="text"
              required
              value={currentChatInput}
              onChange={(e) => setCurrentChatInput(e.target.value)}
              placeholder="Ask anything (e.g. 'moody sci-fi like interstellar')..."
              className="flex-1 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none focus:ring-1 focus:ring-red-500 placeholder-slate-400"
            />
            <button
              type="submit"
              disabled={isGeneratingChat || !currentChatInput.trim()}
              className="p-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold transition-all disabled:opacity-50 flex items-center justify-center cursor-pointer"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>
      )}

      {/* FULL SCREEN CINEMATIC TRAILER player FRAME MODAL */}
      {activeTrailerId && (
        <div 
          id="trailer-modal"
          className="fixed inset-0 z-50 bg-[#000000]/95 backdrop-blur-sm flex flex-col items-center justify-center p-4 md:p-8 animate-fade-in"
          onClick={() => setActiveTrailerId(null)}
        >
          <div className="w-full max-w-4xl space-y-2 pointer-events-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between text-white">
              <span className="font-display font-medium text-sm flex items-center gap-1">
                <Film className="w-4 h-4 text-red-500" /> CineMatch High-Definition Player
              </span>
              <button 
                onClick={() => setActiveTrailerId(null)}
                className="p-2 bg-white/10 text-slate-200 hover:text-white rounded-full hover:bg-red-600 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* YouTube HD iframe */}
            <div className="aspect-video w-full rounded-2xl overflow-hidden bg-black border border-white/10 shadow-2xl">
              <iframe
                className="w-full h-full"
                src={`https://www.youtube.com/embed/${activeTrailerId}?autoplay=1&mute=0`}
                title="Cinematic Trailer Playback Frame"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            </div>

            <p className="text-[10px] text-slate-500 font-mono text-center">
              Double-tap screen or tap close [X] to return to selection dashboard. Source: YouTube Content Hosting.
            </p>
          </div>
        </div>
      )}

    </div>
  );
}
