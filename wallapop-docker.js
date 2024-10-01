const { Builder, By, until } = require('selenium-webdriver');
const fs = require('fs');
const chrome = require('selenium-webdriver/chrome');
const path = require('path');
const OpenAIService = require('./services/openai-service'); // Ajusta la ruta según sea necesario
const TelegramService = require('node-telegram-bot-api');


// Función para asegurar que el directorio existe
function ensureDirectoryExists(dir) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

// Función principal para extraer datos de Wallapop
async function wallapop() {
  const urlsToScrap = [
    "https://es.wallapop.com/app/search?category_ids=24200&object_type_ids=10088&keywords=game%20boy&latitude=39.57825&longitude=2.63204&filters_source=default_filters",
    "https://es.wallapop.com/app/search?category_ids=24200&object_type_ids=10088&keywords=play%20station%203&latitude=39.57825&longitude=2.63204&filters_source=default_filters",
    "https://es.wallapop.com/app/search?category_ids=24200&object_type_ids=10088&keywords=nintendo%20ds&latitude=39.57825&longitude=2.63204&filters_source=default_filters",
    "https://es.wallapop.com/app/search?category_ids=24200&object_type_ids=10088&keywords=ds&latitude=39.57825&longitude=2.63204&filters_source=default_filters",
    "https://es.wallapop.com/app/search?category_ids=24200&object_type_ids=10088&keywords=play%20station%204&latitude=39.57825&longitude=2.63204&filters_source=default_filters"
  ];

  const cantidadUrls = 20; // Ajusta la cantidad de URLs que deseas extraer
  const allAdUrls = []; // Array para almacenar todas las URLs de anuncios de todas las categorías

  // Configuración de Chrome para headless
  const chromeOptions = new chrome.Options();

  // Establecer la ruta al binario de Google Chrome si es necesario
  chromeOptions.setChromeBinaryPath('/usr/bin/chromium');

  chromeOptions.addArguments('user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36');
  chromeOptions.addArguments('--headless'); // Ejecutar en modo headless
  chromeOptions.addArguments('--no-sandbox'); // Necesario en algunos entornos de servidor
  chromeOptions.addArguments('--disable-search-engine-choice-screen');
  chromeOptions.addArguments('--disable-gpu'); // Deshabilitar uso de GPU (opcional)
  chromeOptions.addArguments('--disable-dev-shm-usage'); // Evitar errores de almacenamiento compartido limitado
  chromeOptions.addArguments('--window-size=1920,1080');
  chromeOptions.setUserPreferences({
    profile: {
      default_content_settings: {
        images: 2
      },
      managed_default_content_settings: {
        images: 2
      }
    }
  });

  // Crear el driver de Chrome con las opciones configuradas
  const driver = await new Builder().forBrowser('chrome').setChromeOptions(chromeOptions).build();

  try {
    // Iterar sobre cada URL de la lista `urlsToScrap`
    for (const url of urlsToScrap) {
      await driver.get(url);
      await driver.sleep(2000); // Esperar 2 segundos para que la página cargue

      const adUrls = await extractAdUrlsFromSearchPage(driver, cantidadUrls);
      allAdUrls.push(...adUrls); // Añadir URLs de anuncios a la lista total
    }

    // Extraer detalles de cada anuncio encontrado
    await extractDetailsFromUrls(driver, allAdUrls);

  } catch (error) {
    console.error('Error al obtener los anuncios:', error);
  } finally {
    await driver.quit();
  }
}

