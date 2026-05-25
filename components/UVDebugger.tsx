import React, { Suspense, useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { Canvas, useThree, useFrame } from '@react-three/fiber';
import { OrbitControls, useGLTF, Grid, Environment } from '@react-three/drei';
import * as THREE from 'three';

// -----------------------------------------------------------------------------
// Stylesheet injection for fonts, scrollbars and range sliders
// -----------------------------------------------------------------------------
const StyleInject = () => (
    <style dangerouslySetInnerHTML={{ __html: `
        @import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@300;400;500;700;900&family=JetBrains+Mono:wght@400;700&display=swap');
        
        .retro-tech * {
            font-family: 'Space Grotesk', -apple-system, sans-serif !important;
        }
        .retro-mono, .retro-mono *, select, option, input, button, code {
            font-family: 'JetBrains Mono', monospace !important;
        }

        /* Custom range sliders styling */
        input[type="range"] {
            -webkit-appearance: none;
            appearance: none;
            background: #222 !important;
            outline: none;
            height: 6px !important;
            border: 1px solid rgba(255,255,255,0.1);
        }
        
        input[type="range"]::-webkit-slider-thumb {
            -webkit-appearance: none;
            appearance: none;
            width: 10px;
            height: 10px;
            border-radius: 0% !important; /* Sharp corners */
            background: #fbbf24 !important;
            cursor: pointer;
            box-shadow: 0 0 5px #fbbf24;
            border: none;
        }
        
        input[type="range"]::-moz-range-thumb {
            width: 10px;
            height: 10px;
            border-radius: 0% !important;
            background: #fbbf24 !important;
            cursor: pointer;
            box-shadow: 0 0 5px #fbbf24;
            border: none;
        }

        /* Custom Webkit scrollbar for black/yellow industrial theme */
        ::-webkit-scrollbar {
            width: 5px;
            height: 5px;
        }
        ::-webkit-scrollbar-track {
            background: #050505;
        }
        ::-webkit-scrollbar-thumb {
            background: #1a1a1a;
            border: 1px solid #fbbf24;
        }
        ::-webkit-scrollbar-thumb:hover {
            background: #fbbf24;
        }
    `}} />
);

// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------
interface TextureConfig {
    baseColor: string;
    normal: string;
    roughness: string;
    metallic: string;
    normalScale: number;
}

// -----------------------------------------------------------------------------
// Static asset options - only the new cart textures + label stickers
// -----------------------------------------------------------------------------
const CART_ASSETS = [
    { label: '(Unassigned)', value: '' },
    { label: 'Cart Base Color', value: '/diffuse.jpg' },
    { label: 'Cart Normal Map', value: '/normal.png' },
    { label: 'Cart Roughness', value: '/roughness.png' },
    { label: 'Label - image (US)', value: '/image.png' },
    { label: 'Label - image-jp (JP)', value: '/image-jp.png' },
    { label: 'UV Grid (debug)', value: 'https://threejs.org/examples/textures/uv_grid_opengl.jpg' },
];

// -----------------------------------------------------------------------------
// Default locked-in texture config from user confirmation
// -----------------------------------------------------------------------------
const DEFAULT_CONFIGS: Record<string, TextureConfig> = {
    all: {
        baseColor: '/diffuse.jpg',
        normal: '/normal.png',
        roughness: '/roughness.png',
        metallic: '',
        normalScale: 1,
    },
    boxart: {
        baseColor: '/image-jp.png',
        normal: '',
        roughness: '',
        metallic: '',
        normalScale: 1,
    },
};

// -----------------------------------------------------------------------------
// MeshComponent - applies textures imperatively via TextureLoader
// flipY=false is set BEFORE GPU upload (correct for GLB/OpenGL UV space)
// invalidate() is called after each async load so frameloop="demand" re-renders
// -----------------------------------------------------------------------------
const MeshComponent = ({ mesh, config }: { mesh: THREE.Mesh; config: TextureConfig }) => {
    const loader = useMemo(() => new THREE.TextureLoader(), []);
    const { invalidate } = useThree();

    useEffect(() => {
        if (!mesh) return;

        const mat = new THREE.MeshStandardMaterial({ roughness: 0.7, metalness: 0.15 });
        mesh.material = mat;
        invalidate();

        const loadTex = (url: string, onDone: (t: THREE.Texture | null) => void) => {
            if (!url) { onDone(null); return; }
            loader.load(url, (t) => {
                t.flipY = false;       // GLB UV space - must be false before GPU upload
                t.needsUpdate = true;
                onDone(t);
                invalidate();          // wake up demand renderer after async load
            });
        };

        loadTex(config.baseColor, (t) => { mat.map = t; mat.needsUpdate = true; invalidate(); });
        loadTex(config.normal, (t) => {
            mat.normalMap = t;
            if (t) mat.normalScale.set(config.normalScale, config.normalScale);
            mat.needsUpdate = true;
            invalidate();
        });
        loadTex(config.roughness, (t) => { mat.roughnessMap = t; mat.needsUpdate = true; invalidate(); });
        loadTex(config.metallic, (t) => { mat.metalnessMap = t; mat.needsUpdate = true; invalidate(); });

        return () => { mat.dispose(); };
    }, [mesh, config.baseColor, config.normal, config.roughness, config.metallic, config.normalScale, loader, invalidate]);

    return null;
};

// -----------------------------------------------------------------------------
// CartModel - loads model.glb, detects all meshes, applies per-mesh configs
// -----------------------------------------------------------------------------
const CartModel = ({
    configs,
    onMeshesLoaded,
}: {
    configs: Record<string, TextureConfig>;
    onMeshesLoaded: (names: string[]) => void;
}) => {
    const { scene } = useGLTF('/model.glb');
    const [meshes, setMeshes] = useState<THREE.Mesh[]>([]);
    const cbRef = useRef(onMeshesLoaded);
    const sceneRef = useRef(scene);
    sceneRef.current = scene;
    cbRef.current = onMeshesLoaded;

    useEffect(() => {
        const names: string[] = [];
        const found: THREE.Mesh[] = [];
        sceneRef.current.traverse((child) => {
            if ((child as THREE.Mesh).isMesh) {
                names.push(child.name);
                found.push(child as THREE.Mesh);
            }
        });
        cbRef.current(names);
        setMeshes(found);
    }, []);

    return (
        <>
            <primitive object={scene} scale={1.0} />
            {meshes.map((mesh) => {
                const cfg = configs[mesh.name] ?? configs['all'] ?? DEFAULT_CONFIGS['all'];
                return <MeshComponent key={mesh.name} mesh={mesh} config={cfg} />;
            })}
        </>
    );
};

// -----------------------------------------------------------------------------
// RotatableGroup - lets mouse drag rotate the model with premium damping instead of moving camera
// -----------------------------------------------------------------------------
const RotatableGroup = ({ children }: { children: React.ReactNode }) => {
    const groupRef = useRef<THREE.Group>(null);
    const { gl, camera, invalidate } = useThree();

    const targetRotation = useRef({ x: 0.2, y: 0 }); // Start with slight cool tilt
    const currentRotation = useRef({ x: 0.2, y: 0 });

    // Zoom distance targets (initial distance of [0, 2, 6] camera is sqrt(40) ~ 6.32)
    const targetZoom = useRef(Math.sqrt(40));
    const currentZoom = useRef(Math.sqrt(40));

    const isDragging = useRef(false);
    const prevPointer = useRef({ x: 0, y: 0 });

    useEffect(() => {
        const dom = gl.domElement;

        const handlePointerDown = (e: PointerEvent) => {
            if (e.button !== 0) return; // Left click only
            isDragging.current = true;
            prevPointer.current = { x: e.clientX, y: e.clientY };
        };

        const handlePointerMove = (e: PointerEvent) => {
            if (!isDragging.current) return;
            const deltaX = e.clientX - prevPointer.current.x;
            const deltaY = e.clientY - prevPointer.current.y;

            // Sensitivity multiplier - adjust for perfect speed
            targetRotation.current.y += deltaX * 0.007;
            targetRotation.current.x += deltaY * 0.007; // Reverted vertical invert as requested

            // Clamp X rotation to avoid flipping upside down (-90 to +90 degrees)
            targetRotation.current.x = Math.max(-Math.PI / 2.2, Math.min(Math.PI / 2.2, targetRotation.current.x));

            prevPointer.current = { x: e.clientX, y: e.clientY };
            invalidate(); // Request frame
        };

        const handlePointerUp = () => {
            isDragging.current = false;
        };

        const handleWheel = (e: WheelEvent) => {
            e.preventDefault(); // Stop entire page scroll
            const zoomSpeed = 0.005;
            targetZoom.current = Math.max(3, Math.min(45, targetZoom.current + e.deltaY * zoomSpeed));
            invalidate();
        };

        dom.addEventListener('pointerdown', handlePointerDown);
        window.addEventListener('pointermove', handlePointerMove);
        window.addEventListener('pointerup', handlePointerUp);
        dom.addEventListener('wheel', handleWheel, { passive: false });

        return () => {
            dom.removeEventListener('pointerdown', handlePointerDown);
            window.removeEventListener('pointermove', handlePointerMove);
            window.removeEventListener('pointerup', handlePointerUp);
            dom.removeEventListener('wheel', handleWheel);
        };
    }, [gl, invalidate]);

    useFrame(() => {
        if (!groupRef.current) return;

        // Premium lag / inertia factor
        const damp = 0.08;

        const diffX = targetRotation.current.x - currentRotation.current.x;
        const diffY = targetRotation.current.y - currentRotation.current.y;
        const diffZoom = targetZoom.current - currentZoom.current;

        let needsRender = false;

        if (Math.abs(diffX) > 0.0001 || Math.abs(diffY) > 0.0001) {
            currentRotation.current.x += diffX * damp;
            currentRotation.current.y += diffY * damp;

            groupRef.current.rotation.x = currentRotation.current.x;
            groupRef.current.rotation.y = currentRotation.current.y;
            needsRender = true;
        }

        if (Math.abs(diffZoom) > 0.001) {
            currentZoom.current += diffZoom * damp;

            // Normalized camera vector [0, 2, 6] direction
            const dirY = 2 / Math.sqrt(40);
            const dirZ = 6 / Math.sqrt(40);

            camera.position.set(0, dirY * currentZoom.current, dirZ * currentZoom.current);
            camera.lookAt(0, 0, 0);
            needsRender = true;
        }

        if (needsRender) {
            invalidate(); // Keep rendering as long as we're animating
        }
    });

    return <group ref={groupRef}>{children}</group>;
};

// -----------------------------------------------------------------------------
// Shared select style - industrial black + yellow theme with sharp corners
// -----------------------------------------------------------------------------
const selectStyle: React.CSSProperties = {
    backgroundColor: '#0a0a0a',
    color: 'rgba(255,255,255,0.85)',
    border: '1px solid rgba(255,255,255,0.12)',
    borderRadius: '0px',
    padding: '8px 10px',
    fontSize: '11px',
    width: '100%',
    outline: 'none',
    cursor: 'pointer',
    appearance: 'auto',
};

// -----------------------------------------------------------------------------
// UVDebugger - main component
// -----------------------------------------------------------------------------
export const UVDebugger: React.FC = () => {
    const [selectedMesh, setSelectedMesh] = useState('all');
    const [configs, setConfigs] = useState<Record<string, TextureConfig>>(DEFAULT_CONFIGS);
    const [meshList, setMeshList] = useState<string[]>([]);
    const [isMeshMapOpen, setIsMeshMapOpen] = useState(true);

    // Default Lighting Rig set from user's specification
    const [ambientInt, setAmbientInt] = useState(0.05);
    const [keyInt, setKeyInt] = useState(6.0);
    const [fillInt, setFillInt] = useState(4.0);
    const [rimInt, setRimInt] = useState(4.0);
    const [envIntensity, setEnvIntensity] = useState(0.18);

    // ScreenScraper
    const [searchTitle, setSearchTitle] = useState('');
    const [searchSystem, setSearchSystem] = useState('14');
    const [isSearching, setIsSearching] = useState(false);
    const [searchResults, setSearchResults] = useState<any[]>([]);
    const [scrapedLabel, setScrapedLabel] = useState('');

    const config = configs[selectedMesh] ?? configs['all'] ?? DEFAULT_CONFIGS['all'];

    const updateConfig = useCallback((key: keyof TextureConfig, value: string | number) => {
        setConfigs(prev => {
            const current = prev[selectedMesh] ?? prev['all'] ?? DEFAULT_CONFIGS['all'];
            return { ...prev, [selectedMesh]: { ...current, [key]: value } };
        });
    }, [selectedMesh]);

    // Apply boxart to the boxart mesh specifically - always
    const applyBoxart = useCallback((url: string, label: string) => {
        setConfigs(prev => ({
            ...prev,
            boxart: { ...(prev['boxart'] ?? DEFAULT_CONFIGS['boxart']), baseColor: url },
        }));
        setScrapedLabel(label);
    }, []);

    const allAssets = useMemo(() => {
        const extras = scrapedLabel && configs['boxart']?.baseColor
            ? [{ label: `🎮 ${scrapedLabel}`, value: configs['boxart'].baseColor }]
            : [];
        return [...CART_ASSETS, ...extras];
    }, [scrapedLabel, configs]);

    // -- ScreenScraper search --------------------------------------------------
    const handleSearch = async () => {
        if (!searchTitle.trim()) return;
        setIsSearching(true);
        setSearchResults([]);
        try {
            const devid = import.meta.env.VITE_SCREENSCRAPER_DEV_ID || '';
            const devpw = import.meta.env.VITE_SCREENSCRAPER_DEV_PASSWORD || '';
            const softname = import.meta.env.VITE_SCREENSCRAPER_SOFT_NAME || 'CartridgeStudio';
            const url = `/api2/jeuRecherche.php?devid=${devid}&devpassword=${devpw}&softname=${softname}&output=json&recherche=${encodeURIComponent(searchTitle)}&systemeid=${searchSystem}`;
            const res = await fetch(url);
            const text = await res.text();
            if (!text) { alert('Empty response from ScreenScraper.'); setIsSearching(false); return; }
            let data;
            try { data = JSON.parse(text); } catch { alert('Invalid JSON from API.'); setIsSearching(false); return; }
            const gamesNode = data?.response?.jeux || data?.response?.jeu;
            if (!gamesNode) { alert('No games found.'); setIsSearching(false); return; }
            let games = gamesNode.jeu ? gamesNode.jeu : gamesNode;
            if (!Array.isArray(games)) games = [games];
            setSearchResults(games);
        } catch (err) {
            alert('Network error: ' + err);
        }
        setIsSearching(false);
    };

    const handleSelectGame = async (gameId: string, gameName: string) => {
        setIsSearching(true);
        try {
            const devid = import.meta.env.VITE_SCREENSCRAPER_DEV_ID || '';
            const devpw = import.meta.env.VITE_SCREENSCRAPER_DEV_PASSWORD || '';
            const softname = import.meta.env.VITE_SCREENSCRAPER_SOFT_NAME || 'CartridgeStudio';
            const url = `/api2/jeuInfos.php?devid=${devid}&devpassword=${devpw}&softname=${softname}&output=json&gameid=${gameId}`;
            const res = await fetch(url);
            const data = await res.json();
            let medias = data?.response?.jeu?.medias;
            if (!medias) { alert('No media found.'); setIsSearching(false); return; }
            if (!Array.isArray(medias)) {
                medias = medias.media ? (Array.isArray(medias.media) ? medias.media : [medias.media]) : [medias];
            }
            const accepted = medias.filter((m: any) =>
                m.type === 'support-texture' || m.type === 'support-2D' || m.type === 'box-2D'
            );
            if (!accepted.length) { alert('No boxart texture found for this game.'); setIsSearching(false); return; }
            const regions = ['wor', 'us', 'eu', 'ss', 'jp'];
            let best = null;
            for (const r of regions) {
                best = accepted.find((m: any) => m.region === r && m.type === 'support-texture');
                if (best) break;
            }
            if (!best) best = accepted.find((m: any) => m.type === 'support-texture') || accepted[0];
            if (best?.url) {
                const proxyUrl = best.url.replace(/^https?:\/\/[^/]+\/api2\//, '/api2/');
                applyBoxart(proxyUrl, gameName);
            } else {
                alert('No valid texture URL found.');
            }
            setSearchResults([]);
            setSearchTitle('');
        } catch (err) {
            alert('Network error: ' + err);
        }
        setIsSearching(false);
    };

    const handleMeshesLoaded = useCallback((names: string[]) => {
        setMeshList(names);
    }, []);

    // Diagonal hazard stripe decoration style
    const hazardStripesStyle: React.CSSProperties = {
        height: '4px',
        background: 'repeating-linear-gradient(45deg, #fbbf24, #fbbf24 8px, #000 8px, #000 16px)',
        width: '100%',
        position: 'absolute',
        top: 0,
        left: 0
    };

    return (
        <div className="retro-tech" style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'row', backgroundColor: '#000000', color: '#fbbf24', overflow: 'hidden', userSelect: 'none' }}>
            <StyleInject />

            {/* -- Sidebar (TACTICAL INSPECTION MONITOR) ---------------------- */}
            <div style={{ width: '280px', backgroundColor: '#070707', borderRight: '2px solid #fbbf24', display: 'flex', flexDirection: 'column', overflowY: 'auto', zIndex: 10, flexShrink: 0 }}>

                {/* Header */}
                <div style={{ padding: '20px 20px 16px 20px', borderBottom: '1px solid #1a1a1a', position: 'relative' }}>
                    <div style={hazardStripesStyle} />
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '8px' }}>
                        <span style={{ fontSize: '18px', fontWeight: 900, color: '#fbbf24', letterSpacing: '-0.5px' }}>
                            CART STUDIO
                        </span>
                        <span style={{ fontSize: '9px', textTransform: 'uppercase', padding: '2px 8px', background: '#fbbf24', color: '#000', fontWeight: 'bold' }}>
                            WebGPU
                        </span>
                    </div>
                    <p className="retro-mono" style={{ fontSize: '8px', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', marginTop: '5px', letterSpacing: '0.1em' }}>model.glb · Diagnostic</p>
                </div>

                {/* Mesh Selector */}
                <SideSection label="Active Mesh Block" badge={`${meshList.length} nodes`}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        <MeshPill name="all" label="⧉ Global Override" active={selectedMesh === 'all'} hasConfig onClick={() => setSelectedMesh('all')} />
                        {meshList.map(name => (
                            <MeshPill key={name} name={name}
                                label={name === 'boxart' ? `🖼️ ${name} (target)` : `📦 ${name}`}
                                active={selectedMesh === name}
                                hasConfig={configs[name] !== undefined}
                                onClick={() => setSelectedMesh(name)}
                            />
                        ))}
                    </div>
                </SideSection>

                {/* Texture Slots */}
                <SideSection label="Map Channels" badge={`mesh: ${selectedMesh}`}>
                    {([
                        { label: 'BASE COLOR', key: 'baseColor' as const, color: '#34d399' },
                        { label: 'NORMAL Map', key: 'normal' as const, color: '#60a5fa' },
                        { label: 'ROUGHNESS', key: 'roughness' as const, color: '#fb923c' },
                        { label: 'METALLIC', key: 'metallic' as const, color: '#fbbf24' },
                    ]).map(slot => (
                        <div key={slot.key} style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                <span className="retro-mono" style={{ fontSize: '9px', fontWeight: 900, color: slot.color }}>{slot.label}</span>
                                {config[slot.key] && (
                                    <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: slot.color, boxShadow: `0 0 5px ${slot.color}` }} />
                                )}
                            </div>
                            <select
                                value={config[slot.key] || ''}
                                onChange={e => updateConfig(slot.key, e.target.value)}
                                style={{ ...selectStyle, borderLeft: `2px solid ${slot.color}` }}
                            >
                                {allAssets.map((a, i) => (
                                    <option key={`${a.value}-${i}`} value={a.value} style={{ backgroundColor: '#0a0a0a', color: 'rgba(255,255,255,0.85)' }}>{a.label}</option>
                                ))}
                            </select>
                            {slot.key === 'normal' && config.normal && (
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '2px' }}>
                                    <span className="retro-mono" style={{ fontSize: '8px', color: 'rgba(255,255,255,0.4)', whiteSpace: 'nowrap' }}>BUMP:</span>
                                    <input type="range" min="0" max="5" step="0.1"
                                        value={config.normalScale}
                                        onChange={e => updateConfig('normalScale', parseFloat(e.target.value))}
                                        style={{ flex: 1, cursor: 'pointer' }}
                                    />
                                    <span className="retro-mono" style={{ fontSize: '9px', color: '#fbbf24', minWidth: '24px', textAlign: 'right' }}>{Number(config.normalScale).toFixed(1)}</span>
                                </div>
                            )}
                        </div>
                    ))}
                </SideSection>

                {/* Lighting */}
                <SideSection label="Tactical Lighting Setup">
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                        <LightSlider label="Ambient" value={ambientInt} min={0} max={1} step={0.05} onChange={setAmbientInt} color="rgba(255,255,255,0.4)" />
                        <LightSlider label="HDR Env" value={envIntensity} min={0} max={3} step={0.05} onChange={setEnvIntensity} color="#a78bfa" />
                        <LightSlider label="Key" value={keyInt} min={0} max={8} step={0.1} onChange={setKeyInt} color="#fbbf24" />
                        <LightSlider label="Fill" value={fillInt} min={0} max={6} step={0.1} onChange={setFillInt} color="#60a5fa" />
                        <LightSlider label="Rim" value={rimInt} min={0} max={6} step={0.1} onChange={setRimInt} color="#f472b6" />
                    </div>
                </SideSection>

                {/* ScreenScraper - Boxart Fetcher */}
                <SideSection label="Database Sync" badge="api interface">
                    {scrapedLabel && (
                        <div style={{ padding: '6px 10px', background: 'rgba(251,191,36,0.08)', border: '1px solid #fbbf24', marginBottom: '6px' }}>
                            <span className="retro-mono" style={{ fontSize: '9px', color: '#fbbf24' }}>🎮 {scrapedLabel}</span>
                        </div>
                    )}
                    <select value={searchSystem} onChange={e => setSearchSystem(e.target.value)} style={selectStyle}>
                        <option value="14" style={{ backgroundColor: '#0a0a0a', color: 'rgba(255,255,255,0.85)' }}>Nintendo 64</option>
                        <option value="1" style={{ backgroundColor: '#0a0a0a', color: 'rgba(255,255,255,0.85)' }}>Arcade</option>
                        <option value="3" style={{ backgroundColor: '#0a0a0a', color: 'rgba(255,255,255,0.85)' }}>Atari 2600</option>
                        <option value="12" style={{ backgroundColor: '#0a0a0a', color: 'rgba(255,255,255,0.85)' }}>PlayStation</option>
                        <option value="57" style={{ backgroundColor: '#0a0a0a', color: 'rgba(255,255,255,0.85)' }}>PlayStation 2</option>
                        <option value="46" style={{ backgroundColor: '#0a0a0a', color: 'rgba(255,255,255,0.85)' }}>Game Boy Advance</option>
                    </select>
                    <div style={{ display: 'flex', gap: '6px', marginTop: '4px' }}>
                        <input
                            type="text"
                            placeholder="Game title..."
                            value={searchTitle}
                            onChange={e => setSearchTitle(e.target.value)}
                            onKeyDown={e => e.key === 'Enter' && handleSearch()}
                            style={{ flex: 1, backgroundColor: '#0a0a0a', color: '#fff', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '0px', padding: '7px 10px', fontSize: '11px', outline: 'none' }}
                        />
                        <button
                            onClick={handleSearch}
                            disabled={isSearching}
                            style={{ padding: '7px 14px', backgroundColor: '#fbbf24', color: '#000', border: 'none', fontSize: '12px', fontWeight: 900, cursor: 'pointer', opacity: isSearching ? 0.5 : 1 }}
                        >
                            {isSearching ? '…' : 'QUERY'}
                        </button>
                    </div>
                    {searchResults.length > 0 && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', maxHeight: '140px', overflowY: 'auto', border: '1px solid rgba(255,255,255,0.1)', background: '#0a0a0a', padding: '4px', marginTop: '4px' }}>
                            {searchResults.map((g: any) => {
                                const id = g.id || g.ID;
                                const name = g.noms?.nom_eu || g.noms?.nom_us || g.noms?.nom_jp || g.nom || 'Unknown';
                                return (
                                    <button key={id} onClick={() => handleSelectGame(String(id), name)}
                                        style={{ textAlign: 'left', padding: '6px 10px', fontSize: '10px', color: '#fbbf24', background: 'transparent', border: 'none', cursor: 'pointer', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                                        onMouseEnter={e => {
                                            e.currentTarget.style.backgroundColor = '#fbbf24';
                                            e.currentTarget.style.color = '#000';
                                        }}
                                        onMouseLeave={e => {
                                            e.currentTarget.style.backgroundColor = 'transparent';
                                            e.currentTarget.style.color = '#fbbf24';
                                        }}
                                    >
                                        ⚡ {name}
                                    </button>
                                );
                            })}
                        </div>
                    )}
                </SideSection>

                {/* Spacer + export */}
                <div style={{ flex: 1 }} />
                <div style={{ padding: '16px 20px', borderTop: '1px solid #1a1a1a', backgroundColor: '#050505' }}>
                    <button
                        onClick={() => {
                            const fullConfig = {
                                textures: configs,
                                lighting: {
                                    ambientIntensity: ambientInt,
                                    hdrEnvironmentIntensity: envIntensity,
                                    keyLightIntensity: keyInt,
                                    fillLightIntensity: fillInt,
                                    rimLightIntensity: rimInt
                                }
                            };
                            navigator.clipboard.writeText(JSON.stringify(fullConfig, null, 2));
                            alert('Full texture and lighting config copied to clipboard!');
                        }}
                        style={{ width: '100%', padding: '10px', background: '#fbbf24', color: '#000', border: '1px solid #fbbf24', borderRadius: '0px', fontSize: '11px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.1em', cursor: 'pointer', transition: 'all 0.15s' }}
                        onMouseEnter={e => {
                            e.currentTarget.style.background = '#000';
                            e.currentTarget.style.color = '#fbbf24';
                        }}
                        onMouseLeave={e => {
                            e.currentTarget.style.background = '#fbbf24';
                            e.currentTarget.style.color = '#000';
                        }}
                    >
                        ⚡ COPY CONFIG PROFILE
                    </button>
                </div>
            </div>

            {/* -- Viewport (3D WORKSPACE) ----------------------------------- */}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', position: 'relative', backgroundColor: '#020202' }}>
                
                {/* HUD */}
                <div style={{ position: 'absolute', top: '16px', left: '16px', zIndex: 20, pointerEvents: 'none', display: 'flex', gap: '8px' }}>
                    <HudPill>
                        <span style={{ width: '6px', height: '6px', backgroundColor: '#fbbf24', boxShadow: '0 0 6px #fbbf24' }} />
                        <span style={{ fontSize: '10px', fontFamily: 'monospace', color: 'rgba(255,255,255,0.7)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>model.glb</span>
                    </HudPill>
                    <HudPill>
                        <span style={{ fontSize: '10px', fontFamily: 'monospace', color: '#fbbf24', textTransform: 'uppercase', letterSpacing: '0.1em' }}>{meshList.length} NODES ONLINE</span>
                    </HudPill>
                    {scrapedLabel && (
                        <HudPill accent>
                            <span style={{ fontSize: '10px', fontFamily: 'monospace', color: '#fbbf24' }}>🎮 {scrapedLabel}</span>
                        </HudPill>
                    )}
                </div>

                {/* 3D Canvas */}
                <div style={{ flex: 1, width: '100%' }}>
                    <Canvas
                        shadows
                        camera={{ position: [0, 2, 6], fov: 28 }}
                        gl={{ antialias: true, toneMapping: THREE.ACESFilmicToneMapping, toneMappingExposure: 1.1 }}
                        frameloop="demand"
                    >
                        <Suspense fallback={null}>
                            <color attach="background" args={['#020202']} />

                            {/* HDR environment - provides ambient IBL + reflections */}
                            <Environment files="/monochrome_studio_03_1k.hdr" background={false} environmentIntensity={envIntensity} />

                            {/* Ambient fill - keep low so IBL does the work */}
                            <ambientLight intensity={ambientInt} />

                            {/* Key light - warm, top-front */}
                            <spotLight position={[2, 8, 4]} angle={0.35} penumbra={0.8} intensity={keyInt} color="#fff5e0" castShadow shadow-mapSize={[2048, 2048]} />

                            {/* Left fill - cool blue */}
                            <spotLight position={[-6, 3, 2]} angle={0.5} penumbra={1} intensity={fillInt} color="#b0d8ff" />

                            {/* Right rim - catches roughness sheen on rotation */}
                            <spotLight position={[6, 2, -4]} angle={0.45} penumbra={1} intensity={rimInt} color="#ffd0e8" />

                            <RotatableGroup>
                                <CartModel configs={configs} onMeshesLoaded={handleMeshesLoaded} />
                            </RotatableGroup>

                            <Grid infiniteGrid fadeDistance={25} sectionSize={1} cellColor="#111120" sectionColor="#1c1c35" />
                        </Suspense>
                    </Canvas>
                </div>

                {/* -- Collapsible Live Mesh Map Diagnostics Panel ---------------- */}
                <div style={{ 
                    backgroundColor: '#070707', 
                    borderTop: '2px solid #fbbf24', 
                    flexShrink: 0,
                    zIndex: 30,
                    position: 'relative'
                }}>
                    {/* Panel Header/Toggler - stopPropagation prevents canvas from stealing the pointer event */}
                    <div 
                        onPointerDown={e => { e.stopPropagation(); }}
                        onClick={() => setIsMeshMapOpen(prev => !prev)}
                        style={{ 
                            height: '32px', 
                            display: 'flex', 
                            justifyContent: 'space-between', 
                            alignItems: 'center', 
                            padding: '0 16px', 
                            cursor: 'pointer', 
                            backgroundColor: '#0a0a0a',
                            borderBottom: isMeshMapOpen ? '1px solid #1a1a1a' : 'none',
                            userSelect: 'none',
                        }}
                    >
                        <span className="retro-mono" style={{ fontSize: '9px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.15em', color: '#fbbf24', display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <span style={{ fontSize: '8px' }}>{isMeshMapOpen ? '▼' : '▲'}</span> LIVE MESH DIAGNOSTICS
                        </span>
                        <span className="retro-mono" style={{ fontSize: '9px', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase' }}>
                            {meshList.length} segments · click to {isMeshMapOpen ? 'collapse' : 'expand'}
                        </span>
                    </div>

                    {/* Collapsible content */}
                    {isMeshMapOpen && (
                        <div
                            onPointerDown={e => e.stopPropagation()}
                            style={{ height: '160px', overflowY: 'auto', display: 'flex', flexDirection: 'column', padding: '8px 16px', gap: '2px' }}
                        >
                            {meshList.map(name => {
                                const mc = configs[name] ?? configs['all'] ?? DEFAULT_CONFIGS['all'];
                                const isBoxart = name === 'boxart';
                                const isActive = selectedMesh === name;
                                return (
                                    <div key={name} 
                                        onPointerDown={e => e.stopPropagation()}
                                        onClick={() => setSelectedMesh(name)}
                                        style={{ 
                                            display: 'flex', 
                                            alignItems: 'center', 
                                            justifyContent: 'space-between', 
                                            padding: '6px 12px', 
                                            cursor: 'pointer', 
                                            fontSize: '10px', 
                                            fontFamily: "'JetBrains Mono', monospace", 
                                            backgroundColor: isActive ? 'rgba(251,191,36,0.08)' : 'transparent', 
                                            borderLeft: isActive ? '2px solid #fbbf24' : '2px solid transparent',
                                            color: isBoxart ? '#fbbf24' : 'rgba(255,255,255,0.6)'
                                        }}
                                    >
                                        <span style={{ fontWeight: 700 }}>{isBoxart ? '⚡' : '⧉'} {name}</span>
                                        <div style={{ display: 'flex', gap: '12px', fontSize: '9px' }}>
                                            <span style={{ color: mc.baseColor ? '#34d399' : 'rgba(255,255,255,0.15)' }}>DIFF: {mc.baseColor ? mc.baseColor.split('/').pop()?.split('?')[0] : '-'}</span>
                                            <span style={{ color: mc.normal ? '#60a5fa' : 'rgba(255,255,255,0.15)' }}>NRM: {mc.normal ? '✓' : '-'}</span>
                                            <span style={{ color: mc.roughness ? '#fb923c' : 'rgba(255,255,255,0.15)' }}>RGH: {mc.roughness ? '✓' : '-'}</span>
                                        </div>
                                    </div>
                                );
                            })}
                            {meshList.length === 0 && (
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60px', fontSize: '10px', fontFamily: 'monospace', color: 'rgba(255,255,255,0.2)' }}>
                                    CONNECTING TO GLB SCANNER...
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

// -----------------------------------------------------------------------------
// Small reusable UI atoms (all inline-styled - no Tailwind dependency)
// -----------------------------------------------------------------------------
const SideSection = ({ label, badge, children }: { label: string; badge?: React.ReactNode; children: React.ReactNode }) => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', padding: '16px 20px', borderBottom: '1px solid #1a1a1a' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span className="retro-mono" style={{ fontSize: '9px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.15em', color: '#fbbf24' }}>
                // {label}
            </span>
            {badge && <div style={{ fontSize: '9px', color: 'rgba(255,255,255,0.4)' }}>{badge}</div>}
        </div>
        {children}
    </div>
);

const MeshPill = ({ name, label, active, hasConfig, onClick }: { name: string; label: string; active: boolean; hasConfig: boolean; onClick: () => void }) => (
    <button onClick={onClick} style={{ 
        width: '100%', 
        textAlign: 'left', 
        padding: '8px 12px', 
        fontSize: '11px', 
        cursor: 'pointer', 
        transition: 'all 0.15s', 
        border: active ? '1px solid #fbbf24' : '1px solid rgba(255,255,255,0.1)', 
        backgroundColor: active ? '#fbbf24' : 'rgba(255,255,255,0.03)', 
        color: active ? '#000' : 'rgba(255,255,255,0.7)', 
        fontWeight: active ? 900 : 400,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        borderRadius: '0px'
    }}>
        <span>{label}</span>
        {hasConfig && name !== 'all' && (
            <span style={{ color: active ? '#000' : '#fbbf24', fontSize: '9px', fontWeight: 'bold' }}>[OK]</span>
        )}
    </button>
);

const LightSlider = ({ label, value, min, max, step, onChange, color = 'rgba(255,255,255,0.4)' }: { label: string; value: number; min: number; max: number; step: number; onChange: (v: number) => void; color?: string }) => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span className="retro-mono" style={{ fontSize: '9px', fontWeight: 900, textTransform: 'uppercase', color }}>{label}</span>
            <span className="retro-mono" style={{ fontSize: '9px', color: 'rgba(255,255,255,0.4)' }}>{value.toFixed(2)}</span>
        </div>
        <input type="range" min={min} max={max} step={step} value={value}
            onChange={e => onChange(parseFloat(e.target.value))}
            style={{ width: '100%', cursor: 'pointer' }}
        />
    </div>
);

const HudPill = ({ children, accent }: { children: React.ReactNode; accent?: boolean }) => (
    <div style={{ 
        display: 'flex', 
        alignItems: 'center', 
        gap: '8px', 
        padding: '5px 14px', 
        backgroundColor: accent ? 'rgba(251,191,36,0.1)' : 'rgba(0,0,0,0.85)', 
        border: `1px solid ${accent ? '#fbbf24' : 'rgba(255,255,255,0.15)'}`, 
        borderRadius: '0px',
        boxShadow: accent ? '0 0 10px rgba(251,191,36,0.15)' : 'none'
    }}>
        {children}
    </div>
);
