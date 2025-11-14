import { IconLayer } from '@deck.gl/layers';
import { getClassIndex } from './naturalBreaks';

// Generate color for ICIO value using natural breaks (Jenks)
export const getICIOColor = (icio, breaks, colors) => {
  if (icio === null || isNaN(icio) || !breaks || breaks.length < 2) {
    return [128, 128, 128]; // Gray for invalid values
  }
  
  const classIndex = getClassIndex(icio, breaks);
  
  if (classIndex === -1 || classIndex >= colors.length) {
    return [128, 128, 128]; // Gray for out of range
  }
  
  return colors[classIndex];
};

// Generate color palette (green to red) for natural breaks
export const generateColorPalette = (numClasses) => {
  const colors = [];
  
  // Color gradient from green to red
  for (let i = 0; i < numClasses; i++) {
    const ratio = i / (numClasses - 1);
    
    // Green to yellow to red gradient
    let r, g, b;
    
    if (ratio < 0.5) {
      // Green to yellow
      const localRatio = ratio * 2;
      r = Math.floor(localRatio * 204);
      g = 200;
      b = 0;
    } else {
      // Yellow to red
      const localRatio = (ratio - 0.5) * 2;
      r = 204 + Math.floor(localRatio * 51);
      g = 200 - Math.floor(localRatio * 200);
      b = 0;
    }
    
    colors.push([r, g, b]);
  }
  
  return colors;
};

// Create geo icon atlas with geo-fill (default) and geo (hover)
// Based on Bootstrap Icons: https://icons.getbootstrap.com/icons/geo-fill/ and https://icons.getbootstrap.com/icons/geo/
const createGeoAtlas = () => {
  const canvas = document.createElement('canvas');
  canvas.width = 48; // 2 icons side by side
  canvas.height = 32; // Height for geo icons
  const ctx = canvas.getContext('2d');
  
  // Scale and positioning - Bootstrap icons use viewBox="0 0 16 16"
  const scale = 1.5; // Scale up from 16x16 to ~24x24
  const icon1X = 12; // Center of first icon (geo-fill)
  const icon2X = 36; // Center of second icon (geo)
  const iconY = 8; // Top of icon
  const centerX1 = icon1X;
  const centerX2 = icon2X;
  const centerY = iconY + 8; // Vertical center
  
  // Helper function to draw SVG path
  const drawPath = (pathString, xOffset, yOffset, fill = true, addOutline = false) => {
    const path = new Path2D(pathString);
    ctx.save();
    ctx.translate(xOffset, yOffset);
    ctx.scale(scale, scale);
    ctx.translate(-8, -8); // Center the 16x16 viewBox
    if (fill) {
      ctx.fillStyle = '#000000';
      ctx.fill(path);
      // Add black outline (0.1mm = ~0.38px at 96dpi, scaled)
      if (addOutline) {
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 0.38 / scale; // 0.1mm equivalent
        ctx.stroke(path);
      }
    } else {
      ctx.strokeStyle = '#000000';
      ctx.lineWidth = 0.8 / scale; // Adjust line width for scale
      ctx.stroke(path);
    }
    ctx.restore();
  };
  
  // Geo-fill icon (filled, default state) - left side
  // SVG path from Bootstrap geo-fill icon - all filled
  const geoFillPath = 'M4 4a4 4 0 1 1 4.5 3.969V13.5a.5.5 0 0 1-1 0V7.97A4 4 0 0 1 4 3.999zm2.493 8.574a.5.5 0 0 1-.411.575c-.712.118-1.28.295-1.655.493a1.3 1.3 0 0 0-.37.265.3.3 0 0 0-.057.09V14l.002.008.016.033a.6.6 0 0 0 .145.15c.165.13.435.27.813.395.751.25 1.82.414 3.024.414s2.273-.163 3.024-.414c.378-.126.648-.265.813-.395a.6.6 0 0 0 .146-.15l.015-.033L12 14v-.004a.3.3 0 0 0-.057-.09 1.3 1.3 0 0 0-.37-.264c-.376-.198-.943-.375-1.655-.493a.5.5 0 1 1 .164-.986c.77.127 1.452.328 1.957.594C12.5 13 13 13.4 13 14c0 .426-.26.752-.544.977-.29.228-.68.413-1.116.558-.878.293-2.059.465-3.34.465s-2.462-.172-3.34-.465c-.436-.145-.826-.33-1.116-.558C3.26 14.752 3 14.426 3 14c0-.599.5-1 .961-1.243.505-.266 1.187-.467 1.957-.594a.5.5 0 0 1 .575.411';
  drawPath(geoFillPath, centerX1, centerY, true, true); // Add outline for default icon
  
  // Geo icon (outline, hover state) - right side
  // SVG path from Bootstrap geo icon - circle at top is filled, rest is outlined
  // Split into two parts: filled circle and outlined body
  const geoCirclePath = 'M8 1a3 3 0 1 0 0 6 3 3 0 0 0 0-6';
  const geoBodyPath = 'M4 4a4 4 0 1 1 4.5 3.969V13.5a.5.5 0 0 1-1 0V7.97A4 4 0 0 1 4 3.999zm2.493 8.574a.5.5 0 0 1-.411.575c-.712.118-1.28.295-1.655.493a1.3 1.3 0 0 0-.37.265.3.3 0 0 0-.057.09V14l.002.008.016.033a.6.6 0 0 0 .145.15c.165.13.435.27.813.395.751.25 1.82.414 3.024.414s2.273-.163 3.024-.414c.378-.126.648-.265.813-.395a.6.6 0 0 0 .146-.15l.015-.033L12 14v-.004a.3.3 0 0 0-.057-.09 1.3 1.3 0 0 0-.37-.264c-.376-.198-.943-.375-1.655-.493a.5.5 0 1 1 .164-.986c.77.127 1.452.328 1.957.594C12.5 13 13 13.4 13 14c0 .426-.26.752-.544.977-.29.228-.68.413-1.116.558-.878.293-2.059.465-3.34.465s-2.462-.172-3.34-.465c-.436-.145-.826-.33-1.116-.558C3.26 14.752 3 14.426 3 14c0-.599.5-1 .961-1.243.505-.266 1.187-.467 1.957-.594a.5.5 0 0 1 .575.411';
  // Draw filled circle
  drawPath(geoCirclePath, centerX2, centerY, true);
  // Draw outlined body
  drawPath(geoBodyPath, centerX2, centerY, false);
  
  return canvas;
};

