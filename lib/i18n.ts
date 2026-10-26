export const locales = ["mn", "en"] as const;
export type Locale = (typeof locales)[number];
export const isLocale = (v: string): v is Locale => (locales as readonly string[]).includes(v);
export const BRAND = process.env.NEXT_PUBLIC_BRAND ?? "Ajet";

export const CMS_COPY_KEYS = [
  "heroKicker", "heroTitle", "heroSub", "heroCta", "heroCta2",
  "journeyKicker", "journeyIntro",
  "journey1Label", "journey1Title", "journey1Body", "journey2Label", "journey2Title", "journey2Body",
  "journey3Label", "journey3Title", "journey3Body", "journey4Label", "journey4Title", "journey4Body",
  "journey5Label", "journey5Title", "journey5Body", "journey6Label", "journey6Title", "journey6Body",
  "journey7Label", "journey7Title", "journey7Body", "priceDisclaimer",
  "fleetTitle", "fleetIntro", "memberTitle", "memberIntro",
  "corporateTitle", "corporateIntro",
  "stat1Value", "stat1Label", "stat2Value", "stat2Label",
  "stat3Value", "stat3Label", "stat4Value", "stat4Label",
  "testimonialKicker", "testimonialText", "testimonialCite",
  "faqKicker", "faqTitle",
  "faq1Question", "faq1Answer", "faq2Question", "faq2Answer",
  "faq3Question", "faq3Answer", "faq4Question", "faq4Answer",
  "ctaKicker", "ctaTitle", "ctaSub", "ctaButton",
  "footerTagline", "footerNote", "contactPhone", "contactEmail",
] as const;
export type CmsCopyKey = (typeof CMS_COPY_KEYS)[number];
export type CmsCopy = Partial<Record<CmsCopyKey, string>>;
export const isCmsCopyKey = (key: string): key is CmsCopyKey =>
  CMS_COPY_KEYS.some((candidate) => candidate === key);

