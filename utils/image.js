const fs = require("fs");
const path = require("path");
const sizeOf = require("image-size");

createImage = (data, path, ...args) => {
    return new Promise((resolve, reject) => {
        if(args.includes("base64")) {
            fs.writeFileSync(path, data, { encoding: "base64" });
            resolve();
        } else {
            const ws = fs.createWriteStream(path);
            ws.write(data, err => {
                if(err) reject(err);
                resolve(); 
            });
        }
    });
}

const createB64Image  = async (source, destinationPath) => {
    try {
        const b64 = source.split(";base64,").pop();
        const fileExt = source.substring("data:image/".length, source.indexOf(";base64,")).split("+")[0];
        let fileName = "";
        
        do {
            fileName = `img_${Math.floor(Math.random() * 1e4)}.${fileExt}`;
        } while(fs.existsSync(`${destinationPath}/${fileName}`));

        const imgPath = path.join(destinationPath, fileName);
        await createImage(b64, imgPath, "base64");
        return imgPath;
    } catch(err) {
        throw err;
    }
}

const createRegularImage = (fileBuffer, url, destinationPath) => {
    return new Promise((resolve, reject) => {
        const fileName = url.split("/").pop().split("?")[0];
        const imgPath = path.join(destinationPath, fileName);
        createImage(fileBuffer, imgPath)
            .then(() => resolve(imgPath))
            .catch(err => reject(err));
    });
}

const isImageUrl = url => {
    return /(https:\/\/)([^\s(["<,>\/]*)(\/)[^\s["><]*(.png|.jpe?g|.svg|.ico|.gif|.webp)(\?[^\s[",><]*)?/gmi.test(url);
}

const getImageData = (img, url) => {
    try {
        const { imgFormat } = img;
        const dimensions = sizeOf(img.imgPath);
        const imgSrcs = { local: img.imgPath, original: url };
        return {
            imgFormat,
            dimensions,
            imgSrcs
        }
    } catch(err) {
        throw err;
    }
}

module.exports = {
    createB64Image,
    createRegularImage,
    isImageUrl,
    getImageData
}