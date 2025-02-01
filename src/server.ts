// Importamos express
import express, { Request, Response } from 'express';

//--------------------------------------------------------------------------------------------

// Importamos los agentes
import { DestinationAgent } from './agents/destinationAgent';
import { PackingAgent } from './agents/packingAgent';
import { WeatherAgent } from './agents/weatherAgent';
import { FlightAgent } from './agents/flightAgent';

//--------------------------------------------------------------------------------------------

// importamos nuestra IA
import { ChatOpenAI } from "@langchain/openai";
import { HumanMessage, BaseMessage, AIMessage } from "@langchain/core/messages";
import { END, START , MessageGraph, CompiledGraph, entrypoint } from "@langchain/langgraph";
import { Tool } from '@langchain/core/tools';
import { Graph } from '@langchain/langgraph';

//--------------------------------------------------------------------------------------------

// Importamos las dependencias
import cors from 'cors';
import path from 'path';
import dotenv from 'dotenv';

//--------------------------------------------------------------------------------------------

dotenv.config();


// Esta es nuestra apikey de openai
const openaiApiKey = process.env.OPENAI_API_KEY;
if (!openaiApiKey) {
  console.error("API Key is missing");
  process.exit(1); // Terminar el proceso si no se encuentra la clave
}

//--------------------------------------------------------------------------------------------

// Creamos el servidor
const app = express();

//--------------------------------------------------------------------------------------------
// Sirve la carpeta raíz del proyecto, tenemos el index.html podemos ejecutar en el buscador un www.localhost.com/3000 para preguntar desde ahi
app.use(express.static(path.join(__dirname, '..'))); 
app.use(express.json());

app.use(express.urlencoded({ extended: true }));

//--------------------------------------------------------------------------------------------

type ConversationState = {
  input: string;
  step: string;
};
// Creamos los agentes de las clases importadas
const destinationAgent = new DestinationAgent();
const packingAgent = new PackingAgent();
const weatherAgent = new WeatherAgent();
const flightAgent = new FlightAgent();

//--------------------------------------------------------------------------------------------


// Creamos los nodos / Nodo de destino
// const destinationNode = async (message: any): Promise<string> => {
//   console.log("Mensaje recibido en destinationNode:", message);
//   const suggestion = await destinationAgent.suggestDestination();
//   return suggestion;
// };

//--------------------------------------------------------------------------------------------


const extractCityFromMessage = (message: string): string => {
  // Aquí puedes aplicar lógica para extraer el nombre de la ciudad
  // Como ejemplo, vamos a suponer que el mensaje es algo como "clima en Buenos Aires"
  const cityRegex = /clima en ([A-Za-z\s]+)/i;
  const match = message.match(cityRegex);
  return match ? match[1] : "Buenos Aires"; // Si no se encuentra, se devuelve una ciudad por defecto
};

//--------------------------------------------------------------------------------------------
const destinationNode = async (message: any): Promise<HumanMessage> => {
  const content = Array.isArray(message) ? message[0]?.content : message.content;

  if (!content) {
    console.error("Error: El mensaje recibido no tiene 'content'.", message);
    return new HumanMessage("No entendí tu solicitud, intenta de nuevo.");
  }

  // Extraer ciudad si el usuario la menciona
  const cityMatch = content.match(/ciudad de ([\w\s]+)/i);
  const city = cityMatch ? cityMatch[1].trim() : null;

  if (city) {
    return new HumanMessage(`Has mencionado ${city}. ¿Quieres saber el clima o preparar el equipaje para este destino?`);
  }

  // Si no hay ciudad, hacer una sugerencia
  const suggestion = await destinationAgent.suggestDestination();
  return new HumanMessage(`${suggestion} ¿Te gustaría saber el clima o preparar el equipaje para tu destino?`);
};

//--------------------------------------------------------------------------------------------
const weatherNode = async (message: string): Promise<HumanMessage> => {
  try {
    // Extraer el nombre de la ciudad del mensaje
    const city = typeof message === "string" ? message : message;  // Asegúrate de acceder al contenido correcto.

    if (!city) {
      return new HumanMessage("No se proporcionó una ciudad. Por favor, intenta de nuevo.");
    }

    // Obtener la temperatura usando WeatherAgent
    const weatherInfo = await weatherAgent.getTemperature(city);

    // Devolver un HumanMessage con la información del clima
    return new HumanMessage(`La temperatura en ${city} es de ${weatherInfo}°C.`);
  } catch (error) {
    console.error("Error en weatherNode:", error);

    // Devolver un mensaje de error en caso de fallo
    return new HumanMessage("No pude obtener la información del clima. Por favor, intenta de nuevo.");
  }
};

