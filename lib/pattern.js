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

/**
 * a pattern would help define the log format as where the information such as time, log level, logged text, logger name is placed
 * 
 * pattern could be a string
 * -------------------------
 * values 'short' and 'medium' declares default format
 * 
 * This is not implemented yet:
 * ex: '%tm[tz('America/New_York')fm('hh:mm:ss')] %ln[sl(5)] %lv[sl(20)] %tx(cs(u))'
 * - tm declares the time within the bracket: tz and fm (see moment tz and format)
 * - ln declares the logger name
 * - lv declares the log level 
 * - tx declares the logged text
 * 
 * each data can be formatted individually
 * - sl is the number of characters to display maximum
 * - cs is to set if the information is capitalize (u) or (l)
 * 
 * 
 * pattern could be a function receiving the following parameters
 * ---------------------------
 * loggerName, logLevel, formattedLogText, unformattedLog (Object containing unformatted text and its arguments)
 * 
 * 
 * @param {String or function} pattern 
 */
function Pattern(pattern) {
    this.format = format;
    let patternFn;
    
    if (_.isFunction(pattern)) {
        patternFn = pattern;
    } else {
        const availables = {
            LONG_FORMAT: longPatternFn,
            MEDIUM_FORMAT: mediumPatternFn,
            SHORT_FORMAT: shortPatternFn
        };
        patternFn = availables[pattern] || mediumPatternFn;
    }

    function longPatternFn(loggerName, logLevel, formattedLogText, unformattedLog) {
        const time = moment().tz('America/New_York').format('YYYY-MM-DD hh:mm:ss A z');        
        return time + ' ' + limit(logLevel.toUpperCase(),5) + ' ' + limit(loggerName,34) + ' - ' + formattedLogText;
    }

    function mediumPatternFn(loggerName, logLevel, formattedLogText, unformattedLog) {
        const time = moment().tz('America/New_York').format('hh:mm:ss A');
        return time + ' ' + limit(logLevel.toUpperCase(),5) + ' ' + limit(loggerName,24) + ' - ' + formattedLogText;
    }

    function shortPatternFn(loggerName, logLevel, formattedLogText, unformattedLog) {
        return limit(logLevel.toUpperCase(),5) + ' ' + limit(loggerName,24) + ' - ' + formattedLogText;
    }

    function limit(str, length) {
        if (!str) return '';
        if (str.length >= length) {
            return str.substring(0, length);
        }
        return str + Array(length - str.length + 1).join(' ');
    }

    function format(loggerName, logLevel, logText, args) {
        // based on pattern we coult build the msg, and add argmument to msgs...maybe...
        var textFormat;
        if (_.isString(logText)) {
            textFormat = formatting.apply(this, _.concat([], logText, args));
            return {
                message: patternFn(loggerName, logLevel, textFormat.text, { text: textFormat.text, args}),
                // revise otherArgs
                otherArgs: _.drop(args, textFormat.argCount)
            };
        }
        return {
            message: patternFn(loggerName, logLevel, '', { text:' ', args: []}),
            otherArgs: _.concat(args, logText)
        };
    }
}

