/**
 *
 *
 *  @param <string> logText - if logText contains %b it will be replaced by the value provided in args.
 *  @param <array> args - Args will be displayed within the log text is matching %b otherwise outside
 *
 */
'use strict';

const moment = require('moment-timezone');
const formatting = require('./format-text.js').formatting;
const _ = require('lodash');
module.exports = Pattern;

function Pattern(pattern) {
    this.format = format;

    function format(loggerName, logLevel, logText, args) {
        const time = moment().tz('America/New_York').format('YYYY-MM-DD hh:mm:ss z');
        loggerName = (loggerName + '                    ').substring(0, 20);
        logLevel = (logLevel.toUpperCase() + '     ').substring(0, 5);
        var appenderFmt = time + ' ' + logLevel + ' ' + loggerName + ' - ';
        
        // based on pattern we coult build the msg, and add argmument to msgs...maybe...
        var textFormat;
        if (_.isString(logText)) {
            textFormat = formatting.apply(this, _.concat([],logText,args));
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

