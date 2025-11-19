export interface PhotoData {
  id: string;
  imageUrl: string; // Base64
  caption: string;
  date: string;
  rotation: number;
  zIndex: number;
  x?: number; // Random positioning
  y?: number;
}

export interface GeminiResponse {
  caption: string;
  date: string;
}
