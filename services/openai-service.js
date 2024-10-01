// Importar las dependencias necesarias
const fs = require('fs');
const OpenAI = require('openai');
const path = require('path');

// Leer la clave API desde claves.txt
const apiKeyPath = path.resolve('./claves.txt');
const apiKey = fs.readFileSync(apiKeyPath, 'utf8').trim();

// Crear una instancia del cliente de OpenAI
const openai = new OpenAI({
  project: "proj_llBKZUJTCGq2fksa6zO9gbzv", // Reemplaza con tu Project ID
  apiKey,
});

// Servicio para manejar la API de OpenAI
class OpenAIService {
  constructor() {
    this.vectorStoreId = "vs_z0qc6qLGMtonBppWK3smsAnd"; // Reemplaza con tu ID de Vector Store
    this.assistantId = "asst_EBs8chduMiGQzNAisqzjGYEz";
  }

  // Método para eliminar todos los archivos en el vector store
  async removeAllFilesFromVectorStore() {
    try {
      const list = await openai.files.list(); // Obtener la lista de archivos
      for (const file of list.data) {
        console.log(`Eliminando archivo: ${file.id} - ${file.filename}`);
        await openai.files.del(file.id); // Eliminar cada archivo
      }
    } catch (error) {
      console.error('Error al eliminar archivos del vector store:', error);
    }
  }

  // Método para listar todos los archivos (opcional, puede ser útil)
  async listFiles() {
    try {
      const list = await openai.files.list(); // Obtener la lista de archivos
      console.log('Listado de archivos:');
      for (const file of list.data) {
        console.log(`Archivo encontrado: ${file.id} - ${file.filename}`);
      }
    } catch (error) {
      console.error('Error al listar los archivos:', error);
    }
  }

  // Método para subir un archivo a OpenAI
  async uploadFile(filePath) {
    try {
      const file = await openai.files.create({
        file: fs.createReadStream(filePath),
        purpose: 'assistants', // Propósito del archivo
      });

      console.log('Archivo subido con éxito:', file);
      return file.id;
    } catch (error) {
      console.error('Error al subir el archivo:', error);
      throw error;
    }
  }

  // Método para adjuntar un archivo a un vector
  async attachFileToVector(fileId) {
    console.log("id file: ", fileId);
    try {
      const response = await openai.beta.vectorStores.files.createAndPoll(
        this.vectorStoreId,
        { file_id: fileId }
      );

      console.log('Archivo adjuntado al vector:', response);
    } catch (error) {
      console.error('Error al adjuntar el archivo al vector:', error);
      throw error;
    }
  }

  // Método para realizar una consulta (prompt) usando el vector store
  async queryWithVector(prompt) {
    const thread = await openai.beta.threads.create({
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
    });

    let threadId = thread.id;
    console.log('Created thread with Id: ' + threadId);

    const run = await openai.beta.threads.runs.createAndPoll(thread.id, {
      assistant_id: this.assistantId, // Use the class property for consistency
    });

    console.log('Run finished with status: ' + run.status);

    if (run.status === 'completed') {
      const messages = await openai.beta.threads.messages.list(thread.id);

      // Filtrar solo el mensaje de respuesta del asistente
      const assistantMessages = messages.getPaginatedItems().filter(message => message.role === 'assistant');

      // Asegúrate de que hay un mensaje del asistente
      if (assistantMessages.length > 0) {
        const assistantResponse = assistantMessages[0].content; // Obtener el contenido del primer mensaje
        return assistantResponse; // Retornar el mensaje del asistente
      } else {
        console.error('No response from assistant.');
        return null;
      }
    } else {
      console.error('Run was not completed successfully.');
      return null;
    }
  }

  // Método para manejar el flujo de subida, adjunto y consulta con prompt predefinido
  async uploadAttachAndQueryWithPrompt(filePath) {
    const fixedPrompt = "Dame los 5 mejores anuncios de cada consola. Teniendo en cuenta que tienes las siguientes consolas: playstation 3, playstation 4, gameboys y ds o nintendo ds";

    try {
      // Eliminar todos los archivos del vector store antes de subir un nuevo archivo
      await this.removeAllFilesFromVectorStore();

      // Subir el archivo y obtener su ID
      const fileId = await this.uploadFile(filePath);

      // Adjuntar el archivo al vector usando el ID del archivo
      await this.attachFileToVector(fileId);

      // Realizar una consulta usando el vector como contexto con un prompt predefinido
      const answer = await this.queryWithVector(fixedPrompt);
      return answer;
    } catch (error) {
      console.error('Error en el proceso de subir, adjuntar y consultar con prompt fijo:', error);
      throw error;
    }
  }
}

// Exportar el servicio para usarlo en otros módulos
module.exports = OpenAIService;
