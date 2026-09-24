// src/content/legalDocuments.js

export const LEGAL_CONTACT_EMAIL = 'yaronserlindev@gmail.com';

export const TERMS_OF_SERVICE = {
    title: 'Terms of Service',
    lastUpdated: 'September 2026',
    version: '1.3',
    lang: 'en',
    dir: 'ltr',
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
            heading: '9. Governing Law and Jurisdiction',
            content: `These Terms of Service are governed by and construed in accordance with the laws of the State of Israel, without regard to conflict of law principles. Any dispute arising out of or relating to these Terms or the Service shall be subject to the exclusive jurisdiction of the competent courts of the State of Israel.`
        },
        {
            heading: '10. Changes to Terms',
            content: `We may revise these Terms of Service periodically to reflect changes in regulatory standards or application features. Continued use of the Service following notifications of updates constitutes acceptance of the revised Terms.`
        },
        {
            heading: '11. Contact Information',
            content: `For questions regarding these Terms of Service, please contact ${LEGAL_CONTACT_EMAIL} or your designated system administrator.`
        }
    ]
};

export const TERMS_OF_SERVICE_HE = {
    title: 'תנאי שימוש',
    lastUpdated: 'ספטמבר 2026',
    version: '1.3',
    lang: 'he',
    dir: 'rtl',
    sections: [
        {
            heading: '1. קבלת התנאים',
            content: `בהרשמה, בגישה או בשימוש באפליקציית ניהול התחזוקה ("השירות"), הנך ("משתמש", "מנהל" או "חברה") מסכים/ה להיות כפוף/ה לתנאי שימוש אלה. אם הנך נרשם/ת בשם חברה, ארגון או ישות משפטית אחרת, הנך מצהיר/ה ומתחייב/ת שיש לך סמכות חוקית מלאה להתחייב עבור אותה ישות לתנאים אלה. אם אינך מסכים/ה לתנאים אלה, אין לגשת לשירות או להשתמש בו.`
        },
        {
            heading: '2. תיאור השירות',
            content: `השירות מספק פלטפורמת ניהול תחזוקה ונכסי ציוד ארגונית. התכונות העיקריות כוללות קטלוג ציוד, תחזוקה מונעת מתוכננת, רישום תקלות, מעקב כלים, ניהול מלאי חלפים והקצאת עבודות לטכנאים, בתוך סביבות עבודה מבודדות לכל ארגון (ריבוי דיירים).`
        },
        {
            heading: '3. חשבונות משתמשים, תפקידים ואבטחת אימות',
            content: `• מנהל חברה: האדם הרושם את החברה מוגדר כמנהל. המנהלים אחראים להזמנה וניהול של חשבונות מפעילים ומכונאים, ולוודא שהרשאות המשתמשים מוגדרות כראוי.
• אחריות המשתמש: משתמשים חייבים לשמור על סודיות פרטי ההתחברות. מפעילים ומכונאים שקיבלו סיסמה ראשונית זמנית חייבים להחליף אותה בכניסה הראשונה ולהסכים לתנאים אלה ולמדיניות הפרטיות.
• תקינות החשבון: הנך מתחייב/ת להודיע מיד להנהלה על כל גישה בלתי מורשית, פריצת אבטחה או פגיעה בפרטי ההתחברות.`
        },
        {
            heading: '4. הסרת אחריות לבטיחות ותפעול ציוד',
            content: `השירות מסופק אך ורק ככלי דיגיטלי למעקב, תזמון ותיעוד. התוכנה אינה תחליף לבדיקה פיזית, להערכת מכונאי מוסמך, לאישורים הנדרשים בדין או לנהלי הבטיחות של היצרן. כל חברה וכל משתמש נושאים באחריות הבלעדית להפעלה הבטוחה, למצבו הפיזי ולציות הרגולטורי של כל הציוד, המכונות והכלים.`
        },
        {
            heading: '5. שימוש מותר ובידוד דיירים',
            content: `המשתמשים מתחייבים שלא:
• להפריע או לעקוף את מחסומי בידוד הדיירים, מנגנוני האבטחה או מגבלות הקצב.
• להזין רישומי תקלות או תחזוקה מזויפים, מומצאים או זדוניים.
• להעלות קוד זדוני, וירוסים או קבצי מדיה בלתי הולמים.
• לבצע הנדסה לאחור, פירוק או ניסיון לגזור את קוד המקור של האפליקציה.`
        },
        {
            heading: '6. זכויות קניין רוחני',
            content: `כל זכויות הקניין הרוחני בתוכנה, בעיצוב הממשק, באלגוריתמים, בתיעוד ובסימני המסחר שייכות לספקי השירות. החברה שלך שומרת על כל הזכויות, הקניין והבעלות בנתוני החברה וביומני התחזוקה המאוחסנים במחיצת הדייר שלה.`
        },
        {
            heading: '7. הגבלת אחריות',
            content: `במידה המרבית המותרת בדין החל, השירות מסופק "כפי שהוא" (AS IS) ו"כפי שהוא זמין" ללא אחריות מכל סוג. בשום מקרה לא יישאו ספקי השירות בנזקים עקיפים, מקריים, עונשיים או תוצאתיים - לרבות אובדן רווחים, השבתת ציוד או שיבוש תפעולי - הנובעים מהשימוש בשירות או מאי היכולת להשתמש בו.`
        },
        {
            heading: '8. סיום התקשרות',
            content: `אנו שומרים לעצמנו את הזכות להשעות או לסיים את הגישה לכל חשבון או דייר חברה המפר תנאים אלה או עוסק בפעילות המזיקה לשירות או למשתמשים אחרים. באפשרותך לסיים את חשבונך בכל עת באמצעות פנייה למנהל החברה או לתמיכה.`
        },
        {
            heading: '9. דין חל וסמכות שיפוט',
            content: `תנאי שימוש אלה יהיו כפופים לדיני מדינת ישראל ויתפרשו בהתאם להם, מבלי להתחשב בכללי ברירת דין. כל מחלוקת הנובעת מתנאים אלה או הקשורה אליהם או לשירות תהיה בסמכות השיפוט הבלעדית של בתי המשפט המוסמכים במדינת ישראל.`
        },
        {
            heading: '10. שינויים בתנאים',
            content: `אנו רשאים לעדכן תנאי שימוש אלה מעת לעת בהתאם לשינויים בדרישות הרגולציה או בתכונות האפליקציה. המשך השימוש בשירות לאחר הודעה על העדכון מהווה הסכמה לתנאים המעודכנים.`
        },
        {
            heading: '11. פרטי יצירת קשר',
            content: `לשאלות בנוגע לתנאי שימוש אלה ניתן לפנות ל-${LEGAL_CONTACT_EMAIL} או למנהל המערכת המיועד בארגונך.`
        }
    ]
};

