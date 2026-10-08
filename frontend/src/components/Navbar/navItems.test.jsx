// src/components/Navbar/navItems.test.jsx
import { pageToPath, isPageActive } from './navItems';

describe('superadmin nav pages', () => {
    it('map to /superadmin sections', () => {
        expect(['Overview', 'Companies', 'Users', 'Audit Log'].map(pageToPath)).toEqual([
            '/superadmin', '/superadmin/companies', '/superadmin/users', '/superadmin/audit',
        ]);
    });

    it('highlight only the current section, not Overview on every sub-page', () => {
        expect(isPageActive('Users', '/superadmin/users')).toBe(true);
        expect(isPageActive('Overview', '/superadmin/users')).toBe(false);
        expect(isPageActive('Overview', '/superadmin')).toBe(true);
    });
});
