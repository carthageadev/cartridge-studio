import { useState } from 'react'
import { X } from 'lucide-react'
import { clearCredentials, searchGames } from '../../api/screenscraper'
import { resolveLibrary, useStore } from '../../store'

export function SettingsPanel() {
  const open = useStore((s) => s.settingsOpen)
  const setOpen = useStore((s) => s.setSettingsOpen)
  const resetLibrary = useStore((s) => s.resetLibrary)

  const [test, setTest] = useState<'idle' | 'testing' | 'ok' | 'fail'>('idle')
  const [testMsg, setTestMsg] = useState('')

  const clearStoredKeys = () => {
    clearCredentials()
    setTest('idle')
    setTestMsg('Cleared keys stored by older versions.')
  }

  const testConnection = async () => {
    setTest('testing')
    setTestMsg('')
    try {
      const results = await searchGames('Mario')
      setTest('ok')
      setTestMsg(`Connected - ${results.length} results for "Mario".`)
    } catch (err: any) {
      setTest('fail')
      setTestMsg(err?.message ?? 'Connection failed')
    }
  }

  return (
    <aside className={`settings glass ${open ? 'open' : ''}`}>
      <div className="panel-header">
        <h2>System Settings</h2>
        <button className="icon-btn" aria-label="Close settings" onClick={() => setOpen(false)}>
          <X size={18} />
        </button>
      </div>

      <section className="settings-section">
        <h3>ScreenScraper API</h3>
        <p className="settings-note">
          Cover art is fetched through a server-side proxy. Keys live in the
          server environment, never in this browser.
        </p>

        <div className="settings-actions">
          <button className="btn" onClick={testConnection} disabled={test === 'testing'}>
            {test === 'testing' ? 'Testing…' : 'Test Connection'}
          </button>
          <button className="btn subtle" onClick={clearStoredKeys}>
            Clear stored keys
          </button>
        </div>
        {testMsg && (
          <p className={`settings-status ${test === 'fail' ? 'fail' : 'ok'}`}>{testMsg}</p>
        )}
      </section>

      <section className="settings-section">
        <h3>Library</h3>
        <p className="settings-note">
          Resets your library back to the starter collection of N64 classics.
        </p>
        <button
          className="btn danger"
          onClick={() => {
            resetLibrary()
            setTestMsg('')
            void resolveLibrary()
          }}
        >
          Reset Library
        </button>
      </section>

      <footer className="settings-footer">RETROFLOW OS · v1.0</footer>
    </aside>
  )
}
