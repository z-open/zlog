/**
 * 
 *
 */
const fs = require('fs'),
    moment = require('moment'),
    _ = require('lodash');

const FileAppender = require('./file-appender.js'),
    ConsoleAppender = require('./console-appender.js'),
    Pattern = require('./pattern.js'),
    formatText = require('./format-text.js');

var loggers = [],
    appenderMap = {},
    rootLogger,
    consoleAppender;

const LEVEL_MAP = {
    debug: 1,
    info: 2,
    warn: 3,
    error: 4,
    fatal: 5,
}

clear();

module.exports = {
    getLogger,
    setLogger,
    setLoggers,
    setRootLogger,
    setFileAppender,
    setCustomAppender,
    setConsoleAppender,
    getAppender,
    formatText,
    clear
}
function clear() {
    loggers = [];
    appenderMap = {};
    rootLogger = null;

    // default sonsole appender
    consoleAppender = setConsoleAppender('STDOUT', '%n %l %m');
    // create the Root logger
    setRootLogger('INFO');
    reconfigureDefaultConsole();
}

function setFileAppender(appenderName, path, format, clear) {
    return setAppender(appenderName, new FileAppender(path, clear), format);
}

function setConsoleAppender(appenderName, format) {
    return setAppender(appenderName, new ConsoleAppender(), format);
}

function setCustomAppender(appenderName, implementation, format) {
    return setAppender(appenderName, implementation, format);
}


function setAppender(appenderName, appender, format) {
    appender.pattern = new Pattern(format);
    appenderMap[appenderName] = appender;
    return appender;
}

function getAppender(appenderName) {
    return appenderMap[appenderName];
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
    try {
        var logger = getLogger(name);
        logger.setLevel(level);

        logger.appenders = getAppenders(appenderNames);

        return logger;
    } catch (err) {
        err.message += formatText(' - Logger %b definition error', name);
        throw err;
    }
}

function setLoggers(names, level, appenderNames) {
    names.forEach(function (name) {
        setLogger(name, level, appenderNames);
    });
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
        var appender = appenderMap[name];
        if (!appender) {
            throw new Error(formatText('Appender %b does not exist.', name));
        }
        return appender;
    })
}

function Logger(loggerName) {
    var level;

    this.name = loggerName;
    this.debug = debug;
    this.error = error;
    this.info = info;
    this.warn = warn;
    this.writeLog = writeLog;
    this.setLevel = setLevel;
    this.getLevel = getLevel;
    this.appenders = [];


    this.addAppender = function (name) {
        this.appenders.push(appenderMap[name]);
    }

    function setLevel(value) {
        level = value ? value.toLowerCase() : null;
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

    function getLevel() {
        if (level) {
            return level;
        }
        // if a logger does not have a level, it will be the one of its parents, if it has no parent...it should be the one of rootLogger; so need to find the parent
        var parent = getParentLogger();
        if (!parent) {
            return rootLogger.getLevel();
        } else {
            parent.getLevel();
        }
    }

    function getParentLogger() {
        // after we found the parent, should set the parent in the object to speed up next access
        return null;
    }

    // write a log entry to all appenders of all related loggers
    function writeLog(logLevel, writeArgs) {
        var appenders = [];
        var output = false;
        var loggers = findLoggers(loggerName);

        //TODO
        // loggers should be here should be the loggers ancestors... don

        // Collect the appenders allowed to output the log
        loggers.forEach(function (logger) {
            // !logger.getLevel() || 
            if (getLevelNumber(logger.getLevel()) <= getLevelNumber(logLevel)) {
                output = true;
                appenders = _.concat(appenders, logger.appenders);
            }
        });


        // make sure that if no appender is defined in logger with the correct level that the information is still shown to the console if the root logger allows this level.        
        // if (output && appenders.length == 0 && getLevelNumber(rootLogger.level) <= getLevelNumber(logLevel)) {
        //     appenders.push(consoleAppender);
        // }

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
    var deep = true;

    // what we want
    // childLogger is moduleName.childName
    // parent logger is moduleName
    //
    // if the parent logger is debug
    // and child is info.
    // child.debug does nothin to any appenders

    // if the parent logger is info
    // and child is debug.
    // child.debug does print in itst appender not in parent appenders
    //        
    // however, child.info does print in its appender but also in the parent appender if parent logger is set to deep:true;
    // except if parent is set to warn or child is set to warn  

    // useful
    // if a child logger has no appender, the information will still be logged within its parent logger appenders without having to define in the child logger the same appenders of its parents.

    var hierachy = getHierarchy(loggerName);

    return _.filter(loggers, function (logger) {
        return loggerName === logger.name ||
            // is the logger parent ?
            (deep && _.indexOf(hierachy, logger.name) !== -1);
    });
}

function getHierarchy(loggerName) {
    if (!loggerName) {
        return [];
    }
    // if loggername is 'moduleName/something/otherthing'
    // should return
    // - moduleName/something
    // - moduleName
    var names = [];
    var p;
    while (p !== -1) {
        p = loggerName.indexOf('/');
        if (p !== -1) {
            names.push(loggerName.substring(0, p));
            loggerName = loggerName.substring(p + 1);
        }
    }
    //    console.log(names);
    return names;
}

function reconfigureDefaultConsole() {
    console.log = function () {
        rootLogger.info.apply(this, arguments);
    }
    console.error = function () {
        rootLogger.error.apply(this, arguments);
    }
}
