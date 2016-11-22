/**
 * similar to printf concept.
 *
 * If find a %b in the text, would replace by the argument if any.
 */
'use strict';

module.exports = {
    formatText,
    format
};

function format(text, param1, param2) {
    return formatText(text, Array.from(arguments, 1)).text;
}

/**
 *  format the text with the arguments provided.
 *  ('hello %b','world','you')
 *  -> 'hello [world]',1
 *
 *  Returns
 *  - the formatted text
 *  - the number of arguments used to format the text
 *
 */
function formatText(text, args) {
    var argCount = 0;
    var box = 0;
    for (var n = 0; box != -1 && n < args.length; n++) {
        box = text.indexOf('%b');
        if (box != -1) {
            text = text.substring(0, box) + '[' + args[n] + ']' + text.substring(box + 2);
            argCount++;
        }
    }
    return {
        text: text,
        argCount: argCount
    };
}