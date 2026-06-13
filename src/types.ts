export type GameEntry = {
  id: string;
  title: string;
  description: string;
  genre: string;
  releaseYear: string;
  developer: string;
  publisher: string;
  rating: string;
  players: string;
  coverUrl?: string;
  backgroundUrl?: string;
  accent: string;
  source: "seed" | "screenscraper";
  screenScraperId?: string;
};

export type SearchResult = {
  id: string;
  title: string;
  subtitle: string;
  source: "screenscraper";
};

export type VisualSettings = {
  reflections: boolean;
  consoleGlow: boolean;
  reducedMotion: boolean;
};

export type ScreenScraperConfig = {
  devId: string;
  devPassword: string;
  softName: string;
  userId: string;
  userPassword: string;
};
