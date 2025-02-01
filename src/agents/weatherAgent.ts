import { HumanMessage } from '@langchain/core/messages';
import { WeatherService } from '../services/weatherService';
import { DestinationAgent } from './destinationAgent';


// Agente del clima

export class WeatherAgent {
    //------------------------------------------------------------------------//
  private weatherService = new WeatherService();
  private destinationAgent = new DestinationAgent();
  //------------------------------------------------------------------------//
  // Funcion para obtener la temeperatura
  async getTemperature(cityMessage?: string): Promise<string> {
    try {
      let city = cityMessage || this.destinationAgent.getLastRecommendedDestination();

      if (!city) {
        return "No tengo un destino reciente para verificar el clima.";
      }

      const { temperature } = await this.weatherService.getWeather(city);
      return `La temperatura en ${city} es de ${temperature}°C.`;
    } catch (error) {
      console.error("Error en WeatherAgent:", error);
      return `No pude obtener la temperatura para la ciudad especificada.`;
    }
  }
}