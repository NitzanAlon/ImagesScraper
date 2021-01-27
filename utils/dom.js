const { getImageData } = require("./image");

const generateGridItem = ($, containerId, imgPath, imgFormat, imgSrc) => {
    const imgData = getImageData({ imgPath, imgFormat }, imgSrc);
    $(`#${containerId}`).append(getGridItem(imgData.imgSrcs, imgData.dimensions, imgData.imgFormat));
}

const getGridItem = (imgSrc, originalSize, format) => {
    const { width, height } = originalSize;
    const source = getDetail("source", imgSrc.original);
    const dimensions = getDetail("dimensions", `${width}x${height}`);
    const imgFormat = getDetail("format", format);
    const itemDetails = `<div class="details">${source}${dimensions}${imgFormat}</div>`;
    return `<div class="grid-item"><img src=${imgSrc.local}>${itemDetails}</div>`;
}

const getDetail = (title, value) => {
    return `<div class=${title}><span class=${title}>${title.toUpperCase()}:</span><span class="value">${value}</span></div>`
}

module.exports = generateGridItem;