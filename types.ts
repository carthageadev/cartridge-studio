export interface GameData {
  id: string;
  title: string;
  description: string;
  color: string;
  coverUrl?: string;
  year: number;
  genre: string;
}

export interface CartridgeProps {
  data: GameData;
  isActive: boolean;
  offset: number; // Distance from center index (-2, -1, 0, 1, 2 etc)
  onClick: () => void;
}
