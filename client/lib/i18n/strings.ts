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
  report: {
    title: "מה רואים כאן?",
    close: "סגירה",
    kinds: {
      missing_from_map: { title: "עץ שלא מופיע במפה", hint: "" },
      gone: { title: "עץ חסר", hint: "במפה יש עץ, אבל כאן אין" },
      damaged: { title: "עץ פגוע", hint: "יישלח לעירייה, לא יוצג במפה" },
    },
    locating: "מאתרים את המיקום שלכם…",
    sent: "תודה! הדיווח נשלח",
    sentDamaged: "תודה! הדיווח יישלח לעירייה",
    noLocation: "לא הצלחנו לאתר את המיקום שלכם. אפשרו גישה למיקום ונסו שוב.",
    failed: "הדיווח לא נשלח. נסו שוב.",
  },
  verify: {
    signInTitle: "כדי לעזור למפה צריך להיכנס",
    signInBody: "הדיווחים והאימותים נשמרים בשם המשתמש הבדוי שלכם.",
    signIn: "כניסה",
    side: {
      left: "משמאלך, {distance}",
      right: "מימינך, {distance}",
      ahead: "לפניך, {distance}",
    },
    opposite: "מול בית מספר {number}",
    oppositeOnStreet: "מול בית מספר {number}, {street}",
    reference: "{species}, ככה הוא נראה בדרך כלל",
    capture: {
      close: "סגירה",
      step: "{step}/2 · {what}",
      whole: "כל העץ",
      leaves: "העלים",
      wholeHint: "הכניסו את כל העץ למסגרת",
      leavesHint: "התקרבו לעלים",
      shutter: "צילום",
      noTree: "אין כאן עץ",
      noCamera: "אין גישה למצלמה. אפשר לצלם או לבחור תמונה במקום.",
      pickPhoto: "צלמו או בחרו תמונה",
      uploading: "מעלים את התמונה…",
      uploadFailed: "התמונה לא עלתה. נסו שוב.",
      noTreeSaved: "תודה! סימנו שאין כאן עץ",
    },
    match: {
      title: "זה אותו עץ?",
      yourPhoto: "הצילום שלך",
      usually: "ככה הוא נראה בדרך כלל",
      yes: "כן",
      no: "לא",
      notSure: "לא בטוח",
      savedSame: "תודה! {species} נוסף לאוסף שלכם",
      saved: "תודה על הבדיקה",
      failed: "התשובה לא נשמרה. נסו שוב.",
      noPhoto: "עוד אין צילום של העץ.",
      retake: "לצלם שוב",
    },
  },
  summary: {
    title: "הגעתם",
    distance: "ק״מ",
    steps: "צעדים",
    shade: "בצל",
    trees: { one: "אימתתם עץ אחד", other: "אימתתם {count} עצים" },
    noTrees: "הפעם לא אימתתם עצים",
    toCollection: "לאוסף שלי",
    saving: "שומרים את ההליכה…",
    saveFailed: "לא הצלחנו לשמור את ההליכה.",
    retry: "נסו שוב",
    signIn: "היכנסו כדי לשמור את ההליכה ואת העצים באוסף שלכם.",
    empty: "עוד לא סיימתם הליכה. צאו לדרך, והסיכום יופיע כאן.",
  },
  collection: {
    title: "האוסף שלי",
    back: "חזרה",
    speciesCount: { one: "סוג אחד", other: "{count} סוגים" },
    streetsCount: {
      one: "עזרתם לאמת עצים ברחוב אחד",
      other: "עזרתם לאמת עצים ב־{count} רחובות",
    },
    empty: "עוד לא אספתם עצים. אמתו עץ בהליכה הבאה, והוא יופיע כאן.",
    notYet: "עוד לא",
    failed: "לא הצלחנו לטעון את האוסף.",
    retry: "נסו שוב",
    species: {
      ficus: "פיקוס",
      olive: "זית",
      carob: "חרוב",
      datePalm: "דקל",
      plane: "דולב",
      jacaranda: "ג׳קרנדה",
      tipu: "טיפואנה",
      chinaberry: "איזדרכת",
      kurrajong: "בקבוקון",
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
  report: {
    title: "ماذا ترون هنا؟",
    close: "إغلاق",
    kinds: {
      missing_from_map: { title: "شجرة غير موجودة على الخريطة", hint: "" },
      gone: { title: "شجرة مفقودة", hint: "على الخريطة شجرة، لكن لا شجرة هنا" },
      damaged: {
        title: "شجرة متضررة",
        hint: "يُرسل إلى البلدية، ولا يظهر على الخريطة",
      },
    },
    locating: "نحدد موقعكم…",
    sent: "شكرًا! أُرسل البلاغ",
    sentDamaged: "شكرًا! سيُرسل البلاغ إلى البلدية",
    noLocation:
      "لم نتمكن من تحديد موقعكم. اسمحوا بالوصول إلى الموقع وحاولوا مرة أخرى.",
    failed: "لم يُرسل البلاغ. حاولوا مرة أخرى.",
  },
  verify: {
    signInTitle: "سجّلوا الدخول لتساعدوا الخريطة",
    signInBody: "تُحفظ البلاغات والتحققات باسم المستخدم المستعار الخاص بكم.",
    signIn: "تسجيل الدخول",
    side: {
      left: "على يساركم، {distance}",
      right: "على يمينكم، {distance}",
      ahead: "أمامكم، {distance}",
    },
    opposite: "مقابل المبنى رقم {number}",
    oppositeOnStreet: "مقابل المبنى رقم {number}، {street}",
    reference: "{species}، هكذا تبدو عادةً",
    capture: {
      close: "إغلاق",
      step: "{step}/2 · {what}",
      whole: "الشجرة كاملة",
      leaves: "الأوراق",
      wholeHint: "أدخلوا الشجرة كلها في الإطار",
      leavesHint: "اقتربوا من الأوراق",
      shutter: "التقاط",
      noTree: "لا توجد شجرة هنا",
      noCamera:
        "لا يمكن الوصول إلى الكاميرا. يمكنكم التصوير أو اختيار صورة بدلًا من ذلك.",
      pickPhoto: "صوّروا أو اختاروا صورة",
      uploading: "نرفع الصورة…",
      uploadFailed: "لم تُرفع الصورة. حاولوا مرة أخرى.",
      noTreeSaved: "شكرًا! سجّلنا أنه لا توجد شجرة هنا",
    },
    match: {
      title: "هل هي الشجرة نفسها؟",
      yourPhoto: "صورتكم",
      usually: "هكذا تبدو عادةً",
      yes: "نعم",
      no: "لا",
      notSure: "غير متأكد",
      savedSame: "شكرًا! أُضيفت {species} إلى مجموعتكم",
      saved: "شكرًا على التحقق",
      failed: "لم تُحفظ الإجابة. حاولوا مرة أخرى.",
      noPhoto: "لا توجد صورة للشجرة بعد.",
      retake: "التصوير من جديد",
    },
  },
  summary: {
    title: "وصلتم",
    distance: "كم",
    steps: "خطوات",
    shade: "في الظل",
    trees: {
      one: "تحققتم من شجرة واحدة",
      other: "الأشجار التي تحققتم منها: {count}",
    },
    noTrees: "لم تتحققوا من أشجار هذه المرة",
    toCollection: "إلى مجموعتي",
    saving: "نحفظ النزهة…",
    saveFailed: "لم نتمكن من حفظ النزهة.",
    retry: "حاولوا مرة أخرى",
    signIn: "سجّلوا الدخول لحفظ النزهة والأشجار في مجموعتكم.",
    empty: "لم تُنهوا نزهة بعد. انطلقوا، وسيظهر الملخص هنا.",
  },
  collection: {
    title: "مجموعتي",
    back: "رجوع",
    speciesCount: { one: "نوع واحد", other: "الأنواع: {count}" },
    streetsCount: {
      one: "ساعدتم في التحقق من الأشجار في شارع واحد",
      other: "الشوارع التي ساعدتم فيها: {count}",
    },
    empty:
      "لم تجمعوا أشجارًا بعد. تحققوا من شجرة في نزهتكم القادمة وستظهر هنا.",
    notYet: "ليس بعد",
    failed: "لم نتمكن من تحميل المجموعة.",
    retry: "حاولوا مرة أخرى",
    species: {
      ficus: "فيكس",
      olive: "زيتون",
      carob: "خرّوب",
      datePalm: "نخيل",
      plane: "دُلب",
      jacaranda: "جكرندا",
      tipu: "تيبوانا",
      chinaberry: "زنزلخت",
      kurrajong: "براكيكيتون",
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
  report: {
    title: "What do you see here?",
    close: "Close",
    kinds: {
      missing_from_map: { title: "A tree that isn't on the map", hint: "" },
      gone: {
        title: "A missing tree",
        hint: "The map shows a tree, but there isn't one here",
      },
      damaged: {
        title: "A damaged tree",
        hint: "Sent to the municipality, not shown on the map",
      },
    },
    locating: "Finding your location…",
    sent: "Thank you! Report sent",
    sentDamaged: "Thank you! It will go to the municipality",
    noLocation:
      "We couldn't find your location. Allow location access and try again.",
    failed: "The report wasn't sent. Please try again.",
  },
  verify: {
    signInTitle: "Sign in to help the map",
    signInBody:
      "Reports and checks are saved under your pseudonymous username.",
    signIn: "Sign in",
    side: {
      left: "On your left, {distance}",
      right: "On your right, {distance}",
      ahead: "Ahead of you, {distance}",
    },
    opposite: "Opposite number {number}",
    oppositeOnStreet: "Opposite number {number}, {street}",
    reference: "{species}, as it usually looks",
    capture: {
      close: "Close",
      step: "{step}/2 · {what}",
      whole: "The whole tree",
      leaves: "The leaves",
      wholeHint: "Fit the whole tree in the frame",
      leavesHint: "Get close to the leaves",
      shutter: "Take photo",
      noTree: "There's no tree here",
      noCamera:
        "The camera isn't available. You can take or choose a photo instead.",
      pickPhoto: "Take or choose a photo",
      uploading: "Uploading the photo…",
      uploadFailed: "The photo didn't upload. Please try again.",
      noTreeSaved: "Thank you! We noted there's no tree here",
    },
    match: {
      title: "Is it the same tree?",
      yourPhoto: "Your photo",
      usually: "How it usually looks",
      yes: "Yes",
      no: "No",
      notSure: "Not sure",
      savedSame: "Thank you! {species} is in your collection",
      saved: "Thanks for checking",
      failed: "Your answer wasn't saved. Please try again.",
      noPhoto: "There's no photo of the tree yet.",
      retake: "Photograph again",
    },
  },
  summary: {
    title: "You made it",
    distance: "km",
    steps: "steps",
    shade: "in shade",
    trees: { one: "You checked 1 tree", other: "You checked {count} trees" },
    noTrees: "You didn't check any trees this time",
    toCollection: "My collection",
    saving: "Saving your walk…",
    saveFailed: "We couldn't save your walk.",
    retry: "Try again",
    signIn: "Sign in to save the walk and its trees to your collection.",
    empty:
      "You haven't finished a walk yet. Set off, and your summary shows up here.",
  },
  collection: {
    title: "My collection",
    back: "Back",
    speciesCount: { one: "1 type", other: "{count} types" },
    streetsCount: {
      one: "you helped check trees on 1 street",
      other: "you helped check trees on {count} streets",
    },
    empty: "No trees yet. Check a tree on your next walk and it shows up here.",
    notYet: "Not yet",
    failed: "We couldn't load your collection.",
    retry: "Try again",
    species: {
      ficus: "Ficus",
      olive: "Olive",
      carob: "Carob",
      datePalm: "Date palm",
      plane: "Plane tree",
      jacaranda: "Jacaranda",
      tipu: "Tipu tree",
      chinaberry: "Chinaberry",
      kurrajong: "Kurrajong",
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
