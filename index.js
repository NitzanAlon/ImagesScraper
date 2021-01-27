const fs = require("fs");
const path = require("path");
const puppeteer = require("puppeteer");
const cheerio = require("cheerio");

const { createB64Image, createRegularImage, isImageUrl, getImageData } = require("./utils/image");

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
            if(url.indexOf(";base64,") > -1) {
                promises.push(new Promise((resolve, reject) => {
                    createB64Image(url, DEST_FOLDER).then(imgPath => {
                        let img = { imgPath, imgFormat: response.headers()["content-type"] };
                        const imgData = getImageData(img, url);
                        $("#container").append(getGridItem(imgData.imgSrcs, imgData.dimensions, imgData.imgFormat));
                        resolve();
                    })
                    .catch(err => reject(err.message));
                }));
            } 
            else {
                if(response.request().resourceType() === "image" && isImageUrl(url)) {
                    response.buffer()
                        .then(file => {
                            promises.push(new Promise((resolve, reject) => {
                                createRegularImage(file, url, DEST_FOLDER)
                                    .then(imgPath => {
                                        if(imgPath && response.headers()["content-type"]) {
                                            let img = { imgPath, imgFormat: response.headers()["content-type"] };
                                            const imgData = getImageData(img, url);
                                            $("#container").append(getGridItem(imgData.imgSrcs, imgData.dimensions, imgData.imgFormat));
                                            resolve();
                                        } else reject();
                                    })
                                    .catch(err => reject(err));
                                }));
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

function getGridItem(imgSrc, originalSize, format) {
    const { width, height } = originalSize;
    const source = getDetail("source", imgSrc.original);
    const dimensions = getDetail("dimensions", `${width}x${height}`);
    const imgFormat = getDetail("format", format);
    const itemDetails = `<div class="details">${source}${dimensions}${imgFormat}</div>`;
    return `<div class="grid-item"><img src=${imgSrc.local}>${itemDetails}</div>`;
}

function getDetail(title, value) {
    return `<div class=${title}><span class=${title}>${title.toUpperCase()}:</span><span class="value">${value}</span></div>`
}