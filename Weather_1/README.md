# Weather Widget

This widget detects the user’s location (GPS/IP) and displays real-time weather data from OpenWeatherMap’s current API.

## Features

- Auto-fetches weather data using location access.
- Displays temperature, humidity, wind speed, and weather icon.
- Allows manual input if GPS/IP location fails.
- Shows a loading state while fetching data.
- Allows toggling units (°C/°F, km/h/mph) which persist via localStorage.
- Displays animated weather icons.
- Provides contextual tips based on the weather (e.g., "Rainy → Don't forget your umbrella!", "Sunny → High UV today, wear sunscreen!").

## Installation

1. Clone this repository.
2. Run `npm install`.
3. Open `public/index.html` in your browser.