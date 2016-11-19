var zlog = require('../lib/zlog');
var stdout, appender;

describe('zlog', function () {

    beforeEach(function () {
        zlog.clear();
        stdout = zlog.getAppender('STDOUT');
        spyOn(stdout, 'writeLog').and.callThrough();
        appender = zlog.setCustomAppender('APPENDER', {
            writeLog: function () {
            }
        });
        spyOn(appender, 'writeLog').and.callThrough();

    });

    it('should NOT show the log on default console appender', function () {
        var logger = zlog.getLogger('myLogger');
        logger.info('Hello');
        expect(stdout.writeLog).not.toHaveBeenCalled();
    });

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

    it('should NOT show the log from child logger when parent logger lever lower and child has not defined level', function () {

        var logger = zlog.getLogger('myLogger');
        logger.addAppender('APPENDER');
        logger.setLevel('ERROR');
        var childLogger = zlog.getLogger('myLogger/myChild');
        childLogger.info('Hello');
        expect(appender.writeLog).not.toHaveBeenCalled();
    });


    it('should show the log from child logger when parent logger lever lower and child has a defined level', function () {

        var logger = zlog.getLogger('myLogger');
        logger.addAppender('APPENDER');
        logger.setLevel('ERROR');
        var childLogger = zlog.getLogger('myLogger/myChild');
        childLogger.setLevel('INFO');
        childLogger.info('Hello');
        expect(appender.writeLog).toHaveBeenCalled();
    });



    it('should show the log from child logger on console if parent has no appender', function () {

        var logger = zlog.getLogger('myLogger');
        var childLogger = zlog.getLogger('myLogger/myChild');
        childLogger.info('Hello');
        
         expect(stdout.writeLog).toHaveBeenCalled();
    });

});