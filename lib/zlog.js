/**
 * 
 *
 */
const fs = require('fs'),
    moment = require('moment');

const FileAppender = require('./file-appender.js'),
    ConsoleAppender = require('./console-appender.js'),
    Pattern = require('./pattern.js'),
    formatText = require('./format-text.js');

var loggers = [],
    appenderMap = {},
    rootLogger;

const LEVEL_MAP = {
    debug: 1,
    info: 2,
    warn: 3,
    error: 4,
    fatal: 5,
}

// default sonsole appender
var consoleAppender = setConsoleAppender('STDOUT', '%n %l %m');

// create the Root logger
setRootLogger('INFO');
reconfigureDefaultConsole();

module.exports = {
    getLogger,
    setLogger,
    setRootLogger,
    setFileAppender,
    setConsoleAppender,
    formatText
}

function setFileAppender(appenderName, path, format, clear) {
    return setAppender(appenderName, new FileAppender(path, clear), format);
}

function setConsoleAppender(appenderName, format) {
    return setAppender(appenderName, new ConsoleAppender(), format);
}

function setAppender(appenderName, appender, format) {
    appender.pattern = new Pattern(format);
    appenderMap[appenderName] = appender;
    return appender;
}

/**
 * Define here where all messages would go
 *
 * by default the rootLogger sends messages to the console
 *
 */
function setRootLogger(level, appenderNames) {
    if (!appenderNames) {
        appenderNames = ['STDOUT'];
    }
    rootLogger = setLogger(null, level, appenderNames);
}

/**
 * if appenderNames are not provided, the rootLogger appender will be used.
 *
 *
 */
function setLogger(name, level, appenderNames) {
    var logger = getLogger(name);
    logger.level = level.toLowerCase();

    logger.appenders = getAppenders(appenderNames);

    return logger;
}

function getLogger(loggerName) {
    var logger = _.find(loggers, { name: loggerName });
    if (!logger) {
        logger = new Logger(loggerName);
        loggers.push(logger);
    }
    return logger;
}

function getAppenders(appenderNames) {
    return _.map(appenderNames, function (name) {
        return appenderMap[name];
    })
}

function Logger(loggerName) {

    this.name = loggerName;
    this.debug = debug;
    this.error = error;
    this.info = info;
    this.warn = warn;
    this.level = null;
    this.setLevel = setLevel;
    this.appenders = [];

    this.addAppender = function (name) {
        this.appenders.push(appenderMap[name]);
    }

    function setLevel(value) {
        this.level = value ? value.toLowerCase() : null;
    }

    function debug(logText) {
        writeLog.call(this, 'debug', Array.from(arguments));
    }

    function error(logText) {
        writeLog.call(this, 'error', Array.from(arguments));
    }

    function info(logText) {
        writeLog.call(this, 'info', Array.from(arguments));
    }

    function warn(logText) {
        writeLog.call(this, 'warn', Array.from(arguments));
    }

    function fatal(logText) {
        writeLog.call(this, 'fatal', Array.from(arguments));
    }

    // write a log entry to all appenders of all related loggers
    function writeLog(logLevel, writeArgs) {
        var appenders = [];
        var output = false;
        var loggers = findLoggers(loggerName);
        // Collect the appenders allowed to output the log
        loggers.forEach(function (logger) {
            if (!logger.level || getLevelNumber(logger.level) <= getLevelNumber(logLevel)) {
                output = true;
                appenders = _.concat(appenders, logger.appenders);
            }
        });

        // make sure that if no appender is defined in logger with the correct level that the information is shown to the console        
        if (output && appenders.length == 0) {
            appenders.push(consoleAppender);
        }

        var logName = loggerName || 'ROOT';

        // write the message to each appender no more than once!
        _.uniq(appenders).forEach(function (appender) {

            var fmt = appender.pattern.format(logName, logLevel, writeArgs[0], _.slice(writeArgs, 1));

            var args = _.concat(logName, logLevel, fmt.message);
            // any more arguments ?
            if (fmt.otherArgs) {
                args = _.concat(args, fmt.otherArgs);
            }
            appender.writeLog.apply(this, args);
        });
    }

}

function getLevelNumber(levelName) {
    var n = LEVEL_MAP[levelName];
    return n || 0;
}

function findLoggers(loggerName) {
    return _.filter(loggers, function (logger) {
        // if logger has no name (it is root), so it logs everything
        // if another logger contains the loggerName within its name...it should apply too
        // ex one logger is 'app.view', other is 'app.view.stuff'. If logger name is app.view, both loggers should log...if it is app.view.stuff, only the latter.
        return !logger.name || loggerName === logger.name || _.startsWith(loggerName + '.', logger.name);
    });
}

function reconfigureDefaultConsole() {
    console.log = function () {
        rootLogger.info.apply(this, arguments);
    }
    console.error = function () {
        rootLogger.error.apply(this, arguments);
    }
}
