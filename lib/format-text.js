/**
 * similar to printf concept.
 *
 * If find a %b in the text, would replace by the argument if any.
 */

module.exports = formatText;

function formatText(text, param1, param2) {
    var box = 0;
    for (var n = 1; box != -1 && n < arguments.length; n++) {
        box = text.indexOf('%b');
        if (box != -1) {
            text = text.substring(0, box) + '[' + arguments[n] + ']' + text.substring(box + 2);
        }
    }
    return text;
}
