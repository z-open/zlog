# zlog



### Scope

This is a logger for nodeJs inspired by log4j used in Java.



### Principle

There are 3 main entities working together:

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


### Use case

A named logger shall be retrieved in the file containing the code to log.
Though it might be pratical to configure the logger from this file, best is to define appenders and loggers in a dedicated file of your application for quick access and overall vision of what and how all is logged.

**Basic example**

    const zlog = require('zlog');
    var logger = zlog.getLogger('do.service');
    logger.info('Some info')'
    logger.debug('I am debugging')'

This will display the message to the console by default

    logger.setLevel('INFO');

or 

    zlog.setLogger('do.service','INFO');

set the log level

**Default appender**

if a logger does not have appenders, it will default to the console appender named STDOUT.


**Default logger**

Using console.log, error, etc will output to the default logger named ROOT
which use the STDOUT console appender.

    zlog.setRootLogger('INFO');

This would set the default root logger level.


