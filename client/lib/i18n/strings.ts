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
  map: {
    label: "מפת הרחובות המוצלים",
    attribution: "קרדיט למפה",
    zoomIn: "התקרבות",
    zoomOut: "התרחקות",
    myLocation: "המיקום שלי",
    locationDenied: "אין הרשאה למיקום. אפשרו אותה בהגדרות הדפדפן.",
    locationUnavailable: "לא הצלחנו למצוא את המיקום שלכם.",
    layers: "שכבות",
    filtersLabel: "מה להראות במפה",
    filters: {
      shade: "צל",
      parks: "פארקים",
      fountains: "ברזיות",
      benches: "ספסלים",
    },
    legendShade: "רחוב מוצל",
    sheetExpand: "הרחבה",
    sheetCollapse: "צמצום",
    sheetClose: "סגירה",
  },
  home: {
    searchLabel: "חיפוש יעד",
    searchPlaceholder: "לאן?",
    search: "חיפוש",
    profile: "פרופיל ותפריט",
    mode: "סוג ההליכה",
    menu: "תפריט",
    recents: "אחרונים",
    recentsEmpty: "עוד לא חיפשתם יעדים.",
    destinationHint: "חפשו כתובת או מקום, ונמצא את הדרך המוצלת ביותר.",
    freeWalkHint: "בוחרים כמה ללכת, ומקבלים מסלול מוצל עם משימות בדרך.",
    freeWalkStart: "הגדרת הליכה",
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
  map: {
    label: "خريطة الشوارع المظللة",
    attribution: "مصادر الخريطة",
    zoomIn: "تكبير",
    zoomOut: "تصغير",
    myLocation: "موقعي",
    locationDenied:
      "لا يوجد إذن بالوصول إلى الموقع. فعّلوه في إعدادات المتصفح.",
    locationUnavailable: "لم نتمكن من تحديد موقعكم.",
    layers: "الطبقات",
    filtersLabel: "ما يظهر على الخريطة",
    filters: {
      shade: "الظل",
      parks: "الحدائق",
      fountains: "برّادات الماء",
      benches: "المقاعد",
    },
    legendShade: "شارع مظلل",
    sheetExpand: "توسيع",
    sheetCollapse: "تصغير",
    sheetClose: "إغلاق",
  },
  home: {
    searchLabel: "البحث عن وجهة",
    searchPlaceholder: "إلى أين؟",
    search: "بحث",
    profile: "الملف الشخصي والقائمة",
    mode: "نوع المشي",
    menu: "القائمة",
    recents: "الأخيرة",
    recentsEmpty: "لم تبحثوا عن وجهات بعد.",
    destinationHint: "ابحثوا عن عنوان أو مكان، وسنجد الطريق الأكثر ظلًا.",
    freeWalkHint:
      "اختاروا كم تريدون أن تمشوا، واحصلوا على مسار مظلل مع مهام على الطريق.",
    freeWalkStart: "إعداد النزهة",
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
  map: {
    label: "Map of shaded streets",
    attribution: "Map credits",
    zoomIn: "Zoom in",
    zoomOut: "Zoom out",
    myLocation: "My location",
    locationDenied:
      "Location is turned off for this site. Allow it in your browser settings.",
    locationUnavailable: "We could not find your location.",
    layers: "Layers",
    filtersLabel: "What to show on the map",
    filters: {
      shade: "Shade",
      parks: "Parks",
      fountains: "Water fountains",
      benches: "Benches",
    },
    legendShade: "Shaded street",
    sheetExpand: "Expand",
    sheetCollapse: "Collapse",
    sheetClose: "Close",
  },
  home: {
    searchLabel: "Search for a destination",
    searchPlaceholder: "Where to?",
    search: "Search",
    profile: "Profile and menu",
    mode: "Kind of walk",
    menu: "Menu",
    recents: "Recents",
    recentsEmpty: "You have not searched for anywhere yet.",
    destinationHint:
      "Search for an address or a place, and we will find the shadiest way there.",
    freeWalkHint:
      "Choose how far to walk, and get a shaded route with tasks along the way.",
    freeWalkStart: "Set up a walk",
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
