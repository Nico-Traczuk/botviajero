import { WeatherService } from "../services/weatherService";


  //------------------------------------------------------------------------//
interface WeatherData {
  temperature: number;
  city: string;
}
  //------------------------------------------------------------------------//
  // Agente de equipaje
export class PackingAgent {
  private weatherService = new WeatherService();
  //------------------------------------------------------------------------//
  // De acuerdo a la temperatura de la ciudad, devuelve una lista de equipaje
  async getPackingList(city: string): Promise<string> {
    try {
      const { temperature } = await this.weatherService.getWeather(city);

      if (typeof temperature !== "number") {
        throw new Error("Temperatura no válida.");
      }

      let packingList = `Para tu viaje a ${city}, te recomiendo llevar: `;

      if (temperature < 10) {
        packingList += "ropa abrigada, bufanda, guantes. ";
      } else if (temperature > 25) {
        packingList += "ropa ligera, protector solar, gafas de sol. ";
      } else {
        packingList += "ropa cómoda, chaqueta ligera. ";
      }

      packingList += "No olvides tus documentos y artículos de higiene personal.";
      return packingList;
    } catch (error) {
      console.error("Error en PackingAgent:", error);
      return `No pude obtener la información del clima para ${city}.`;
    }
  }
}