# Python Geocoding Script

This script geocodes city names from the Excel file and adds latitude/longitude columns, then saves the result as CSV.

## Setup

1. Install Python dependencies:
```bash
pip install -r requirements.txt
```

## Usage

1. Make sure `ICIO_Municipios_50000_Espana.xlsx` is in the project root directory.

2. Run the geocoding script:
```bash
python geocode_cities.py
```

The script will:
- Read the Excel file
- Detect the city name column automatically
- Geocode each city using Nominatim (OpenStreetMap)
- Add `latitude` and `longitude` columns
- Save the result as `ICIO_Municipios_50000_Espana.csv`

## Notes

- The script uses rate limiting to be respectful to the geocoding service (1 second delay between requests)
- If coordinates already exist, they will be preserved
- Failed geocoding attempts will be logged but won't stop the process
- The resulting CSV will be saved in the project root and can be used by the React app

## CSV Format

The output CSV will contain all original columns plus:
- `latitude`: Latitude coordinate
- `longitude`: Longitude coordinate

Place the generated CSV file in the `public/` directory for the React app to load it automatically, or upload it through the web interface.

