const fs = require("fs");
const path = require("path");
const puppeteer = require("puppeteer");
const cheerio = require("cheerio");
const ora = require("ora");

const { createB64Image, createRegularImage, isImageUrl } = require("./utils/image");
const generateGridItem = require("./utils/dom");

const URL = process.argv[2];
const DEST_FOLDER = path.join(__dirname, process.argv[3]);
const templateHtml = fs.readFileSync("./template.html", "utf-8");
const $ = cheerio.load(templateHtml);

try { 
    if(!fs.existsSync(DEST_FOLDER)) {
        fs.mkdirSync(DEST_FOLDER);
    }
} catch(err) {
    console.log(`Something went wrong! ${err.message}`);
    return;
}
    
(async () => {
    try {
        console.log(`Scraping images from: ${URL}`);
        var browser = await puppeteer.launch();
        const page = await browser.newPage();
        const promises = [];
        var spinner = ora("Searching for images...").start();
    
        page.on("response", response => {
            const url = response.url();
            const resContentType = response.headers()["content-type"];
            // Base64 images
            if(url.indexOf(";base64,") > -1) {
                spinner.text = "Currently scraping a base64 image";
                promises.push(
                    createB64Image(url, DEST_FOLDER).then(imgPath => {
                        generateGridItem($, "container", imgPath, resContentType, url)
                    })
                    .catch(err => {
                        spinner.fail(`Unable to scrape image from: ${url}, reason: ${err.message}.`);
                        spinner.start();
                    })
                );
            }
            // Other images
            else if(response.request().resourceType() === "image" && isImageUrl(url)) {
                spinner.text = `Scraping image from: ${url}`;
                response.buffer()
                    .then(file => {
                        promises.push(
                            createRegularImage(file, url, DEST_FOLDER)
                                .then(imgPath => {
                                    generateGridItem($, "container", imgPath, resContentType, url);
                                })
                                .catch(err => {
                                    spinner.fail(`Unable to scrape image from: ${url}, reason: ${err.message}.`);
                                    spinner.start();
                                })
                        );
                    })
                    .catch(err => console.log(err.message));
            }
        });   
    
        await page.goto(URL);
    
        Promise.allSettled(promises).then(() => {
            const htmlResult = "index.html";
            spinner.succeed(`Done scraping! Images can be found in: ${DEST_FOLDER}`);
            spinner.start("Creating HTML file");
            fs.writeFileSync(path.join(DEST_FOLDER, htmlResult), $.html())
            spinner.succeed(`HTML file created: ${path.join(DEST_FOLDER, htmlResult)}`);
        }).catch(err => {
            spinner.fail(`Something went wrong! ${err.message}`);
        })
    } catch(err) {
        spinner.fail(`Something went wrong! ${err.message}`);
    } finally {
        await browser.close();
    }
})();