//--------------------------------------------------------------------------------------------
// Nodo de equipaje
const packingNode = async (message: any): Promise<HumanMessage> => {
  const text = typeof message === "string" ? message : String(message?.content);

  const cityMatch = text.match(/ciudad de ([\w\s]+)/i);
  const city = cityMatch ? cityMatch[1].trim() : null;

  if (!city) {
    return new HumanMessage("Necesito saber la ciudad para preparar el equipaje.");
  }

  const packingList = await packingAgent.getPackingList(city);
  return new HumanMessage(`Aquí tienes una lista de equipaje recomendada para ${city}: ${packingList}`);
};

//--------------------------------------------------------------------------------------------


// Creamos modelo y graph
const llm = new ChatOpenAI({
 
  modelName: "gpt-3.5-turbo",
  temperature: 0.9
})

//--------------------------------------------------------------------------------------------
// Aca creamos el graph los nodos y como se relacionan

const graph = new MessageGraph();

graph
  .addNode("destination", destinationNode) // Nodo de destino
  .addNode("weather", weatherNode) // Nodo de clima
  .addNode("packing", packingNode) // Nodo de equipaje
  .addEdge(START, "destination") // Comienza en destinationNode
  .addConditionalEdges("destination", (message: BaseMessage | BaseMessage[]) => {
    // Condicion para el flujo hacia el clima o el equipaje
    const content = Array.isArray(message) ? message[0].content : message.content;

    if (typeof content === "string") {
      // Si se menciona el clima o una ciudad, pasa al nodo de clima
      if (content.toLowerCase().includes("clima") || content.toLowerCase().includes("temperatura")) {
        return "weather"; // Pasa al nodo de clima
      } else if (content.toLowerCase().includes("equipaje") || content.toLowerCase().includes("llevar")) {
        return "packing"; // Pasa al nodo de equipaje
      }
    }
    return END; // Finaliza el flujo si no se menciona clima o equipaje
  })
  .addEdge("weather", "packing") // Después de consultar el clima, pasa a equipaje
  .addEdge("packing", END); // Finaliza despues de mostrar el equipaje


// Añadir nodos al grafo


//--------------------------------------------------------------------------------------------

// Compilamos nuestros nodos

const compiledGraph = graph.compile();


//--------------------------------------------------------------------------------------------

// Creamos el entry point

app.post('/api/chat', async (req: Request, res: Response) => {
  let { message } = req.body;

  if (typeof message !== 'string') {
    message = String(message);
  }

  console.log("Mensaje recibido:", message);

  try {
    // Determina si el mensaje es sobre el clima
    if (message.includes('clima') || message.includes('tiempo')) {
      const city = extractCityFromMessage(message); // Extrae la ciudad del mensaje
      if (!city) {
        res.send({ response: "Por favor, dime el nombre de la ciudad para consultar el clima." });
        return;
      }

      const weatherResponse = await weatherAgent.getTemperature(city);
      res.send({ response: weatherResponse });

    // Determina si el mensaje es sobre el destino
    } else if (message.includes('destino') || message.includes('viaje')) {
      const destinationResponse = await destinationAgent.suggestDestination();
      res.send({ response: destinationResponse });

    // Determina si el mensaje es sobre el equipaje
    } else if (message.includes('equipaje') || message.includes('maleta')) {
      const city = extractCityFromMessage(message); // Extrae la ciudad del mensaje
      if (!city) {
        res.send({ response: "Por favor, dime el nombre de la ciudad para preparar el equipaje." });
        return;
      }

      const luggageResponse = await packingAgent.getPackingList(city);
      res.send({ response: luggageResponse });

    } else {
      // Si el mensaje no corresponde a una de las categorías anteriores
      const response = "No entendí tu pregunta. ¿Quieres saber el clima, el destino o preparar el equipaje?";
      res.send({ response });
    }
  } catch (error) {
    console.error("Error procesando el mensaje:", error);
    res.status(500).send({ response: "Ocurrió un error procesando el mensaje." });
  }
});



//--------------------------------------------------------------------------------------------

// Corremos el servidor en el puerto 3000
const PORT = 3000;
app.listen(PORT, () => {
  console.log(`Servidor corriendo en http://localhost:${PORT}`);
});

//--------------------------------------------------------------------------------------------

