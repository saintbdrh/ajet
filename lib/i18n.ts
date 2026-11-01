export const locales = ["mn", "en"] as const;
export type Locale = (typeof locales)[number];
export const isLocale = (v: string): v is Locale => (locales as readonly string[]).includes(v);
export const BRAND = process.env.NEXT_PUBLIC_BRAND ?? "Ajet";

export const CMS_COPY_KEYS = [
  "heroKicker", "heroTitle", "heroSub", "heroCta", "heroCta2", "heroPhone",
  "credential1", "credential2", "credential3", "credential4",
  "stat1Value", "stat1Label", "stat2Value", "stat2Label",
  "stat3Value", "stat3Label", "stat4Value", "stat4Label",
  "fleetKicker", "fleetTitle", "fleetIntro",
  "servicesKicker", "servicesTitle", "servicesIntro",
  "galleryKicker", "galleryTitle", "galleryHandle",
  "safetyKicker", "safetyTitle", "safetyIntro",
  "aboutKicker", "aboutTitle", "aboutIntro",
  "padsKicker", "padsTitle", "padsIntro",
  "destKicker", "destTitle",
  "faqKicker", "faqTitle",
  "faq1Question", "faq1Answer", "faq2Question", "faq2Answer",
  "faq3Question", "faq3Answer", "faq4Question", "faq4Answer",
  "ctaKicker", "ctaTitle", "ctaSub", "ctaButton",
  "priceDisclaimer",
  "footerTagline", "footerNote", "footerAddress",
  "contactPhone", "contactEmail", "pendingNote",
] as const;
export type CmsCopyKey = (typeof CMS_COPY_KEYS)[number];
export type CmsCopy = Partial<Record<CmsCopyKey, string>>;
export const isCmsCopyKey = (key: string): key is CmsCopyKey =>
  CMS_COPY_KEYS.some((candidate) => candidate === key);

