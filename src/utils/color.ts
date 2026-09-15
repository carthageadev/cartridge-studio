/* Accent colours come from the game data, and a few of them are near-black.
   On a black canvas that made the genre line and the rating stars vanish.
   readableColor enforces a legibility floor: anything already bright is
   returned untouched, anything too dark is mixed toward white in small
   steps until it clears the floor, which keeps the hue recognisable. */

const MIN_LUMINANCE = 0.18

function linearise(channel: number): number {
  const v = channel / 255
  return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4)
}

function luminance(rgb: number[]): number {
  return 0.2126 * linearise(rgb[0]) + 0.7152 * linearise(rgb[1]) + 0.0722 * linearise(rgb[2])
}

function parseHex(hex: string): number[] | null {
  const match = /^#?([\da-f]{2})([\da-f]{2})([\da-f]{2})$/i.exec(hex.trim())
  if (!match) return null
  return [match[1], match[2], match[3]].map((part) => parseInt(part, 16))
}

function toHex(rgb: number[]): string {
  return `#${rgb.map((c) => c.toString(16).padStart(2, "0")).join("")}`
}

export function readableColor(hex: string): string {
  const rgb = parseHex(hex)
  if (!rgb) return hex
  if (luminance(rgb) >= MIN_LUMINANCE) return hex

  for (let step = 1; step <= 20; step++) {
    const t = step / 20
    const mixed = rgb.map((c) => Math.round(c + (255 - c) * t))
    if (luminance(mixed) >= MIN_LUMINANCE) return toHex(mixed)
  }

  return "#ffffff"
}