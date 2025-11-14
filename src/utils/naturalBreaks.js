/**
 * Calculate natural breaks (Jenks breaks) for data classification
 * This minimizes variance within classes and maximizes variance between classes
 * 
 * @param {Array} data - Array of numeric values
 * @param {number} nClasses - Number of classes to create
 * @returns {Array} Array of break points
 */
export function jenksBreaks(data, nClasses) {
  if (!data || data.length === 0) {
    return [];
  }

  // Filter out null, undefined, and NaN values
  const cleanData = data.filter(d => d !== null && d !== undefined && !isNaN(d)).map(Number);
  
  if (cleanData.length === 0) {
    return [];
  }

  // Sort data
  const sorted = [...cleanData].sort((a, b) => a - b);
  
  if (sorted.length <= nClasses) {
    // If we have fewer data points than classes, return unique values
    return [...new Set(sorted)];
  }

  // Initialize matrices
  const dataLength = sorted.length;
  const lowerClassLimits = [];
  const varianceCombinations = [];

  // Initialize matrices with zeros
  for (let i = 0; i <= dataLength; i++) {
    lowerClassLimits[i] = [];
    varianceCombinations[i] = [];
    for (let j = 0; j <= nClasses; j++) {
      lowerClassLimits[i][j] = 0;
      varianceCombinations[i][j] = 0;
    }
  }

  // Calculate variance for each possible class
  let variance = 0;
  for (let i = 1; i <= nClasses; i++) {
    lowerClassLimits[1][i] = 1;
    varianceCombinations[1][i] = 0;
    
    for (let j = 2; j <= dataLength; j++) {
      if (i === 1) {
        varianceCombinations[j][1] = varianceWithin(sorted, 0, j - 1);
        lowerClassLimits[j][1] = 1;
      } else {
        varianceCombinations[j][i] = Infinity;
        for (let k = i; k <= j; k++) {
          variance = varianceCombinations[k - 1][i - 1] + varianceWithin(sorted, k - 1, j - 1);
          if (variance < varianceCombinations[j][i]) {
            lowerClassLimits[j][i] = k;
            varianceCombinations[j][i] = variance;
          }
        }
      }
    }
  }

  // Extract breaks
  const breaks = [];
  let k = dataLength;
  for (let j = nClasses; j >= 1; j--) {
    breaks[j - 1] = sorted[lowerClassLimits[k][j] - 1];
    k = lowerClassLimits[k][j] - 1;
  }
  breaks[0] = sorted[0];
  breaks[nClasses] = sorted[dataLength - 1];

  return breaks.filter((v, i, a) => a.indexOf(v) === i); // Remove duplicates
}

/**
 * Calculate variance within a class
 */
function varianceWithin(data, start, end) {
  if (start >= end) return 0;
  
  const subset = data.slice(start, end + 1);
  const mean = subset.reduce((a, b) => a + b, 0) / subset.length;
  const variance = subset.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0);
  
  return variance;
}

/**
 * Get class index for a value using natural breaks
 */
export function getClassIndex(value, breaks) {
  if (value === null || value === undefined || isNaN(value)) {
    return -1;
  }

  for (let i = 0; i < breaks.length - 1; i++) {
    if (value >= breaks[i] && value < breaks[i + 1]) {
      return i;
    }
  }
  
  // Handle the last class (inclusive of the maximum value)
  if (value >= breaks[breaks.length - 2]) {
    return breaks.length - 2;
  }
  
  return -1;
}

