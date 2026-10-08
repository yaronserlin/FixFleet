const fs = require('fs');
const path = require('path');
const { CURRENT_TERMS_VERSION } = require('../constants/auth');

// The backend can't import the frontend's ESM legal documents, so this keeps
// the two copies of the version from drifting apart. Only the documents
// accepted at signup count (the accessibility statement is versioned apart).
it('CURRENT_TERMS_VERSION matches the frontend terms and privacy versions', () => {
    const source = fs.readFileSync(path.join(__dirname, '../../frontend/src/content/legalDocuments.js'), 'utf8');
    const versions = source
        .split('export const ')
        .filter(block => /^(TERMS_OF_SERVICE|PRIVACY_POLICY)/.test(block))
        .map(block => block.match(/version:\s*'([^']+)'/)[1]);
    expect(versions).toHaveLength(4);
    versions.forEach(v => expect(v).toBe(CURRENT_TERMS_VERSION));
});
