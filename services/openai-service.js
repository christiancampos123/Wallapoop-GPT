const fs = require('fs');
const OpenAI = require('openai');
const path = require('path');

// Leer la clave API desde claves.txt
const apiKeyPath = path.resolve('./claves.txt');
const apiKey = fs.readFileSync(apiKeyPath, 'utf8').trim();

// Crear una instancia del cliente de OpenAI
const openai = new OpenAI({
  project: "proj_llBKZUJTCGq2fksa6zO9gbzv",
  apiKey,
});

// Servicio para manejar la API de OpenAI
class OpenAIService {
  // Método para listar todos los archivos
  async listFiles() {
    try {
      const list = await openai.files.list(); // Obtener la lista de archivos
      console.log('Listado de archivos:');
      for (const file of list.data) {
        await openai.files.del(file.id)
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
        purpose: 'assistants',
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
        "vs_z0qc6qLGMtonBppWK3smsAnd",
        { file_id: fileId }
      );

      console.log('Archivo adjuntado al vector:', response);
    } catch (error) {
      console.error('Error al adjuntar el archivo al vector:', error);
    }
  }

  // Método para manejar el flujo de subida y adjunto
  async uploadAndAttach(filePath) {
    try {
      // Listar archivos antes de subir
      await this.listFiles();

      // Subir el archivo y obtener su ID
      const fileId = await this.uploadFile(filePath);

      // Adjuntar el archivo al vector usando el ID del archivo
      await this.attachFileToVector(fileId);
    } catch (error) {
      console.error('Error en el proceso de subir y adjuntar:', error);
    }
  }
}

module.exports = OpenAIService;
