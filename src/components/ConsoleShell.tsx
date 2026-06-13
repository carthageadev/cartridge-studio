import { useEffect, useRef, useState } from "react";
import {
  BatteryCharging,
  ChevronLeft,
  ChevronRight,
  Circle,
  Gamepad2,
  Plus,
  Search,
  Settings,
  Signal,
  Sparkles,
  Wifi,
  X,
} from "lucide-react";
import type { GameEntry, ScreenScraperConfig, SearchResult, VisualSettings } from "../types";
import { getScreenScraperConfig, hasScreenScraperCredentials, saveScreenScraperConfig } from "../services/screenscraper";

type ConsoleShellProps = {
  selectedGame: GameEntry;
  selectedIndex: number;
  totalGames: number;
  detailsOpen: boolean;
  libraryOpen: boolean;
  settingsOpen: boolean;
  visualSettings: VisualSettings;
  searchQuery: string;
  searchResults: SearchResult[];
  searchStatus: string;
  searching: boolean;
  artSyncStatus: string;
  artSyncActive: boolean;
  onSyncArt: () => void;
  onPrev: () => void;
  onNext: () => void;
  onOpenDetails: () => void;
  onCloseDetails: () => void;
  onToggleLibrary: () => void;
  onToggleSettings: () => void;
  onCloseLibrary: () => void;
  onSearchQueryChange: (value: string) => void;
  onSearch: () => void;
  onAddSearchResult: (result: SearchResult) => void;
  onVisualSettingsChange: (settings: VisualSettings) => void;
};

function useClock() {
  const [time, setTime] = useState(() =>
    new Intl.DateTimeFormat(undefined, {
      hour: "numeric",
      minute: "2-digit",
    }).format(new Date()),
  );

  useEffect(() => {
    const interval = window.setInterval(() => {
      setTime(
        new Intl.DateTimeFormat(undefined, {
          hour: "numeric",
          minute: "2-digit",
        }).format(new Date()),
      );
    }, 1000);

    return () => window.clearInterval(interval);
  }, []);

  return time;
}

function SystemStatus({ onToggleSettings }: { onToggleSettings: () => void }) {
  const time = useClock();

  return (
    <header className="top-status" aria-label="Console status">
      <div className="brand-mark">
        <Gamepad2 size={17} />
        <span>RetroFlow 64</span>
      </div>
      <div className="status-cluster">
        <span className="status-pill">{time}</span>
        <Wifi size={16} />
        <Signal size={16} />
        <BatteryCharging size={18} />
        <button className="icon-button" type="button" onClick={onToggleSettings} aria-label="Open settings">
          <Settings size={18} />
        </button>
      </div>
    </header>
  );
}

function ArtSyncStatus({ active, status }: { active: boolean; status: string }) {
  if (!status) {
    return null;
  }

  return (
    <div className={`art-sync ${active ? "is-active" : ""}`} role="status" aria-live="polite">
      <span />
      {status}
    </div>
  );
}

function InfoPanel({
  open,
  game,
  onClose,
}: {
  open: boolean;
  game: GameEntry;
  onClose: () => void;
}) {
  return (
    <aside className={`info-panel ${open ? "is-open" : ""}`} aria-hidden={!open}>
      <button className="icon-button panel-close" type="button" onClick={onClose} aria-label="Close game details">
        <X size={18} />
      </button>
      <div className="panel-kicker">Game Details</div>
      <h1>{game.title}</h1>
      <p className="game-description">{game.description}</p>
      <div className="meta-grid">
        <span>
          <strong>{game.releaseYear}</strong>
          Year
        </span>
        <span>
          <strong>{game.genre}</strong>
          Genre
        </span>
        <span>
          <strong>{game.developer}</strong>
          Developer
        </span>
        <span>
          <strong>{game.rating}</strong>
          Rating
        </span>
      </div>
      <div className="publisher-row">
        <span>Publisher</span>
        <strong>{game.publisher}</strong>
      </div>
      <div className="publisher-row">
        <span>Players</span>
        <strong>{game.players}</strong>
      </div>
    </aside>
  );
}

