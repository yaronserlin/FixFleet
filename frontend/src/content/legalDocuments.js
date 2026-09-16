// src/content/legalDocuments.js

export const LEGAL_CONTACT_EMAIL = 'yaronserlindev@gmail.com';

export const TERMS_OF_SERVICE = {
    title: 'Terms of Service',
    lastUpdated: 'September 2026',
    version: '1.2',
    sections: [
        {
            heading: '1. Acceptance of Terms',
            content: `By registering for, accessing, or using the Maintenance System Application ("the Service"), you ("User", "Administrator", or "Company") agree to be bound by these Terms of Service. If you are registering an account on behalf of a company, organization, or other legal entity, you represent and warrant that you have full legal authority to bind that entity to these terms. If you do not agree to these terms, you must not access or use the Service.`
        },
        {
            heading: '2. Description of the Service',
            content: `The Service provides an enterprise maintenance and equipment asset management platform. Core features include equipment cataloging, scheduled preventive maintenance routines, fault logging, tool tracking, spare part inventory management, and technician work order assignments within isolated multi-tenant workspaces.`
        },
        {
            heading: '3. User Accounts, Roles, and Authentication Security',
            content: `• Company Administrator: The individual who registers the company is designated as an Administrator. Administrators are responsible for inviting and managing operator and mechanic accounts, ensuring that user permissions are properly configured.
• User Responsibilities: Users must keep credentials confidential. Operators and mechanics provided with temporary initial passwords must change their password upon first login and agree to these Terms and the Privacy Policy.
• Account Integrity: You agree to immediately notify management of any unauthorized access, breach of security, or compromised credentials.`
        },
        {
            heading: '4. Equipment Safety and Operational Responsibility Disclaimer',
            content: `The Service is provided strictly as a digital tracking, scheduling, and logging utility. The software does not replace physical inspection, certified mechanic evaluations, statutory equipment certifications, or manufacturer safety protocols. Each company and individual user remains solely responsible for the safe operation, physical condition, and regulatory compliance of all equipment, machinery, and tools.`
        },
        {
            heading: '5. Acceptable Use and Tenant Isolation',
            content: `Users agree not to:
• Interfere with or bypass tenant isolation barriers, security controls, or rate limits.
• Submit fraudulent, fabricated, or malicious fault logs or maintenance records.
• Upload malicious code, viruses, or inappropriate media files.
• Reverse engineer, decompile, or attempt to derive source code from the application.`
        },
        {
            heading: '6. Intellectual Property Rights',
            content: `All intellectual property rights in the software, interface design, algorithms, documentation, and trademarks belong to the Service providers. Your company retains all rights, title, and ownership in and to your company data and maintenance logs stored within your tenant partition.`
        },
        {
            heading: '7. Limitation of Liability',
            content: `To the maximum extent permitted by applicable law, the Service is provided on an "AS IS" and "AS AVAILABLE" basis without warranties of any kind. In no event shall the Service providers be liable for any indirect, incidental, punitive, or consequential damages—including loss of profits, equipment downtime, or operational disruption—arising out of or related to the use or inability to use the Service.`
        },
        {
            heading: '8. Termination',
            content: `We reserve the right to suspend or terminate access to any account or company tenant that violates these Terms or engages in activities harmful to the Service or other users. You may terminate your account at any time by contacting your company administrator or support.`
        },
        {
            heading: '9. Changes to Terms',
            content: `We may revise these Terms of Service periodically to reflect changes in regulatory standards or application features. Continued use of the Service following notifications of updates constitutes acceptance of the revised Terms.`
        },
        {
            heading: '10. Contact Information',
            content: `For questions regarding these Terms of Service, please contact ${LEGAL_CONTACT_EMAIL} or your designated system administrator.`
        }
    ]
};

export const PRIVACY_POLICY = {
    title: 'Privacy Policy',
    lastUpdated: 'September 2026',
    version: '1.2',
    sections: [
        {
            heading: '1. Information We Collect',
            content: `We collect information necessary to deliver and secure our maintenance management services:
• Account Information: Name, work email address, hashed passwords, assigned system role (Operator, Mechanic, Administrator), and optional profile avatars.
• Tenant & Company Data: Company name, organization slug, and tenant account status.
• Operational Data: Maintenance logs, equipment telemetry, fault descriptions, equipment service books, parts usage, and tool tracking notes.
• Technical Logs: IP addresses, browser types, session timestamps, and authentication tokens for audit trails and security monitoring.`
        },
        {
            heading: '2. How We Use Your Information',
            content: `Your information is utilized solely to:
• Authenticate users and enforce strict role-based access control.
• Ensure complete tenant isolation so that company records remain confidential and inaccessible to other organizations.
• Facilitate maintenance notifications, fault escalation, and equipment scheduling workflows.
• Prevent fraudulent activity, token misuse, and brute-force attacks.`
        },
        {
            heading: '3. Data Security and Tenant Isolation',
            content: `We employ industry-standard administrative, physical, and technical safeguards:
• Passwords are cryptographically salted and hashed using bcrypt.
• Authentication utilizes JSON Web Tokens (JWT) with automatic refresh token rotation and token reuse detection.
• Multi-tenant database architecture isolates each company's equipment, faults, and users with company-scoped indexing and query filtering.
• All data transmission across public networks is protected using secure HTTPS/TLS encryption.`
        },
        {
            heading: '4. Third-Party Sharing and Disclosures',
            content: `We do not sell, rent, or trade your personal or operational data to third parties or advertising networks. Data is only processed by essential cloud hosting and database infrastructure providers bound by strict confidentiality and data protection agreements.`
        },
        {
            heading: '5. Cookies and Local Storage',
            content: `The application uses strictly necessary HTTP cookies and local storage tokens:
• Session Cookies: HTTP-only, secure cookies used to maintain authenticated user sessions and refresh tokens safely.
• Application State: Local storage or memory storage for user interface preferences and session continuity.
We do not employ third-party tracking or advertising cookies.`
        },
        {
            heading: '6. Data Retention and Deletion',
            content: `Operational logs and account details are retained for as long as your company maintains an active tenant subscription. Administrators may request export or deletion of company user accounts and equipment histories upon contract termination in accordance with statutory compliance guidelines.`
        },
        {
            heading: '7. Your Privacy Rights',
            content: `Under applicable privacy and data protection laws, users have the right to:
• Access personal information held about them.
• Request correction of inaccurate personal details via profile settings or through their administrator.
• Request deletion of their personal user profile when no longer required for authorized operations.`
        },
        {
            heading: '8. Contact Our Privacy Office',
            content: `If you have questions, concerns, or requests regarding this Privacy Policy or how your data is handled, please contact our Data Protection Team at ${LEGAL_CONTACT_EMAIL}.`
        }
    ]
};
