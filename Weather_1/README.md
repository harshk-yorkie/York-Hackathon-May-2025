# Weather Comparison Table

This project is a comparison table that allows users to view weather metrics for multiple cities simultaneously using OpenWeatherMap API data.

## Installation

1. Clone the repository.
2. Run `npm install` to install the dependencies.
3. Replace 'YOUR_OPENWEATHERMAP_API_KEY' in `src/api.ts` with your actual OpenWeatherMap API key.
4. Run the application with `npm start`.

## Testing

Run `npm test` to run the tests.

## Features

- Displays 3+ cities' data within 15 seconds.
- All columns show real API data (no mock values).
- Maintains sort state during data refreshes.
- Clear visual differentiation between cities.
- Empty state when no cities selected.
- "Delta" mode showing differences from first city.
- Mini sparkline graphs for temp trends.

## Contributing

Pull requests are welcome. For major changes, please open an issue first to discuss what you would like to change.