function LibraryDrawer({
  open,
  query,
  results,
  status,
  searching,
  onClose,
  onQueryChange,
  onSearch,
  onAdd,
  onSyncArt,
}: {
  open: boolean;
  query: string;
  results: SearchResult[];
  status: string;
  searching: boolean;
  onClose: () => void;
  onQueryChange: (value: string) => void;
  onSearch: () => void;
  onAdd: (result: SearchResult) => void;
  onSyncArt: () => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      window.setTimeout(() => inputRef.current?.focus(), 120);
    }
  }, [open]);

  return (
    <section className={`library-drawer ${open ? "is-open" : ""}`} aria-hidden={!open}>
      <div className="drawer-header">
        <div>
          <span className="panel-kicker">ScreenScraper Search</span>
          <h2>Add N64 Game</h2>
        </div>
        <button className="icon-button" type="button" onClick={onClose} aria-label="Close add game panel">
          <X size={18} />
        </button>
      </div>

      <form
        className="search-form"
        onSubmit={(event) => {
          event.preventDefault();
          onSearch();
        }}
      >
        <Search size={18} />
        <input
          ref={inputRef}
          value={query}
          onChange={(event) => onQueryChange(event.target.value)}
          placeholder="Search Mario, Zelda, GoldenEye..."
        />
        <button type="submit" disabled={searching || !query.trim()}>
          {searching ? "Searching" : "Search"}
        </button>
      </form>

      <p className="drawer-status">{status}</p>

      <button className="sync-art-button" type="button" onClick={onSyncArt}>
        Refresh cartridge art
      </button>

      <div className="search-results">
        {results.map((result) => (
          <button className="search-result" key={result.id} type="button" onClick={() => onAdd(result)}>
            <span>
              <strong>{result.title}</strong>
              <small>{result.subtitle || "Nintendo 64"}</small>
            </span>
            <Plus size={18} />
          </button>
        ))}
      </div>
    </section>
  );
}

function SettingsPanel({
  open,
  settings,
  onSettingsChange,
  onClose,
}: {
  open: boolean;
  settings: VisualSettings;
  onSettingsChange: (settings: VisualSettings) => void;
  onClose: () => void;
}) {
  const [config, setConfig] = useState<ScreenScraperConfig>(() => getScreenScraperConfig());
  const [saved, setSaved] = useState("");

  useEffect(() => {
    if (open) {
      setConfig(getScreenScraperConfig());
      setSaved("");
    }
  }, [open]);

  const credentialsReady = hasScreenScraperCredentials(config);

  return (
    <aside className={`settings-panel ${open ? "is-open" : ""}`} aria-hidden={!open}>
      <div className="drawer-header">
        <div>
          <span className="panel-kicker">Console OS</span>
          <h2>Settings</h2>
        </div>
        <button className="icon-button" type="button" onClick={onClose} aria-label="Close settings">
          <X size={18} />
        </button>
      </div>

      <div className="toggle-list">
        <label>
          <span>Soft floor shadow</span>
          <input
            type="checkbox"
            checked={settings.reflections}
            onChange={(event) => onSettingsChange({ ...settings, reflections: event.target.checked })}
          />
        </label>
        <label>
          <span>Cartridge glow</span>
          <input
            type="checkbox"
            checked={settings.consoleGlow}
            onChange={(event) => onSettingsChange({ ...settings, consoleGlow: event.target.checked })}
          />
        </label>
        <label>
          <span>Reduced motion</span>
          <input
            type="checkbox"
            checked={settings.reducedMotion}
            onChange={(event) => onSettingsChange({ ...settings, reducedMotion: event.target.checked })}
          />
        </label>
      </div>

      <div className="credentials-box">
        <div className="credential-state">
          <Sparkles size={16} />
          <span>{credentialsReady ? "ScreenScraper configured" : "ScreenScraper credentials needed"}</span>
        </div>
        <label>
          Developer ID
          <input value={config.devId} onChange={(event) => setConfig({ ...config, devId: event.target.value })} />
        </label>
        <label>
          Developer Password
          <input
            type="password"
            value={config.devPassword}
            onChange={(event) => setConfig({ ...config, devPassword: event.target.value })}
          />
        </label>
        <label>
          Soft Name
          <input value={config.softName} onChange={(event) => setConfig({ ...config, softName: event.target.value })} />
        </label>
        <label>
          User ID
          <input value={config.userId} onChange={(event) => setConfig({ ...config, userId: event.target.value })} />
        </label>
        <label>
          User Password
          <input
            type="password"
            value={config.userPassword}
            onChange={(event) => setConfig({ ...config, userPassword: event.target.value })}
          />
        </label>
        <button
          className="primary-action"
          type="button"
          onClick={() => {
            saveScreenScraperConfig(config);
            setSaved("Saved for this browser.");
          }}
        >
          Save Credentials
        </button>
        <small>{saved || "You can also set VITE_SCREENSCRAPER_* values in .env.local."}</small>
      </div>
    </aside>
  );
}

