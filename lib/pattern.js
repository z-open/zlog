/**
 *
 *
 *  @param <string> logText - if logText contains %b it will be replaced by the value provided in args.
 *  @param <array> args - Args will be displayed within the log text is matching %b otherwise outside
 *
 */
const formatText = require('./format-text.js');
const _ = require('lodash');
module.exports = Pattern;

function Pattern(pattern) {
    this.format = format;

    function format(loggerName, logLevel, logText, args) {
        // based on pattern we coult build the msg, and add argmument to msgs...maybe...
        if (_.isString(logText)) {
            logText = formatText(logText, args);
        }    
        loggerName = (loggerName + '                    ').substring(0, 20);
        var appenderFmt = logLevel.toUpperCase() + ' ' + loggerName + ' - ' + logText;

        return {
            message: appenderFmt,
            otherArgs: args.length === 0 ? null : args
        };
    }
}

