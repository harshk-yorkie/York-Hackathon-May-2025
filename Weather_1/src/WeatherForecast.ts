import { fetchWeatherData, calculateMinMaxTemp, convertTemp } from './utils';

export class WeatherForecast {
  private unit: string = 'C';

  public async init() {
    const data = await fetchWeatherData();
    this.render(data);
  }

  private render(data: any) {
    // Implementation of rendering the weather data
    // This will involve creating HTML elements and appending them to the DOM
    // The data should be displayed according to the design requirements
  }

  public toggleUnit() {
    this.unit = this.unit === 'C' ? 'F' : 'C';
    this.init();
  }
}