function BottomControls({
  selectedIndex,
  totalGames,
  onPrev,
  onNext,
  onOpenDetails,
  onToggleLibrary,
}: Pick<ConsoleShellProps, "selectedIndex" | "totalGames" | "onPrev" | "onNext" | "onOpenDetails" | "onToggleLibrary">) {
  return (
    <footer className="bottom-controls">
      <button type="button" onClick={onPrev} aria-label="Previous game">
        <ChevronLeft size={18} />
        <span>L</span>
      </button>
      <button type="button" onClick={onOpenDetails}>
        <Circle size={14} />
        <span>A Select</span>
      </button>
      <div className="position-indicator">
        {selectedIndex + 1}
        <span>/</span>
        {totalGames}
      </div>
      <button type="button" onClick={onToggleLibrary}>
        <Plus size={18} />
        <span>Add</span>
      </button>
      <button type="button" onClick={onNext} aria-label="Next game">
        <span>R</span>
        <ChevronRight size={18} />
      </button>
    </footer>
  );
}

export function ConsoleShell({
  selectedGame,
  selectedIndex,
  totalGames,
  detailsOpen,
  libraryOpen,
  settingsOpen,
  visualSettings,
  searchQuery,
  searchResults,
  searchStatus,
  searching,
  artSyncStatus,
  artSyncActive,
  onSyncArt,
  onPrev,
  onNext,
  onOpenDetails,
  onCloseDetails,
  onToggleLibrary,
  onToggleSettings,
  onCloseLibrary,
  onSearchQueryChange,
  onSearch,
  onAddSearchResult,
  onVisualSettingsChange,
}: ConsoleShellProps) {
  return (
    <>
      <SystemStatus onToggleSettings={onToggleSettings} />
      <ArtSyncStatus active={artSyncActive} status={artSyncStatus} />
      <InfoPanel open={detailsOpen} game={selectedGame} onClose={onCloseDetails} />
      <LibraryDrawer
        open={libraryOpen}
        query={searchQuery}
        results={searchResults}
        status={searchStatus}
        searching={searching}
        onClose={onCloseLibrary}
        onQueryChange={onSearchQueryChange}
        onSearch={onSearch}
        onAdd={onAddSearchResult}
        onSyncArt={onSyncArt}
      />
      <SettingsPanel
        open={settingsOpen}
        settings={visualSettings}
        onSettingsChange={onVisualSettingsChange}
        onClose={onToggleSettings}
      />
      <BottomControls
        selectedIndex={selectedIndex}
        totalGames={totalGames}
        onPrev={onPrev}
        onNext={onNext}
        onOpenDetails={onOpenDetails}
        onToggleLibrary={onToggleLibrary}
      />
    </>
  );
}
