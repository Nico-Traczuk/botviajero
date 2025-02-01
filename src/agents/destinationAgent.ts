import axios from "axios";

interface Country {
  name: {
    common: string;
  };
  region: string;
}

// Agente de Destinos

export class DestinationAgent {
  //------------------------------------------------------------------------//
  
 // Variables para llenar
  private destinations: string[] = [];
  private lastRecommendedDestination: string | null = null;

  constructor() {
    this.loadDestinations(); // Cargamos los destinos
  }

  //------------------------------------------------------------------------//
  // Cargamos los destinos con una api para obtener los paises
  private async loadDestinations(): Promise<void> {
    try {
      const response = await axios.get<Country[]>("https://restcountries.com/v3.1/all");
      this.destinations = response.data.map((country: Country) => country.name.common);
    } catch (error) {
      console.error("Error al obtener los países:", error);
    }
  }
  //------------------------------------------------------------------------//

  // De la misma api obtenemos la region
  private async getRegion(countryName: string): Promise<string | null> {
    try {
      const response = await axios.get<Country[]>(`https://restcountries.com/v3.1/name/${countryName}`);
      const region = response.data[0]?.region;
      return region || null;
    } catch (error) {
      console.error("Error al obtener la región del país:", error);
      return null;
    }
  }
  //------------------------------------------------------------------------//
  // El agente nos sugiere un destino que espera un string con el pais
  async suggestDestination(): Promise<string> {
    if (this.destinations.length === 0) {
      return "No tengo destinos disponibles en este momento.";
    }
    // Elige un destino random
    const randomIndex = Math.floor(Math.random() * this.destinations.length);
    const destination = this.destinations[randomIndex];
    this.lastRecommendedDestination = destination;

    const region = await this.getRegion(destination);
    const regionMessage = region ? `que está ubicado en la región de ${region}` : "No se pudo obtener la región.";

    return `Te recomiendo visitar ${destination}, ${regionMessage}. Es un lugar interesante para explorar.`;
  }
 
  //------------------------------------------------------------------------//
  // Devuelve y llena la variable con el ultimo destino sugerido
  getLastRecommendedDestination(): string | null {
    return this.lastRecommendedDestination;
  }
}