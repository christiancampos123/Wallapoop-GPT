const TelegramBot = require('node-telegram-bot-api');

class TelegramService {
  constructor() {
    // Reemplaza el valor con el token de Telegram que recibes de @BotFather
    this.token = '7904225546:AAFvKA1kTMcMmRzPwNwu_ey-_8023zjWyE0';
    this.bot = new TelegramBot(this.token, { polling: false }); // Cambia a false para evitar conflictos
  }

  // Método para enviar un mensaje
  async sendMessage(chatId, message) {
    try {
      await this.bot.sendMessage(chatId, message);
      console.log('Mensaje enviado:', message);
    } catch (error) {
      console.error('Error al enviar el mensaje:', error);
    }
  }
}

// Exportar el servicio para usarlo en otros módulos
module.exports = TelegramService;