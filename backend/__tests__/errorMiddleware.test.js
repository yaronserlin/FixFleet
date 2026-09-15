const { errorHandler } = require('../middleware/errorMiddleware');
const logger = require('../utils/logger');

// Direct unit tests of the centralized error handler: call it as a plain
// function with mock req/res/next (no HTTP, no DB) so every branch --
// including the security-relevant expected-vs-unexpected error split -- is
// pinpointed rather than only exercised incidentally by HTTP integration
// tests.
describe('errorMiddleware.errorHandler', () => {
    let req;
    let res;
    let next;
    let warnSpy;
    let errorSpy;
    const originalNodeEnv = process.env.NODE_ENV;

    beforeEach(() => {
        req = { headers: {} };
        res = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn().mockReturnThis(),
        };
        next = jest.fn();
        warnSpy = jest.spyOn(logger, 'warn').mockImplementation(() => {});
        errorSpy = jest.spyOn(logger, 'error').mockImplementation(() => {});
    });

    afterEach(() => {
        warnSpy.mockRestore();
        errorSpy.mockRestore();
        process.env.NODE_ENV = originalNodeEnv;
    });

    it('handles a bad-JSON-body SyntaxError with 400', () => {
        const err = new SyntaxError('Unexpected token } in JSON');
        err.status = 400;
        err.body = '{bad json';

        errorHandler(err, req, res, next);

        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith({ message: 'Invalid JSON payload' });
        expect(warnSpy).toHaveBeenCalled();
    });

    it('does not treat a SyntaxError without a body/status as a bad-JSON error', () => {
        const err = new SyntaxError('some other syntax problem');
        // No `status` and no `body` property -- falls through to the generic 500 branch.
        errorHandler(err, req, res, next);

        expect(res.status).toHaveBeenCalledWith(500);
    });

    it('handles a Mongoose ValidationError with 400 and joined messages', () => {
        const err = {
            name: 'ValidationError',
            errors: {
                name: { message: 'Name is required' },
                email: { message: 'Email is invalid' },
            },
        };

        errorHandler(err, req, res, next);

        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith({ message: 'Name is required, Email is invalid' });
        expect(warnSpy).toHaveBeenCalled();
    });

    it('handles a Mongoose CastError with 400 and a field-specific message', () => {
        const err = { name: 'CastError', path: '_id', value: 'not-an-objectid' };

        errorHandler(err, req, res, next);

        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith({ message: 'Invalid _id: not-an-objectid' });
        expect(warnSpy).toHaveBeenCalled();
    });

    it('handles a MulterError with 400 and the multer-provided message', () => {
        const err = { name: 'MulterError', message: 'File too large' };

        errorHandler(err, req, res, next);

        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith({ message: 'File too large' });
        expect(warnSpy).toHaveBeenCalled();
    });

    it('handles a CORS rejection with 403 and logs the offending origin', () => {
        const err = new Error('Not allowed by CORS');
        req.headers.origin = 'http://evil.example.com';

        errorHandler(err, req, res, next);

        expect(res.status).toHaveBeenCalledWith(403);
        expect(res.json).toHaveBeenCalledWith({ message: 'CORS forbidden' });
        expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('http://evil.example.com'));
    });

    describe('service-thrown httpError (expected 4xx client errors)', () => {
        it('logs at warn and echoes the message for a plain 404', () => {
            const err = new Error('Equipment not found');
            err.status = 404;

            errorHandler(err, req, res, next);

            expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('Equipment not found'));
            expect(errorSpy).not.toHaveBeenCalled();
            expect(res.status).toHaveBeenCalledWith(404);
            expect(res.json).toHaveBeenCalledWith({ message: 'Equipment not found' });
        });

        it('echoes err.code when the throwing service set one', () => {
            const err = new Error('Compromised token detected');
            err.status = 403;
            err.code = 'TOKEN_REUSE_DETECTED';

            errorHandler(err, req, res, next);

            expect(res.status).toHaveBeenCalledWith(403);
            expect(res.json).toHaveBeenCalledWith({
                message: 'Compromised token detected',
                code: 'TOKEN_REUSE_DETECTED',
            });
        });

        it('never includes a `code` key when the error has none', () => {
            const err = new Error('Bad request');
            err.status = 400;

            errorHandler(err, req, res, next);

            const payload = res.json.mock.calls[0][0];
            expect(payload).not.toHaveProperty('code');
        });
    });

    describe('genuine server errors (5xx / unset status)', () => {
        it('logs at error level and echoes the real message outside production', () => {
            process.env.NODE_ENV = 'development';
            const err = new Error('Unexpected DB failure');

            errorHandler(err, req, res, next);

            expect(errorSpy).toHaveBeenCalledWith('Unhandled server error:', err);
            expect(warnSpy).not.toHaveBeenCalled();
            expect(res.status).toHaveBeenCalledWith(500);
            expect(res.json).toHaveBeenCalledWith({ message: 'Unexpected DB failure' });
        });

        it('masks the message with a generic string in production', () => {
            process.env.NODE_ENV = 'production';
            const err = new Error('Leaky internal detail: connection string xyz');

            errorHandler(err, req, res, next);

            expect(res.status).toHaveBeenCalledWith(500);
            expect(res.json).toHaveBeenCalledWith({ message: 'Server error' });
        });

        it('treats an explicit 500 status from a service as a genuine server error, not a warning', () => {
            process.env.NODE_ENV = 'development';
            const err = new Error('Something really broke');
            err.status = 500;

            errorHandler(err, req, res, next);

            expect(errorSpy).toHaveBeenCalled();
            expect(warnSpy).not.toHaveBeenCalled();
            expect(res.status).toHaveBeenCalledWith(500);
        });

        it('falls back to "Server error" in production even when err.message is empty', () => {
            process.env.NODE_ENV = 'production';
            const err = new Error();

            errorHandler(err, req, res, next);

            expect(res.json).toHaveBeenCalledWith({ message: 'Server error' });
        });
    });
});
