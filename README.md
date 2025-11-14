# ICIO Map Visualization

A React application that visualizes ICIO (Indicador Compuesto de Inversión y Oportunidades) data by city on an interactive map using deck.gl.

## Features

- Upload and parse XLSX files containing ICIO data
- Interactive map visualization with color-coded points
- Point size represents ICIO value magnitude
- Tooltips showing city name and ICIO value on hover
- Automatic detection of latitude, longitude, city name, and ICIO columns

## Prerequisites

- Node.js (v14 or higher)
- npm or yarn
- Mapbox access token (get one at https://account.mapbox.com/)

## Installation

1. Install dependencies:
```bash
npm install
```

2. Set your Mapbox access token:
   
   **For local development:**
   - Create a `.env` file in the root directory
   - Add: `REACT_APP_MAPBOX_TOKEN=your_token_here`
   - Or `REACT_APP_MAPBOX_ACCESS_TOKEN=your_token_here`
   
   **For Vercel deployment:**
   - Go to your Vercel project → Settings → Environment Variables
   - Add: `REACT_APP_MAPBOX_TOKEN` with your Mapbox token value
   - Set for Production, Preview, and Development environments

## Usage

1. Start the development server:
```bash
npm start
```

2. Open your browser to `http://localhost:3000`

3. Click "Upload XLSX File" and select your ICIO data file

## XLSX File Format

The application expects an XLSX file with the following columns (case-insensitive):

- **Latitude**: Column names like `lat`, `latitude`, `y`, `coord_y`
- **Longitude**: Column names like `lon`, `lng`, `longitude`, `x`, `coord_x`, `long`
- **City Name**: Column names like `city`, `municipio`, `municipality`, `nombre`, `name`, `ciudad`
- **ICIO Value**: Column names like `icio`, `value`, `valor`, `ic`

Example:
| City | Latitude | Longitude | ICIO |
|------|----------|-----------|------|
| Madrid | 40.4168 | -3.7038 | 0.85 |
| Barcelona | 41.3851 | 2.1734 | 0.92 |

## Technologies Used

- React 18
- deck.gl 9.2
- react-map-gl 7.1
- Mapbox GL JS
- xlsx (for parsing Excel files)
- d3-scale (for color scaling)

## License

MIT

