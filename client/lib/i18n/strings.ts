import type { Lang } from "./languages";

/*
 * Every word the GreenPath screens show, in each language.
 *
 * Hebrew is the source: its shape is the type every other language must
 * match, so a missing or misspelled key in Arabic or English fails
 * `npm run typecheck`. To add text: add it to `he`, then to `ar` and `en`.
 *
 * Read it anywhere with:  import { t } from "@/lib/i18n";  t.nav.map
 */

const he = {
  appName: "המסלול הירוק",
  partners: "בשיתוף הסדנא לידע ציבורי ויער עירוני דיגיטלי",
  language: "שפה",
  nav: {
    map: "מפה",
    collection: "האוסף שלי",
    signIn: "כניסה",
    signOut: "יציאה",
  },
  stub: {
    next: "המשך",
    figma: "הסקיצה ב-Figma",
  },
  actions: {
    toDestination: "ליעד",
    freeWalk: "הליכה חופשית",
    myCollection: "האוסף שלי",
    findRoute: "מצאו מסלול",
    setOff: "יוצאים לדרך",
    stopHere: "עצרו כאן",
    report: "דיווח",
    finish: "סיום",
    backToNavigation: "חזרה לניווט",
    photograph: "צלמו את העץ",
    skip: "דלגו",
    continue: "המשך",
    backToMap: "חזרה למפה",
  },
  mobileOnly: {
    title: "הניווט זמין בטלפון",
    body: "ניווט צעד אחר צעד עובד רק בטלפון. פתחו את המסלול הירוק בדפדפן של הטלפון כדי לצאת לדרך.",
  },
  notFound: {
    title: "הדף לא נמצא",
    body: "הכתובת שחיפשתם לא קיימת.",
  },
  auth: {
    loading: "רגע...",
    title: "כניסה",
    intro:
      "נכנסים עם מפתח גישה (passkey): טביעת אצבע, זיהוי פנים או קוד המכשיר. בלי סיסמה.",
    emailLabel: "אימייל",
    emailHelp: "משמש רק לשחזור החשבון. לא מוצג לאף אחד.",
    signIn: "כניסה עם מפתח גישה",
    noAccount: "אין לכם חשבון?",
    createAccount: "יצירת חשבון",
    lostPasskey: "איבדתם את מפתח הגישה, או נכנסים ממכשיר חדש?",
    recover: "שחזור דרך האימייל",
    signUpTitle: "יצירת חשבון",
    signUpIntro:
      "נשלח לכם אימייל עם קישור כניסה. האימייל משמש רק לשחזור החשבון, ואף אחד לא יראה אותו.",
    recoverTitle: "שחזור החשבון",
    recoverIntro:
      "נשלח קישור לאימייל של החשבון, ואז תיצרו מפתח גישה חדש במכשיר הזה.",
    sendCode: "שליחת אימייל",
    codeTitle: "בדקו את האימייל",
    codeSent:
      "אם יש חשבון עם הכתובת הזו, שלחנו אליה אימייל. פתחו את הקישור שבו במכשיר הזה, או הקלידו כאן את הקוד אם יש בו קוד.",
    codeLabel: "הקוד מהאימייל (אם יש)",
    verify: "אישור",
    resend: "שליחה מחדש",
    resent: "שלחנו קוד חדש.",
    back: "חזרה",
    usernameTitle: "זה השם שלכם",
    usernameIntro:
      "כך אחרים יראו אתכם באפליקציה. השם נבחר באקראי כדי לשמור על הפרטיות שלכם.",
    usernameLabel: "שם המשתמש שלכם",
    reroll: "שם אחר",
    continue: "המשך",
    passkeyTitle: "יצירת מפתח גישה",
    passkeyIntro: "בפעם הבאה תיכנסו עם טביעת אצבע, זיהוי פנים או קוד המכשיר.",
    createPasskey: "יצירת מפתח גישה",
    addPasskey: "הוספת מפתח גישה",
    addPasskeyTitle: "מפתח גישה נוסף",
    addPasskeyIntro:
      "אפשר מפתח גישה בכל מכשיר: הטלפון, המחשב או מפתח אבטחה. כל אחד מהם יכניס אתכם לאותו חשבון.",
    finishSetup: "השלמת ההרשמה",
    signedInAs: "מחוברים בתור",
    notSetUpTitle: "Supabase עוד לא מוגדר",
    notSetUpBody:
      "העתיקו את .env.example ל-.env ומלאו את הערכים. ההוראות ב-docs/02-supabase-setup.markdown.",
    support: {
      unsupported:
        "הדפדפן הזה לא תומך במפתחות גישה. נסו גרסה עדכנית של Chrome, Safari, Edge או Firefox.",
      insecure:
        "מפתחות גישה עובדים רק בחיבור מאובטח (https). פתחו את האתר בכתובת https.",
    },
    errors: {
      cancelled: "הכניסה בוטלה או שעבר הזמן. נסו שוב.",
      alreadyRegistered: "כבר יש מפתח גישה לחשבון הזה במכשיר הזה.",
      unknownPasskey:
        "מפתח הגישה הזה לא מוכר. אולי הוא נמחק? אפשר לשחזר את החשבון עם קוד באימייל.",
      expired: "עבר יותר מדי זמן. נסו שוב.",
      verificationFailed:
        "לא הצלחנו לאמת את מפתח הגישה. נסו שוב, או נסו מנהל סיסמאות אחר.",
      passkeysOff: "הכניסה עם מפתחות גישה כבויה כרגע.",
      wrongSite: "מפתחות הגישה לא מוגדרים לכתובת הזו.",
      badCode: "הקוד שגוי או שפג תוקפו. בקשו קוד חדש.",
      badEmail: "כתובת האימייל לא תקינה.",
      tooManyTries: "יותר מדי ניסיונות. חכו כמה דקות ונסו שוב.",
      wrongAccount:
        "מפתח הגישה הזה שייך לחשבון אחר. בחרו את המפתח של האימייל שהקלדתם.",
      tooManyPasskeys: "יש לחשבון כבר את המספר המרבי של מפתחות גישה.",
      linkFailed: "הקישור פג תוקף או שכבר השתמשו בו. בקשו חדש.",
      generic: "משהו השתבש. נסו שוב.",
    },
  },
  screens: {
    home: {
      title: "בית",
      purpose:
        "מפת הרחובות המוצלים סביבכם. מכאן מחפשים יעד או יוצאים להליכה חופשית.",
    },
    walk: {
      title: "כמה ללכת?",
      purpose:
        "בוחרים כמה ללכת, בצעדים, במרחק או בזמן, ומקבלים מסלול מוצל עם משימות בדרך.",
    },
    route: {
      title: "בחירת מסלול",
      purpose: "כמה מסלולים ליעד, לכל אחד זמן ואחוז צל. הכי מוצל מופיע ראשון.",
    },
    navigate: {
      title: "ניווט",
      purpose: "ניווט צעד אחר צעד דרך הצל: הפנייה הבאה, הזמן שנשאר ואחוז הצל.",
    },
    report: {
      title: "מה רואים כאן?",
      purpose: "דיווח בזמן הליכה: עץ שלא מופיע במפה, עץ חסר או עץ פגוע.",
    },
    stop: {
      title: "עצרו כאן",
      purpose: "עץ בדרך שצריך אימות: מה הוא, איפה הוא ותמונה להשוואה.",
    },
    capture: {
      title: "צילום",
      purpose: "מצלמים את כל העץ, ואחר כך את העלים. אפשר גם לסמן שאין כאן עץ.",
    },
    match: {
      title: "זה אותו עץ?",
      purpose: "משווים את הצילום שלכם לתמונה של סוג העץ: כן, לא או לא בטוח.",
    },
    summary: {
      title: "הגעתם",
      purpose: "סיכום ההליכה: מרחק, צעדים, אחוז צל ועצים שאימתתם.",
    },
    collection: {
      title: "האוסף שלי",
      purpose: "סוגי העצים שאספתם, והרחובות שעזרתם לאמת.",
    },
  },
};

