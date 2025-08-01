import { useEffect, useState, useCallback } from "react";
import { Line } from "react-chartjs-2";
import {
  Chart,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
} from "chart.js";
import "./App.css";

Chart.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

const coconutFacts = [
  "Coconuts are technically seeds, not nuts.",
  "Coconut water is a natural isotonic beverage.",
  "There are over 1,200 varieties of coconuts worldwide.",
  "Coconuts can float on water and travel long distances.",
  "The coconut tree is known as the 'Tree of Life'.",
  "Coconut oil has been used for centuries in skincare and cooking.",
  "The husk of a coconut can be used to make ropes and mats.",
  "Coconuts are grown in more than 90 countries worldwide.",
  "The coconut palm is one of the most useful trees on Earth.",
  "Coconut shells can be used as bowls or fuel.",
  "Coconuts provide a natural source of hydration in tropical climates.",
  "In some cultures, coconuts symbolize prosperity and fertility.",
  "Coconut water was used as an emergency intravenous hydration fluid during WWII.",
  "The tallest coconut palm on record was over 30 meters tall.",
  "Coconut leaves are used for thatching roofs and weaving baskets.",
];


function LoadingSpinner() {
  return (
    <div className="spinner" aria-label="Loading...">
      <svg viewBox="0 0 50 50">
        <circle
          className="path"
          cx="25"
          cy="25"
          r="20"
          fill="none"
          strokeWidth="5"
        />
      </svg>
    </div>
  );
}

