import axios from 'axios';
// Servicio del clima, este servicio sirve para obtener la temperatura de una ciudad


export class WeatherService {
  // Esto lo logramos a traves de la api de wheaterApi
  async getWeather(city: string): Promise<{ temperature: number; city: string }> {
    const apiKey = '326eb02a508340ac835214705253101'; // Tu API key de OpenWeatherMap
    const url = `https://api.weatherapi.com/v1/current.json?key=${apiKey}&q=${city}`;

    try {
      const response = await axios.get(url);
      const weatherData = response.data.current.temp_c;
      const cityName = response.data.location.name;
      // Nos devuelvemos la temperatura y la ciudad.
      return { 
        temperature: weatherData,
        city: cityName
      };
    } catch (error) {
      console.error("Error al obtener el clima:", error);
      throw new Error("No se pudo obtener la información del clima.");
    }
  }
}