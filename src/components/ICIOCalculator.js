import React, { useState, useEffect, useRef } from 'react';
import './ICIOCalculator.css';

const CONSTRUCTION_TYPES = [
  { value: 'new_construction', label: 'New construction', pemMultiplier: 1.0 }, // Max PEM
  { value: 'integral_renovation', label: 'Integral renovation', pemMultiplier: 0.75 }, // 75% of range
  { value: 'energy_rehabilitation', label: 'Energy rehabilitation', pemMultiplier: 0.5 }, // 50% of range
  { value: 'interior_refurbishment', label: 'Interior refurbishment', pemMultiplier: 0.0 } // Min PEM
];

const SPECIAL_CONDITIONS = [
  { value: 'none', label: 'None', percentage: 0 },
  { value: 'heritage_building', label: 'Heritage building', percentage: 20 },
  { value: 'heritage_neighborhood', label: 'Heritage neighborhood', percentage: 10 },
  { value: 'nature_conservation', label: 'Nature conservation zone', percentage: 15 },
  { value: 'archeologic_zone', label: 'Archeologic zone', percentage: 5 },
  { value: 'complex_geology', label: 'Complex geology', percentage: 25 },
  { value: 'special_financing', label: 'Special financing', percentage: 18 }
];

const ICIO_REDUCTIONS = [
  { value: 'none', label: 'None', reduction: 0 },
  // Building type reductions
  { value: 'protected_heritage', label: 'Protected heritage', reduction: 75 },
  { value: 'vpo', label: 'VPO', reduction: 90 },
  { value: 'vppb', label: 'VPPB', reduction: 40 },
  { value: 'educational', label: 'Educational', reduction: 70 },
  { value: 'cultural', label: 'Cultural', reduction: 70 },
  { value: 'health_care', label: 'Health care', reduction: 70 },
  { value: 'state_dotated_construction', label: 'State dotated construction', reduction: 70 },
  // Accessibility reductions
  { value: 'building_designed_with_accessibility', label: 'Building designed with accessibility', reduction: 90 },
  // Function change reductions
  { value: 'function_change', label: 'Function change', reduction: 95 },
  // Energy efficiency reductions
  { value: 'rehabilitation_of_housing', label: 'Rehabilitation of housing', reduction: 70 },
  { value: 'pv_solar_energy_generation', label: 'PV solar energy generation', reduction: 95 },
  { value: 'ev_cars_chargers', label: 'EV cars chargers', reduction: 20 }
];

