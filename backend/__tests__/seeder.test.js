// __tests__/seeder.test.js
const { spawnSync } = require('child_process');
const path = require('path');

// F-3 regression: the seeder wipes every collection and creates demo
// accounts. It must flatly refuse to run when NODE_ENV=production, before
// opening any database connection.
describe('seeders/seeder.js production guard', () => {
    it('refuses to run with NODE_ENV=production', () => {
        const result = spawnSync(
            process.execPath,
            [path.join(__dirname, '..', 'seeders', 'seeder.js')],
            {
                env: {
                    ...process.env,
                    NODE_ENV: 'production',
                    // Unreachable URI: if the guard fails and it tries to
                    // connect, the test must not hang on a real database.
                    MONGO_URI: 'mongodb://127.0.0.1:1/seeder_guard_test',
                },
                timeout: 20000,
                encoding: 'utf8',
            }
        );

        const output = `${result.stdout || ''}${result.stderr || ''}`;
        expect(result.status).toBe(1);
        expect(output).toMatch(/refusing to seed/i);
        expect(output).not.toMatch(/MongoDB connected/);
    }, 30000);
});
