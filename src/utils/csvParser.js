import Papa from 'papaparse';

/**
 * Parse CSV file and extract ICIO data by city
 * @param {File} file - The CSV file to parse
 * @returns {Promise<Array>} Array of objects with city data and ICIO values
 */
export const parseCSV = async (file) => {
  return new Promise((resolve, reject) => {
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      dynamicTyping: false, // Keep as strings, we'll parse manually
      complete: (results) => {
        console.log('CSV parsed, first row:', results.data[0]);
        console.log('Total rows:', results.data.length);
        resolve(results.data);
      },
      error: (error) => {
        reject(error);
      }
    });
  });
};

/**
 * Convert parsed CSV data to GeoJSON format
 * @param {Array} data - Parsed CSV data
 * @returns {Object} GeoJSON FeatureCollection
 */
export const convertToGeoJSON = (data) => {
  // Try to detect column names (case-insensitive)
  const detectColumn = (row, possibleNames) => {
    const keys = Object.keys(row);
    for (const name of possibleNames) {
      const found = keys.find(k => k.toLowerCase().includes(name.toLowerCase()));
      if (found) return found;
    }
    return null;
  };

  // Debug: log column detection for first row
  if (data.length > 0) {
    const firstRow = data[0];
    console.log('CSV columns detected:', {
      availableColumns: Object.keys(firstRow),
      latCol: detectColumn(firstRow, ['lat', 'latitude', 'y', 'coord_y']),
      lonCol: detectColumn(firstRow, ['lon', 'lng', 'longitude', 'x', 'coord_x', 'long']),
      cityCol: detectColumn(firstRow, ['city', 'municipio', 'municipality', 'nombre', 'name', 'ciudad', 'capital']),
      icioCol: detectColumn(firstRow, ['icio', 'tipo icio', 'value', 'valor', 'ic', 'icío'])
    });
  }

  const features = data
    .map((row, index) => {
      // Try to find relevant columns
      const latCol = detectColumn(row, ['lat', 'latitude', 'y', 'coord_y']);
      const lonCol = detectColumn(row, ['lon', 'lng', 'longitude', 'x', 'coord_x', 'long']);
      const cityCol = detectColumn(row, ['city', 'municipio', 'municipality', 'nombre', 'name', 'ciudad', 'capital']);
      const icioCol = detectColumn(row, ['icio', 'tipo icio', 'value', 'valor', 'ic', 'icío']);

      if (!latCol || !lonCol) {
        console.warn(`Row ${index} missing coordinates. Available columns:`, Object.keys(row));
        return null;
      }

      const lat = parseFloat(row[latCol]);
      const lon = parseFloat(row[lonCol]);
      
      // Debug: log first few parsed coordinates
      if (index < 3) {
        console.log(`Row ${index}: latCol="${latCol}"=${row[latCol]}, lonCol="${lonCol}"=${row[lonCol]}, parsed: lat=${lat}, lon=${lon}`);
      }
      const icio = icioCol ? parseFloat(row[icioCol]) : null;
      
      // Get city name - prefer Municipio, fallback to Capital if Municipio is empty
      let city = cityCol ? row[cityCol] : null;
      if (!city || city === '' || city === 'nan') {
        const capitalCol = detectColumn(row, ['capital']);
        city = capitalCol && row[capitalCol] ? row[capitalCol] : `City ${index + 1}`;
      }

      // Validate coordinates: latitude must be between -90 and 90, longitude between -180 and 180
      if (isNaN(lat) || isNaN(lon)) {
        console.warn(`Row ${index} (${city}) has invalid coordinates: lat=${row[latCol]}, lon=${row[lonCol]}`);
        return null;
      }

      if (lat < -90 || lat > 90) {
        console.warn(`Row ${index} (${city}) has invalid latitude: ${lat} (must be between -90 and 90)`);
        return null;
      }

      if (lon < -180 || lon > 180) {
        console.warn(`Row ${index} (${city}) has invalid longitude: ${lon} (must be between -180 and 180)`);
        return null;
      }

      return {
        type: 'Feature',
        geometry: {
          type: 'Point',
          coordinates: [lon, lat]
        },
        properties: {
          city: city,
          icio: icio,
          ...row // Include all original properties
        }
      };
    })
    .filter(f => f !== null);

  return {
    type: 'FeatureCollection',
    features: features
  };
};

