// Waits for library sync to finish, then dumps each entry's final state.
import { chromium } from 'playwright-core'

const browser = await chromium.launch({ channel: 'msedge', headless: true })
const page = await (await browser.newContext({ viewport: { width: 1440, height: 810 } })).newPage()
const failures = []
page.on('response', (r) => {
  if (!r.ok() && r.url().includes('/api2/')) failures.push(`${r.status()} ${r.url().slice(0, 130)}`)
})

await page.goto('http://localhost:5173', { waitUntil: 'load' })
await page.evaluate(() => localStorage.clear())
await page.reload({ waitUntil: 'load' })
await page.waitForSelector('canvas')

// wait until no pending/loading entries remain (max 90s)
await page.waitForFunction(
  () => {
    const raw = localStorage.getItem('retroflow.library.v1')
    if (!raw) return false
    const games = JSON.parse(raw).state.games
    return games.every((g) => g.status === 'ready' || g.status === 'error')
  },
  null,
  { timeout: 90_000, polling: 1000 }
)

const games = await page.evaluate(() =>
  JSON.parse(localStorage.getItem('retroflow.library.v1')).state.games.map((g) => ({
    name: g.name,
    status: g.status,
    label: g.labelUrl ? 'yes' : 'NO',
    desc: g.meta?.description ? g.meta.description.length : 0,
    year: g.meta?.year,
  }))
)
console.table(games)
console.log('PROXY FAILURES:')
console.log(failures.join('\n') || 'none')
await page.screenshot({ path: 'scripts/shots/06-final.png' })
await browser.close()