// Función para extraer URLs de anuncios desde la página de búsqueda
async function extractAdUrlsFromSearchPage(driver, cantidadUrls) {
  const adUrls = [];

  try {
    // Recolectar URLs de anuncios hasta alcanzar el número deseado (`cantidadUrls`)
    while (adUrls.length < cantidadUrls) {
      await driver.wait(until.elementsLocated(By.css('.ItemCardList__item')), 10000);
      const adElements = await driver.findElements(By.css('.ItemCardList__item'));

      for (const adElement of adElements) {
        const url = await adElement.getAttribute('href');
        if (url && !adUrls.includes(url)) {
          adUrls.push(url);
          if (adUrls.length >= cantidadUrls) break;
        }
      }

      if (adUrls.length < cantidadUrls) {
        await driver.executeScript('window.scrollTo(0, document.body.scrollHeight);');
        await driver.sleep(3000); // Esperar a que se carguen más elementos al hacer scroll
      }
    }
  } catch (error) {
    console.error('Error al extraer URLs de la página de búsqueda:', error);
  }

  return adUrls;
}

// Función para extraer detalles de los anuncios
async function extractDetailsFromUrls(driver, urls) {
  const allDetails = [];
  ensureDirectoryExists('storage'); // Asegúrate de que el directorio exista

  for (const url of urls) {
    await driver.get(url);

    let price = null;
    let title = null;
    let state = null;
    let description = null;

    try {
      price = await driver.findElement(By.css('.item-detail-price_ItemDetailPrice--standard__TxPXr')).getText();
    } catch (e) {
      console.log(`No se encontró el precio para ${url}`);
    }

    try {
      title = await driver.findElement(By.css('h1.item-detail_ItemDetail__title__wcPRl.mt-2')).getText();
    } catch (e) {
      console.log(`No se encontró el título para ${url}`);
    }

    try {
      state = await driver.findElement(By.css('.item-detail-additional-specifications_ItemDetailAdditionalSpecifications__characteristics__Ut9iT')).getText();
    } catch (e) {
      console.log(`No se encontró el estado para ${url}`);
    }

    try {
      description = await driver.findElement(By.css('section.item-detail_ItemDetail__description__7rXXT.py-4')).getText();
    } catch (e) {
      console.log(`No se encontró la descripción para ${url}`);
    }

    allDetails.push({
      url,
      price: price ? parseFloat(price.split(' ')[0]) : null,
      title,
      state: state && state.includes(' · ') ? state.split(' · ').pop() : state,
      description
    });

    console.log(`Detalles extraídos para ${url}`);
  }

  // Guardar detalles en un archivo JSON
  const jsonFilePath = path.resolve('storage/wallapop.json'); // Ruta al archivo JSON guardado
  const telegramService = new TelegramService();

  fs.writeFile(jsonFilePath, JSON.stringify(allDetails, null, 2), async (err) => {
    if (err) {
      console.error('Error al guardar los detalles en el archivo JSON:', err);
    } else {
      console.log('Detalles guardados en wallapop.json');
      const responseGPT = await callOpenAIService();
      // console.log("Mi respuesta ", responseGPT)
      const messageToSend = responseGPT[0]?.text?.value || "No hay mensaje disponible"; // Asegurarse de que no sea vacío

      if (messageToSend) {
        await wallapopBotNotification(messageToSend);
      } else {
        console.error('El mensaje está vacío. No se enviará a Telegram.');
      }
    }
  });
}

// Función para llamar al servicio OpenAI
async function callOpenAIService() {
  const openAIService = new OpenAIService(); // Crear instancia del servicio OpenAI
  const filePath = path.resolve('./storage/wallapop.json'); // Ajusta la ruta según sea necesario

  try {
    // Llamar al método para subir, adjuntar y consultar
    const respuestaGPT = await openAIService.uploadAttachAndQueryWithPrompt(filePath);
    return respuestaGPT; // Retornar la respuesta si es necesario
  } catch (error) {
    console.error('Error en el flujo general:', error);
  }
}

// Iniciar la función principal
//  wallapop();
async function wallapopBotNotification(message) {
  const TelegramService = require('./services/telegram-service'); // Ajusta la ruta según sea necesario
  const telegramService = new TelegramService();

  await telegramService.sendMessage("351777687", message);
}

wallapop();

// callOpenAIService(path.resolve('/storage/wallapop.json'))
