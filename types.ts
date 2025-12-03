
export interface PhotoData {
  id: string; // The UUID
  imageUrl: string; 
  caption: string;
  authorName?: string; // User's name (Deprecated in favor of bio, kept for legacy)
  bio?: string; // User's bio
  socialHandle?: string; // User's social/comment
  date: string;
  rotation: number;
  zIndex: number;
  x?: number; // Random positioning
  y?: number;
  timestamp: number; // Created time in ms
}

export interface GeminiResponse {
  caption: string;
  date: string;
}
