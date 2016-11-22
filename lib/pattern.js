/**
 *
 *
 *  @param <string> logText - if logText contains %b it will be replaced by the value provided in args.
 *  @param <array> args - Args will be displayed within the log text is matching %b otherwise outside
 *
 */
const formatText = require('./format-text.js').formatText;
const _ = require('lodash');
module.exports = Pattern;

function Pattern(pattern) {
    this.format = format;

    function format(loggerName, logLevel, logText, args) {

        loggerName = (loggerName + '                    ').substring(0, 20);
        logLevel = (logLevel.toUpperCase() + '     ').substring(0, 5);
        var appenderFmt = logLevel + ' ' + loggerName + ' - ';
        
        // based on pattern we coult build the msg, and add argmument to msgs...maybe...
        var textFormat;
        if (_.isString(logText)) {
            textFormat = formatText(logText, args);
            return {
                message: appenderFmt + textFormat.text,
                otherArgs: _.drop(args, textFormat.argCount)
            };

        }
        return {
            message: appenderFmt,
            otherArgs: _.concat(args, logText)
        };




    }
}

