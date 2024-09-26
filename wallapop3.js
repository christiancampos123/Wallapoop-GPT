const { Builder, By, until } = require('selenium-webdriver');
const fs = require('fs');
const chrome = require('selenium-webdriver/chrome');
const path = require('path');
const OpenAIService = require('./services/openai-service'); // Ajusta la ruta según sea necesario

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

  const cantidadUrls = 10; // Ajusta la cantidad de URLs que deseas extraer

  // Configuración de Chrome para headless
  const chromeOptions = new chrome.Options();

  // Establecer la ruta al binario de Google Chrome
  chromeOptions.setChromeBinaryPath('/usr/bin/google-chrome');

  chromeOptions.addArguments('user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36');
  chromeOptions.addArguments('--headless'); // Ejecutar en modo headless
  chromeOptions.addArguments('--no-sandbox'); // Necesario en algunos entornos de servidor
  chromeOptions.addArguments('--disable-search-engine-choice-screen');
  chromeOptions.addArguments('--disable-gpu'); // Deshabilitar uso de GPU (opcional)
  chromeOptions.addArguments('--disable-dev-shm-usage'); // Evitar errores de almacenamiento compartido limitado
  chromeOptions.addArguments('--window-size=1920,1080');

  // Crear el driver de Chrome con las opciones configuradas
  const driver = await new Builder().forBrowser('chrome').setChromeOptions(chromeOptions).build();

  try {
    const url = 'https://es.wallapop.com/app/search?latitude=39.5782344&longitude=2.6319001&keywords=gameboy&order_by=newest&country_code=ES&filters_source=quick_filters';
    await driver.get(url);
    await driver.executeScript("document.body.style.zoom='25%'");

    await driver.wait(until.elementLocated(By.id('onetrust-accept-btn-handler')), 10000);
    const acceptButton = await driver.findElement(By.id('onetrust-accept-btn-handler'));
    await acceptButton.click();
    console.log('Cookies aceptadas');

    await driver.sleep(1500); // Retardo

    for (let i = 0; i < 3; i++) {
      await driver.actions().move({ x: 100, y: 100 }).click().perform();
      await driver.sleep(500);
    }

    const adData = [];
    const adUrls = [];

    try {
      await driver.executeScript('arguments[0].scrollIntoView(true);', await driver.wait(until.elementLocated(By.css('#btn-load-more.hydrated')), 10000));
      const loadMoreButton = await driver.findElement(By.css('#btn-load-more.hydrated'));
      await loadMoreButton.click();
      console.log('Clic en "Ver más productos"');
      await driver.sleep(3000);
    } catch (err) {
      console.log('No se encontró el botón "Ver más productos".', err);
    }

    // Recolectar URLs de anuncios
    while (adData.length < cantidadUrls) {
      await driver.wait(until.elementsLocated(By.css('.ItemCardList__item')), 10000);
      const adElements = await driver.findElements(By.css('.ItemCardList__item'));

      for (const adElement of adElements) {
        const title = await adElement.getAttribute('title');
        const url = await adElement.getAttribute('href');

        if (!adUrls.includes(url)) {
          adData.push({ title, url });
          adUrls.push(url);

          if (adUrls.length >= cantidadUrls) {
            break;
          }
        }
      }

      if (adUrls.length >= cantidadUrls) {
        break;
      }

      await driver.executeScript('window.scrollTo(0, document.body.scrollHeight);');
      console.log('Desplazándose hacia abajo para cargar más anuncios');
      await driver.sleep(3000); // Retardo
    }

    // Extrae detalles de los anuncios
    await extractDetailsFromUrls(driver, adUrls);
  } catch (error) {
    console.error('Error al obtener los anuncios:', error);
  } finally {
    await driver.quit();
  }
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
      await driver.wait(until.elementLocated(By.css('.item-detail-price_ItemDetailPrice--standard__TxPXr')), 10000);
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
      price: parseFloat(price.split(' ')[0]),
      title,
      state: state.includes(' · ') ? state.split(' · ').pop() : state,
      description
    });

    console.log(`Detalles extraídos para ${url}`);
  }

  // Guardar detalles en un archivo JSON
  const jsonFilePath = path.resolve('storage/wallapop.json'); // Ruta al archivo JSON guardado
  fs.writeFile(jsonFilePath, JSON.stringify(allDetails, null, 2), async (err) => {
    if (err) {
      console.error('Error al guardar los detalles en el archivo JSON:', err);
    } else {
      console.log('Detalles guardados en wallapop.json');
      // Llama al servicio OpenAI si es necesario
    }
  });
}

// Iniciar la función principal
wallapop();
