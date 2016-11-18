/**
 *
 *  The console uses this appender by default;
 *
 *  could add some code for colors...
 *
 */
const fs = require('fs'),
    moment = require('moment');

var consoleError = console.error,
    consoleLog = console.log;


module.exports = ConsoleAppender;

function ConsoleAppender() {
    this.writeLog = function (loggerName, logLevel, logText, params1) {
        if (logLevel === 'error' || logLevel === 'fatal') {
            consoleError.apply(this, _.slice(Array.from(arguments), 2));
        } else {
            consoleLog.apply(this, _.slice(Array.from(arguments), 2));
        }
    }
}



