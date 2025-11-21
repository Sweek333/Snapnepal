
export interface PhotoData {
  id: string; // The UUID
  imageUrl: string; 
  caption: string;
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