function ICIOCalculator({ isOpen, position, cityData, onClose }) {
  const [buildTypes, setBuildTypes] = useState([]);
  const [constructionType, setConstructionType] = useState('new_construction');
  const [buildingFunction, setBuildingFunction] = useState('');
  const [gfa, setGfa] = useState(100);
  const [specialConditions, setSpecialConditions] = useState('none');
  const [icioReduction, setIcioReduction] = useState('none');
  const [calculatedICIO, setCalculatedICIO] = useState(null);
  const [totalBudget, setTotalBudget] = useState(null);
  const [loading, setLoading] = useState(false);
  const [dashboardPosition, setDashboardPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const dashboardRef = useRef(null);

  // Initialize dashboard position to right side, stuck to right edge, vertically centered
  useEffect(() => {
    if (isOpen) {
      // Use setTimeout to ensure the element is rendered and we can measure it
      const timer = setTimeout(() => {
        if (dashboardRef.current) {
          const dashboardWidth = dashboardRef.current.offsetWidth || 245;
          const dashboardHeight = dashboardRef.current.offsetHeight || 400;
          // Position on right side: window.innerWidth - dashboardWidth
          const x = window.innerWidth - dashboardWidth;
          const centerY = (window.innerHeight - dashboardHeight) / 2;
          setDashboardPosition({ x: Math.max(0, x), y: Math.max(0, centerY) });
        } else {
          // Fallback: right side using estimated dimensions
          const x = window.innerWidth - 245;
          const centerY = (window.innerHeight - 400) / 2;
          setDashboardPosition({ x: Math.max(0, x), y: Math.max(0, centerY) });
        }
      }, 0);
      
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  useEffect(() => {
    // Load buildtypes.csv
    const loadBuildTypes = async () => {
      try {
        const response = await fetch('/buildtypes.csv');
        const text = await response.text();
        
        // Simple CSV parser that handles quoted fields
        const parseCSVLine = (line) => {
          const result = [];
          let current = '';
          let inQuotes = false;
          
          for (let i = 0; i < line.length; i++) {
            const char = line[i];
            if (char === '"') {
              inQuotes = !inQuotes;
            } else if (char === ',' && !inQuotes) {
              result.push(current.trim());
              current = '';
            } else {
              current += char;
            }
          }
          result.push(current.trim());
          return result;
        };
        
        const lines = text.split('\n').filter(line => line.trim());
        const types = [];
        
        for (let i = 1; i < lines.length; i++) {
          const values = parseCSVLine(lines[i]);
          if (values.length >= 3) {
            types.push({
              type: values[0],
              subtype: values[1],
              pemStart: parseFloat(values[2]) || 0,
              pemFinish: parseFloat(values[3]) || 0,
              cteReference: values[4] || '',
              activeLink: values[5] || ''
            });
          }
        }
        setBuildTypes(types);
        if (types.length > 0) {
          setBuildingFunction(types[0].subtype);
        }
      } catch (error) {
        console.error('Error loading buildtypes.csv:', error);
      }
    };

    if (isOpen) {
      loadBuildTypes();
    }
  }, [isOpen]);

  // Drag handlers
  const handleMouseDown = (e) => {
    // Don't start dragging if clicking the close button or other interactive elements
    if (e.target.closest('.icio-calculator-close') || e.target.closest('button')) {
      return;
    }
    
    if (e.target.closest('.icio-calculator-header')) {
      setIsDragging(true);
      const rect = dashboardRef.current.getBoundingClientRect();
      setDragOffset({
        x: e.clientX - rect.left,
        y: e.clientY - rect.top
      });
      e.preventDefault();
    }
  };

  useEffect(() => {
    const handleMouseMove = (e) => {
      if (isDragging) {
        const newX = e.clientX - dragOffset.x;
        const newY = e.clientY - dragOffset.y;
        setDashboardPosition({ x: newX, y: newY });
      }
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging, dragOffset]);

  const calculateICIO = () => {
    if (!buildingFunction || !cityData) {
      alert('Please select building function and ensure city data is available');
      return;
    }

    setLoading(true);

    try {
      // Find selected building type
      const selectedBuildType = buildTypes.find(bt => bt.subtype === buildingFunction);
      if (!selectedBuildType) {
        alert('Building function not found');
        setLoading(false);
        return;
      }

      // Get PEM range
      const pemStart = selectedBuildType.pemStart;
      const pemFinish = selectedBuildType.pemFinish;
      const pemRange = pemFinish - pemStart;

      // Get construction type multiplier
      const constructionTypeData = CONSTRUCTION_TYPES.find(ct => ct.value === constructionType);
      const pemMultiplier = constructionTypeData ? constructionTypeData.pemMultiplier : 1.0;

      // Calculate unique cost per m² based on construction type
      // new_construction = max (finish), interior_refurbishment = min (start)
      // Others interpolate: integral_renovation = start + 0.75 * range, energy_rehabilitation = start + 0.5 * range
      let uniqueCostPerM2;
      if (constructionType === 'new_construction') {
        uniqueCostPerM2 = pemFinish; // Max
      } else if (constructionType === 'interior_refurbishment') {
        uniqueCostPerM2 = pemStart; // Min
      } else {
        // Interpolate: start + multiplier * range
        uniqueCostPerM2 = pemStart + (pemMultiplier * pemRange);
      }

      // Multiply by GFA
      let totalCost = uniqueCostPerM2 * gfa;

      // Add special conditions percentage
      const specialConditionData = SPECIAL_CONDITIONS.find(sc => sc.value === specialConditions);
      if (specialConditionData && specialConditionData.percentage > 0) {
        totalCost = totalCost * (1 + specialConditionData.percentage / 100);
      }

      // Store total budget (PEM)
      setTotalBudget(totalCost);

      // Get ICIO percentage from city data
      const icioPercentage = parseFloat(cityData.icio) || 0;
      
      // Calculate ICIO tax
      let icioAmount = totalCost * (icioPercentage / 100);

      // Apply reduction
      const reductionData = ICIO_REDUCTIONS.find(red => red.value === icioReduction);
      if (reductionData && reductionData.reduction > 0) {
        icioAmount = icioAmount * (1 - reductionData.reduction / 100);
      }

      setCalculatedICIO(icioAmount);
    } catch (error) {
      console.error('Error calculating ICIO:', error);
      alert('Error calculating ICIO. Please check your inputs.');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const style = {
    position: 'fixed',
    left: `${dashboardPosition.x}px`,
    top: `${dashboardPosition.y}px`,
    zIndex: 1000,
    cursor: isDragging ? 'grabbing' : 'default'
  };

  return (
    <div className="icio-calculator-overlay" onClick={onClose}>
      <div 
        ref={dashboardRef}
        className="icio-calculator-dashboard" 
        style={style} 
        onClick={(e) => e.stopPropagation()}
      >
        <div 
          className="icio-calculator-header"
          onMouseDown={handleMouseDown}
          style={{ cursor: 'grab' }}
        >
          <h3>ICIO Tax Calculation</h3>
          <button className="icio-calculator-close" onClick={onClose}>×</button>
        </div>
        
        <div className="icio-calculator-content">
          {cityData && (
            <div className="icio-calculator-city-info">
              <strong>City:</strong> {cityData.city || 'Unknown'}
              {cityData.icio !== null && !isNaN(cityData.icio) && (
                <span> | <strong>ICIO:</strong> {cityData.icio.toFixed(2)}%</span>
              )}
            </div>
          )}

          <div className="icio-calculator-field">
            <label>Type of construction:</label>
            <select 
              value={constructionType} 
              onChange={(e) => setConstructionType(e.target.value)}
            >
              {CONSTRUCTION_TYPES.map(ct => (
                <option key={ct.value} value={ct.value}>{ct.label}</option>
              ))}
            </select>
          </div>

          <div className="icio-calculator-field">
            <label>Building function:</label>
            <select 
              value={buildingFunction} 
              onChange={(e) => setBuildingFunction(e.target.value)}
            >
              {buildTypes.map(bt => (
                <option key={bt.subtype} value={bt.subtype}>
                  {bt.type} - {bt.subtype.replace(/_/g, ' ')}
                </option>
              ))}
            </select>
          </div>

          <div className="icio-calculator-field">
            <label>GFA m²:</label>
            <input 
              type="number" 
              value={gfa} 
              onChange={(e) => setGfa(parseFloat(e.target.value) || 0)}
              min="0"
              step="0.01"
            />
          </div>

          <div className="icio-calculator-field">
            <label>Special conditions:</label>
            <select 
              value={specialConditions} 
              onChange={(e) => setSpecialConditions(e.target.value)}
            >
              {SPECIAL_CONDITIONS.map(sc => (
                <option key={sc.value} value={sc.value}>
                  {sc.label} {sc.percentage > 0 ? `(+${sc.percentage}%)` : ''}
                </option>
              ))}
            </select>
          </div>

          <div className="icio-calculator-field">
            <label>Reduce ICIO by:</label>
            <select 
              value={icioReduction} 
              onChange={(e) => setIcioReduction(e.target.value)}
            >
              {ICIO_REDUCTIONS.map(red => (
                <option key={red.value} value={red.value}>
                  {red.label} {red.reduction > 0 ? `(-${red.reduction}%)` : ''}
                </option>
              ))}
            </select>
          </div>

          <button 
            className="icio-calculator-button" 
            onClick={calculateICIO}
            disabled={loading || !buildingFunction}
          >
            {loading ? 'Calculating...' : 'Calculate'}
          </button>

          <div className="icio-calculator-result">
            <label>Total budget (PEM) =</label>
            <div className="icio-calculator-result-value">
              {totalBudget !== null 
                ? `€${totalBudget.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                : '—'
              }
            </div>
          </div>

          <div className="icio-calculator-result">
            <label>ICIO calculated =</label>
            <div className="icio-calculator-result-value">
              {calculatedICIO !== null 
                ? `€${calculatedICIO.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                : '—'
              }
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ICIOCalculator;

