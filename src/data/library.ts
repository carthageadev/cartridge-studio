import type { GameEntry } from "../types";

const LIBRARY_KEY = "retroflow.n64.library";

const seedPalettes = [
  ["#f6d34e", "#e84a5f", "#1d1f31"],
  ["#54d7ff", "#1fd29c", "#202733"],
  ["#ff9d45", "#6441a5", "#1b1727"],
  ["#ffe66d", "#4ecdc4", "#292f36"],
  ["#ff6b6b", "#f7fff7", "#292f36"],
  ["#b8f26d", "#1d9a8a", "#282332"],
  ["#f2a65a", "#772f1a", "#1f1f1f"],
  ["#bcb8ff", "#ff7a90", "#1f2341"],
];

function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function drawLabel(title: string, palette: string[], code: string) {
  if (typeof document === "undefined") {
    return "/gameart.png";
  }

  const canvas = document.createElement("canvas");
  canvas.width = 960;
  canvas.height = 640;
  const context = canvas.getContext("2d");

  if (!context) {
    return "/gameart.png";
  }

  const [primary, secondary, dark] = palette;
  const gradient = context.createLinearGradient(0, 0, canvas.width, canvas.height);
  gradient.addColorStop(0, primary);
  gradient.addColorStop(0.48, secondary);
  gradient.addColorStop(1, dark);
  context.fillStyle = gradient;
  context.fillRect(0, 0, canvas.width, canvas.height);

  context.globalAlpha = 0.16;
  context.fillStyle = "#ffffff";
  for (let x = -80; x < canvas.width; x += 96) {
    context.fillRect(x, 0, 22, canvas.height);
  }
  context.globalAlpha = 1;

  context.fillStyle = "rgba(0,0,0,0.72)";
  context.fillRect(58, 58, canvas.width - 116, canvas.height - 116);

  context.strokeStyle = "rgba(255,255,255,0.72)";
  context.lineWidth = 10;
  context.strokeRect(76, 76, canvas.width - 152, canvas.height - 152);

  context.fillStyle = "#f7f2dd";
  context.font = "900 78px Arial, sans-serif";
  context.textAlign = "center";
  context.textBaseline = "middle";

  const words = title.toUpperCase().split(/\s+/);
  const lines: string[] = [];
  let line = "";
  words.forEach((word) => {
    const next = `${line} ${word}`.trim();
    if (next.length > 14 && line) {
      lines.push(line);
      line = word;
    } else {
      line = next;
    }
  });
  lines.push(line);

  const startY = canvas.height / 2 - (lines.length - 1) * 48;
  lines.slice(0, 3).forEach((text, index) => {
    context.fillText(text, canvas.width / 2, startY + index * 96, canvas.width - 190);
  });

  context.fillStyle = primary;
  context.font = "800 32px Arial, sans-serif";
  context.fillText("NINTENDO 64", canvas.width / 2, 132);

  context.fillStyle = "#ffffff";
  context.font = "700 28px Arial, sans-serif";
  context.textAlign = "left";
  context.fillText(code, 92, canvas.height - 104);

  context.textAlign = "right";
  context.fillText("RETROFLOW", canvas.width - 92, canvas.height - 104);

  return canvas.toDataURL("image/png");
}

const seedGames = [
  {
    title: "Super Mario 64",
    genre: "Platformer",
    releaseYear: "1996",
    developer: "Nintendo EAD",
    publisher: "Nintendo",
    rating: "19/20",
    players: "1",
    description:
      "Mario leaps into Princess Peach's castle and through painted worlds in a benchmark 3D platformer built for analog movement and playful discovery.",
  },
  {
    title: "The Legend of Zelda: Ocarina of Time",
    genre: "Action Adventure",
    releaseYear: "1998",
    developer: "Nintendo EAD",
    publisher: "Nintendo",
    rating: "20/20",
    players: "1",
    description:
      "Link travels between childhood and adulthood across Hyrule, pairing dungeon design, lock-on combat, music, and cinematic scale into one of the defining N64 adventures.",
  },
  {
    title: "GoldenEye 007",
    genre: "First-Person Shooter",
    releaseYear: "1997",
    developer: "Rare",
    publisher: "Nintendo",
    rating: "18/20",
    players: "1-4",
    description:
      "A stealthy mission shooter with objective-driven stages and legendary split-screen multiplayer that helped define console FPS design.",
  },
  {
    title: "Mario Kart 64",
    genre: "Racing",
    releaseYear: "1996",
    developer: "Nintendo EAD",
    publisher: "Nintendo",
    rating: "17/20",
    players: "1-4",
    description:
      "The Mushroom Kingdom racing series goes polygonal with drift-heavy courses, party-grade weapons, and four-player living room chaos.",
  },
  {
    title: "Star Fox 64",
    genre: "Rail Shooter",
    releaseYear: "1997",
    developer: "Nintendo EAD",
    publisher: "Nintendo",
    rating: "18/20",
    players: "1-4",
    description:
      "Fox McCloud leads the Star Fox team through branching on-rails missions, cinematic radio chatter, and Rumble Pak spectacle.",
  },
  {
    title: "Banjo-Kazooie",
    genre: "Platformer",
    releaseYear: "1998",
    developer: "Rare",
    publisher: "Nintendo",
    rating: "18/20",
    players: "1",
    description:
      "A dense collectathon with expressive worlds, sharp character animation, and a playful buddy-move system built around Banjo and Kazooie.",
  },
  {
    title: "F-Zero X",
    genre: "Racing",
    releaseYear: "1998",
    developer: "Nintendo EAD",
    publisher: "Nintendo",
    rating: "17/20",
    players: "1-4",
    description:
      "A blisteringly fast futuristic racer that trades spectacle for speed, tight handling, and huge 30-vehicle fields.",
  },
  {
    title: "Paper Mario",
    genre: "Role-Playing",
    releaseYear: "2000",
    developer: "Intelligent Systems",
    publisher: "Nintendo",
    rating: "18/20",
    players: "1",
    description:
      "A storybook RPG with timed-action combat, crisp writing, and a bright paper-craft style that gives Mario's world a theatrical rhythm.",
  },
] satisfies Omit<GameEntry, "id" | "accent" | "source" | "coverUrl">[];

export function createFallbackLabel(game: Pick<GameEntry, "title" | "accent">, index = 0) {
  const palette = seedPalettes[index % seedPalettes.length];
  return drawLabel(game.title, [game.accent || palette[0], palette[1], palette[2]], `NUS-${String(index + 1).padStart(3, "0")}`);
}

export function getSeedLibrary(): GameEntry[] {
  return seedGames.map((game, index) => {
    const accent = seedPalettes[index % seedPalettes.length][0];

    return {
      ...game,
      id: `seed-${slugify(game.title)}`,
      accent,
      source: "seed",
    };
  });
}

export function loadLibrary() {
  if (typeof localStorage === "undefined") {
    return getSeedLibrary();
  }

  const fallback = getSeedLibrary();
  const saved = localStorage.getItem(LIBRARY_KEY);

  if (!saved) {
    return fallback;
  }

  try {
    const parsed = JSON.parse(saved) as GameEntry[];
    const savedIds = new Set(parsed.map((game) => game.id));
    const missingSeeds = fallback.filter((game) => !savedIds.has(game.id));
    return [...parsed, ...missingSeeds];
  } catch {
    return fallback;
  }
}

export function saveLibrary(games: GameEntry[]) {
  localStorage.setItem(LIBRARY_KEY, JSON.stringify(games));
}
