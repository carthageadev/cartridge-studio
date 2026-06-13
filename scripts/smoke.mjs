// Headless smoke test: fresh library, loop browsing, detail view, FPS probe.
import { chromium } from 'playwright-core'
import { mkdirSync } from 'node:fs'

const OUT = 'scripts/shots'
mkdirSync(OUT, { recursive: true })

const browser = await chromium.launch({ channel: 'msedge', headless: true })
const page = await (await browser.newContext({ viewport: { width: 1440, height: 810 } })).newPage()

const errors = []
page.on('console', (m) => m.type() === 'error' && errors.push(m.text()))
page.on('pageerror', (e) => errors.push(String(e)))

await page.goto('http://localhost:5173', { waitUntil: 'load' })
await page.evaluate(() => localStorage.clear())
await page.reload({ waitUntil: 'load' })
await page.waitForSelector('canvas', { timeout: 30000 })

// Right after boot: carts should wear FETCHING ART badges + SYNCING bar
await page.waitForTimeout(2600)
await page.screenshot({ path: `${OUT}/01-fetching.png` })

// Loop test: from index 0, go LEFT - ring should wrap to the last cart
await page.keyboard.press('ArrowLeft')
await page.waitForTimeout(1400)
await page.screenshot({ path: `${OUT}/02-loop-left.png` })

// Let seeds resolve, then look at the carousel with bloom
await page.waitForTimeout(12000)
await page.screenshot({ path: `${OUT}/03-carousel.png` })

// Detail view - metadata should be populated now (retries in place)
await page.keyboard.press('ArrowRight')
await page.waitForTimeout(500)
await page.keyboard.press('ArrowRight')
await page.waitForTimeout(900)
await page.keyboard.press('Enter')
await page.waitForTimeout(1800)
await page.screenshot({ path: `${OUT}/04-detail.png` })
await page.keyboard.press('Escape')
await page.waitForTimeout(800)

// crude FPS probe over 2s
const fps = await page.evaluate(
  () =>
    new Promise((res) => {
      let c = 0
      const t0 = performance.now()
      const loop = () => {
        c++
        if (performance.now() - t0 < 2000) requestAnimationFrame(loop)
        else res(Math.round(c / 2))
      }
      requestAnimationFrame(loop)
    })
)
console.log('FPS ~', fps)
console.log('CONSOLE ERRORS:', errors.length ? errors.join('\n---\n') : 'none')
await browser.close()