export const PRIVACY_POLICY = {
    title: 'Privacy Policy',
    lastUpdated: 'September 2026',
    version: '1.3',
    lang: 'en',
    dir: 'ltr',
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
            heading: '4. Third-Party Service Providers',
            content: `We do not sell, rent, or trade your personal or operational data to third parties or advertising networks. Data is processed only by the following essential infrastructure providers, each bound by confidentiality and data protection obligations:
• Render (cloud hosting) - hosts the application servers and processes all application traffic.
• MongoDB Atlas (database hosting) - stores account, company, and operational data.
• Web Push services - push notifications are delivered through your browser vendor's push service (for example Google, Mozilla, or Apple), which processes a device-specific push subscription identifier for that purpose.
These providers may process data outside of Israel; any such transfer is made in accordance with applicable data protection law.`
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
• Request deletion of their personal user profile when no longer required for authorized operations.
To exercise any of these rights, contact us at ${LEGAL_CONTACT_EMAIL}.`
        },
        {
            heading: '8. Contact Our Privacy Office',
            content: `If you have questions, concerns, or requests regarding this Privacy Policy or how your data is handled, please contact our Data Protection Team at ${LEGAL_CONTACT_EMAIL}.`
        }
    ]
};

export const PRIVACY_POLICY_HE = {
    title: 'מדיניות פרטיות',
    lastUpdated: 'ספטמבר 2026',
    version: '1.3',
    lang: 'he',
    dir: 'rtl',
    sections: [
        {
            heading: '1. מידע שאנו אוספים',
            content: `אנו אוספים את המידע הנדרש להפעלה ולאבטחה של שירותי ניהול התחזוקה:
• פרטי חשבון: שם, כתובת דוא"ל עבודה, סיסמה מגובבת (hashed), תפקיד מערכת (מפעיל, מכונאי, מנהל) ותמונת פרופיל אופציונלית.
• נתוני דייר וחברה: שם החברה, מזהה הארגון (slug) וסטטוס חשבון הדייר.
• נתונים תפעוליים: יומני תחזוקה, נתוני ציוד, תיאורי תקלות, ספרי ציוד, שימוש בחלפים והערות מעקב כלים.
• יומנים טכניים: כתובות IP, סוגי דפדפן, חותמות זמן של הפעלות ואסימוני אימות לצורכי ביקורת וניטור אבטחה.`
        },
        {
            heading: '2. כיצד אנו משתמשים במידע',
            content: `המידע משמש אך ורק לצורך:
• אימות משתמשים ואכיפת בקרת גישה מבוססת תפקידים.
• הבטחת בידוד מלא בין דיירים, כך שרשומות החברה נשארות חסויות ובלתי נגישות לארגונים אחרים.
• הפעלת התראות תחזוקה, הסלמת תקלות ותזמון ציוד.
• מניעת פעילות הונאה, שימוש לרעה באסימונים והתקפות כוח גס.`
        },
        {
            heading: '3. אבטחת מידע ובידוד דיירים',
            content: `אנו נוקטים אמצעי הגנה ארגוניים, פיזיים וטכניים המקובלים בתעשייה:
• סיסמאות מגובבות עם מלח (salt) באמצעות bcrypt.
• האימות מבוסס JSON Web Tokens (JWT) עם רוטציית אסימוני רענון אוטומטית וזיהוי שימוש חוזר באסימון.
• ארכיטקטורת ריבוי דיירים מבודדת את הציוד, התקלות והמשתמשים של כל חברה באמצעות אינדוקס וסינון לפי חברה.
• כל תעבורת הנתונים ברשתות ציבוריות מוגנת בהצפנת HTTPS/TLS.`
        },
        {
            heading: '4. ספקי שירות חיצוניים',
            content: `איננו מוכרים, משכירים או סוחרים במידע האישי או התפעולי שלך לצדדים שלישיים או לרשתות פרסום. המידע מעובד רק על ידי ספקי התשתית הבאים, החיוניים להפעלת השירות והמחויבים לסודיות ולהגנת מידע:
• Render (אחסון בענן) - מארח את שרתי האפליקציה ומעבד את כל תעבורת האפליקציה.
• MongoDB Atlas (אחסון בסיס נתונים) - מאחסן את נתוני החשבון, החברה והתפעול.
• שירותי Web Push - התראות push מועברות דרך שירות ה-push של ספק הדפדפן שלך (למשל גוגל, מוזילה או אפל), המעבד מזהה הרשמת push ייעודי למכשיר לצורך כך.
ספקים אלה עשויים לעבד מידע מחוץ לישראל; העברה כזו נעשית בהתאם לדין הגנת הפרטיות החל.`
        },
        {
            heading: '5. עוגיות ואחסון מקומי',
            content: `האפליקציה משתמשת בעוגיות HTTP הכרחיות בלבד ובאסימוני אחסון מקומי:
• עוגיות הפעלה: עוגיות HTTP-only מאובטחות לשמירת הפעלות מאומתות ואסימוני רענון.
• מצב אפליקציה: אחסון מקומי או אחסון בזיכרון להעדפות ממשק ולהמשכיות ההפעלה.
איננו משתמשים בעוגיות מעקב או פרסום של צדדים שלישיים.`
        },
        {
            heading: '6. שמירת מידע ומחיקה',
            content: `יומנים תפעוליים ופרטי חשבון נשמרים כל עוד החברה מחזיקה מנוי דייר פעיל. מנהלים רשאים לבקש ייצוא או מחיקה של חשבונות משתמשים והיסטוריית ציוד עם סיום ההתקשרות, בהתאם לדרישות החוק החלות.`
        },
        {
            heading: '7. זכויותיך בפרטיות',
            content: `על פי דיני הגנת הפרטיות החלים, למשתמשים הזכות:
• לעיין במידע האישי המוחזק לגביהם.
• לבקש תיקון של פרטים אישיים שגויים דרך הגדרות הפרופיל או באמצעות המנהל.
• לבקש מחיקה של פרופיל המשתמש האישי כאשר אינו נדרש עוד לתפעול מורשה.
למימוש זכויות אלה ניתן לפנות אלינו ב-${LEGAL_CONTACT_EMAIL}.`
        },
        {
            heading: '8. יצירת קשר בנושא פרטיות',
            content: `לשאלות, בירורים או בקשות בנוגע למדיניות פרטיות זו או לאופן הטיפול במידע שלך, ניתן לפנות לצוות הגנת הפרטיות שלנו ב-${LEGAL_CONTACT_EMAIL}.`
        }
    ]
};

export const ACCESSIBILITY_STATEMENT = {
    title: 'Accessibility Statement',
    lastUpdated: 'September 2026',
    version: '1.0',
    lang: 'en',
    dir: 'ltr',
    sections: [
        {
            heading: '1. Our Commitment',
            content: `We place great importance on making the Service accessible to people with disabilities and work to conform it to the Israeli standard SI 5568, based on WCAG 2.0 Level AA, in line with the Israeli Equal Rights for Persons with Disabilities Law and its regulations.`
        },
        {
            heading: '2. Accessibility Adjustments Made',
            content: `• Semantic structure and ARIA attributes across application screens, built on the Material-UI component library.
• Keyboard-operable controls, dialogs, and menus via standard accessible components.
• Color-contrast-conscious interface theme with light and dark modes.
• Responsive layout for different screen sizes and zoom levels.
• The legal documents on this page are available in English and Hebrew, with right-to-left display support.`
        },
        {
            heading: '3. Known Exceptions',
            content: `Despite our efforts, some content may not yet be fully accessible - for example, certain PDF documents displayed within the application. We continue to work on improving these areas.`
        },
        {
            heading: '4. Contact for Accessibility Requests',
            content: `If you encounter an accessibility problem or have a suggestion, please contact us at ${LEGAL_CONTACT_EMAIL}. We are committed to responding to accessibility inquiries within 14 days.`
        }
    ]
};

export const ACCESSIBILITY_STATEMENT_HE = {
    title: 'הצהרת נגישות',
    lastUpdated: 'ספטמבר 2026',
    version: '1.0',
    lang: 'he',
    dir: 'rtl',
    sections: [
        {
            heading: '1. המחויבות שלנו',
            content: `אנו רואים חשיבות רבה בהנגשת השירות לאנשים עם מוגבלות ופועלים להתאמתו לתקן הישראלי ת"י 5568 על בסיס WCAG 2.0 רמה AA, בהתאם לחוק שוויון זכויות לאנשים עם מוגבלות ותקנותיו.`
        },
        {
            heading: '2. ההתאמות שבוצעו',
            content: `• מבנה סמנטי ותכונות ARIA במסכי האפליקציה, המבוססת על ספריית הרכיבים Material-UI.
• פקדים, דיאלוגים ותפריטים הניתנים להפעלה במקלדת באמצעות רכיבים נגישים תקניים.
• ערכת ממשק עם תשומת לב לניגודיות צבעים, במצב בהיר ובמצב כהה.
• פריסה רספונסיבית לגדלי מסך ורמות זום שונים.
• המסמכים המשפטיים בעמוד זה זמינים באנגלית ובעברית, עם תמיכה בתצוגה מימין לשמאל.`
        },
        {
            heading: '3. חריגות ידועות',
            content: `למרות מאמצינו, ייתכן שחלק מהתכנים עדיין אינם נגישים במלואם - למשל, מסמכי PDF מסוימים המוצגים בתוך האפליקציה. אנו ממשיכים לפעול לשיפור תחומים אלה.`
        },
        {
            heading: '4. דרכי יצירת קשר לפניות נגישות',
            content: `אם נתקלת בבעיית נגישות או שיש לך הצעה לשיפור, ניתן לפנות אלינו ב-${LEGAL_CONTACT_EMAIL}. אנו מתחייבים להשיב לפניות נגישות בתוך 14 יום.`
        }
    ]
};

export const LEGAL_DOCS = {
    terms: { en: TERMS_OF_SERVICE, he: TERMS_OF_SERVICE_HE },
    privacy: { en: PRIVACY_POLICY, he: PRIVACY_POLICY_HE },
    accessibility: { en: ACCESSIBILITY_STATEMENT, he: ACCESSIBILITY_STATEMENT_HE },
};

export const getLegalDoc = (type, lang = 'en') =>
    (LEGAL_DOCS[type] && (LEGAL_DOCS[type][lang] || LEGAL_DOCS[type].en)) || TERMS_OF_SERVICE;
