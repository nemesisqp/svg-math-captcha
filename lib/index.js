'use strict';

const chToPath = require('./ch-to-path');
const random = require('./random');
const PNG = require('./pngjs2/png.js').PNG;
const Bimap = require('./bimap.js');

const getLineNoise = function (ctx, lv, width, height) {
    const noiseString = [];
    let i = -1;

    ctx.beginPath();
    while (++i < lv) {
        let startX = random.int(5, 25);
        let startY = random.int(10, height - 10);
        let start = startX + ' ' + startY;
        ctx.moveTo(startX, startY);

        let endX = random.int(width - 25, width - 5);
        let endY = random.int(10, height - 10);
        let end = endX + ' ' + endY;

        let mid1X = random.int((width / 2) - 25, (width / 2) + 25);
        let mid1Y = random.int(10, height - 10);
        let mid1 = mid1X + ' ' + mid1Y;

        let mid2X = random.int((width / 2) - 25, (width / 2) + 25);
        let mid2Y = random.int(10, height - 10);
        let mid2 = mid2X + ' ' + mid2Y;

        let color = random.greyColor();
        noiseString.push(`<path d="M${start} C${mid1},${mid2},${end}"
			stroke="${color}" fill="transparent"/>`);
        ctx.bezierCurveTo(mid1X, mid1Y, mid2X, mid2Y, endX, endY);
    }
    ctx.closePath();
    ctx.stroke();

    return noiseString.join('');
};

const getSVGOptions = function (height) {
    return {
        y:        height / 2,
        fontSize: height
    };
};

const getText = function (ctx, text, width, height) {
    const len = text.length;
    const spacing = (width - 2) / (len + 1);
    let i = -1;
    let out = [];

    while (++i < len) {
        if (text[i] == ' ') continue;
        let charPath = chToPath(text[i], getSVGOptions(height));
        let charPathData = charPath.toPathData();

        // randomly and evenly space out the characters
        let spacePos = spacing * (i + 0.5);
        let transform = random.int(spacePos - 2, spacePos + 4);
        // let transform = spacePos;
        let color = random.greyColor(0, 4);

        ctx.beginPath();
        charPath.commands.forEach(function (cmd) {
            switch (cmd.type) {
                case 'M':
                    ctx.moveTo(cmd.x + transform, cmd.y);
                    break;
                case 'Q':
                    ctx.quadraticCurveTo(cmd.x1 + transform, cmd.y1, cmd.x + transform, cmd.y);
                    break;
                case 'L':
                    ctx.lineTo(cmd.x + transform, cmd.y);
                    break;
                case 'Z':
                    ctx.closePath();
                    ctx.fill();
                    ctx.beginPath();
                    break;
            }
        });

        out.push(`<path fill="${color}" d="${charPathData}"
			transform="translate(${transform})"/>`);
    }

    return out.join('');
};

const createCaptcha = function (options) {
    if (typeof options === 'string') {
        options = {text: options};
    }
    options = options || {};
    const width = options.width || 150;
    const height = options.height || 50;
    const noiseLv = options.noise || 1;
    const text = options.text;

    const bitmap = Bimap.make(width, height);
    const ctx = bitmap.getContext();

    const lineNoise = getLineNoise(ctx, noiseLv, width, height);
    const textPath = getText(ctx, text, width, height, options);
    const xml = `<svg xmlns="http://www.w3.org/2000/svg"
		width="${width}" height="${height}">			
			${textPath}
			${lineNoise}
		</svg>`;

    return {
        answer: options.answer,
        png:    'data:image/png;base64,' + PNG.sync.write(encodePNG(bitmap)).toString('base64'),
        svg:    xml.replace(/[\t]/g, '').replace(/\n(\W)/g, '$1')
    }
};

function encodePNG(bitmap) {
    var png = new PNG({
        width:  bitmap.width,
        height: bitmap.height,
    });

    for (var i = 0; i < bitmap.width; i++) {
        for (var j = 0; j < bitmap.height; j++) {
            for (var k = 0; k < 4; k++) {
                var n = (j * bitmap.width + i) * 4 + k;
                png.data[n] = bitmap._buffer[n];
            }
        }
    }

    return png.pack();
}

const ops = ['+', '-'];
const nums = ['zero', 'one', 'two', 'three', 'four', 'five',
    'six', 'seven', 'eight', 'nine'];

function genText(options) {
    options = options || {};
    options.text = random.captchaText();
    options.answer = options.text;
    return createCaptcha(options);
}

const genMath = function (options) {
    options = options || {};

    let answer = random.int(0, 9);
    let expressionStr = nums[answer];

    let numOps = 1;
    let i;
    for (i = 0; i < numOps; ++i) {
        let op = random.int(0, 1);
        expressionStr += ' ' + ops[op] + ' ';
        let num = random.int(0, 9);
        expressionStr += nums[num];

        switch (op) {
            case 0:
                answer += num;
                break;
            case 1:
                answer -= num;
                break;
        }
    }

    options.text = expressionStr;
    options.answer = answer.toString();
    return createCaptcha(options);
};

module.exports = {
    genText: genText,
    genMath: genMath,
};
