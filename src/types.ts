/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface Movie {
  id: string;
  title: string;
  type: 'movie' | 'tv';
  description: string;
  rating: number; // e.g. 8.8
  ratingCount: number;
  releaseYear: number;
  runtime: number; // in minutes
  posterUrl: string;
  backdropUrl: string;
  genres: string[];
  director: string;
  cast: string[];
  trailerUrl: string; // YouTube video ID (e.g. d9MyW72ELq0)
  popularity: number; // index sorting
  tagline?: string;
  language?: string;
}

export interface WatchlistItem {
  movieId: string;
  status: 'watchlist' | 'watched' | 'favorite';
  addedAt: string;
}

export interface Review {
  id: string;
  movieId: string;
  userName: string;
  userAvatar: string;
  rating: number;
  comment: string;
  date: string;
  likes: number;
}

export interface UserProfile {
  name: string;
  avatar: string;
  bio: string;
  favoriteGenres: string[];
  watchTime: number; // in minutes
  moviesCount: number;
  tvCount: number;
}

export interface Message {
  id: string;
  role: 'user' | 'model';
  text: string;
  timestamp: string;
  suggestedMovies?: Movie[];
}

export interface MoodType {
  id: string;
  label: string;
  icon: string;
  description: string;
}