const dict = {
  mn: {
    brandTag: "Нислэг",
    nav: {
      fleet: "Нисэх парк", services: "Үйлчилгээ", safety: "Аюулгүй байдал",
      about: "Бидний тухай", helipads: "Буух талбай", destinations: "Чиглэлүүд",
      quote: "Үнийн санал авах", estimate: "Нислэгээ тооцоолох", contact: "Холбогдох",
    },
    desc: "Монгол орны дагуу хувийн нисдэг тэрэгний нислэг, аялал, эмнэлгийн болон уул уурхайн дэмжлэгийн нислэг. Нислэг бүрийг үйл ажиллагааны баг тусад нь хянаж баталгаажуулна.",
    hero: {
      kicker: "Хувийн нисдэг тэрэгний нислэг · Улаанбаатар",
      title: "Монгол орон замнаас ойрхон.",
      sub: "Ajet нь Улаанбаатараас Монгол орны өнцөг булан бүрт хувийн нисдэг тэрэгний нислэг, аялал, эмнэлгийн нислэг болон уул уурхайн дэмжлэгийг зохион байгуулна. Нислэг бүрийг нисгэгч болон үйл ажиллагааны алба тусад нь хянаж баталгаажуулна.",
      cta: "Үнийн санал авах", cta2: "Нислэгээ тооцоолох", phone: "Утсаар холбогдох",
    },
    credentials: {
      label: "Үйл ажиллагааны мэдээлэл",
      items: ["[AOC №]", "[AMO №]", "[НИСЛЭГИЙН ЦАГ]", "[ЗОРИЧИГЧИЙН СУУДАЛ]"],
      note: "Баталгаажсан гэрчилгээ, нислэгийн цаг болон паркийн мэдээллийг захиалагч нийлүүлнэ.",
    },
    stats: [
      ["[ОН]","Үүсгэн байгуулсан"],
      ["[ЦАГ]+","Нийт нислэгийн цаг"],
      ["[%]","Үйл ажиллагааны найдвартай байдал"],
      ["[0]","Хүнд осол, зөрчил"],
    ],
    fleet: {
      kicker: "Нисэх парк",
      title: "Нислэгт бэлэн байлгах чадвар.",
      intro: "Нисдэг тэрэг бүрийн техникийн үзүүлэлтийг эх сурвалжтай нь тулгаж, хүний гарын үсгээр баталгаажуулсны дараа л нийтэлнэ. Нислэгийн боломжийг хүсэлт бүрээр диспетчер шалгана.",
      empty: "Паркийн мэдээлэл удахгүй нэмэгдэнэ.",
      seats: "Зорчигч", range: "Нислэгийн зай", speed: "Крейсер хурд",
      payload: "Ачаалал", engine: "Хөдөлгүүр", registration: "Бүртгэл",
      specificationsPending: "Техникийн мэдээллийг эх сурвалжтай нь баталгаажуулаагүй.",
      book: "Энэ нисдэг тэргээр нисэх", detail: "Дэлгэрэнгүй",
      verified: "Эх сурвалжаар баталгаажсан",
      noPhoto: "Зургийг захиалагч нийлүүлнэ",
    },
    services: {
      kicker: "Бидний нислэг",
      title: "Нисэх зургаан арга.",
      intro: "Гүйцэтгэх албаны багаас эхлээд өвчтөн хүргэх хүртэл — чадварлаг нисдэг тэрэг, нисгэгчийн нэгдсэн стандарт, чанартай засварын баг нислэг бүрийн ард зогсоно.",
      items: [
        { index: "01", name: "VVIP нислэг", body: "Гүйцэтгэх алба, төлөөлөгчид болон хувийн зочдыг хөндлөнгийн оролцоогүйгээр цэгээс цэгт хүргэнэ. Бүхээгийг таны хөтөлбөрт тохируулж, хоёр талын газар дээрх үйлчилгээг зохион байгуулна." },
        { index: "02", name: "Үзэсгэлэн аялал", body: "Хээр тал, Говь, Хангай, тайгын нууруудыг ойрхон харна. Маршрутыг улирал болон нисэх цагт тань тааруулан байгуулна." },
        { index: "03", name: "Эмнэлгийн нислэг", body: "Алслагдсан цэгээс Улаанбаатарын эмнэлэг хүртэл хурдан зөөвөрлөнө. Уулын болон бэлтгэгдээгүй талбайд ажиллах чадвартай баг." },
        { index: "04", name: "Уул уурхайн дэмжлэг", body: "Ээлжийн багийг солих, ашигт малтмалын хайгуулын агаарын зураг, лицензийн талбай руу гүйцэтгэх албаны тээвэр — хуваарийн дагуу эсвэл захиалгаар." },
        { index: "05", name: "Ачаа тээвэр", body: "Замын хөдөлгөөнгүй газарт яаралтай ачаа, тоног төхөөрөмж, сэлбэг хүргэнэ. Шаардлагатай бол дүүжин тээвэрлэлт хийнэ." },
        { index: "06", name: "Захиалгат нислэг", body: "Дээрх ангилалд багтахгүй бүхэн. Чиглэл, огноо, суудлын тоогоо хэлээрэй — бид юу шаардагдахыг хариу өгнө." },
      ],
      more: "Үйлчилгээний дэлгэрэнгүй",
    },
    gallery: {
      kicker: "Нислэгээс",
      title: "Хоёр жил, буух талбайгаас харвал.",
      handle: "@ajet",
      note: "Зургууд нь танилцуулгын зориулалттай. Захиалагчийн баталгаажуулсан гэрэл зургаар солино.",
    },
    safety: {
      kicker: "Аюулгүй байдал ба гүйцэтгэл",
      title: "Нислэг бүр эхлэхийн өмнө.",
      intro: "Нисгэгч, техникийн баг, диспетчер гэсэн гурван шатны шалгалтаар нислэг бүр баталгаажина. Доорх үзүүлэлтүүд нь захиалагчаас нийлүүлэх баталгаажсан мэдээллийн орон зай юм.",
      points: [
        "Нислэгийн өмнөх гурван шатны шалгалт",
        "Цаг агаарын хязгаарлалтыг нисгэгч эцэслэн шийднэ",
        "Засварын хуваарь үйлдвэрлэгчийн хөтөлбөрөөр",
        "Ачаа, тэнцвэрийн тооцоо нислэг бүрд",
        "Зорчигчийн бүртгэл ба нислэгийн төлөвлөгөө",
        "Осол, зөрчлийн мэдээллийг нээлттэй нийтэлнэ",
      ],
      certs: [
        { label: "Үйл ажиллагааны гэрчилгээ", title: "[AOC №]", body: "Иргэний нисэхийн ерөнхий газраас олгосон агаарын хөлгийн үйл ажиллагааны гэрчилгээний дугаарыг энд оруулна." },
        { label: "Засварын байгууллага", title: "[AMO №]", body: "Батлагдсан засварын байгууллагын дугаар, хүчинтэй хугацааг энд оруулна." },
        { label: "Нислэгийн баг", title: "[НИСГЭГЧ]", body: "Нисгэгчийн тоо, нийт нислэгийн цаг, олгогдсон ангиллыг энд оруулна." },
      ],
    },
    about: {
      kicker: "Ajet-ийн тухай",
      title: "Нэг бааз. Нэг баг. Нэг стандарт.",
      intro: "Ajet нь Улаанбаатарт суурилан Монгол орны дагуу хувийн нисдэг тэрэгний нислэг үзүүлдэг. Бид алслагдсан чиглэлийг холбож, чухал ажлыг дэлхийн түвшний стандартаар дэмжинэ.",
      body: "Манай бааз [БААЗЫН ХАЯГ] дээр нислэгийн талбай, түлшний ажиллагаа, паркийг бэлэн байлгах засварын цехийг ажиллуулна. Улаанбаатар хотын дагуу гурван хөөрөх, буух талбайг ашиглана.",
      facts: [["[ӨНДӨР]","Талбайн өндөр"],["[ЦАГ]+","Нисгэгчийн нийт нислэгийн цаг"]],
      cta: "Багийн талаар лавлах",
    },
    pads: {
      kicker: "Буух талбай",
      title: "Улаанбаатарт таныг хаана буулгаж чадах вэ.",
      intro: "Хот болон түүний захад байрлах буух талбайнууд. Таны очих газарт хамгийн ойрыг нь хэлээрэй — бид нислэгийг түүнийг тойруулан байгуулна.",
      items: [
        { name: "[БААЗЫН НЭР]", role: "Ajet · Үндсэн бааз", body: "Нислэгийн талбай, түлшний ажиллагаа, засварын цех бүхий өөрийн бааз. Ихэнх нислэг эндээс эхэлж, энд бууна.", coords: "[КООРДИНАТ]" },
        { name: "[ХОТЫН НЭР]", role: "Ajet · Хотын төв", body: "Сүхбаатарын талбайгаас богино зайд байрлах хоёр дахь буух талбай. Хот руу газардуулах хамгийн богино зам.", coords: "[КООРДИНАТ]" },
        { name: "[НИСЭХ ОНГОЦНЫ БУУДАЛ]", role: "Түнш · Онгоцны шилжилт", body: "Олон улсын нисэх онгоцны буудлын дэргэд. Олон улсын нислэгээр ирсэн зочдыг хот руу газардуулахгүйгээр шууд үргэлжлүүлнэ.", coords: "[КООРДИНАТ]" },
        { name: "[БИЗНЕС ТӨВ]", role: "Түнш · Хотын төв", body: "Бизнес төвийн дэргэдэх дээш өргөгдсөн талбай. Энэ талбайд буух төлбөрийг талбайн оператор тогтоодог — бид үнийн саналтай хамт баталгаажуулна.", coords: "[КООРДИНАТ]" },
        { name: "[ЭМНЭЛЭГ]", role: "Зөвхөн эмнэлгийн нислэг", body: "Яаралтай эмнэлгийн нислэгт зориулсан хүлээн авах талбай. Захиалгат болон аяллын нислэгт ашиглахгүй.", coords: "[КООРДИНАТ]" },
        { name: "[ОСЛЫН ТӨВ]", role: "Зөвхөн эмнэлгийн нислэг", body: "Гэмтэл, ослын үед өвчтөн хүлээн авах үндэсний төв. Захиалгат болон аяллын нислэгт ашиглахгүй.", coords: "[КООРДИНАТ]" },
      ],
      note: "Энэ нь бүрэн газрын зураг биш. Хотоос гадна аюулгүй хүрэх боломжтой газарт бууж чадна — талбай байхгүй бол бид судалгаа хийж бэлтгэнэ.",
    },
    dest: {
      kicker: "Чиглэлүүд", title: "Монгол орны хаа ч.",
      intro: "Бид маршрутын зурагт хязгаарлагдахгүй. Аюулгүй буух талбай байвал хүрнэ — байхгүй бол судалгаа хийж бэлтгэнэ.",
      wx: "Мэдээлсэн цаг агаар", ms: "м/с",
      wxObserved: "Мэдээлсэн цаг", wxUnavailable: "Цаг агаарын мэдээлэл одоогоор боломжгүй.",
      wxStale: "Хуучин мэдээлэл — шийдвэр гаргахад ашиглахгүй.",
      locationDisclaimer: "Жишээ өгөгдөл гэж тэмдэглэсэн байршил нь зөвхөн дүрслэлийн зориулалттай; буух талбай эсвэл навигацийн өгөгдөл биш.",
      coordinatesPending: "Байршлын координатыг эх сурвалжтай нь шалгаж дуусаагүй.",
      coordinatesUnavailable: "Баталгаажсан координат одоогоор байхгүй.",
      disclaimer: "Цаг агаарын мэдээлэл нь зөвхөн мэдээллийн зорилготой. Нислэг явах эсэхийг нисгэгч болон үйл ажиллагааны алба шийднэ.",
      map: "Чиглэлүүдийн газрын зураг",
      time: "Нислэгийн хугацаа", pending: "Хугацааг баталгаажуулна",
    },
    faq: { kicker: "Асуулт", title: "Мэдэх ёстой бүхэн", items: [
      ["Төлбөр хэзээ хийгддэг вэ?","Нислэгийн онцлогоос шалтгаалан шууд төлбөр хийгддэггүй. Хүсэлт илгээсний дараа диспетчер үнийн саналыг илгээж, та баталгаажуулснаар захиалга баталгаажна."],
      ["Цаг агаар нислэгт нөлөөлвөл?","Энэ сайтад харагдах цаг агаар нь зөвхөн мэдээллийн зориулалттай. Нислэгийн шийдвэрийг нисгэгч болон үйл ажиллагааны баг гаргана."],
      ["Хэдэн зорчигч ачих боломжтой вэ?","Онгоцноос хамаарна. Парк бүрийн суудлын багтаамжийг техникийн хэсэгт дурдсан болно."],
      ["Ачаа авч явах боломжтой юу?","Тийм ээ. Ачааны хэмжээ, жинг хүсэлт илгээхдээ дурдаарай — тохирох онгоц сонгогдоно."],
    ]},
    cta: { kicker: "Бэлэн үү", title: "Чиглэлээ хэлээрэй. Бид юу шаардагдахыг хэлнэ.", sub: "Захиалгат нислэгийн үнийг суудлаар бус, нислэгээр тооцно. Доорх мэдээллийг илгээгээрэй — манай үйл ажиллагааны баг нисдэг тэрэг, хуваарь, үнээр эргэн холбогдоно.", btn: "Үнийн санал авах" },
    priceDisclaimer: "Энэ нь зөвхөн жишиг эхлэх үнэ бөгөөд эцсийн үнийг бичгээр ирүүлэх үнийн саналд баталгаажуулна.",
    sample: "Жишээ өгөгдөл: захиалагч баталгаажуулна",
    more: "Бүгдийг харах",
    pending: "Баталгаажуулах",
    placeholderNote: "Хаалтанд тэмдэглэсэн мэдээллийг Ajet нислэг эхлэхийн өмнө нийлүүлнэ.",
    form: {
      title: "Нислэгийн хүсэлт", name: "Нэр", phone: "Утас", email: "И-мэйл (заавал биш)",
      org: "Байгууллага (заавал биш)", from: "Хаанаас", to: "Хаашаа", round: "Хоёр чиглэлийн нислэг",
      date: "Огноо", time: "Цаг (заавал биш)", pax: "Зорчигчийн тоо",
      notes: "Нэмэлт мэдээлэл (ачаа гэх мэт)", submit: "Хүсэлт илгээх",
      sending: "Илгээж байна...", ok: "Хүсэлт хүлээн авлаа. Дугаар:", okTail: "Диспетчер тантай холбогдоно.",
      err: "Илгээж чадсангүй. Дахин оролдоно уу, эсвэл утсаар холбогдоно уу.",
    },
    foot: {
      tagline: "Улаанбаатарт суурилсан хувийн нисдэг тэрэгний нислэг. Таны цаг — бидний хариуцлага.",
      explore: "Судлах", company: "Компани", contact: "Холбогдох",
      legal: "Нууцлал · Үйлчилгээний нөхцөл",
      note: "Нислэг бүр нисгэгч, үйл ажиллагааны албаны шалгалтын дараа баталгаажна.",
      rights: "© 2026 Ajet. Бүх эрх хуулиар хамгаалагдсан.",
      address: "Улаанбаатар, Монгол",
      backToTop: "Дээшээ",
    },
  },
  en: {
    brandTag: "Charter",
    nav: {
      fleet: "Fleet", services: "Services", safety: "Safety",
      about: "About", helipads: "Helipads", destinations: "Destinations",
      quote: "Request a quote", estimate: "Estimate your flight", contact: "Contact",
    },
    desc: "Private helicopter charter, scenic tours, medevac and mining support across Mongolia. Every flight remains subject to operational review and confirmation.",
    hero: {
      kicker: "Private helicopter charter · Ulaanbaatar",
      title: "Mongolia is closer than the road suggests.",
      sub: "Ajet flies private charter, scenic tours, medevac and mining support from Ulaanbaatar to anywhere in Mongolia. Every flight is reviewed and confirmed separately by the pilot and our operations team.",
      cta: "Request a quote", cta2: "Estimate your flight", phone: "Speak to us",
    },
    credentials: {
      label: "Operating credentials",
      items: ["[AOC No.]", "[AMO No.]", "[FLIGHT HOURS]", "[PASSENGER SEATS]"],
      note: "Verified certificates, flight hours and fleet details are to be supplied by the operator.",
    },
    stats: [
      ["[YEAR]","Established"],
      ["[HRS]+","Flight hours flown"],
      ["[%]","Operational reliability"],
      ["[0]","Incidents or accidents"],
    ],
    fleet: {
      kicker: "The fleet",
      title: "The capability to keep them flying.",
      intro: "Technical details are published only after the figures are checked against a source and attested by a named person. Availability is assessed by dispatch for every request.",
      empty: "Fleet details are coming soon.",
      seats: "Passengers", range: "Range", speed: "Cruise speed",
      payload: "Payload", engine: "Engine", registration: "Registration",
      specificationsPending: "Technical details have not been verified against a source.",
      book: "Fly this aircraft", detail: "Full details",
      verified: "Verified against a source",
      noPhoto: "Photography to be supplied",
    },
    services: {
      kicker: "What we fly",
      title: "Six ways we take you flying.",
      intro: "From moving your executive team to carrying a patient — capable helicopters, a single crew standard and quality maintenance stand behind every flight.",
      items: [
        { index: "01", name: "VVIP charter", body: "Discreet point-to-point flying for executives, delegations and private guests. Cabin configured to your itinerary, ground handling arranged at both ends." },
        { index: "02", name: "Scenic tours", body: "The steppe, the Gobi, the Khangai and the taiga lakes, seen close up. Routes built around the season and how long you want to stay airborne." },
        { index: "03", name: "Medevac", body: "Rapid medical transfer from remote sites to Ulaanbaatar hospitals, with crews current on mountain and unprepared-site operations." },
        { index: "04", name: "Mining support", body: "Crew rotation, aerial survey for mineral exploration and executive transport into licence areas — scheduled or on demand." },
        { index: "05", name: "Cargo transport", body: "Time-critical freight, equipment and spares delivered into locations without a runway, and underslung transport where the job requires it." },
        { index: "06", name: "On-demand charter", body: "Everything that doesn't fit a category. Tell us the route, the date and the number of seats, and we will tell you what it takes." },
      ],
      more: "All services",
    },
    gallery: {
      kicker: "From the feed",
      title: "Two years, seen from the ramp.",
      handle: "@ajet",
      note: "Preview photography. Replace with client-approved imagery before launch.",
    },
    safety: {
      kicker: "Safety & performance",
      title: "Before every flight.",
      intro: "Every sector clears three stages — pilot, engineering, dispatch — before the rotors turn. The figures below are placeholders for verified operator data.",
      points: [
        "Three-stage pre-flight clearance",
        "Weather limits decided by the pilot in command",
        "Maintenance to manufacturer programmes",
        "Weight and balance computed for every sector",
        "Passenger manifest and filed flight plan",
        "Incident and defect reporting published openly",
      ],
      certs: [
        { label: "Air operator certificate", title: "[AOC No.]", body: "The air operator certificate number issued by the Civil Aviation Authority of Mongolia goes here." },
        { label: "Approved maintenance organisation", title: "[AMO No.]", body: "The approved maintenance organisation number and its validity go here." },
        { label: "Flight operations team", title: "[CREW]", body: "Number of pilots, combined flight hours and type ratings go here." },
      ],
    },
    about: {
      kicker: "About Ajet",
      title: "One base. One crew. One standard.",
      intro: "Ajet is based in Ulaanbaatar and flies private helicopter charter across Mongolia. We connect remote destinations and support critical operations to a world-class standard.",
      body: "Our base at [BASE ADDRESS] handles landing, fuel and the maintenance floor that keeps the fleet serviceable. Three take-off and landing sites are used across Ulaanbaatar.",
      facts: [["[ELEV]","Field elevation"],["[HRS]+","Combined pilot flight hours"]],
      cta: "Ask about the team",
    },
    pads: {
      kicker: "Landing sites",
      title: "Where we can set you down in Ulaanbaatar.",
      intro: "Landing sites across the city and its approaches. Tell us which is closest to where you need to be and we will build the flight around it.",
      items: [
        { name: "[BASE NAME]", role: "Ajet · Primary base", body: "Our own base with a landing area, fuel handling and an in-house maintenance floor. Most charters begin and end here.", coords: "[COORDINATES]" },
        { name: "[CITY PAD]", role: "Ajet · City centre", body: "Our second landing site, a short distance from Sükhbaatar Square — the shortest ground transfer of any site in the city.", coords: "[COORDINATES]" },
        { name: "[AIRPORT PAD]", role: "Partner · Airport transfers", body: "Immediately beside the international airport, where we meet arrivals and fly them onward without a road transfer into the city.", coords: "[COORDINATES]" },
        { name: "[BUSINESS DISTRICT]", role: "Partner · City centre", body: "An elevated pad beside the central business district. Landing here carries a fee set by the site operator — we confirm it with your quote.", coords: "[COORDINATES]" },
        { name: "[HOSPITAL]", role: "Medevac only", body: "A receiving pad used for emergency medical transfers. Not available for charter or scenic flights.", coords: "[COORDINATES]" },
        { name: "[TRAUMA CENTRE]", role: "Medevac only", body: "The national receiving centre for casualty transfers, and our destination of choice when a patient needs trauma care on arrival.", coords: "[COORDINATES]" },
      ],
      note: "This is not the whole map. Outside the city we can land almost anywhere with a safe approach — if a site does not exist yet, we will survey one.",
    },
    dest: {
      kicker: "Destinations", title: "Everywhere in Mongolia.",
      intro: "We are not limited to a route map. If it has a safe landing site, we can reach it — and if it doesn't, we will survey one.",
      wx: "Reported weather", ms: "m/s",
      wxObserved: "Reported", wxUnavailable: "Weather data is currently unavailable.",
      wxStale: "Older report — do not use for operational decisions.",
      locationDisclaimer: "Locations marked as sample data are illustrative only; they are not verified landing sites or navigation data.",
      coordinatesPending: "Location coordinates have not been checked against a source.",
      coordinatesUnavailable: "No verified destination coordinates are available yet.",
      disclaimer: "Weather is shown for information only. The pilot and operations team decide whether a flight goes ahead.",
      map: "Map of destinations",
      time: "Flight time", pending: "To be confirmed",
    },
    faq: { kicker: "Questions", title: "Everything you need to know", items: [
      ["When do I pay?","A dispatcher sends a quote when one can be prepared. Payment arrangements, if applicable, are confirmed separately in the written terms."],
      ["What if weather affects my flight?","Weather information on this site is informational only. The pilot and operations team make the operational decision and advise you of next steps."],
      ["How many passengers can fly?","It depends on the aircraft. Each aircraft card lists its seat capacity."],
      ["Can I bring luggage or cargo?","Yes. Note the size and weight in your request and we will assign the right aircraft and payload plan."],
    ]},
    cta: { kicker: "Ready when you are", title: "Tell us the route. We will tell you what it takes.", sub: "Charter is priced per mission, not per seat. Send the details below and our operations team will come back with an aircraft, a schedule and a price.", btn: "Request a quote" },
    priceDisclaimer: "Indicative starting prices only. Your final price will be confirmed in a written quote.",
    sample: "Sample data: to be confirmed by the client",
    more: "View all",
    pending: "To be confirmed",
    placeholderNote: "Values shown in brackets are supplied by the operator before the site goes live.",
    form: {
      title: "Flight request", name: "Full name", phone: "Phone", email: "Email (optional)",
      org: "Company (optional)", from: "Departure", to: "Destination", round: "Round trip",
      date: "Date", time: "Time (optional)", pax: "Passengers",
      notes: "Anything else we should know? (optional)", submit: "Send request",
      sending: "Sending request...", ok: "Request received. Reference:", okTail: "Our dispatcher will contact you.",
      err: "Could not send. Please try again or contact us by phone.",
    },
    foot: {
      tagline: "Private helicopter charter based in Ulaanbaatar. Your time — our responsibility.",
      explore: "Explore", company: "Company", contact: "Contact",
      legal: "Privacy · Terms of service",
      note: "Every flight is confirmed after a pilot and operations check.",
      rights: "© 2026 Ajet. All rights reserved.",
      address: "Ulaanbaatar, Mongolia",
      backToTop: "Back to top",
    },
  },
} as const;

