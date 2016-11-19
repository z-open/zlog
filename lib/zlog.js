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
    none: 10000
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
    setRootLogger('INFO', ['STDOUT']);
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
        if (appenderNames) {
            appenderNames.forEach(function (name) {
                logger.addAppender(name);
            });
        }

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

/**
 * when loggers define the appenders for a level, they cache them internally
 *
 * If a level is changed or appender is added, loggers must recalculate their cache to take in consideration the new configuration;
 */
function clearAllCache() {
    loggers.forEach(function (logger) {
        logger.clearCache();
    });
    clearCacheNeeded = false;
}


function Logger(loggerName) {
    var level,
        computedAppenders = {};
    var thisLogger = this;
    this.name = loggerName;
    this.debug = debug;
    this.error = error;
    this.info = info;
    this.warn = warn;
    this.writeLog = writeLog;
    this.setLevel = setLevel;
    this.getLevel = getLevel;
    this.hasLevel = hasLevel;
    this.getParent = getParent;
    this.appenders = [];
    this.clearCache = clearCache;
    this.addAppender = addAppender;
    this.getAppendersBasedOnLevel = getAppendersBasedOnLevel;


    function addAppender(name) {
        clearCacheNeeded = true;
        var appender = appenderMap[name];
        if (!appender) {
            throw new Error(formatText('Appender %b does not exist.', name));
        }
        thisLogger.appenders.push(appender);
    }

    function clearCache() {
        computedAppenders = {};
    }

    function hasLevel() {
        return !!level;
    }

    function setLevel(value) {
        clearCacheNeeded = true;
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
        var parent = getParent();
        if (!parent) {
            return null;//rootLogger.getLevel();
        }
        return parent.getLevel();
    }

    function getParent() {
        // after we found the parent, should set the parent in the object to speed up next access
        return findLoggerParent(thisLogger);
    }

    // write a log entry to all appenders of all related loggers
    function writeLog(logLevel, writeArgs) {

        var logName = loggerName || 'ROOT';

        // write the message to each appender no more than once!
        getAppendersBasedOnLevel(logLevel).forEach(function (appender) {

            var fmt = appender.pattern.format(logName, logLevel, writeArgs[0], _.slice(writeArgs, 1));

            var args = _.concat(logName, logLevel, fmt.message);
            // any more arguments ?
            if (fmt.otherArgs) {
                args = _.concat(args, fmt.otherArgs);
            }
            appender.writeLog.apply(this, args);
        });
    }

    /**
     * Look up which appenders will be used
     *
     */
    function getAppendersBasedOnLevel(logLevel) {
        if (clearCacheNeeded) {
            clearAllCache();
        }
        var appenders = computedAppenders[logLevel] || [];
        if (appenders.length !== 0) {
            return appenders
        }
        var output = false;
        var logger = thisLogger;
        var testLevel = logLevel;

        // if this logger has a level defined....it should apply on all logger appenders whatever they are
        // because we are forcing the output on all appenders.        
        if (logger.hasLevel() && logger.getParent()) {
            testLevel = logger.getParent().getLevel();
            output = true;
        }

        while (logger) {

            if ((logger === thisLogger && getLevelNumber(logger.getLevel()) <= getLevelNumber(logLevel)) ||
                (logger !== thisLogger && getLevelNumber(logger.getLevel()) <= getLevelNumber(testLevel))) {
                appenders = _.concat(appenders, logger.appenders);
            }
            logger = logger.getParent();
        }

        // if (appenders.length == 0 && getLevelNumber(rootLogger.level) <= getLevelNumber(logLevel)) {
        //     appenders.push(consoleAppender);
        // }

        return _.uniq(appenders);
    }

}

function getLevelNumber(levelName) {
    var n = LEVEL_MAP[levelName];
    return n || 0;
}


function findLoggerParent(logger) {
    if (rootLogger === logger) {
        return null;
    }
    var deep = true;

    var hierachy = getHierarchy(logger.name);
    var parent;
    for (var n = hierachy.length - 1; n >= 0 && !parent; n--) {
        parent = _.find(loggers, { name: hierachy[n] })
    }
    return parent || rootLogger;

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
