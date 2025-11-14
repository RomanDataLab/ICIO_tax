import React, { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import DeckGL from '@deck.gl/react';
import { IconLayer } from '@deck.gl/layers';
import { Map as MapGL } from 'react-map-gl';
import { parseCSV, convertToGeoJSON } from './utils/csvParser';
import { generateColorPalette, getICIOColor } from './utils/iconLayer';
import { jenksBreaks } from './utils/naturalBreaks';
import ErrorBoundary from './ErrorBoundary';
import ICIOCalculator from './components/ICIOCalculator';
import './App.css';

// Use environment variable for Mapbox token (set in Vercel/GitHub Actions)
const MAPBOX_ACCESS_TOKEN = process.env.REACT_APP_MAPBOX_TOKEN || process.env.REACT_APP_MAPBOX_ACCESS_TOKEN || '';

const INITIAL_VIEW_STATE = {
  longitude: -3.7,
  latitude: 40.4,
  zoom: 5,
  pitch: 50,
  bearing: 0
};

function App() {
  const [geoJsonData, setGeoJsonData] = useState(null);
  const [icioRange, setIcioRange] = useState([0, 1]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [webglError, setWebglError] = useState(null);
  const [calculatorOpen, setCalculatorOpen] = useState(false);
  const [calculatorPosition, setCalculatorPosition] = useState(null);
  const [selectedCityData, setSelectedCityData] = useState(null);
  const [mapInstance, setMapInstance] = useState(null);
  const [hoveredObject, setHoveredObject] = useState(null);
  const [cursor, setCursor] = useState('default');
  const [clickedIndex, setClickedIndex] = useState(null);

  const loadCSVData = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/ICIO.csv');
      if (!response.ok) {
        throw new Error('Failed to load CSV file');
      }
      
      const text = await response.text();
      const blob = new Blob([text], { type: 'text/csv' });
      const file = new File([blob], 'ICIO.csv', { type: 'text/csv' });
      
      const parsedData = await parseCSV(file);
      
      // Convert to GeoJSON
      const geoJson = convertToGeoJSON(parsedData);
      setGeoJsonData(geoJson);

      // Calculate ICIO values for natural breaks
      const icioValues = geoJson.features
        .map(f => f.properties.icio)
        .filter(v => v !== null && !isNaN(v));
      
      if (icioValues.length > 0) {
        const min = Math.min(...icioValues);
        const max = Math.max(...icioValues);
        setIcioRange([min, max]);
      }
    } catch (err) {
      setError(`Error loading data: ${err.message}`);
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  // Check WebGL support
  useEffect(() => {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
    if (!gl) {
      setWebglError('WebGL is not supported in your browser. Please use a modern browser with WebGL support.');
    }
  }, []);

  // Load CSV file on mount
  useEffect(() => {
    loadCSVData();
  }, [loadCSVData]);

  // Calculate natural breaks for ICIO values
  const naturalBreaks = useMemo(() => {
    if (!geoJsonData || !geoJsonData.features.length) return null;
    
    const icioValues = geoJsonData.features
      .map(f => f.properties.icio)
      .filter(v => v !== null && !isNaN(v))
      .map(Number);
    
    if (icioValues.length === 0) return null;
    
    // Use 12 classes for natural breaks
    const breaks = jenksBreaks(icioValues, 12);
    return breaks;
  }, [geoJsonData]);

  // Generate color palette for natural breaks
  const colorPalette = useMemo(() => {
    if (!naturalBreaks || naturalBreaks.length < 2) return [];
    const numClasses = naturalBreaks.length - 1;
    return generateColorPalette(numClasses);
  }, [naturalBreaks]);

  // Handle icon click
  const handleIconClick = useCallback((info) => {
    if (info.object && info.object.properties) {
      const props = info.object.properties;
      // Position calculator on the right side, stuck to the right edge, vertically centered
      const calculatorWidth = 245; // Estimated width (30% less than 350)
      const x = window.innerWidth - calculatorWidth;
      const y = window.innerHeight / 2;
      setSelectedCityData({
        city: props.city,
        icio: props.icio
      });
      setCalculatorPosition({ x: Math.max(0, x), y });
      setCalculatorOpen(true);
    }
  }, []);

  // Handle map load to get map instance
  const handleMapLoad = useCallback((event) => {
    // In react-map-gl v7, event.target is the mapboxgl.Map instance
    setMapInstance(event.target);
  }, []);

  // Generate legend colors based on natural breaks
  const legendColors = useMemo(() => {
    if (!naturalBreaks || naturalBreaks.length < 2 || !colorPalette.length) return [];
    
    return colorPalette.map(color => `rgb(${color[0]}, ${color[1]}, ${color[2]})`);
  }, [naturalBreaks, colorPalette]);

  // Create custom pin icon - circle with line extending down
  const createCustomPinIcon = useCallback(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 40; // Single icon
    canvas.height = 40; // Height to accommodate circle + line
    const ctx = canvas.getContext('2d');
    
    const centerX = 20; // Center of canvas
    const circleY = 10; // Top of circle (10px from top)
    const circleRadius = 10; // 20px diameter / 2
    const lineHeight = 15; // Height of line
    const lineStartY = circleY + circleRadius; // Start line from bottom of circle
    const lineEndY = lineStartY + lineHeight;
    
    // Draw shadow first (offset slightly down and right)
    ctx.save();
    ctx.shadowColor = 'rgba(0, 0, 0, 0.3)';
    ctx.shadowBlur = 4;
    ctx.shadowOffsetX = 2;
    ctx.shadowOffsetY = 2;
    
    // Draw circle shadow
    ctx.beginPath();
    ctx.arc(centerX, circleY, circleRadius, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
    ctx.fill();
    
    // Draw line shadow
    ctx.beginPath();
    ctx.moveTo(centerX, lineStartY);
    ctx.lineTo(centerX, lineEndY);
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.2)';
    ctx.lineWidth = 2;
    ctx.stroke();
    
    ctx.restore();
    
    // Draw white line (2px thick, 15px height)
    ctx.beginPath();
    ctx.moveTo(centerX, lineStartY);
    ctx.lineTo(centerX, lineEndY);
    ctx.strokeStyle = '#FFFFFF';
    ctx.lineWidth = 2;
    ctx.stroke();
    
    // Draw circle with white outline (0.5px) - will be filled with color later
    ctx.beginPath();
    ctx.arc(centerX, circleY, circleRadius, 0, Math.PI * 2);
    ctx.strokeStyle = '#FFFFFF';
    ctx.lineWidth = 0.5;
    ctx.stroke();
    // Fill will be done per-icon with palette color
    
    return canvas;
  }, []);

  // Create custom pin icons dynamically for each city
  const createCustomPinIcons = useCallback(() => {
    if (!geoJsonData || !geoJsonData.features.length || !naturalBreaks || !colorPalette.length) {
      return null;
    }

    // Create a canvas for each unique color needed
    const colorToCanvas = new window.Map();
    
    geoJsonData.features.forEach((feature) => {
      const icio = feature.properties.icio;
      const rgbColor = getICIOColor(icio, naturalBreaks, colorPalette);
      const colorKey = `${rgbColor[0]},${rgbColor[1]},${rgbColor[2]}`;
      
      if (!colorToCanvas.has(colorKey)) {
        const canvas = document.createElement('canvas');
        canvas.width = 40;
        canvas.height = 40;
        const ctx = canvas.getContext('2d');
        
        const centerX = 20;
        const circleY = 10;
        const circleRadius = 10;
        const lineHeight = 15;
        const lineStartY = circleY + circleRadius;
        const lineEndY = lineStartY + lineHeight;
        
        // Draw circle with white outline (0.5px) and fill with color
        ctx.beginPath();
        ctx.arc(centerX, circleY, circleRadius, 0, Math.PI * 2);
        ctx.fillStyle = `rgb(${rgbColor[0]}, ${rgbColor[1]}, ${rgbColor[2]})`;
        ctx.fill();
        
        // White outline around circle (0.5px thick)
        ctx.beginPath();
        ctx.arc(centerX, circleY, circleRadius, 0, Math.PI * 2);
        ctx.strokeStyle = '#FFFFFF';
        ctx.lineWidth = 0.5;
        ctx.stroke();
        
        // Draw white line (pin stick)
        ctx.beginPath();
        ctx.moveTo(centerX, lineStartY);
        ctx.lineTo(centerX, lineEndY);
        ctx.strokeStyle = '#FFFFFF';
        ctx.lineWidth = 2;
        ctx.stroke();
        
        colorToCanvas.set(colorKey, canvas);
      }
    });
    
    return colorToCanvas;
  }, [geoJsonData, naturalBreaks, colorPalette]);

  // Create icon layer with custom pins
  const iconLayer = useMemo(() => {
    if (!geoJsonData || !geoJsonData.features.length || !naturalBreaks || !colorPalette.length) {
      return null;
    }

    // Create icon atlas with all unique colors
    const colorCanvases = createCustomPinIcons();
    if (!colorCanvases) return null;
    
    // Combine all canvases into one atlas
    const numIcons = colorCanvases.size;
    const iconsPerRow = Math.ceil(Math.sqrt(numIcons));
    const iconSize = 40;
    const atlasWidth = iconsPerRow * iconSize;
    const atlasHeight = Math.ceil(numIcons / iconsPerRow) * iconSize;
    
    const atlasCanvas = document.createElement('canvas');
    atlasCanvas.width = atlasWidth;
    atlasCanvas.height = atlasHeight;
    const atlasCtx = atlasCanvas.getContext('2d');
    
    const iconMapping = {};
    let index = 0;
    colorCanvases.forEach((canvas, colorKey) => {
      const x = (index % iconsPerRow) * iconSize;
      const y = Math.floor(index / iconsPerRow) * iconSize;
      atlasCtx.drawImage(canvas, x, y);
      iconMapping[colorKey] = { x, y, width: iconSize, height: iconSize, mask: true };
      index++;
    });

    return new IconLayer({
      id: 'custom-pin-icons',
      data: geoJsonData.features,
      pickable: true,
      iconAtlas: atlasCanvas,
      iconMapping: iconMapping,
      getIcon: (d, { index }) => {
        const icio = d.properties.icio;
        const rgbColor = getICIOColor(icio, naturalBreaks, colorPalette);
        const colorKey = `${rgbColor[0]},${rgbColor[1]},${rgbColor[2]}`;
        return colorKey;
      },
      getPosition: d => d.geometry.coordinates,
      getSize: (d, { index }) => {
        return clickedIndex === index ? 54 : 36; // 0.75x of previous size (36px default, 54px on click)
      },
      getColor: (d, { index }) => {
        // On hover or click, show white; otherwise use palette color
        if ((hoveredObject && hoveredObject === d) || clickedIndex === index) {
          return [255, 255, 255, 255]; // White on hover or click
        }
        // Return the actual palette color for this pin
        const icio = d.properties.icio;
        const rgbColor = getICIOColor(icio, naturalBreaks, colorPalette);
        return [...rgbColor, 255];
      },
      onHover: (info) => {
        if (info.object) {
          setHoveredObject(info.object);
          setCursor('pointer');
        } else {
          setHoveredObject(null);
          setCursor('default');
        }
      },
      onClick: (info) => {
        if (info.object) {
          const index = info.index;
          if (clickedIndex === index) {
            setClickedIndex(null);
          } else {
            setClickedIndex(index);
            // Also open calculator
            if (info.object.properties) {
              const props = info.object.properties;
              // Position calculator on the right side, stuck to the right edge, vertically centered
              const calculatorWidth = 245; // Estimated width (30% less than 350)
              const x = window.innerWidth - calculatorWidth;
              const y = window.innerHeight / 2;
              setSelectedCityData({
                city: props.city || props.municipio,
                icio: props.icio
              });
              setCalculatorPosition({ x: Math.max(0, x), y });
              setCalculatorOpen(true);
            }
          }
        }
      },
      updateTriggers: {
        getIcon: [naturalBreaks, colorPalette],
        getColor: [hoveredObject, clickedIndex],
        getSize: [clickedIndex]
      }
    });
  }, [geoJsonData, naturalBreaks, colorPalette, hoveredObject, clickedIndex, createCustomPinIcons]);

  // Get tooltip info for hovered object
  const getTooltip = useCallback((info) => {
    if (!info || !info.object) return null;
    const props = info.object.properties;
    const cityName = props.city || props.municipio || 'Unknown';
    const icio = props.icio;
    const icioValue = icio !== null && !isNaN(icio) 
      ? `${Number(icio).toFixed(2)}%`
      : 'N/A';
    return {
      html: `
        <div style="padding: 6px 10px; background: rgba(0, 0, 0, 0.85); color: white; border-radius: 4px; text-align: center; min-width: 100px;">
          <div style="font-weight: bold; font-size: 13px; margin-bottom: 3px;">${cityName}</div>
          <div style="font-size: 12px; opacity: 0.9;">ICIO: ${icioValue}</div>
        </div>
      `,
      style: {
        backgroundColor: 'transparent',
        fontSize: '12px',
        pointerEvents: 'none'
      }
    };
  }, []);

  return (
    <ErrorBoundary>
      <div className="App">
        <div className="controls">
          <div className="control-panel">
            <h2>Tax for Construction, Installations and Renovation (Impuesto sobre construcciones, instalaciones y obras - ICIO)</h2>
            <a 
              href="https://agenciatributaria.madrid.es/portales/contribuyente/es/Tramites/Impuesto-sobre-Construcciones-Instalaciones-y-Obras-ICIO-Autoliquidacion/?vgnextfmt=default&vgnextoid=35d36cab45973510VgnVCM1000001d4a900aRCRD&vgnextchannel=97d608f9be116810VgnVCM1000001d4a900aRCRD"
              target="_blank"
              rel="noopener noreferrer"
              style={{ display: 'block', marginBottom: '10px', color: '#007bff', textDecoration: 'underline' }}
            >
              More information
            </a>
            {loading && <div className="info">Loading data...</div>}
            {error && <div className="error">{error}</div>}
            {geoJsonData && (
              <div className="info">
                <p><strong>Total:</strong> {geoJsonData.features.length} cities</p>
                <p><strong>ICIO Range:</strong> {icioRange[0].toFixed(2)} - {icioRange[1].toFixed(2)}</p>
              </div>
            )}
            <div className="legend">
              <h3>Tax ranges %</h3>
              <div className="legend-scale">
                {legendColors.map((color, index) => {
                  if (!naturalBreaks || index >= naturalBreaks.length - 1) return null;
                  const lower = naturalBreaks[index];
                  const upper = naturalBreaks[index + 1];
                  return (
                    <div key={index} className="legend-item">
                      <span className="legend-color" style={{ backgroundColor: color }}></span>
                      <span>
                        {index === 0 && `${lower.toFixed(2)} - ${upper.toFixed(2)}`}
                        {index > 0 && index < legendColors.length - 1 && `${lower.toFixed(2)} - ${upper.toFixed(2)}`}
                        {index === legendColors.length - 1 && `${lower.toFixed(2)} - ${upper.toFixed(2)}`}
                      </span>
                    </div>
                  );
                })}
              </div>
              <div style={{ marginTop: '10px', fontSize: '12px' }}>
                <div style={{ marginBottom: '5px' }}>
                  <strong>Total Range:</strong> {icioRange[0].toFixed(2)} - {icioRange[1].toFixed(2)}
                </div>
              </div>
            </div>
          </div>
        </div>
        {webglError ? (
          <div style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            background: 'white',
            padding: '20px',
            borderRadius: '8px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
            zIndex: 1000
          }}>
            <h2>WebGL Error</h2>
            <p>{webglError}</p>
            <button
              onClick={() => {
                setWebglError(null);
                window.location.reload();
              }}
              style={{
                marginTop: '15px',
                padding: '10px 20px',
                background: '#007bff',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer'
              }}
            >
              Reload Page
            </button>
          </div>
        ) : (
          <div className="deckgl-container">
            <DeckGL
              initialViewState={INITIAL_VIEW_STATE}
              controller={true}
              layers={iconLayer ? [iconLayer] : []}
              getTooltip={getTooltip}
              cursor={cursor}
              glOptions={{
                preserveDrawingBuffer: true
              }}
              onError={(error) => {
                console.error('DeckGL error:', error);
                const errorMsg = error?.message || error?.toString() || 'Unknown WebGL error';
                setWebglError(`Map rendering error: ${errorMsg}`);
              }}
            >
              <MapGL
                mapboxAccessToken={MAPBOX_ACCESS_TOKEN}
                mapStyle="mapbox://styles/mapbox/navigation-night-v1"
                onLoad={handleMapLoad}
                onError={(e) => {
                  console.error('Map error:', e);
                  if (e.error && e.error.message) {
                    setWebglError(`Map error: ${e.error.message}`);
                  }
                }}
              />
            </DeckGL>
          </div>
        )}
        <ICIOCalculator
          isOpen={calculatorOpen}
          position={calculatorPosition}
          cityData={selectedCityData}
          onClose={() => {
            setCalculatorOpen(false);
            setCalculatorPosition(null);
            setSelectedCityData(null);
          }}
        />
      </div>
    </ErrorBoundary>
  );
}

export default App;
