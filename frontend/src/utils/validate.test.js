import {
    isRequired,
    validateEmail,
    validatePassword,
    validateName,
    validateRole,
    validateMinLength,
} from './validate';

describe('isRequired', () => {
    it('flags undefined, null, blank strings, and empty arrays', () => {
        expect(isRequired(undefined, 'Field')).toBe('Field is required.');
        expect(isRequired(null, 'Field')).toBe('Field is required.');
        expect(isRequired('   ', 'Field')).toBe('Field is required.');
        expect(isRequired([], 'Field')).toBe('Field is required.');
    });

    it('passes for non-empty strings, arrays, and other values', () => {
        expect(isRequired('value')).toBe('');
        expect(isRequired(['a'])).toBe('');
        expect(isRequired(0)).toBe('');
        expect(isRequired(false)).toBe('');
    });
});

describe('validateEmail', () => {
    it('requires a value', () => {
        expect(validateEmail('')).toMatch(/required/i);
    });

    it('rejects malformed emails', () => {
        expect(validateEmail('not-an-email')).toMatch(/valid email/i);
    });

    it('accepts a well-formed email', () => {
        expect(validateEmail('user@example.com')).toBe('');
    });
});

describe('validatePassword', () => {
    it('requires a value', () => {
        expect(validatePassword('')).toMatch(/required/i);
    });

    it('rejects short passwords', () => {
        expect(validatePassword('1234567')).toMatch(/at least 8/i);
    });

    it('accepts a password of sufficient length', () => {
        expect(validatePassword('password1')).toBe('');
    });
});

describe('validateName', () => {
    it('requires a value', () => {
        expect(validateName('')).toMatch(/required/i);
    });

    it('rejects names with digits or symbols', () => {
        expect(validateName('John123')).toMatch(/can only contain/i);
    });

    it('accepts names with letters, spaces, hyphens, and apostrophes', () => {
        expect(validateName("Mary-Jane O'Brien")).toBe('');
    });
});

describe('validateRole', () => {
    it('requires a value', () => {
        expect(validateRole('')).toMatch(/required/i);
    });

    it('rejects a role outside the allowed set', () => {
        expect(validateRole('superuser')).toMatch(/must be one of/i);
    });

    it.each(['admin', 'operator', 'mechanic'])('accepts the valid role "%s"', (role) => {
        expect(validateRole(role)).toBe('');
    });
});

describe('validateMinLength', () => {
    it('passes for non-string values', () => {
        expect(validateMinLength(undefined, 5, 'Field')).toBe('');
    });

    it('passes for an empty string (defers to isRequired elsewhere)', () => {
        expect(validateMinLength('', 5, 'Field')).toBe('');
    });

    it('rejects a string shorter than the minimum', () => {
        expect(validateMinLength('ab', 5, 'Field')).toMatch(/at least 5/i);
    });

    it('accepts a string meeting the minimum length', () => {
        expect(validateMinLength('abcde', 5, 'Field')).toBe('');
    });
});
