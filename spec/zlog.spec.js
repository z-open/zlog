var zlog = require('../lib/zlog');
var stdout, appender, appender2;

describe('zlog', function () {

    beforeEach(function () {
        zlog.clear();
        stdout = zlog.getAppender('STDOUT');
        spyOn(stdout, 'writeLog');//.and.callThrough();

        appender = zlog.setCustomAppender('APPENDER', {
            writeLog: function () {
            }
        });

        spyOn(appender, 'writeLog');

        appender2 = zlog.setCustomAppender('APPENDER2', {
            writeLog: function () {
            }
        });

        spyOn(appender2, 'writeLog');

    });

    it('should show the log on default console appender', function () {
        var logger = zlog.getLogger('myLogger');
        logger.info('Hello');
        expect(stdout.writeLog).toHaveBeenCalled();
    });

    it('should show the log on default console appender when using console.log and level is info', function () {
        zlog.setRootLogger('INFO');
        console.log('hello');
        expect(stdout.writeLog).toHaveBeenCalled();
    });


    it('should NOT show the log on default console appender when set to NONE and using console', function () {
        zlog.setRootLogger('NONE');
        console.log('hello');
        expect(stdout.writeLog).not.toHaveBeenCalled();
    });

    it('should NOT show the log on default console appender when set to NONE', function () {
        zlog.setRootLogger('NONE');
        var logger = zlog.getLogger('myLogger');
        logger.info('Hello');
        expect(stdout.writeLog).not.toHaveBeenCalled();
    });


    it('should NOT show any log since all loggers are set to NONE', function () {
        zlog.setRootLogger('NONE');
        var logger = zlog.getLogger('myLogger');
        logger.addAppender('APPENDER');
        logger.setLevel('NONE');
        logger.debug('Hello');
        expect(stdout.writeLog).not.toHaveBeenCalled();
        expect(appender.writeLog).not.toHaveBeenCalled();
    });


    it('should show the log when logger and parent logger are set too low', function () {
        zlog.setRootLogger('ERROR');
        var logger = zlog.getLogger('myLogger');
        logger.addAppender('APPENDER');
        logger.setLevel('WARN');
        logger.debug('Hello');
        expect(stdout.writeLog).not.toHaveBeenCalled();
        expect(appender.writeLog).not.toHaveBeenCalled();

    });

    it('should NOT show the log in parent logger whatever its level when child is set to low', function () {
        zlog.setRootLogger('DEBUG');
        var logger = zlog.getLogger('myLogger');
        logger.addAppender('APPENDER');
        logger.setLevel('WARN');
        logger.debug('Hello');
        expect(stdout.writeLog).not.toHaveBeenCalled();
        expect(appender.writeLog).not.toHaveBeenCalled();

    })

    it('should show the log on appender', function () {

        var logger = zlog.getLogger('myLogger');
        logger.addAppender('APPENDER');
        logger.info('Hello');
        expect(appender.writeLog).toHaveBeenCalled();
    });

    it('should NOT show the log on appender when level is lower', function () {

        var logger = zlog.getLogger('myLogger');
        logger.addAppender('APPENDER');
        logger.setLevel('ERROR');
        logger.info('Hello');
        expect(appender.writeLog).not.toHaveBeenCalled();
    });

    it('should show the log from child logger', function () {

        var logger = zlog.getLogger('myLogger');
        logger.addAppender('APPENDER');
        var childLogger = zlog.getLogger('myLogger/myChild');
        childLogger.info('Hello');
        expect(appender.writeLog).toHaveBeenCalled();
    });

    it('should show the log from child logger when parent logger level is equal/higher and child has not defined level', function () {

        var logger = zlog.getLogger('myLogger');
        logger.addAppender('APPENDER');
        logger.setLevel('WARN');
        var childLogger = zlog.getLogger('myLogger/myChild');
        childLogger.error('Hello');
        expect(appender.writeLog).toHaveBeenCalled();
        childLogger.warn('Hello');
        expect(appender.writeLog).toHaveBeenCalledTimes(2);
    });

    it('should NOT show the log from child logger when parent logger level is lower and child has not defined level', function () {

        var logger = zlog.getLogger('myLogger');
        logger.addAppender('APPENDER');
        logger.setLevel('WARN');
        var childLogger = zlog.getLogger('myLogger/myChild');
        childLogger.info('Hello');
        expect(appender.writeLog).not.toHaveBeenCalled();
    });


    it('should show the log from child logger when parent logger level is lower and child has a defined level', function () {

        var logger = zlog.getLogger('myLogger');
        logger.addAppender('APPENDER');
        logger.setLevel('ERROR');
        var childLogger = zlog.getLogger('myLogger/myChild');
        childLogger.setLevel('INFO');
        childLogger.info('Hello');
        expect(appender.writeLog).toHaveBeenCalled();
    });


    it('should NOT show the log from child logger in parent logger appender nor in the child logger appender', function () {

        var logger = zlog.getLogger('myLogger');
        logger.addAppender('APPENDER');
        logger.setLevel('ERROR');
        var childLogger = zlog.getLogger('myLogger/myChild');
        childLogger.setLevel('INFO');
        childLogger.addAppender('APPENDER2');
        childLogger.debug('Hello');
        expect(appender.writeLog).not.toHaveBeenCalled();
        // but the appender2 should not have called since it only cares about INFO not debug
        expect(appender2.writeLog).not.toHaveBeenCalled();
    });


    it('should show the log from child logger on console if parent has no appender', function () {

        var logger = zlog.getLogger('myLogger');
        var childLogger = zlog.getLogger('myLogger/myChild');
        childLogger.info('Hello');

        expect(stdout.writeLog).toHaveBeenCalled();
    });

    it('should NOT show the log in root or parent loggers when child logger does not allow it', function () {
        zlog.setRootLogger('ALL');
        var logger = zlog.getLogger('myLogger');
        logger.addAppender('APPENDER');
        logger.setLevel('ERROR');
        var childLogger = zlog.getLogger('myLogger/myChild');
        childLogger.setLevel('INFO');
        childLogger.addAppender('APPENDER2');
        childLogger.debug('Hello');
        expect(stdout.writeLog).not.toHaveBeenCalled();
        expect(appender.writeLog).not.toHaveBeenCalled();
        expect(appender2.writeLog).not.toHaveBeenCalled();
    });

    it('should show the log in root or parent loggers whatever their level when child logger allows it', function () {
        zlog.setRootLogger('ALL');
        var logger = zlog.getLogger('myLogger');
        logger.addAppender('APPENDER');
        logger.setLevel('ERROR');
        var childLogger = zlog.getLogger('myLogger/myChild');
        childLogger.setLevel('INFO');
        childLogger.addAppender('APPENDER2');
        childLogger.info('Hello');
        expect(stdout.writeLog).toHaveBeenCalled();
        expect(appender.writeLog).toHaveBeenCalled();
        expect(appender2.writeLog).toHaveBeenCalled();
    });


    it('should show the log in root or parent loggers even when level is NONE when child logger allows it', function () {
        zlog.setRootLogger('NONE');
        var logger = zlog.getLogger('myLogger');
        logger.addAppender('APPENDER');
        logger.setLevel('NONE');
        var childLogger = zlog.getLogger('myLogger/myChild');
        childLogger.setLevel('INFO');
        childLogger.addAppender('APPENDER2');
        childLogger.info('Hello');
        expect(stdout.writeLog).toHaveBeenCalled();
        expect(appender.writeLog).toHaveBeenCalled();
        expect(appender2.writeLog).toHaveBeenCalled();
    });
    // NONE
    // - INFO - print debug
    // - DEBUG
    // - NONE
    // - ALL

    // -  - print debug
    // - DEBUG
    // - NONE
    // - ALL

});