function App() {
  const [coords, setCoords] = useState(null);
  const [windSpeed, setWindSpeed] = useState(null);
  const [treeDensity, setTreeDensity] = useState(null);
  const [timeExposure, setTimeExposure] = useState(30);
  const [manualLat, setManualLat] = useState("");
  const [manualLon, setManualLon] = useState("");
  const [useManual, setUseManual] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [windHistory, setWindHistory] = useState([]);
  const [factIndex, setFactIndex] = useState(0);

  const fetchData = useCallback(async (lat, lon) => {
    setIsLoading(true);
    try {
      setCoords({ lat, lon });

      // Fetch current weather + last 5 days wind speed for trend
      const now = new Date();
      const end = now.toISOString().slice(0, 10);
      const startDate = new Date(now);
      startDate.setDate(now.getDate() - 5);
      const start = startDate.toISOString().slice(0, 10);

      const weatherUrl = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current_weather=true&hourly=wind_speed_10m&start_date=${start}&end_date=${end}`;
      const res = await fetch(weatherUrl);
      const data = await res.json();

      if (data.current_weather) {
        setWindSpeed(data.current_weather.windspeed);
      }

      if (data.hourly && data.hourly.wind_speed_10m) {
        // Pick one wind speed per day roughly at noon (12:00)
        const hours = data.hourly.time;
        const speeds = data.hourly.wind_speed_10m;
        const dailySpeeds = [];
        for (let i = 0; i < hours.length; i++) {
          if (hours[i].endsWith("12:00")) {
            dailySpeeds.push(speeds[i]);
          }
        }
        setWindHistory(dailySpeeds.slice(-5)); // last 5 days at noon
      }

      // Fetch tree density
      const overpassUrl = `https://overpass-api.de/api/interpreter?data=[out:json];(node["natural"="tree"](around:1000,${lat},${lon});way["landuse"="forest"](around:1000,${lat},${lon});way["natural"="wood"](around:1000,${lat},${lon}););out body;`;
      const treeRes = await fetch(overpassUrl);
      const treeJson = await treeRes.json();
      setTreeDensity(treeJson.elements?.length || 5);
    } catch (err) {
      console.error("Error fetching data:", err);
      setTreeDensity(5);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!useManual) {
      navigator.geolocation.getCurrentPosition(
        (pos) => fetchData(pos.coords.latitude, pos.coords.longitude),
        (err) => console.error("Geolocation error:", err)
      );
    }
  }, [useManual, fetchData]);

  const handleManualSubmit = (e) => {
    e.preventDefault();
    const lat = parseFloat(manualLat);
    const lon = parseFloat(manualLon);
    if (!isNaN(lat) && !isNaN(lon)) fetchData(lat, lon);
  };

  const coconutProbability =
    windSpeed !== null && treeDensity !== null
      ? Math.min(
          100,
          (10 + windSpeed * 2 + Math.random() * 5) *
            5 *
            (treeDensity / 20) *
            (timeExposure / 1440)
        ).toFixed(1)
      : null;

  const dangerLevel = coconutProbability
    ? coconutProbability > 70
      ? "danger"
      : coconutProbability > 40
      ? "warning"
      : "safe"
    : "";

  // Animate fun facts every 10 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      setFactIndex((i) => (i + 1) % coconutFacts.length);
    }, 10000);
    return () => clearInterval(interval);
  }, []);

  // Chart data
  const chartData = {
    labels: [
      "5 days ago",
      "4 days ago",
      "3 days ago",
      "2 days ago",
      "Yesterday",
    ],
    datasets: [
      {
        label: "Wind Speed (m/s)",
        data: windHistory,
        fill: false,
        backgroundColor: "#3498db",
        borderColor: "#2980b9",
        tension: 0.3,
        pointRadius: 5,
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    plugins: {
      legend: {
        position: "top",
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        max: Math.max(...windHistory, 10),
      },
    },
  };

  return (
    <div className="app-container" role="main" aria-live="polite">
      <h1>🥥 Coconut Hit Probability Calculator</h1>

      <label>
        <input
          type="checkbox"
          checked={useManual}
          onChange={() => setUseManual(!useManual)}
        />{" "}
        Use manual coordinates
      </label>

      {useManual && (
        <form className="manual-form" onSubmit={handleManualSubmit}>
          <div className="manual-inputs">
            <input
              type="number"
              placeholder="Latitude"
              step="0.0001"
              value={manualLat}
              onChange={(e) => setManualLat(e.target.value)}
              required
              aria-label="Latitude"
            />
            <input
              type="number"
              placeholder="Longitude"
              step="0.0001"
              value={manualLon}
              onChange={(e) => setManualLon(e.target.value)}
              required
              aria-label="Longitude"
            />
            <button type="submit">Fetch Data</button>
          </div>
        </form>
      )}

      {isLoading ? (
        <LoadingSpinner />
      ) : (
        <>
          {coords && (
            <div
              className="info-card"
              style={{ animation: "fadeIn 0.7s ease forwards" }}
            >
              <p>
                📍 Your location: {coords.lat.toFixed(4)},{" "}
                {coords.lon.toFixed(4)}
              </p>
              <p>
                🌬️ Wind speed:{" "}
                {windSpeed !== null ? `${windSpeed} m/s` : "Loading..."}
              </p>
              <p>
                🌴 Estimated nearby trees:{" "}
                {treeDensity !== null ? treeDensity : "..."}
              </p>
              <label>
                Adjust tree count:
                <input
                  type="number"
                  min="1"
                  value={treeDensity || ""}
                  onChange={(e) =>
                    setTreeDensity(parseInt(e.target.value) || 5)
                  }
                  aria-label="Adjust tree count"
                />
              </label>
              <label>
                Minutes under trees per day:
                <input
                  type="number"
                  min="0"
                  value={timeExposure}
                  onChange={(e) =>
                    setTimeExposure(parseInt(e.target.value) || 0)
                  }
                  aria-label="Minutes under trees"
                />
              </label>
            </div>
          )}

          {coconutProbability !== null && (
            <p
              className={`probability-text ${dangerLevel}`}
              style={{ animation: "colorFade 1.2s ease forwards" }}
              aria-live="assertive"
            >
              🥥 Coconut Hit Probability: {coconutProbability}% —{" "}
              {coconutProbability > 50
                ? "Find cover!"
                : "You're probably safe... for now."}
            </p>
          )}

          {windHistory.length > 0 && (
            <div
              className="info-card"
              style={{ animation: "fadeIn 1s ease forwards" }}
            >
              <h3>Wind Speed Trend (last 5 days)</h3>
              <Line data={chartData} options={chartOptions} />
            </div>
          )}

          <marquee
            behavior="scroll"
            direction="left"
            className="fun-fact"
            aria-label="Fun coconut fact"
          >
            🌴 Fun fact: {coconutFacts[factIndex]}
          </marquee>
        </>
      )}
    </div>
  );
}

export default App;