const dict = {
  mn: {
    nav: { fleet: "Нисэх онгоцны парк", destinations: "Чиглэлүүд", quote: "Нислэг захиалах" },
    desc: "Монгол орны чиглэлд захиалгат нисдэг тэрэгний нислэгийн хүсэлт илгээнэ үү. Бүх нислэг үйл ажиллагааны баталгаажуулалтад хамрагдана.",
    hero: {
      kicker: "Захиалгат нисдэг тэрэгний үйлчилгээ",
      title: "Тэнгэрийн замаар, таны хуваариар",
      sub: "Монгол орны чиглэлд хувийн нисдэг тэрэгний нислэг төлөвлөөрэй. Диспетчер баг хүсэлтийг шалгаж, бодит боломжийг эргэн баталгаажуулна.",
      cta: "Нислэгийн хүсэлт илгээх", cta2: "Парк үзэх",
    },
    journeyKicker: "АЯЛЛЫН ТУХАЙ",
    journeyIntro: "Нислэгийн хүсэлтээс зорьсон газарт хүрэх хүртэл.",
    journey: [
      { label: "ХӨДЛӨХ", title: "Аялал тайван эхэлнэ", body: "Таныг ирэхээс өмнө аяллын нарийн ширийн бүхнийг нягтална." },
      { label: "НИСДЭГ ТЭРЭГ", title: "Аялалд тань тохируулна", body: "Очих чиглэлээ хуваалцаарай. Манай баг маршрут, боломжит онгоцыг шалгана." },
      { label: "ХӨӨРӨЛТ", title: "Цагаа үнэ цэнтэй өнгөрүүлээрэй", body: "Захиалгат нислэгээр газрын урт замыг товчилж, очих газартаа илүү цаг зарцуулна." },
      { label: "ТЭНГЭРТ", title: "Шинэ өнцгөөс харах нь", body: "Уулын оргил, уудам хээр тал, алсын хаяа таны дор нээгдэнэ." },
      { label: "ЧИГЛЭЛ", title: "Зорьсон газартаа ойрхон", body: "Аяллын төлөвлөгөөндөө тааруулан шууд чиглэлээ сонгоорой." },
      { label: "БУУЛТ", title: "Өдрөө илүү үр бүтээлтэй өнгөрүүлнэ", body: "Нягт төлөвлөсөн маршрут хөөрөхөөс буух хүртэл ая тухыг бүрдүүлнэ." },
      { label: "ТАНЫ АЯЛАЛ", title: "Та хаашаа нисэх вэ?", body: "Төлөвлөгөөгөө манай нислэгийн зөвлөхтэй хуваалцаарай. Хүсэлт бүрийг нягтална." },
    ],
    priceDisclaimer: "Энэ нь зөвхөн жишиг эхлэх үнэ бөгөөд эцсийн үнийг бичгээр ирүүлэх үнийн саналд баталгаажуулна.",
    stats: [["01","Хүсэлт"],["02","Санал"],["03","Зөвшөөрөл"],["04","Үйл ажиллагааны баталгаа"]],
    how: { kicker: "Үйлчилгээний урсгал", title: "Хүсэлтээс нислэг хүртэл", steps: [
      ["Хүсэлт илгээх","Хаанаас, хаашаа, хэзээ, хэдэн зорчигч — хүсэлтээ үлдээнэ үү."],
      ["Үнийн санал авах","Диспетчер хүсэлтийг хянаж, боломжтой бол хувийн санал илгээнэ."],
      ["Хоёр шатны баталгаа","Таны зөвшөөрлийн дараа үйл ажиллагааны баг нислэгийг тусад нь баталгаажуулна."],
    ]},
    fleet: { kicker:"Нисэх онгоцны парк", title:"Тав тух, аюулгүй байдлын стандарт",
      intro:"Нисэх онгоц болон техникийн мэдээллийг баталгаажуулсны дараа нийтэлнэ. Нислэгийн боломжийг хүсэлт бүрээр шалгана.",
      empty:"Нисдэг тэрэгний мэдээлэл удахгүй нэмэгдэнэ.", seats:"Суудал", range:"Нислэгийн зай", speed:"Крейсер хурд", payload:"Ачаалал",
      specificationsPending:"Техникийн мэдээллийг эх сурвалжтай нь баталгаажуулаагүй." },
    member: { kicker:"Гишүүнчлэлийн хүсэлт", title:"Гишүүнчлэлийн талаар лавлах",
      intro:"Одоогоор гишүүнчлэлийн хөтөлбөр байгаа эсэх болон нөхцөлийг манай багтай холбогдон баталгаажуулна уу.",
      feats:["Хөтөлбөрийн боломжийг баталгаажуулах","Нөхцөлийг бичгээр шалгах","Үнийн мэдээллийг урьдчилан авах","Амлалт өгөхөөс өмнө багтай ярилцах"],
      cta:"Дэлгэрэнгүй лавлах" },
    corporate: { kicker:"Байгууллагын нислэгийн хүсэлт", title:"Байгууллагын нислэгийн талаар ярилцах",
      intro:"Байгууллагын чиглэл болон шаардлагаа илгээнэ үү. Манай баг боломжтой үйлчилгээ болон нөхцөлийг хариу өгөхдөө баталгаажуулна.",
      cta:"Байгууллагын хүсэлт илгээх" },
    dest: { kicker:"Чиглэлүүд", title:"Хаана ч хүргэх боломж", wx:"Мэдээлсэн цаг агаар", ms:"м/с",
      wxObserved:"Мэдээлсэн цаг", wxUnavailable:"Цаг агаарын мэдээлэл одоогоор боломжгүй.", wxStale:"Хуучин мэдээлэл — шийдвэр гаргахад ашиглахгүй.",
      locationDisclaimer:"Жишээ өгөгдөл гэж тэмдэглэсэн байршил нь зөвхөн дүрслэлийн зориулалттай; буух талбай эсвэл навигацийн өгөгдөл биш.",
      coordinatesPending:"Байршлын координатыг эх сурвалжтай нь шалгаж дуусаагүй.",
      coordinatesUnavailable:"Баталгаажсан координат одоогоор байхгүй.",
      disclaimer:"Цаг агаарын мэдээлэл нь зөвхөн мэдээллийн зорилготой. Нислэг явах эсэхийг нисгэгч болон үйл ажиллагааны алба шийднэ.",
      map:"Чиглэлүүдийн газрын зураг" },
    testi: { kicker:"Нислэгийн төлөвлөлт", text:"Нислэгийн хүсэлт бүрийг чиглэл, хуваарь болон үйл ажиллагааны шаардлагад тулгуурлан тусад нь хянана.", cite:"Ajet-ийн хүсэлт хяналтын зарчим" },
    faq: { kicker:"Түгээмэл асуулт", title:"Таны асуултад хариу", items:[
      ["Төлбөр хэзээ хийгддэг вэ?","Нислэгийн онцлогоос шалтгаалан шууд төлбөр хийгддэггүй. Хүсэлт илгээсний дараа диспетчер үнийн саналыг илгээж, та баталгаажуулснаар захиалга баталгаажна."],
      ["Цаг агаар нислэгт нөлөөлвөл?","Энэ сайтад харагдах цаг агаар нь зөвхөн мэдээллийн зориулалттай. Нислэгийн шийдвэрийг нисгэгч болон үйл ажиллагааны баг гаргана."],
      ["Хэдэн зорчигч ачих боломжтой вэ?","Онгоцноос хамаарна. Парк бүрийн суудлын багтаамжийг техникийн хэсэгт дурдсан болно."],
      ["Ачаа авч явах боломжтой юу?","Тийм ээ. Ачааны хэмжээ, жинг хүсэлт илгээхдээ дурдаарай — тохирох онгоц сонгогдоно."],
    ]},
    cta: { kicker:"Бэлэн үү?", title:"Дараагийн нислэгээ төлөвлөе", sub:"Хүсэлтээ илгээнэ үү. Диспетчер баг боломж болон дараагийн алхмыг тантай холбогдон ярилцана.", btn:"Нислэгийн хүсэлт илгээх" },
    sample: "Жишээ өгөгдөл: захиалагч баталгаажуулна", more: "Бүгдийг харах",
    form: { title:"Хувийн нислэгийн хүсэлт", name:"Нэр", phone:"Утас", email:"И-мэйл (заавал биш)", org:"Байгууллага (заавал биш)", from:"Хаанаас", to:"Хаашаа", round:"Хоёр чиглэлийн нислэг", date:"Огноо", time:"Цаг (заавал биш)", pax:"Зорчигчийн тоо", notes:"Нэмэлт мэдээлэл (ачаа гэх мэт)", submit:"Хувийн нислэг хүсэх", sending:"Илгээж байна...", ok:"Хүсэлт хүлээн авлаа. Дугаар:", okTail:"Диспетчер тантай холбогдоно.", err:"Илгээж чадсангүй. Дахин оролдоно уу, эсвэл утсаар холбогдоно уу." },
    foot: { tagline:"Захиалгат болон тусгай үүргийн нислэг. Таны цаг — бидний хариуцлага.", explore:"Судлах", company:"Компани", contact:"Холбогдох", legal:"Нууцлал · Үйлчилгээний нөхцөл", note:"Нислэг бүр нисгэгч, үйл ажиллагааны албаны шалгалтын дараа баталгаажна.", rights:"© 2026 Зохиогчийн эрх хуулиар хамгаалагдсан." },
  },
  en: {
    nav: { fleet: "Fleet", destinations: "Destinations", quote: "Request a private flight" },
    desc: "Request private helicopter charter to destinations in Mongolia. Every flight remains subject to operational review and confirmation.",
    hero: {
      kicker: "Private helicopter charter",
      title: "Above the ordinary, on your schedule",
      sub: "Plan private helicopter charter to destinations across Mongolia. Our dispatch team reviews each request and confirms availability before making a proposal.",
      cta: "Request a private flight", cta2: "Explore the fleet",
    },
    journeyKicker: "A JOURNEY, CONSIDERED",
    journeyIntro: "From a considered request to the place you came to find.",
    journey: [
      { label: "The departure", title: "A quieter kind of departure", body: "A considered beginning, with the details handled before you arrive." },
      { label: "The aircraft", title: "Chosen around your journey", body: "Tell us where you are going. Our team will review the route and available aircraft." },
      { label: "The takeoff", title: "Your time, thoughtfully used", body: "A private charter turns a long overland journey into more time where it matters." },
      { label: "Above the world", title: "A different perspective", body: "Mountain horizons, open country and the quiet distance between them." },
      { label: "The destination", title: "Closer to the places you came for", body: "Plan a direct journey to the landscapes and communities on your itinerary." },
      { label: "The arrival", title: "Arrive with more of the day", body: "A thoughtful route gives the journey a sense of ease from departure to arrival." },
      { label: "The invitation", title: "Where will your journey take you?", body: "Share your plans with our aviation concierge. Every request is reviewed personally." },
    ],
    priceDisclaimer: "Indicative starting prices only. Your final price will be confirmed in a written quote.",
    stats: [["01","Request"],["02","Proposal"],["03","Client approval"],["04","Operational confirmation"]],
    how: { kicker: "The journey", title: "From request to flight", steps: [
      ["Send a request","Tell us where, when and how many are flying — the form takes a minute."],
      ["Receive a proposal","Dispatch reviews the request and sends a tailored proposal when available."],
      ["Two-stage confirmation","After client approval, operations separately confirms the flight."],
    ]},
    fleet: { kicker:"The fleet", title:"Built for comfort. Held to a higher standard.",
      intro:"Aircraft and technical details are published only after review. Availability is assessed by dispatch for each request.",
      empty:"Fleet details are coming soon.", seats:"Seats", range:"Range", speed:"Cruise speed", payload:"Payload",
      specificationsPending:"Technical details have not been verified against a source." },
    member: { kicker:"Membership enquiry", title:"Ask about membership",
      intro:"Contact our team to confirm whether a membership programme is currently available and request its written terms.",
      feats:["Confirm current programme availability","Review terms in writing","Request pricing before committing","Speak with the team about eligibility"],
      cta:"Make an enquiry" },
    corporate: { kicker:"Corporate charter enquiry", title:"Discuss charter for your organisation",
      intro:"Share your organisation's route and requirements. Our team will confirm which services and terms are available in its response.",
      cta:"Send a corporate enquiry" },
    dest: { kicker:"Destinations", title:"Where would you like to land?", wx:"Reported weather", ms:"m/s",
      wxObserved:"Reported", wxUnavailable:"Weather data is currently unavailable.", wxStale:"Older report — do not use for operational decisions.",
      locationDisclaimer:"Locations marked as sample data are illustrative only; they are not verified landing sites or navigation data.",
      coordinatesPending:"Location coordinates have not been checked against a source.",
      coordinatesUnavailable:"No verified destination coordinates are available yet.",
      disclaimer:"Weather is shown for information only. The pilot and operations team decide whether a flight goes ahead.",
      map:"Map of destinations" },
    testi: { kicker:"Flight planning", text:"Every flight request is reviewed against its route, schedule and operational requirements.", cite:"Ajet request review approach" },
    faq: { kicker:"Questions", title:"Everything you need to know", items:[
      ["When do I pay?","A dispatcher sends a quote when one can be prepared. Payment arrangements, if applicable, are confirmed separately in the written terms."],
      ["What if weather affects my flight?","Weather information on this site is informational only. The pilot and operations team make the operational decision and advise you of next steps."],
      ["How many passengers can fly?","It depends on the aircraft. Each aircraft card in the Fleet section lists its seat capacity."],
      ["Can I bring luggage or cargo?","Yes. Note the size and weight in your request and we will assign the right aircraft and payload plan."],
    ]},
    cta: { kicker:"Ready when you are", title:"Let's plan your next flight", sub:"Send a request and our dispatch team will discuss availability and next steps with you.", btn:"Request a private flight" },
    sample: "Sample data: to be confirmed by the client", more: "View all",
    form: { title:"Private flight request", name:"Name", phone:"Phone", email:"Email (optional)", org:"Company (optional)", from:"From", to:"To", round:"Round trip", date:"Date", time:"Time (optional)", pax:"Passengers", notes:"Additional details (luggage, etc.)", submit:"Request your private flight", sending:"Sending request...", ok:"Request received. Reference:", okTail:"Our dispatcher will contact you.", err:"Could not send. Please try again or contact us by phone." },
    foot: { tagline:"Charter and special-mission helicopter flights. Your time — our responsibility.", explore:"Explore", company:"Company", contact:"Contact", legal:"Privacy · Terms of service", note:"Every flight is confirmed after a pilot and operations check.", rights:"© 2026 All rights reserved." },
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
    journeyKicker: copy.journeyKicker ?? base.journeyKicker,
    journeyIntro: copy.journeyIntro ?? base.journeyIntro,
    priceDisclaimer: copy.priceDisclaimer ?? base.priceDisclaimer,
    journey: base.journey.map((scene, index) => {
      const number = index + 1;
      const label = copy[`journey${number}Label` as CmsCopyKey];
      const title = copy[`journey${number}Title` as CmsCopyKey];
      const body = copy[`journey${number}Body` as CmsCopyKey];
      return { label: label ?? scene.label, title: title ?? scene.title, body: body ?? scene.body };
    }),
    hero: {
      ...base.hero,
      kicker: copy.heroKicker ?? base.hero.kicker,
      title: copy.heroTitle ?? base.hero.title,
      sub: copy.heroSub ?? base.hero.sub,
      cta: copy.heroCta ?? base.hero.cta,
      cta2: copy.heroCta2 ?? base.hero.cta2,
    },
    fleet: {
      ...base.fleet,
      title: copy.fleetTitle ?? base.fleet.title,
      intro: copy.fleetIntro ?? base.fleet.intro,
    },
    member: {
      ...base.member,
      title: copy.memberTitle ?? base.member.title,
      intro: copy.memberIntro ?? base.member.intro,
    },
    corporate: {
      ...base.corporate,
      title: copy.corporateTitle ?? base.corporate.title,
      intro: copy.corporateIntro ?? base.corporate.intro,
    },
    stats: base.stats.map((item, index) => {
      const number = index + 1;
      const value = copy[`stat${number}Value` as CmsCopyKey];
      const label = copy[`stat${number}Label` as CmsCopyKey];
      return [value ?? item[0], label ?? item[1]];
    }),
    testi: {
      ...base.testi,
      kicker: copy.testimonialKicker ?? base.testi.kicker,
      text: copy.testimonialText ?? base.testi.text,
      cite: copy.testimonialCite ?? base.testi.cite,
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
    foot: {
      ...base.foot,
      tagline: copy.footerTagline ?? base.foot.tagline,
      note: copy.footerNote ?? base.foot.note,
    },
  };
};