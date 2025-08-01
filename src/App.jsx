  import { useEffect, useState, useCallback } from "react";
  import "./App.css";

  /**
   * Coconut Risk Calculator Component
   * 
   * Calculates probability of coconut strikes based on:
   * - Current weather conditions (wind, rain, temperature)
   * - Local tree density
   * - User exposure time
   * - Manual location override capability
   */
  function App() {
    // State Management
    const [coords, setCoords] = useState(null); // User's geographic coordinates
    const [weatherData, setWeatherData] = useState(null); // Current weather conditions
    const [treeDensity, setTreeDensity] = useState(5); // Coconut tree count (default: 5)
    const [timeExposure, setTimeExposure] = useState(30); // Minutes under trees (default: 30)
    const [manualLat, setManualLat] = useState(""); // Manual latitude input
    const [manualLon, setManualLon] = useState(""); // Manual longitude input
    const [useManualCoords, setUseManualCoords] = useState(false); // Toggle for manual coordinates
    const [useManualTrees, setUseManualTrees] = useState(false); // Toggle for manual tree count
    const [isLoading, setIsLoading] = useState(false); // Loading state

    /**
     * Climate impact coefficients
     * These values are empirically estimated weights for how different
     * weather conditions affect coconut detachment probability
     */
    const climateFactors = {
      windImpact: 2.5,       // Base wind impact multiplier (m/s)
      rainImpact: 1.3,       // Rain makes fronds slippery
      stormImpact: 3.0,      // Storms dramatically increase risk
      humidityImpact: 0.8,   // Dry conditions loosen fibers
      temperatureImpact: 1.1 // Heat dries out stems
    };

    /**
     * Data fetching handler (memoized with useCallback)
     * Fetches both weather and tree data for given coordinates
     * @param {number} lat - Latitude
     * @param {number} lon - Longitude
     */
    const fetchData = useCallback(async (lat, lon) => {
      setIsLoading(true);
      setWeatherData(null); // Reset previous weather data
      setCoords({ lat, lon }); // Store coordinates (now properly used)

      try {
        // Fetch comprehensive weather data from Open-Meteo API
        const weatherUrl = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=wind_speed_10m,precipitation,rain,temperature_2m,relative_humidity_2m`;
        const weatherRes = await fetch(weatherUrl);
        const weatherJson = await weatherRes.json();

        if (weatherJson.current) {
          setWeatherData({
            windSpeed: weatherJson.current.wind_speed_10m,
            precipitation: weatherJson.current.precipitation,
            rain: weatherJson.current.rain,
            temperature: weatherJson.current.temperature_2m,
            humidity: weatherJson.current.relative_humidity_2m,
            isStormy: weatherJson.current.wind_speed_10m > 8 // Beaufort scale "fresh gale" threshold
          });
        }

        // Only fetch tree data if automatic mode enabled
        if (!useManualTrees) {
          const overpassUrl = `https://overpass-api.de/api/interpreter?data=[out:json];(node["natural"="tree"](around:1000,${lat},${lon});way["landuse"="forest"](around:1000,${lat},${lon});way["natural"="wood"](around:1000,${lat},${lon}););out body;`;
          const treeRes = await fetch(overpassUrl);
          const treeJson = await treeRes.json();
          setTreeDensity(treeJson.elements?.length || 5); // Default to 5 if no data
        }
      } catch (err) {
        console.error("Data fetch error:", err);
        setTreeDensity(5); // Fallback value
      } finally {
        setIsLoading(false);
      }
    }, [useManualTrees]); // Only rebuild if useManualTrees changes

    // Geolocation effect - runs on mount and when manual mode toggled
    useEffect(() => {
      if (!useManualCoords) {
        navigator.geolocation.getCurrentPosition(
          (position) => fetchData(position.coords.latitude, position.coords.longitude),
          (err) => console.error("Geolocation error:", err)
        );
      }
    }, [useManualCoords, fetchData]); // Proper dependencies

    /**
     * Handles manual coordinate submission
     * @param {Event} e - Form submit event
     */
    const handleManualSubmit = (e) => {
      e.preventDefault();
      const lat = parseFloat(manualLat);
      const lon = parseFloat(manualLon);
      if (!isNaN(lat) && !isNaN(lon)) fetchData(lat, lon);
    };

    /**
     * Calculates coconut strike probability (0-100%)
     * Incorporates all climate factors and exposure time
     * @returns {string|null} Formatted percentage or null if insufficient data
     */
    const calculateDanger = () => {
      if (!weatherData) return null;

      // Base risk incorporates wind speed with exponential scaling
      let risk = 10 + Math.pow(weatherData.windSpeed, 1.5) * climateFactors.windImpact;

      // Apply climate modifiers
      if (weatherData.rain > 0) risk *= climateFactors.rainImpact;
      if (weatherData.isStormy) risk *= climateFactors.stormImpact;
      if (weatherData.temperature > 30) risk *= climateFactors.temperatureImpact;
      if (weatherData.humidity < 40) risk *= climateFactors.humidityImpact;

      // Scale by tree density and exposure time
      return Math.min(
        100,
        risk * (treeDensity / 15) * (timeExposure / 120)
      ).toFixed(1);
    };
    // ... (UI rendering code would follow here)

  export default App;