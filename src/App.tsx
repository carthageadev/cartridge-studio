import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { CarouselScene } from "./components/CarouselScene";
import { ConsoleShell } from "./components/ConsoleShell";
import { createFallbackLabel, loadLibrary, saveLibrary } from "./data/library";
import { fetchN64GameDetails, hasScreenScraperCredentials, searchN64Games } from "./services/screenscraper";
import type { GameEntry, SearchResult, VisualSettings } from "./types";

const VISUAL_SETTINGS_KEY = "retroflow.visual.settings";

function loadVisualSettings(): VisualSettings {
  if (typeof localStorage === "undefined") {
    return { reflections: true, consoleGlow: true, reducedMotion: false };
  }

  try {
    return {
      reflections: true,
      consoleGlow: true,
      reducedMotion: false,
      ...JSON.parse(localStorage.getItem(VISUAL_SETTINGS_KEY) ?? "{}"),
    };
  } catch {
    return { reflections: true, consoleGlow: true, reducedMotion: false };
  }
}

function clampIndex(index: number, total: number) {
  return ((index % total) + total) % total;
}

function normalizeTitle(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "");
}

function delay(ms: number) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

export default function App() {
  const [library, setLibrary] = useState<GameEntry[]>(() => loadLibrary());
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [libraryOpen, setLibraryOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [visualSettings, setVisualSettings] = useState<VisualSettings>(() => loadVisualSettings());
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [searchStatus, setSearchStatus] = useState("Search by name to add real ScreenScraper cartridge art.");
  const [searching, setSearching] = useState(false);
  const [artSyncStatus, setArtSyncStatus] = useState("");
  const [artSyncActive, setArtSyncActive] = useState(false);
  const [zoom, setZoom] = useState(0.42);
  const [inspectActive, setInspectActive] = useState(false);
  const [inspectRotation, setInspectRotation] = useState({ x: 0, y: 0 });
  const dragStartRef = useRef<{ x: number; y: number } | null>(null);
  const artSyncStartedRef = useRef(false);

  const selectedGame = useMemo(() => library[clampIndex(selectedIndex, library.length)], [library, selectedIndex]);

  useEffect(() => {
    saveLibrary(library);
  }, [library]);

  useEffect(() => {
    localStorage.setItem(VISUAL_SETTINGS_KEY, JSON.stringify(visualSettings));
  }, [visualSettings]);

  useEffect(() => {
    setSelectedIndex((index) => clampIndex(index, library.length));
  }, [library.length]);

  const syncLibraryArt = useCallback(async () => {
    if (!hasScreenScraperCredentials()) {
      setArtSyncStatus("ScreenScraper art sync waiting for credentials.");
      return;
    }

    if (artSyncActive) {
      return;
    }

    const candidates = library.filter(
      (game) =>
        game.source === "seed" ||
        !game.screenScraperId ||
        !game.coverUrl ||
        game.coverUrl === "/gameart.png" ||
        game.coverUrl.startsWith("data:"),
    );

    if (!candidates.length) {
      setArtSyncStatus("Cartridge art is synced.");
      return;
    }

    let cancelled = false;
    setArtSyncActive(true);

    let updated = 0;

    for (let index = 0; index < candidates.length; index += 1) {
      const game = candidates[index];

      if (cancelled) {
        return;
      }

      setArtSyncStatus(`Fetching cartridge art ${index + 1}/${candidates.length}: ${game.title}`);

      try {
        const results = await searchN64Games(game.title);
        const normalizedGameTitle = normalizeTitle(game.title);
        const bestMatch =
          results.find((result) => {
            const normalizedResultTitle = normalizeTitle(result.title);
            return normalizedResultTitle === normalizedGameTitle || normalizedResultTitle.includes(normalizedGameTitle);
          }) ?? results[0];

        if (!bestMatch) {
          await delay(180);
          continue;
        }

        const details = await fetchN64GameDetails(bestMatch.id, game.title);

        setLibrary((current) =>
          current.map((entry) => {
            if (entry.id !== game.id) {
              return entry;
            }

            return {
              ...entry,
              ...details,
              id: entry.id,
              coverUrl: details.coverUrl || entry.coverUrl || createFallbackLabel(details, index),
              backgroundUrl: details.backgroundUrl || entry.backgroundUrl,
            };
          }),
        );

        updated += 1;
        await delay(260);
      } catch (error) {
        setArtSyncStatus(error instanceof Error ? `Art sync issue: ${error.message}` : "Art sync issue.");
        await delay(500);
      }
    }

    if (!cancelled) {
      setArtSyncActive(false);
      setArtSyncStatus(updated ? `Synced real art for ${updated} N64 games.` : "No ScreenScraper art updates found.");
    }
  }, [artSyncActive, library]);

  useEffect(() => {
    if (artSyncStartedRef.current) {
      return;
    }

    artSyncStartedRef.current = true;
    void syncLibraryArt();
  }, [syncLibraryArt]);

  const navigate = useCallback(
    (direction: number) => {
      setInspectActive(false);
      setInspectRotation({ x: 0, y: 0 });
      setSelectedIndex((index) => clampIndex(index + direction, library.length));
    },
    [library.length],
  );

  const focusIndex = useCallback((index: number) => {
    setInspectActive(false);
    setInspectRotation({ x: 0, y: 0 });
    setSelectedIndex(index);
  }, []);

  const openDetails = useCallback((index = selectedIndex) => {
    setSelectedIndex(index);
    setDetailsOpen(true);
    setLibraryOpen(false);
  }, [selectedIndex]);

  const activateGame = useCallback(
    (index = selectedIndex) => {
      if (detailsOpen && index === selectedIndex) {
        setInspectActive((active) => !active);
        return;
      }

      setInspectActive(false);
      setInspectRotation({ x: 0, y: 0 });
      openDetails(index);
    },
    [detailsOpen, openDetails, selectedIndex],
  );

  const runSearch = useCallback(async () => {
    if (!searchQuery.trim()) {
      return;
    }

    setSearching(true);
    setSearchStatus("Contacting ScreenScraper...");

    try {
      const results = await searchN64Games(searchQuery.trim());
      setSearchResults(results);
      setSearchStatus(results.length ? "Choose a result to add it to your flow." : "No N64 results found for that search.");
    } catch (error) {
      setSearchResults([]);
      setSearchStatus(error instanceof Error ? error.message : "Search failed.");
    } finally {
      setSearching(false);
    }
  }, [searchQuery]);

  const addSearchResult = useCallback(
    async (result: SearchResult) => {
      setSearching(true);
      setSearchStatus(`Loading ${result.title} details...`);

      try {
        const game = await fetchN64GameDetails(result.id, result.title);
        const preparedGame = {
          ...game,
          coverUrl: game.coverUrl || createFallbackLabel(game, library.length),
        };

        setLibrary((current) => {
          const existingIndex = current.findIndex(
            (entry) => entry.screenScraperId === preparedGame.screenScraperId || entry.title === preparedGame.title,
          );

          if (existingIndex >= 0) {
            const next = [...current];
            next[existingIndex] = preparedGame;
            setSelectedIndex(existingIndex);
            return next;
          }

          setSelectedIndex(current.length);
          return [...current, preparedGame];
        });

        setDetailsOpen(true);
        setLibraryOpen(false);
        setSearchStatus(`${result.title} added to your N64 carousel.`);
      } catch (error) {
        setSearchStatus(error instanceof Error ? error.message : "Could not add that game.");
      } finally {
        setSearching(false);
      }
    },
    [library.length],
  );

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "ArrowLeft") {
        navigate(-1);
      }

      if (event.key === "ArrowRight") {
        navigate(1);
      }

      if (event.key === "Enter") {
        activateGame();
      }

      if (event.key === "Escape") {
        if (inspectActive) {
          setInspectActive(false);
          setInspectRotation({ x: 0, y: 0 });
          return;
        }

        setDetailsOpen(false);
        setLibraryOpen(false);
        setSettingsOpen(false);
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [activateGame, inspectActive, navigate]);

  const handleWheel = (event: React.WheelEvent<HTMLElement>) => {
    if (Math.abs(event.deltaY) > 4) {
      setZoom((value) => Math.min(1, Math.max(0, value - event.deltaY * 0.0012)));
    }
  };

  const handlePointerDown = (event: React.PointerEvent<HTMLElement>) => {
    dragStartRef.current = { x: event.clientX, y: event.clientY };
  };

  const handlePointerMove = (event: React.PointerEvent<HTMLElement>) => {
    if (dragStartRef.current === null) {
      return;
    }

    if (!detailsOpen) {
      dragStartRef.current = { x: event.clientX, y: event.clientY };
      return;
    }

    const deltaX = event.clientX - dragStartRef.current.x;
    const deltaY = event.clientY - dragStartRef.current.y;
    dragStartRef.current = { x: event.clientX, y: event.clientY };

    if (Math.abs(deltaX) + Math.abs(deltaY) < 1) {
      return;
    }

    setInspectActive(true);
    setInspectRotation((rotation) => ({
      x: Math.min(0.7, Math.max(-0.7, rotation.x + deltaY * 0.006)),
      y: rotation.y + deltaX * 0.01,
    }));
  };

  const handlePointerUp = () => {
    dragStartRef.current = null;
  };

  return (
    <main
      className={`app-shell ${detailsOpen ? "details-mode" : ""} ${visualSettings.consoleGlow ? "glow-mode" : ""}`}
      style={{ "--active-accent": selectedGame.accent } as React.CSSProperties}
    >
      <div className="console-body">
        <section
          className="screen-stage"
          aria-label="N64 cartridge carousel"
          onWheel={handleWheel}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerLeave={handlePointerUp}
        >
          <CarouselScene
            games={library}
            selectedIndex={selectedIndex}
            detailsOpen={detailsOpen}
            reflections={visualSettings.reflections}
            consoleGlow={visualSettings.consoleGlow}
            zoom={zoom}
            inspecting={inspectActive}
            inspectRotation={inspectRotation}
            onFocus={focusIndex}
            onActivate={activateGame}
          />
          <div className="screen-vignette" />
          <div className="selected-title" style={{ "--accent": selectedGame.accent } as React.CSSProperties}>
            <span>{selectedGame.genre}</span>
            <strong>{selectedGame.title}</strong>
          </div>
        </section>

        <ConsoleShell
          selectedGame={selectedGame}
          selectedIndex={selectedIndex}
          totalGames={library.length}
          detailsOpen={detailsOpen}
          libraryOpen={libraryOpen}
          settingsOpen={settingsOpen}
          visualSettings={visualSettings}
          searchQuery={searchQuery}
          searchResults={searchResults}
          searchStatus={searchStatus}
          searching={searching}
          artSyncStatus={artSyncStatus}
          artSyncActive={artSyncActive}
          onSyncArt={syncLibraryArt}
          onPrev={() => navigate(-1)}
          onNext={() => navigate(1)}
          onOpenDetails={() => activateGame()}
          onCloseDetails={() => {
            setInspectActive(false);
            setInspectRotation({ x: 0, y: 0 });
            setDetailsOpen(false);
          }}
          onToggleLibrary={() => {
            setLibraryOpen((open) => !open);
            setSettingsOpen(false);
          }}
          onToggleSettings={() => {
            setSettingsOpen((open) => !open);
            setLibraryOpen(false);
          }}
          onCloseLibrary={() => setLibraryOpen(false)}
          onSearchQueryChange={setSearchQuery}
          onSearch={runSearch}
          onAddSearchResult={addSearchResult}
          onVisualSettingsChange={setVisualSettings}
        />
      </div>
    </main>
  );
}
