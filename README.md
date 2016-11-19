# zlog



### Scope

This is a logger for nodeJs inspired by log4j used in Java.

zlog can define logger and child loggers.


### Principle

There are 4 main entities working together:

**Appenders**
Define your appenders. Appenders will append the logged message in a chosen format.
Appenders can be ConsoleAppender, FileAppender, customAppender.

**Loggers**
Define your logger with a name and a log level as well as which appenders they use.
Use the logger in your code.

**logManager**
The logManager helps you access and define your appenders and loggers.

**pattern**
Appenders will output the text in a pattern.
Ex: 12:13 myLogger INFO myText

**format**
Appenders will output the text following a format before including the text in the appender pattern.

    logger.info('Hello %b','you');

actually runs

    zlog.formatText('Hello %b','you')
    
Result: Hello [you]


### Basic scenario

A named logger shall be retrieved in the file containing the code to log.
Though it might be pratical to configure the logger from this file, best is to define appenders and loggers in a dedicated file of your application for quick access and overall vision of what and how all is logged.

    const zlog = require('zlog');
    var logger = zlog.getLogger('do.service');
    logger.info('Some info')'
    logger.debug('I am debugging')'

This will display the message to the console by default

In order to modify the log level:

    logger.setLevel('INFO');

or 

    zlog.setLogger('do.service','INFO');

set the log level


### Logging strategy

**Default appender**

if a logger does not have appenders, it will default to the parent loggers. If there is no parent logger. the rootLogger appender will be used.


**Default logger**

Using console.log, error, etc will output to the default logger named ROOT
which use the STDOUT console appender.

    zlog.setRootLogger('INFO');

This would set the default root logger level.


**Logger prioritization**

Ex: 

In the following example, myLogger would write the text in its appender.


    zlog.setLogger('myLogger','NONE',['MYAPPENDER']);
    zlog.setLogger('myLogger/childLogger','INFO');
    var logger = zlog.getLogger('myLogger/childLogger');
    logger.info('Hello world');

MyLogger has an appender. it will write the text because the child logger is set to a level.

if the rootLogger was set to NONE. It would also still write the text as force by the child logger level.

Ex 2:

In the following example, myLogger would not write anything.

    zlog.setLogger('myLogger','NONE',['MYAPPENDER']);
    zlog.setLogger('myLogger/childLogger');
    var logger = zlog.getLogger('myLogger/childLogger');
    logger.info('Hello world');

if the childLogger was NOT set with a level, it would write according to its ancestors logger levels.


Ex 3:

In the following example, myLogger would not write anything.

    zlog.setLogger('myLogger','ERROR',['MYAPPENDER']);
    zlog.setLogger('myLogger/childLogger');
    var logger = zlog.getLogger('myLogger/childLogger');
    logger.info('Hello world');

if the childLogger was not set with a level, it would write according to its ancestors logger levels.
In this example, myLogger would not write the text because the parent logger level is lower.


