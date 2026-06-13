import { useEffect, useState } from 'react'
import {
  Battery,
  BatteryCharging,
  BatteryFull,
  BatteryLow,
  BatteryMedium,
  Settings,
  Wifi,
  WifiOff,
} from 'lucide-react'
import { useStore } from '../../store'

function useClock() {
  const [now, setNow] = useState(() => new Date())
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 15_000)
    return () => clearInterval(id)
  }, [])
  return now
}

function useBattery() {
  const [state, setState] = useState({ level: 0.82, charging: false })
  useEffect(() => {
    const nav = navigator as any
    if (!nav.getBattery) return
    let battery: any
    const sync = () =>
      setState({ level: battery.level, charging: battery.charging })
    nav.getBattery().then((b: any) => {
      battery = b
      sync()
      b.addEventListener('levelchange', sync)
      b.addEventListener('chargingchange', sync)
    })
    return () => {
      battery?.removeEventListener('levelchange', sync)
      battery?.removeEventListener('chargingchange', sync)
    }
  }, [])
  return state
}

function useOnline() {
  const [online, setOnline] = useState(navigator.onLine)
  useEffect(() => {
    const on = () => setOnline(true)
    const off = () => setOnline(false)
    window.addEventListener('online', on)
    window.addEventListener('offline', off)
    return () => {
      window.removeEventListener('online', on)
      window.removeEventListener('offline', off)
    }
  }, [])
  return online
}

function BatteryIcon({ level, charging }: { level: number; charging: boolean }) {
  if (charging) return <BatteryCharging size={18} />
  if (level > 0.85) return <BatteryFull size={18} />
  if (level > 0.5) return <BatteryMedium size={18} />
  if (level > 0.2) return <BatteryLow size={18} />
  return <Battery size={18} />
}

export function TopBar() {
  const now = useClock()
  const battery = useBattery()
  const online = useOnline()
  const setSettingsOpen = useStore((s) => s.setSettingsOpen)
  const settingsOpen = useStore((s) => s.settingsOpen)

  const time = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  const day = now.toLocaleDateString([], { weekday: 'short' })

  return (
    <header className="topbar">
      <div className="topbar-left">
        <span className="logo-chip">64</span>
        <span className="logo-text">RETROFLOW</span>
        <span className="topbar-divider" />
        <span className="topbar-time">
          {time}
          <small>{day}</small>
        </span>
      </div>
      <div className="topbar-right">
        {online ? <Wifi size={17} /> : <WifiOff size={17} className="dim" />}
        <span className="battery">
          <span className="battery-pct">{Math.round(battery.level * 100)}%</span>
          <BatteryIcon level={battery.level} charging={battery.charging} />
        </span>
        <button
          className={`icon-btn ${settingsOpen ? 'active' : ''}`}
          aria-label="Settings"
          onClick={() => setSettingsOpen(!settingsOpen)}
        >
          <Settings size={18} />
        </button>
      </div>
    </header>
  )
}
