import * as XLSX from 'xlsx';

/**
 * Parse xlsx file and extract ICIO data by city
 * @param {File} file - The xlsx file to parse
 * @returns {Promise<Array>} Array of objects with city data and ICIO values
 */
export const parseXLSX = async (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: 'array' });
        
        // Get the first sheet
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        
        // Convert to JSON
        const jsonData = XLSX.utils.sheet_to_json(worksheet);
        
        resolve(jsonData);
      } catch (error) {
        reject(error);
      }
    };
    
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsArrayBuffer(file);
  });
};

/**
 * Convert parsed data to GeoJSON format
 * Assumes the xlsx has columns for city name, latitude, longitude, and ICIO value
 * @param {Array} data - Parsed xlsx data
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

  const features = data
    .map((row, index) => {
      // Try to find relevant columns
      const latCol = detectColumn(row, ['lat', 'latitude', 'y', 'coord_y']);
      const lonCol = detectColumn(row, ['lon', 'lng', 'longitude', 'x', 'coord_x', 'long']);
      const cityCol = detectColumn(row, ['city', 'municipio', 'municipality', 'nombre', 'name', 'ciudad']);
      const icioCol = detectColumn(row, ['icio', 'value', 'valor', 'ic']);

      if (!latCol || !lonCol) {
        console.warn(`Row ${index} missing coordinates`);
        return null;
      }

      const lat = parseFloat(row[latCol]);
      const lon = parseFloat(row[lonCol]);
      const icio = icioCol ? parseFloat(row[icioCol]) : null;
      const city = cityCol ? row[cityCol] : `City ${index + 1}`;

      if (isNaN(lat) || isNaN(lon)) {
        console.warn(`Row ${index} has invalid coordinates`);
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

