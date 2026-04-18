# כוכב של עצמאות

משחק קהילתי RTL בעברית ליום העצמאות עבור מושב כוכב מיכאל, בנוי ב-Next.js 15 עם חוויית מובייל-פירסט, זמן אמת, גלריית תמונות, לוח תוצאות, סאונד, ואזור אדמין נסתר.

## מה יש בפנים

- דף פתיחה עם hero מלא, הדרכה קצרה, כניסה למשחק, קישורים לגלריה וללוח התוצאות, ופיד אירועים חיים.
- משחק בזמן אמת עם 20 שאלות, 6 משימות צילום לאורך המסלול, ומשימת צילום קבוצתית בסוף.
- ניקוד מלא לפי החוקים שבבריף: תשובות, בונוסי מהירות, קומבו, משימות צילום, השלמת משחק והשלמת כל משימות הצילום.
- שחזור התקדמות אחרי רענון דרך `localStorage` + backend session.
- גלריה בזמן אמת עם lightbox מלא.
- לוח תוצאות חי עם הדגשת מקומות 1-3, חיפוש לפי שם, והדגשת השחקן הנוכחי.
- מסך סיכום חגיגי עם ניקוד, דירוג, משימות, תשובות נכונות ו"אנשים חדשים שפגשתי".
- פאנל אדמין סודי עם התחברות בסיסמה, snapshot מלא, ניהול שחקנים, ניהול תמונות, עריכת טקסטים, כיבוי/הדלקת סאונד גלובלי, ייצוא CSV והורדת QR.
- מצב `local demo` ללא Supabase, ומעבר אוטומטי ל-Supabase כשמגדירים env.

## סטאק

- Next.js 15
- React 19
- TypeScript
- Tailwind CSS 4
- Framer Motion
- Supabase (`postgres`, `realtime`, `storage`)
- Howler.js

## הרצה מקומית

```bash
npm install
npm run dev
```

אפליקציית הפיתוח תעלה ב-`http://localhost:3000`.

אם לא מוגדרים משתני Supabase, האפליקציה תעבוד ב-local mode עם DB קובצי ב-`data/local-db.json` שנוצר אוטומטית.

## בדיקות שבוצעו

```bash
npm run lint
npm run typecheck
npm run build
```

בנוסף בוצע smoke test ל-`/` ול-`/play` על שרת dev מקומי.

## קובצי סביבה

העתיקו את `env.example` ל-`.env.local` ומלאו:

```bash
NEXT_PUBLIC_APP_URL=http://localhost:3000

NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

ADMIN_PASSWORD=kochav-admin-2026
ADMIN_COOKIE_SECRET=replace-with-a-long-random-secret
ADMIN_ROUTE_SEGMENT=admin-secret-route
```

## הקמת Supabase

1. צרו פרויקט Supabase.
2. הריצו את `supabase/schema.sql` בתוך SQL Editor של Supabase.
3. מלאו את משתני הסביבה ב-`.env.local`.
4. הריצו:

```bash
npm run seed
```

ה-seed יכניס:

- 20 שאלות הבחירה המדויקות שסופקו
- 6 משימות צילום + משימת סיום
- טקסט פתיחה ופרסי מקומות 1-3

## מסלול אדמין

מסלול האדמין נקבע ע"י `ADMIN_ROUTE_SEGMENT`.

ברירת מחדל:

```text
/admin-secret-route
```

ההתחברות מגדירה עוגיית `httpOnly` חתומה.

## מבנה מסלולים

- `/`
- `/play`
- `/gallery`
- `/leaderboard`
- `/summary`
- `/${ADMIN_ROUTE_SEGMENT}`

## קבצים חשובים

- `src/lib/content/default-bank.ts` - בנק השאלות והמשימות בעברית
- `src/lib/data/index.ts` - מתאם בין local mode ל-Supabase
- `src/lib/data/local-repository.ts` - backend מקומי לקבצים
- `src/lib/data/supabase-repository.ts` - backend של Supabase
- `scripts/seed.ts` - seed של השאלות, המשימות וההגדרות
- `supabase/schema.sql` - schema מלא ל-Postgres / Realtime / Storage

## הערות יישום

- ה-header הממותג קבוע בכל המסכים עם לוגו המושב ודגל ישראל מהנכסים המקוריים.
- סדר השאלות מתערבב בכל ריצה חדשה.
- משימות הצילום נשמרות אחרי כל 3 שאלות, ומשימת הסיום מופיעה רק אחרי שאלה 20.
- העלאות תמונות עוברות דחיסה בצד הלקוח.
- אם העלאה נכשלת, נשמר תור העלאות מקומי ונעשה ניסיון חוזר.
- גלריה, לוח תוצאות והפיד הראשי מתעדכנים ע"י polling, וב-Supabase mode גם דרך subscriptions.