export type Strings = typeof he;

const ar: Strings = {
  appName: "المسار الأخضر",
  partners: "بالتعاون مع ورشة المعرفة العامة والغابة الحضرية الرقمية",
  language: "اللغة",
  nav: {
    map: "الخريطة",
    collection: "مجموعتي",
    signIn: "تسجيل الدخول",
    signOut: "تسجيل الخروج",
  },
  stub: {
    next: "التالي",
    figma: "المخطط في Figma",
  },
  actions: {
    toDestination: "إلى وجهة",
    freeWalk: "نزهة حرة",
    myCollection: "مجموعتي",
    findRoute: "ابحثوا عن مسار",
    setOff: "انطلقوا",
    stopHere: "توقفوا هنا",
    report: "إبلاغ",
    finish: "إنهاء",
    backToNavigation: "العودة إلى الملاحة",
    photograph: "صوّروا الشجرة",
    skip: "تخطّوا",
    continue: "متابعة",
    backToMap: "العودة إلى الخريطة",
  },
  mobileOnly: {
    title: "الملاحة متاحة على الهاتف",
    body: "الملاحة خطوة بخطوة تعمل على الهاتف فقط. افتحوا المسار الأخضر في متصفح الهاتف للانطلاق.",
  },
  notFound: {
    title: "الصفحة غير موجودة",
    body: "العنوان الذي تبحثون عنه غير موجود.",
  },
  auth: {
    loading: "لحظة...",
    title: "تسجيل الدخول",
    intro:
      "ادخلوا بمفتاح مرور (passkey): بصمة الإصبع أو التعرّف على الوجه أو رمز الجهاز. بلا كلمة مرور.",
    emailLabel: "البريد الإلكتروني",
    emailHelp: "يُستخدم فقط لاستعادة الحساب. لا يظهر لأحد.",
    signIn: "الدخول بمفتاح مرور",
    noAccount: "ليس لديكم حساب؟",
    createAccount: "إنشاء حساب",
    lostPasskey: "فقدتم مفتاح المرور، أو تدخلون من جهاز جديد؟",
    recover: "الاستعادة عبر البريد",
    signUpTitle: "إنشاء حساب",
    signUpIntro:
      "سنرسل إليكم رسالة فيها رابط للدخول. يُستخدم البريد فقط لاستعادة الحساب، ولن يراه أحد.",
    recoverTitle: "استعادة الحساب",
    recoverIntro:
      "سنرسل رابطًا إلى بريد الحساب، ثم تنشئون مفتاح مرور جديدًا على هذا الجهاز.",
    sendCode: "إرسال الرسالة",
    codeTitle: "تحقّقوا من بريدكم",
    codeSent:
      "إذا كان هناك حساب بهذا العنوان، فقد أرسلنا إليه رسالة. افتحوا الرابط فيها على هذا الجهاز، أو اكتبوا الرمز هنا إن وُجد.",
    codeLabel: "الرمز من البريد (إن وُجد)",
    verify: "تأكيد",
    resend: "إعادة الإرسال",
    resent: "أرسلنا رمزًا جديدًا.",
    back: "رجوع",
    usernameTitle: "هذا اسمكم",
    usernameIntro:
      "هكذا سيراكم الآخرون في التطبيق. اخترنا الاسم عشوائيًا لحماية خصوصيتكم.",
    usernameLabel: "اسم المستخدم",
    reroll: "اسم آخر",
    continue: "متابعة",
    passkeyTitle: "إنشاء مفتاح مرور",
    passkeyIntro:
      "في المرة القادمة ستدخلون ببصمة الإصبع أو التعرّف على الوجه أو رمز الجهاز.",
    createPasskey: "إنشاء مفتاح مرور",
    addPasskey: "إضافة مفتاح مرور",
    addPasskeyTitle: "مفتاح مرور إضافي",
    addPasskeyIntro:
      "يمكنكم إضافة مفتاح مرور لكل جهاز: الهاتف أو الحاسوب أو مفتاح أمان. كلٌّ منها يُدخلكم إلى الحساب نفسه.",
    finishSetup: "إكمال التسجيل",
    signedInAs: "متصلون باسم",
    notSetUpTitle: "لم يتم إعداد Supabase بعد",
    notSetUpBody:
      "انسخوا ‎.env.example‎ إلى ‎.env‎ واملؤوا القيم. التعليمات في docs/02-supabase-setup.markdown.",
    support: {
      unsupported:
        "هذا المتصفح لا يدعم مفاتيح المرور. جرّبوا إصدارًا حديثًا من Chrome أو Safari أو Edge أو Firefox.",
      insecure:
        "تعمل مفاتيح المرور فقط عبر اتصال آمن (https). افتحوا الموقع بعنوان https.",
    },
    errors: {
      cancelled: "أُلغي الدخول أو انتهى الوقت. حاولوا مرة أخرى.",
      alreadyRegistered: "يوجد مفتاح مرور لهذا الحساب على هذا الجهاز بالفعل.",
      unknownPasskey:
        "مفتاح المرور هذا غير معروف. ربما حُذف؟ يمكنكم استعادة الحساب برمز عبر البريد.",
      expired: "مرّ وقت طويل. حاولوا مرة أخرى.",
      verificationFailed:
        "لم نتمكن من التحقق من مفتاح المرور. حاولوا مرة أخرى، أو جرّبوا مدير كلمات مرور آخر.",
      passkeysOff: "الدخول بمفاتيح المرور متوقف حاليًا.",
      wrongSite: "مفاتيح المرور غير مُعدّة لهذا العنوان.",
      badCode: "الرمز خاطئ أو انتهت صلاحيته. اطلبوا رمزًا جديدًا.",
      badEmail: "عنوان البريد الإلكتروني غير صالح.",
      tooManyTries: "محاولات كثيرة جدًا. انتظروا بضع دقائق ثم حاولوا مرة أخرى.",
      wrongAccount:
        "مفتاح المرور هذا يخص حسابًا آخر. اختاروا مفتاح البريد الذي كتبتموه.",
      tooManyPasskeys: "وصل الحساب إلى الحد الأقصى من مفاتيح المرور.",
      linkFailed: "انتهت صلاحية الرابط أو سبق استخدامه. اطلبوا رابطًا جديدًا.",
      generic: "حدث خطأ ما. حاولوا مرة أخرى.",
    },
  },
  screens: {
    home: {
      title: "الرئيسية",
      purpose:
        "خريطة الشوارع المظللة من حولكم. من هنا تبحثون عن وجهة أو تخرجون في نزهة حرة.",
    },
    walk: {
      title: "كم تريدون أن تمشوا؟",
      purpose:
        "اختاروا مقدار المشي بالخطوات أو المسافة أو الوقت، واحصلوا على مسار مظلل مع مهام على الطريق.",
    },
    route: {
      title: "اختيار المسار",
      purpose:
        "عدة مسارات إلى وجهتكم، لكل منها الوقت ونسبة الظل. الأكثر ظلًا يظهر أولًا.",
    },
    navigate: {
      title: "الملاحة",
      purpose:
        "ملاحة خطوة بخطوة عبر الظل: المنعطف التالي والوقت المتبقي ونسبة الظل.",
    },
    report: {
      title: "ماذا ترون هنا؟",
      purpose:
        "أبلغوا أثناء المشي: شجرة غير موجودة على الخريطة، أو شجرة مفقودة، أو شجرة متضررة.",
    },
    stop: {
      title: "توقفوا هنا",
      purpose: "شجرة في طريقكم تحتاج إلى تحقق: ما هي، وأين هي، وصورة للمقارنة.",
    },
    capture: {
      title: "التصوير",
      purpose:
        "صوّروا الشجرة كاملة ثم أوراقها. يمكنكم أيضًا الإشارة إلى عدم وجود شجرة هنا.",
    },
    match: {
      title: "هل هي الشجرة نفسها؟",
      purpose: "قارنوا صورتكم بصورة نوع الشجرة: نعم، لا، أو غير متأكد.",
    },
    summary: {
      title: "وصلتم",
      purpose:
        "ملخص المشي: المسافة والخطوات ونسبة الظل والأشجار التي تحققتم منها.",
    },
    collection: {
      title: "مجموعتي",
      purpose:
        "أنواع الأشجار التي جمعتموها، والشوارع التي ساعدتم في التحقق منها.",
    },
  },
};

