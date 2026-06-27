export interface Game {
  id: number
  title: string
  year: string
  genre: string
  developer: string
  description: string
  coverArt: string
  rating: number
  players: string
  color: string
  error?: string
  ssId?: string | null
  coverState?: 'queued' | 'fetching' | 'cached' | 'fetched' | 'missing' | 'error'
  status?: 'pending' | 'loading' | 'ready' | 'error'
}

export const initialGames: Game[] = [
  {
    id: 1,
    title: "Super Mario 64",
    year: "1996",
    genre: "3D Platformer",
    developer: "Nintendo EAD",
    description:
      "Jump into Mario's first fully 3D adventure! Explore Princess Peach's castle and collect Power Stars across 15 magical worlds filled with secrets and wonder.",
    coverArt: "/images/game1.jpg",
    rating: 9.8,
    players: "1 Player",
    color: "#E52521",
  },
  {
    id: 2,
    title: "Zelda: Ocarina of Time",
    year: "1998",
    genre: "Action-Adventure",
    developer: "Nintendo EAD",
    description:
      "Embark on a legendary quest across the land of Hyrule. Travel through time, solve ancient puzzles, and battle the evil Ganondorf in this timeless masterpiece.",
    coverArt: "/images/game2.jpg",
    rating: 10.0,
    players: "1 Player",
    color: "#1B8A2A",
  },
  {
    id: 3,
    title: "GoldenEye 007",
    year: "1997",
    genre: "First-Person Shooter",
    developer: "Rare",
    description:
      "Step into the shoes of James Bond in this revolutionary FPS. Infiltrate enemy bases, complete covert missions, and battle friends in iconic 4-player splitscreen.",
    coverArt: "/images/game3.jpg",
    rating: 9.5,
    players: "1-4 Players",
    color: "#C4A000",
  },
  {
    id: 4,
    title: "Mario Kart 64",
    year: "1996",
    genre: "Racing",
    developer: "Nintendo EAD",
    description:
      "Race through 16 incredible tracks in the most beloved kart racer of the era. Master power slides, launch shells, and cross the finish line first!",
    coverArt: "/images/game4.jpg",
    rating: 9.4,
    players: "1-4 Players",
    color: "#E52521",
  },
  {
    id: 5,
    title: "Super Smash Bros.",
    year: "1999",
    genre: "Fighting",
    developer: "HAL Laboratory",
    description:
      "Nintendo's greatest heroes collide in an all-out battle royale! Choose from 12 iconic fighters and duke it out on wild stages with items and total chaos.",
    coverArt: "/images/game5.jpg",
    rating: 9.2,
    players: "1-4 Players",
    color: "#FF6B00",
  },
  {
    id: 6,
    title: "Donkey Kong 64",
    year: "1999",
    genre: "3D Platformer",
    developer: "Rare",
    description:
      "Join Donkey Kong and his crew in a massive 3D adventure! Explore sprawling worlds, collect golden bananas, and defeat the nefarious King K. Rool.",
    coverArt: "/images/game6.jpg",
    rating: 8.8,
    players: "1-4 Players",
    color: "#8B4513",
  },
  {
    id: 7,
    title: "Star Fox 64",
    year: "1997",
    genre: "Rail Shooter",
    developer: "Nintendo EAD",
    description:
      "Take command of the Arwing and lead Team Star Fox through intense space combat! Barrel roll through enemy fire and save the entire Lylat system from doom.",
    coverArt: "/images/game7.jpg",
    rating: 9.3,
    players: "1-4 Players",
    color: "#4169E1",
  },
  {
    id: 8,
    title: "Banjo-Kazooie",
    year: "1998",
    genre: "3D Platformer",
    developer: "Rare",
    description:
      "A bear and bird duo embark on a quest to rescue Banjo's sister from the wicked witch Gruntilda. Collect jiggies across colorful, puzzle-filled worlds!",
    coverArt: "/images/game8.jpg",
    rating: 9.4,
    players: "1 Player",
    color: "#FFD700",
  },
  {
    id: 9,
    title: "Wave Race 64",
    year: "1996",
    genre: "Racing",
    developer: "Nintendo EAD",
    description:
      "Slice across dynamic water physics and master the spray, wake, and swell in one of the most beautiful launch-era showcases on the system.",
    coverArt: "/images/game2.jpg",
    rating: 9.0,
    players: "1-2 Players",
    color: "#2B8CC4",
  },
  {
    id: 10,
    title: "F-Zero X",
    year: "1998",
    genre: "Racing",
    developer: "Nintendo EAD",
    description:
      "A blistering anti-gravity racer with 60 FPS speed, aggressive combat, and a futuristic tournament that still feels wild today.",
    coverArt: "/images/game4.jpg",
    rating: 9.1,
    players: "1-4 Players",
    color: "#C81E3A",
  },
  {
    id: 11,
    title: "Paper Mario",
    year: "2000",
    genre: "RPG",
    developer: "Intelligent Systems",
    description:
      "A charming, witty RPG adventure where Mario and a cast of memorable partners unravel a storybook quest through Paper-thin worlds.",
    coverArt: "/images/game5.jpg",
    rating: 9.4,
    players: "1 Player",
    color: "#DA4C2A",
  },
  {
    id: 12,
    title: "Perfect Dark",
    year: "2000",
    genre: "First-Person Shooter",
    developer: "Rare",
    description:
      "A sleek sci-fi spy thriller with precision shooting, deep systems, and one of the most ambitious campaigns on the console.",
    coverArt: "/images/game3.jpg",
    rating: 9.5,
    players: "1-4 Players",
    color: "#111827",
  },
  {
    id: 13,
    title: "The Legend of Zelda: Majora's Mask",
    year: "2000",
    genre: "Action-Adventure",
    developer: "Nintendo EAD",
    description:
      "A moody, time-bending adventure through Termina where every cycle matters and every mask unlocks a different way to see the world.",
    coverArt: "/images/game1.jpg",
    rating: 9.8,
    players: "1 Player",
    color: "#7C3AED",
  },
  {
    id: 14,
    title: "Diddy Kong Racing",
    year: "1997",
    genre: "Racing",
    developer: "Rare",
    description:
      "A joyful adventure racer with hovercraft, planes, and karts plus a sprawling island hub full of secrets and shortcuts.",
    coverArt: "/images/game6.jpg",
    rating: 9.2,
    players: "1-4 Players",
    color: "#F59E0B",
  },
  {
    id: 15,
    title: "Pokémon Stadium",
    year: "2000",
    genre: "Party",
    developer: "HAL Laboratory",
    description:
      "Bring your team into spectacular 3D battles and addictive mini-games that turned link-cable dreams into a couch multiplayer event.",
    coverArt: "/images/game7.jpg",
    rating: 9.1,
    players: "1-4 Players",
    color: "#F97316",
  },
  {
    id: 16,
    title: "Yoshi's Story",
    year: "1997",
    genre: "Platformer",
    developer: "Nintendo EAD",
    description:
      "A colorful storybook platformer with delightful hand-crafted stages, inventive objectives, and soft, playful presentation.",
    coverArt: "/images/game8.jpg",
    rating: 8.7,
    players: "1-2 Players",
    color: "#22C55E",
  },
]
