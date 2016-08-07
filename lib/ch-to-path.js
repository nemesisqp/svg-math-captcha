'use strict';

const assert = require('assert');
const fs = require('fs');
const random = require('./random.js');
const opentype = require('./opentype.min.js');
const fonts = require('./fonts.js');

const font = opentype.parse(fonts.comismsh);
const ascender = font.ascender;
const descender = font.descender;

function snap(v, distance, strength) {
    return (v * (1.0 - strength)) + (strength * Math.round(v / distance) * distance);
}

function doSnap(path) {
    let snapStrength = random.int(5, 30);
    let snapDistance = random.int(5, 30);
    let snapX = random.int(5, 10);
    let snapY = random.int(5, 10);
    let i;
    let strength = snapStrength / 100.0;
    for (i = 0; i < path.commands.length; i++) {
        let cmd = path.commands[i];
        if (cmd.type !== 'Z') {
            cmd.x = snap(cmd.x + snapX, snapDistance, strength) - snapX;
            cmd.y = snap(cmd.y + snapY, snapDistance, strength) - snapY;
        }
        if (cmd.type === 'Q' || cmd.type === 'C') {
            cmd.x1 = snap(cmd.x1 + snapX, snapDistance, strength) - snapX;
            cmd.y1 = snap(cmd.y1 + snapY, snapDistance, strength) - snapY;
        }
        if (cmd.type === 'C') {
            cmd.x2 = snap(cmd.x2 + snapX, snapDistance, strength) - snapX;
            cmd.y2 = snap(cmd.y2 + snapY, snapDistance, strength) - snapY;
        }
    }
}

module.exports = function getPath(text, options) {
    options = options === undefined ? {} : options;

    const ch = text.trim()[0];
    assert(ch, 'expect a string');

    const fontSize = options.fontSize || 72;
    const fontScale = 1 / font.unitsPerEm * fontSize;

    const glyph = font.stringToGlyphs(ch)[0];
    const width = glyph.advanceWidth ? glyph.advanceWidth * fontScale : 0;
    const left = 0 - (width / 2);

    const height = (ascender + descender) * fontScale;
    const baseline = (options.y || 0) + (height / 2);
    let path = font.getPath(ch, 0, baseline, fontSize, {kerning: true});
    if (ch !== '-' && ch !== '+')
        doSnap(path);
    return path;
};