// Create icon layer with geo icons
export const createIconLayer = (data, breaks, colors, hoveredIndex, setHoveredIndex, animationOffset, onIconClick) => {
  if (!data || !data.features.length) return null;

  // Create geo icon atlas
  const iconAtlas = createGeoAtlas();
  
  // Icon mapping: geo-fill (default) and geo (hover)
  const iconMapping = {
    geoFill: { x: 0, y: 0, width: 24, height: 32, mask: true }, // Filled icon (default) - mask: true allows coloring
    geo: { x: 24, y: 0, width: 24, height: 32, mask: false } // Outline icon (hover) - mask: false keeps outline black
  };

  return new IconLayer({
    id: 'icio-geo-icons',
    data: data.features,
    pickable: true,
    iconAtlas: iconAtlas,
    iconMapping: iconMapping,
    getIcon: (d, { index }) => {
      return hoveredIndex === index ? 'geo' : 'geoFill';
    },
    sizeScale: 1.0,
    getPosition: (d, { index }) => {
      const [lon, lat] = d.geometry.coordinates;
      // Animate position: move icon up when hovered (3x stronger bounce)
      if (hoveredIndex === index && animationOffset !== null) {
        // Move icon up by adjusting latitude (north = up)
        // animationOffset will be between 0 and 1, representing animation progress
        // 3 cycles = 6π, amplitude increased 3x from 0.01 to 0.03 degrees
        const offset = Math.sin(animationOffset * Math.PI * 6) * 0.015; // Reduced bounce amplitude
        return [lon, lat + offset];
      }
      return [lon, lat];
    },
    getSize: 40,
    getColor: (d, { index }) => {
      // Only colorize filled icon (geoFill), outline icon (geo) stays black
      if (hoveredIndex === index) {
        // On hover, use outline icon which doesn't get colored (mask: false)
        return [0, 0, 0, 255]; // Black for outline
      }
      // Default state: colorize the filled icon based on ICIO value
      const icio = d.properties.icio;
      const color = getICIOColor(icio, breaks, colors);
      return [...color, 255]; // Add alpha
    },
    onHover: (info) => {
      if (info.object) {
        setHoveredIndex(info.index);
        // Change cursor to pointer when hovering over icon
        if (info.object) {
          document.body.style.cursor = 'pointer';
        }
      } else {
        setHoveredIndex(null);
        // Reset cursor to default when not hovering
        document.body.style.cursor = 'default';
      }
    },
    onClick: (info) => {
      if (info.object && onIconClick) {
        onIconClick(info);
      }
    },
    updateTriggers: {
      getIcon: [hoveredIndex],
      getPosition: [hoveredIndex, animationOffset],
      getColor: [breaks, hoveredIndex]
    }
  });
};
