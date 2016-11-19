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
    all: 0, // logger would log anything
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
        appenders = [],
        computedAppenders = {},
        computedParent;

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
    this.clearCache = clearCache;
    this.addAppender = addAppender;
    this.getAppendersBasedOnLevel = getAppendersBasedOnLevel;


    function addAppender(name) {
        clearCacheNeeded = true;
        var appender = appenderMap[name];
        if (!appender) {
            throw new Error(formatText('Appender %b does not exist.', name));
        }
        appenders.push(appender);
    }

    function clearCache() {
        computedAppenders = {};
        computedParent = null;
    }

    function hasLevel() {
        return level && level !== 'none';
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

    /**
     * returns level of this logger
     *
     * if no level has been defined, get the level of its parents (recursive)
     *
     */
    function getLevel() {
        if (level) {
            return level;
        }
        // if a logger does not have a level, it will be the one of its parents, if it has no parent...it should be the one of rootLogger; so need to find the parent
        var parent = getParent();
        if (!parent) {
            return null;
        }
        return parent.getLevel();
    }

    /**
     *  get the parent of this logger
     *
     *  ex if logger is 'app/module/service/microService'
     *
     *  and there is an existing logger named 'app/module', that would be the parent
     *
     *  if no, parents are found....it would be the rootLogger
     *
     */
    function getParent() {
        if (!computedParent) {
            computedParent = findLoggerParent(thisLogger);
        }
        return computedParent;
    }

    /**
     * write a log entry to all appenders.
     *
     *  All parent loggers will be checked to see if their appenders - if any - should write the log.
     *
     *  Up to the rootLogger.
     *
     */
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
     * Parent logger appenders might be used too.
     *
     */
    function getAppendersBasedOnLevel(logLevel) {
        if (clearCacheNeeded) {
            clearAllCache();
        }
        var levelAppenders = computedAppenders[logLevel] || [];
        if (levelAppenders.length !== 0) {
            return levelAppenders
        }
        var output = false;
        var testLevel = logLevel;

        // if this logger has a level defined....it should apply on all logger appenders whatever they are
        // because we are forcing the output on all appenders.  

        if (logLevel === 'all' || getLevelNumber(thisLogger.getLevel()) <= getLevelNumber(logLevel)) {
            levelAppenders = _.concat(levelAppenders, appenders);
        }

        var parent = thisLogger.getParent();

        if (parent) {
            if (thisLogger.hasLevel() && parent) {
                // Get all parent appenders...and just write to all of them (bubble up the log)
                testLevel = 'all';
                //parent.getLevel(); // might have adverse effect....to see...
            }

            levelAppenders = _.concat(levelAppenders, parent.getAppendersBasedOnLevel(testLevel));
        }

        levelAppenders = _.uniq(levelAppenders);
        computedAppenders[logLevel] = levelAppenders;

        return levelAppenders;
    }

}

function getLevelNumber(levelName) {
    var n = LEVEL_MAP[levelName];
    return n || 0;
}

/**
 *  Check the logger name and find out if there is any defined parent loggers
 */
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


/**
 * figure out the names of the potential parent loggers
 *  if loggername is 'moduleName/something/otherthing'
 * should return
 * - moduleName/something
 * - moduleName
 */
function getHierarchy(loggerName) {
    if (!loggerName) {
        return [];
    }
    var names = [];
    var p;
    while (p !== -1) {
        p = loggerName.indexOf('/');
        if (p !== -1) {
            names.push(loggerName.substring(0, p));
            loggerName = loggerName.substring(p + 1);
        }
    }
    return names;
}

/**
 *
 *  set the default console to use the rootLogger
 *
 */
function reconfigureDefaultConsole() {
    console.log = function () {
        rootLogger.info.apply(this, arguments);
    }
    console.error = function () {
        rootLogger.error.apply(this, arguments);
    }
}
