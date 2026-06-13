import { useEffect, useState } from 'react'
import { RotateCcw, Save, X } from 'lucide-react'
import {
  clearCredentials,
  getCredentials,
  getDefaultCredentials,
  saveCredentials,
  searchGames,
} from '../../api/screenscraper'
import { resolveLibrary, useStore } from '../../store'

export function SettingsPanel() {
  const open = useStore((s) => s.settingsOpen)
  const setOpen = useStore((s) => s.setSettingsOpen)
  const resetLibrary = useStore((s) => s.resetLibrary)

  const [form, setForm] = useState(getCredentials)
  const [test, setTest] = useState<'idle' | 'testing' | 'ok' | 'fail'>('idle')
  const [testMsg, setTestMsg] = useState('')

  useEffect(() => {
    if (open) {
      setForm(getCredentials())
      setTest('idle')
    }
  }, [open])

  const save = () => {
    saveCredentials(form)
    setTest('idle')
    setTestMsg('Saved.')
  }

  const restoreDefaults = () => {
    clearCredentials()
    setForm(getDefaultCredentials())
    setTestMsg('Restored .env defaults.')
  }

  const testConnection = async () => {
    saveCredentials(form)
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
          Credentials default to <code>.env.local</code>. Overrides are stored in
          this browser only.
        </p>
        <label>
          Developer ID
          <input
            value={form.devid}
            onChange={(e) => setForm({ ...form, devid: e.target.value })}
            autoComplete="off"
            spellCheck={false}
          />
        </label>
        <label>
          Developer Password
          <input
            type="password"
            value={form.devpassword}
            onChange={(e) => setForm({ ...form, devpassword: e.target.value })}
            autoComplete="off"
          />
        </label>
        <label>
          Soft Name
          <input
            value={form.softname}
            onChange={(e) => setForm({ ...form, softname: e.target.value })}
            autoComplete="off"
            spellCheck={false}
          />
        </label>

        <div className="settings-actions">
          <button className="btn primary" onClick={save}>
            <Save size={15} /> Save
          </button>
          <button className="btn" onClick={testConnection} disabled={test === 'testing'}>
            {test === 'testing' ? 'Testing…' : 'Test Connection'}
          </button>
          <button className="btn subtle" onClick={restoreDefaults}>
            <RotateCcw size={14} /> Defaults
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