type Widen<T> = T extends string
  ? string
  : T extends readonly unknown[]
    ? readonly Widen<T[number]>[]
    : T extends object
      ? { [K in keyof T]: Widen<T[K]> }
      : T;

export type Dict = Widen<(typeof dict)["mn"]>;

export const t = (locale: Locale, copy: CmsCopy = {}): Dict => {
  const base = dict[locale] as Dict;
  return {
    ...base,
    hero: {
      ...base.hero,
      kicker: copy.heroKicker ?? base.hero.kicker,
      title: copy.heroTitle ?? base.hero.title,
      sub: copy.heroSub ?? base.hero.sub,
      cta: copy.heroCta ?? base.hero.cta,
      cta2: copy.heroCta2 ?? base.hero.cta2,
      phone: copy.heroPhone ?? base.hero.phone,
    },
    credentials: {
      ...base.credentials,
      items: base.credentials.items.map((item, index) =>
        copy[`credential${index + 1}` as CmsCopyKey] ?? item),
    },
    stats: base.stats.map((item, index) => {
      const number = index + 1;
      const value = copy[`stat${number}Value` as CmsCopyKey];
      const label = copy[`stat${number}Label` as CmsCopyKey];
      return [value ?? item[0], label ?? item[1]];
    }),
    fleet: {
      ...base.fleet,
      kicker: copy.fleetKicker ?? base.fleet.kicker,
      title: copy.fleetTitle ?? base.fleet.title,
      intro: copy.fleetIntro ?? base.fleet.intro,
    },
    services: {
      ...base.services,
      kicker: copy.servicesKicker ?? base.services.kicker,
      title: copy.servicesTitle ?? base.services.title,
      intro: copy.servicesIntro ?? base.services.intro,
    },
    gallery: {
      ...base.gallery,
      kicker: copy.galleryKicker ?? base.gallery.kicker,
      title: copy.galleryTitle ?? base.gallery.title,
      handle: copy.galleryHandle ?? base.gallery.handle,
    },
    safety: {
      ...base.safety,
      kicker: copy.safetyKicker ?? base.safety.kicker,
      title: copy.safetyTitle ?? base.safety.title,
      intro: copy.safetyIntro ?? base.safety.intro,
    },
    about: {
      ...base.about,
      kicker: copy.aboutKicker ?? base.about.kicker,
      title: copy.aboutTitle ?? base.about.title,
      intro: copy.aboutIntro ?? base.about.intro,
    },
    pads: {
      ...base.pads,
      kicker: copy.padsKicker ?? base.pads.kicker,
      title: copy.padsTitle ?? base.pads.title,
      intro: copy.padsIntro ?? base.pads.intro,
    },
    dest: {
      ...base.dest,
      kicker: copy.destKicker ?? base.dest.kicker,
      title: copy.destTitle ?? base.dest.title,
    },
    faq: {
      ...base.faq,
      kicker: copy.faqKicker ?? base.faq.kicker,
      title: copy.faqTitle ?? base.faq.title,
      items: base.faq.items.map((item, index) => {
        const number = index + 1;
        const question = copy[`faq${number}Question` as CmsCopyKey];
        const answer = copy[`faq${number}Answer` as CmsCopyKey];
        return [question ?? item[0], answer ?? item[1]];
      }),
    },
    cta: {
      ...base.cta,
      kicker: copy.ctaKicker ?? base.cta.kicker,
      title: copy.ctaTitle ?? base.cta.title,
      sub: copy.ctaSub ?? base.cta.sub,
      btn: copy.ctaButton ?? base.cta.btn,
    },
    priceDisclaimer: copy.priceDisclaimer ?? base.priceDisclaimer,
    foot: {
      ...base.foot,
      tagline: copy.footerTagline ?? base.foot.tagline,
      note: copy.footerNote ?? base.foot.note,
      address: copy.footerAddress ?? base.foot.address,
    },
    placeholderNote: copy.pendingNote ?? base.placeholderNote,
  };
};
