
async function wallapopBotNotification(message) {
  const TelegramService = require('./services/telegram-service'); // Ajusta la ruta según sea necesario
  const telegramService = new TelegramService();

  messages = message.split("---\n")

  messages.forEach(e => {
    telegramService.sendMessage(process.env.chatId, e);
  });
}
wallapopBotNotification("hey")