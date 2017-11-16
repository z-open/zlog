/**
 * similar to printf concept.
 *
 * If find a %b in the text, would replace by the argument if any.
 */
'use strict';
const _ = require('lodash');
const util = require('util');
module.exports = {
    formatText,
    formatting,
};

/**
 * Works like util.format of node but also handles the %b selector
 * which returns a string surrounded by square bracket to point out desired information.
 * 
 * @param {*} text 
 * @param {*} param1 
 * @param {*} param2 
 */
function formatText(text, param1, param2) {
    return formatting.apply(this, arguments).text;
}

/**
 *  format the text with the arguments provided.
 *  ('hello %b','world','you')
 *  -> 'hello [world]',1
 *
 *  @returns {object}
 *  - the formatted text
 *  - the number of arguments used to format the text
 *
 */
function formatting(f) {
    if (typeof f !== 'string') {
        const objects = new Array(arguments.length);
        for (var index = 0; index < arguments.length; index++) {
            objects[index] = util.inspect(arguments[index]);
        }
        return {
            text: objects.join(' '),
            argCount: arguments.length-1
        };
    }

    var argLen = arguments.length;

    if (argLen === 1) return {
        text: f,
        argCount: 0
    };

    var str = '';
    var a = 1;
    var lastPos = 0;
    for (var i = 0; i < f.length;) {
        if (f.charCodeAt(i) === 37/*'%'*/ && i + 1 < f.length) {
            switch (f.charCodeAt(i + 1)) {
                case 98: // 'b'
                    if (a >= argLen)
                        break;
                    if (lastPos < i)
                        str += f.slice(lastPos, i);
                    str += '[' + String(arguments[a++]) + ']';
                    lastPos = i = i + 2;
                    continue;
                case 100: // 'd'
                    if (a >= argLen)
                        break;
                    if (lastPos < i)
                        str += f.slice(lastPos, i);
                    str += Number(arguments[a++]);
                    lastPos = i = i + 2;
                    continue;
                case 106: // 'j'
                    if (a >= argLen)
                        break;
                    if (lastPos < i)
                        str += f.slice(lastPos, i);
                    str += tryStringify(arguments[a++]);
                    lastPos = i = i + 2;
                    continue;
                case 115: // 's'
                    if (a >= argLen)
                        break;
                    if (lastPos < i)
                        str += f.slice(lastPos, i);
                    str += String(arguments[a++]);
                    lastPos = i = i + 2;
                    continue;
                case 37: // '%'
                    if (lastPos < i)
                        str += f.slice(lastPos, i);
                    str += '%';
                    lastPos = i = i + 2;
                    continue;
            }
        }
        ++i;
    }
    if (lastPos === 0)
        str = f;
    else if (lastPos < f.length)
        str += f.slice(lastPos);
    while (a < argLen) {
        const x = arguments[a++];
        if (x === null || (typeof x !== 'object' && typeof x !== 'symbol')) {
            str += ' ' + x;
        } else {
            str += ' ' + util.inspect(x);
        }
    }
    //return str;
    return {
        text: str,
        argCount: a-1
    };
};
