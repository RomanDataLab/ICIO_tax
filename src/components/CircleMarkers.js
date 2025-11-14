import React, { useEffect, useRef } from 'react';
import mapboxgl from 'mapbox-gl';
import { getICIOColor } from '../utils/iconLayer';

// Convert RGB array to hex color
const rgbToHex = (rgb) => {
  return `#${rgb.map(x => {
    const hex = x.toString(16);
    return hex.length === 1 ? '0' + hex : hex;
  }).join('')}`;
};

export default function CircleMarkers({ map, data, breaks, colors }) {
  const markersRef = useRef([]);
  const mapRef = useRef(null);

  useEffect(() => {
    mapRef.current = map;
  }, [map]);

  useEffect(() => {
    const map = mapRef.current;
    
    if (!map || !data || !data.features || !data.features.length) {
      return;
    }

    if (!breaks || breaks.length < 2 || !colors || colors.length === 0) {
      return;
    }

    // Clear existing markers
    markersRef.current.forEach(marker => marker.remove());
    markersRef.current = [];

    // Create circle markers for each feature
    data.features.forEach((feature, index) => {
      const [lon, lat] = feature.geometry.coordinates;
      
      // Validate coordinates
      if (isNaN(lat) || isNaN(lon) || lat < -90 || lat > 90 || lon < -180 || lon > 180) {
        return;
      }

      // Get ICIO value and calculate color
      const icio = feature.properties.icio;
      const rgbColor = getICIOColor(icio, breaks, colors);
      const hexColor = rgbToHex(rgbColor);

      // Get city name
      const cityName = feature.properties.city || feature.properties.municipio || 'Unknown';

      // Create circle SVG element
      const el = document.createElement('div');
      el.className = 'circle-marker';
      el.style.cursor = 'pointer';
      el.title = cityName; // Native browser tooltip
      
      const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      svg.setAttribute('width', '16');
      svg.setAttribute('height', '16');
      svg.setAttribute('viewBox', '0 0 16 16');
      
      const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      circle.setAttribute('cx', '8');
      circle.setAttribute('cy', '8');
      circle.setAttribute('r', '6');
      circle.setAttribute('fill', hexColor);
      circle.setAttribute('stroke', '#ffffff');
      circle.setAttribute('stroke-width', '1');
      
      svg.appendChild(circle);
      el.appendChild(svg);

      // Create marker
      const marker = new mapboxgl.Marker({
        element: el,
        anchor: 'center'
      })
        .setLngLat([lon, lat])
        .addTo(map);

      markersRef.current.push(marker);
    });

    // Cleanup
    return () => {
      markersRef.current.forEach(marker => marker.remove());
      markersRef.current = [];
    };
  }, [map, data, breaks, colors]);

  return null;
}
