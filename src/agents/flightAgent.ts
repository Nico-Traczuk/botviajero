import axios from "axios";

// Clase para interactuar con la API de Amadeus y obtener vuelos cercanos
export class FlightAgent {
  private apiKey = "vmvalFe2pGtBADk77RbAeV3wuBUux1DP"; // Aquí coloca tu clave API de Amadeus
  private apiUrl = "https://test.api.amadeus.com/v2/shopping/flight-offers"; // URL de la API para buscar vuelos

  // Función para obtener vuelos cercanos a un destino
  async getFlights(destination: string, departureDate: string): Promise<string> {
    try {
      // Obtener el token de acceso de Amadeus
      const authResponse = await axios.post(
        "https://test.api.amadeus.com/v1/security/oauth2/token",
        new URLSearchParams({
          grant_type: "client_credentials",
          client_id: "TU_CLIENT_ID",  // Tu Client ID de Amadeus
          client_secret: "TU_CLIENT_SECRET"  // Tu Client Secret de Amadeus
        }),
        {
          headers: {
            "Content-Type": "application/x-www-form-urlencoded"
          }
        }
      );

      const accessToken = authResponse.data.access_token;

      // Hacer la solicitud de vuelos cercanos usando el token de acceso
      const response = await axios.get(
        `${this.apiUrl}?originLocationCode=NYC&destinationLocationCode=${destination}&departureDate=${departureDate}&adults=1`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          }
        }
      );

      // Procesar la respuesta y devolver los vuelos más cercanos
      const flights = response.data.data;
      if (flights.length === 0) {
        return "No encontré vuelos cercanos a tu destino.";
      }

      // Ejemplo de cómo mostrar los vuelos más cercanos
      let flightInfo = `Vuelos cercanos a tu destino ${destination}: \n`;
      flights.forEach((flight: any) => {
        flightInfo += `${flight.itineraries[0].segments[0].departure.iataCode} -> ${flight.itineraries[0].segments[0].arrival.iataCode} - Precio: ${flight.price.total} ${flight.price.currency}\n`;
      });

      return flightInfo;

    } catch (error) {
      console.error("Error al obtener vuelos:", error);
      return "Hubo un error al obtener la información de vuelos.";
    }
  }
}
