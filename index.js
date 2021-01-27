const fs = require("fs");
const path = require("path");
const puppeteer = require("puppeteer");
const cheerio = require("cheerio");

const { createB64Image, createRegularImage, isImageUrl } = require("./utils/image");
const generateGridItem = require("./utils/dom");

try {
    const URL = process.argv[2];
    const DEST_FOLDER = path.join(__dirname, process.argv[3]);
    
    if(!fs.existsSync(DEST_FOLDER)) {
        fs.mkdirSync(DEST_FOLDER);
    }
    
    const templateHtml = fs.readFileSync("./template.html", "utf-8");
    const $ = cheerio.load(templateHtml);
    
    (async () => {
        var browser = await puppeteer.launch();
        const page = await browser.newPage();
        const promises = [];
        page.on("response", response => {
            const url = response.url();
            const resContentType = response.headers()["content-type"];
            if(url.indexOf(";base64,") > -1) {
                promises.push(
                    createB64Image(url, DEST_FOLDER).then(imgPath => {
                        if(imgPath && resContentType) {
                            generateGridItem($, "container", imgPath, resContentType, url)
                        }
                    })
                    .catch(err => console.log(err.message))
                );
            } 
            else {
                if(response.request().resourceType() === "image" && isImageUrl(url)) {
                    response.buffer()
                        .then(file => {
                            promises.push(
                                createRegularImage(file, url, DEST_FOLDER)
                                    .then(imgPath => {
                                        if(imgPath && resContentType) {
                                            generateGridItem($, "container", imgPath, resContentType, url);
                                        }
                                    })
                                    .catch(err => console.log(err))
                            );
                        })
                        .catch(err => console.log(err.message))
                }
            }
        });   

        await page.goto(URL);
        await browser.close();
        Promise.allSettled(promises).then(() => {
            fs.writeFileSync(path.join(DEST_FOLDER, "index.html"), $.html())
        }).catch(err => console.log(err))
    })();
} catch(err) {
    console.log(err);
}