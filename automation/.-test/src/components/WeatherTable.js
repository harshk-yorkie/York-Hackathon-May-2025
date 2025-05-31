import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import { fetchWeatherData } from '../services/weatherService';

const WeatherTable = ({ cities }) => {
  const [weatherData, setWeatherData] = useState([]);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const data = await Promise.all(cities.map(city => fetchWeatherData(city)));
        setWeatherData(data);
      } catch (err) {
        setError('Failed to fetch weather data.');
      }
    };

    fetchData();
  }, [cities]);

  if (error) {
    return <div>{error}</div>;
  }

  return (
    <table>
      <thead>
        <tr>
          <th>City</th>
          <th>Temperature</th>
          <th>Condition</th>
        </tr>
      </thead>
      <tbody>
        {weatherData.map((data, index) => (
          <tr key={index}>
            <td>{data.city}</td>
            <td>{data.temperature} °C</td>
            <td>{data.condition}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
};

WeatherTable.propTypes = {
  cities: PropTypes.arrayOf(PropTypes.string).isRequired
};

export default WeatherTable;