const en: Strings = {
  appName: "GreenPath",
  partners: "With the Public Knowledge Workshop and the Digital Urban Forest",
  language: "Language",
  nav: {
    map: "Map",
    collection: "My collection",
    signIn: "Sign in",
    signOut: "Sign out",
  },
  stub: {
    next: "Next",
    figma: "Wireframe in Figma",
  },
  actions: {
    toDestination: "To a destination",
    freeWalk: "Free walk",
    myCollection: "My collection",
    findRoute: "Find a route",
    setOff: "Set off",
    stopHere: "Stop here",
    report: "Report",
    finish: "Finish",
    backToNavigation: "Back to navigation",
    photograph: "Photograph the tree",
    skip: "Skip",
    continue: "Continue",
    backToMap: "Back to the map",
  },
  mobileOnly: {
    title: "Navigation works on your phone",
    body: "Turn-by-turn navigation only works on a phone. Open GreenPath in your phone's browser to set off.",
  },
  notFound: {
    title: "Page not found",
    body: "The address you were looking for does not exist.",
  },
  auth: {
    loading: "One moment...",
    title: "Sign in",
    intro:
      "Sign in with a passkey: your fingerprint, face or device PIN. No password.",
    emailLabel: "Email",
    emailHelp: "Used only to recover your account. Never shown to anyone.",
    signIn: "Sign in with a passkey",
    noAccount: "No account yet?",
    createAccount: "Create an account",
    lostPasskey: "Lost your passkey, or on a new device?",
    recover: "Recover by email",
    signUpTitle: "Create an account",
    signUpIntro:
      "We'll email you a sign-in link. It is used only to recover your account, and nobody will see it.",
    recoverTitle: "Recover your account",
    recoverIntro:
      "We'll email a link to the account's address, then you'll make a new passkey on this device.",
    sendCode: "Send email",
    codeTitle: "Check your email",
    codeSent:
      "If there is an account with that address, we sent it an email. Open the link in it on this device, or type the code here if it has one.",
    codeLabel: "Code from the email (if it has one)",
    verify: "Confirm",
    resend: "Send again",
    resent: "We sent a new code.",
    back: "Back",
    usernameTitle: "This is your name",
    usernameIntro:
      "This is how others see you in the app. It is picked at random to keep you private.",
    usernameLabel: "Your username",
    reroll: "Another name",
    continue: "Continue",
    passkeyTitle: "Create a passkey",
    passkeyIntro:
      "Next time you'll sign in with your fingerprint, face or device PIN.",
    createPasskey: "Create a passkey",
    addPasskey: "Add a passkey",
    addPasskeyTitle: "Another passkey",
    addPasskeyIntro:
      "You can have a passkey on every device: your phone, your computer or a security key. Each one signs in to the same account.",
    finishSetup: "Finish signing up",
    signedInAs: "Signed in as",
    notSetUpTitle: "Supabase is not set up yet",
    notSetUpBody:
      "Copy .env.example to .env and fill in the values. The instructions are in docs/02-supabase-setup.markdown.",
    support: {
      unsupported:
        "This browser does not support passkeys. Try an up-to-date Chrome, Safari, Edge or Firefox.",
      insecure:
        "Passkeys only work over a secure (https) connection. Open the site at its https address.",
    },
    errors: {
      cancelled: "Sign-in was cancelled or timed out. Try again.",
      alreadyRegistered: "This device already has a passkey for this account.",
      unknownPasskey:
        "That passkey isn't recognised. Was it deleted? You can recover your account with an email code.",
      expired: "That took too long. Try again.",
      verificationFailed:
        "We couldn't verify the passkey. Try again, or try a different password manager.",
      passkeysOff: "Passkey sign-in is switched off right now.",
      wrongSite: "Passkeys aren't set up for this address.",
      badCode: "That code is wrong or has expired. Ask for a new one.",
      badEmail: "That email address isn't valid.",
      tooManyTries: "Too many tries. Wait a few minutes and try again.",
      wrongAccount:
        "That passkey belongs to a different account. Pick the one for the email you typed.",
      tooManyPasskeys: "This account already has the most passkeys allowed.",
      linkFailed:
        "That link has expired or was already used. Ask for a new one.",
      generic: "Something went wrong. Try again.",
    },
  },
  screens: {
    home: {
      title: "Home",
      purpose:
        "A map of the shaded streets around you. Search for a destination or head out on a free walk from here.",
    },
    walk: {
      title: "How far to walk?",
      purpose:
        "Choose how far to walk, in steps, distance or time, and get a shaded route with tasks along the way.",
    },
    route: {
      title: "Choose a route",
      purpose:
        "A few routes to your destination, each with its time and share of shade. The shadiest comes first.",
    },
    navigate: {
      title: "Navigation",
      purpose:
        "Turn-by-turn through the shade: the next turn, the time left and the share of shade.",
    },
    report: {
      title: "What do you see here?",
      purpose:
        "Report while walking: a tree missing from the map, a tree that is gone, or a damaged tree.",
    },
    stop: {
      title: "Stop here",
      purpose:
        "A tree on your way that needs checking: what it is, where it is, and a photo to compare.",
    },
    capture: {
      title: "Photograph",
      purpose:
        "Photograph the whole tree, then its leaves. You can also mark that there is no tree here.",
    },
    match: {
      title: "Is it the same tree?",
      purpose:
        "Compare your photo with a picture of the tree type: yes, no, or not sure.",
    },
    summary: {
      title: "You made it",
      purpose:
        "Your walk in numbers: distance, steps, share of shade and the trees you checked.",
    },
    collection: {
      title: "My collection",
      purpose:
        "The tree types you have collected, and the streets you helped check.",
    },
  },
};

export const STRINGS: Record<Lang, Strings> = { he, ar, en };
