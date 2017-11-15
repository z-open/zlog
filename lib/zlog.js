/**
 * 
 *
 */
'use strict';

const fs = require('fs'),
    moment = require('moment'),
    _ = require('lodash');

const FileAppender = require('./file-appender.js'),
    ConsoleAppender = require('./console-appender.js'),
    Pattern = require('./pattern.js'),
    formatText = require('./format-text.js').format;

const LEVEL_MAP = {
    all: 0, // logger would log anything
    trace: 1,
    debug: 2,
    info: 3,
    warn: 4,
    error: 5,
    fatal: 6,
    mark: 10,
    none: 10000
};

var loggers,
    appenderMap,
    consoleAppender,
    rootLogger;

// Make sure that there is only one instance of zlog
// (require() does not garantee singleton)
if (!global.logEnv) {
    global.logEnv = {
        getLogger,
        setLogger,
        setLoggers,
        setRootLogger,
        setFileAppender,
        setCustomAppender,
        setConsoleAppender,
        getAppender,
        formatText,
        getLoggers,
        print,
        reset
    };
    init();
};






module.exports = global.logEnv;

/**
 *  provide available loggers and their current level
 *
 */
function getLoggers() {
    return _.sortBy(
        loggers.map(function (logger) {
            return {
                name: logger.name,
                level: logger.getLevel(),
                parent: logger.getParent() ? logger.getParent().name : ''
            };
        }),
        function (logger) {
            return logger.name.toUpperCase();
        });
}

/**
 * print to the console the logger statuses
 *
 */
function print() {
    getLoggers().forEach(function (logger) {
        consoleAppender.log(formatText('Logger %b: %b, parent:%b', logger.name, logger.level, logger.parent));
    });
}


function init() {
    loggers = [];
    appenderMap = {};
    rootLogger = null;

    // default sonsole appender
    consoleAppender = setConsoleAppender('STDOUT', '%n %l %m');
    // create the Root logger
    setRootLogger('INFO', ['STDOUT']);
    reconfigureDefaultConsole();
}

/**
 *  this removes the current log level configuration of all loggers
 */
function reset() {
    loggers.forEach(function (logger) {
        logger.setLevel(null);
    });
    rootLogger.setLevel('ALL');
}
//

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
    rootLogger = setLogger('ROOT', level, appenderNames);
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
            logger.clearAppenders();
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
 * if a parent logger is created after a child, the child must clear its computed parent...and recalculate
 * Note: needs to be parent based
 */
function clearAllCache(loggerName) {
    loggers.forEach(function (logger) {
        logger.clearCache();
    });
}


function Logger(loggerName) {
    var level,
        appenders = [],
        computedParent;

    var thisLogger = this;
    this.name = loggerName;

    this.writeLog = writeLog;
    this.setLevel = setLevel;
    this.getLevel = getLevel;
    this.hasLevel = hasLevel;
    this.getParent = getParent;
    this.clearCache = clearCache;
    this.addAppender = addAppender;
    this.getAppenders = getAppenders;
    this.clearAppenders = clearAppenders;

    _.forEach(LEVEL_MAP, function (value, key) {
        if (key !== 'none') {
            thisLogger[key] = function (logText) {
                writeLog.call(thisLogger, key, Array.from(arguments));
            }
        }
    })

    //   For now this is the solution to force the current logger to recalculate their cached parent   
    clearAllCache(loggerName);

    function clearAppenders() {
        appenders = [];        
    }

    function getAppenders() {
        return appenders;
    }

    function addAppender(name) {
        var appender = appenderMap[name];
        if (!appender) {
            throw new Error(formatText('Appender %b does not exist.', name));
        }
        appenders.push(appender);
    }

    function clearCache() {
        computedParent = null;
    }

    function hasLevel() {
        return level && level !== 'none';
    }

    function setLevel(value) {
        level = value ? value.toLowerCase() : null;
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
        var levelAppenders = [];
        var logger;

        // child level always overwrite parent levels
        // if the child does not allow, no appender even parents' ones won't show
        if (getLevelNumber(thisLogger.getLevel()) <= getLevelNumber(logLevel)) {
            logger = thisLogger;
            while (logger) {
                levelAppenders = _.concat(levelAppenders, logger.getAppenders()); logger = logger.getParent();
            }
        }

        // write the message to each appender no more than once!
        _.uniq(levelAppenders).forEach(function (appender) {

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
    var p = 0;
    while (p !== -1) {
        p = loggerName.indexOf('/', p);
        if (p !== -1) {
            names.push(loggerName.substring(0, p));
            // loggerName = loggerName.substring(p + 1);
            p++;
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
