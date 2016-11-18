
/**
 * Quick implementation of the file appender.
 *
 * 
 *
 * Note:
 * Add buffering, rotation. fix performance issue.
 */
const fs = require('fs'),
    moment = require('moment');

module.exports = FileAppender;

function FileAppender(path, clear) {
    if (clear) {
        fs.writeFile(path, '', function (err) {
            // if (err) {
            //     throw 'error opening file: ' + err;
            // }
        });
    }

    this.writeLog = function (loggerName, logLevel, logText, params1) {
        write(logText);
        // also print the argument if any... should use stringify for object
        for (var n = 3; n < arguments.length; n++) {
            write(arguments[n]);
        }
    }

    function write(logText) {
        fs.appendFile(
            path,
            moment().format('h:mm:ss a ') + logText + '\n',
            function (err) {
                if (err) {
                    console.log('Appender error opening file ' + path + ' : ' + err);
                }
            });
    }
}