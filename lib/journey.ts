import type { Locale } from "@/lib/i18n";

export const serviceIds = ["charter", "catering", "photography"] as const;
export type ServiceId = (typeof serviceIds)[number];
export const extraIds = ["catering", "photography", "transfers"] as const;
export type ExtraId = (typeof extraIds)[number];
export const isServiceId = (value: unknown): value is ServiceId => serviceIds.some((id) => id === value);

export const journeyCopy = {
  en: {
    kicker: "One journey. Thoughtfully arranged.", title: "The flight is only the beginning.",
    intro: "Private helicopter travel, VIP catering and photography, brought together around your plans. Tell us what would make the journey right for you.",
    request: "Request this service", all: "Explore our services", serviceLabel: "Main service", extrasLabel: "Complete your journey", extrasNote: "Optional requests. Our team confirms availability and quotes each service separately.",
    services: [
      { id: "charter", index: "01", name: "Helicopter charter", body: "A private flight for business, a journey into Mongolia or a special occasion. Your route, schedule and party shape the plan.", detail: "Travel with your own group in the EC145 cabin. Share your itinerary, luggage and any onward arrangements; we will review the aircraft, landing sites and refuelling plan before confirming your flight.", image: "/img/ajet/ec145-rooftop.webp", alt: "A-JET EC145 helicopter on a rooftop helipad" },
      { id: "catering", index: "02", name: "VIP catering", body: "Catering coordinated with Sparrow, with your preferences and the occasion in mind. A thoughtful addition to the day, on the ground or around your flight.", detail: "Tell us the number of guests, timing, dietary preferences and allergies. Our team will confirm the menu, service arrangements and availability with Sparrow before you commit.", image: "/img/ajet/ec145-cabin.webp", alt: "The passenger cabin of the A-JET EC145" },
      { id: "photography", index: "03", name: "Photography & video", body: "Keep a record of the journey, capture an occasion or plan a dedicated shoot. Photography and video can be arranged alongside your flight.", detail: "Share your brief, locations, intended use and preferred timing. The creative plan, flight profile, crew and any permissions are agreed in advance. Camera installations and specialist aerial work require separate operational review.", image: "/img/ajet/studio-detail.webp", alt: "A-JET helicopter visualised in the studio" },
    ],
    catering: "Sparrow catering", photography: "Photography / video", transfers: "Arrival / departure transfers",
    cabinKicker: "Inside the EC145", cabinTitle: "Space for your people. Care in every detail.",
    cabinIntro: "An Airbus EC145 cabin for up to eight passengers. Room to share the journey, with arrangements shaped around your group.",
    seats: "Up to 8", seatsLabel: "Passenger places", engines: "2", enginesLabel: "Engines", cabinNote: "Passenger capacity and baggage allowance are confirmed for the aircraft configuration, route and conditions of your flight.",
    cabinView: "Cabin", exteriorView: "Exterior", studioView: "Explore in 3D", cabinAlt: "Actual A-JET EC145 passenger cabin with seating and headsets", exteriorAlt: "Actual A-JET EC145 helicopter parked on a city rooftop helipad",
    care: [
      { title: "A considered welcome", body: "A clear meeting plan and a personal briefing before you board." },
      { title: "Comfort, considered", body: "Share your seating, headset, luggage and accessibility needs before the journey." },
      { title: "Privacy, respected", body: "Your itinerary and any photography arrangements are agreed around your preferences." },
    ],
    transferKicker: "The journey on the ground", transferTitle: "A smoother arrival. A considered departure.",
    transferBody: "Ask A-JET to coordinate the ground legs of your itinerary, including airport arrivals and onward transfers. A dedicated service with two A-JET branded vehicles is being developed; availability is confirmed with your request.",
    transferStatus: "Ground transfers · on request", transferAction: "Discuss ground arrangements",
    requestsTitle: "Tell us when you would like to travel.", requestsBody: "You can send a request online at any time. Actual flight availability depends on the operating schedule, crew, maintenance and weather; a request is not a confirmed booking.",
    missionsTitle: "For a visit, an occasion or an important mission.", missions: [
      { title: "Discover Mongolia", body: "Private travel for international visitors, with the flight and supporting services coordinated around the itinerary." },
      { title: "Business & private travel", body: "A schedule built around meetings, remote destinations and time with the people who matter." },
      { title: "Search & rescue support", body: "A-JET participates in search and rescue work. Specialist requests are reviewed with the appropriate operational teams; this website is not an emergency dispatch service." },
    ],
    pricingTitle: "A personal plan. A written quote.", pricingBody: "Share your route, dates and service preferences. Our team will confirm availability, the charging basis and a written quotation for your journey.",
    faq: [
      ["Can I arrange more than a flight?", "Yes. Request Sparrow catering, photography or video, and arrival or departure transfers in the same enquiry. Availability and scope are confirmed separately."],
      ["How many passengers can travel?", "The EC145 cabin can accommodate up to eight passengers. The final number and baggage allowance depend on configuration, route, loading and operational conditions."],
      ["Can I enquire during winter?", "Yes. Requests can be sent online at any time. Winter maintenance, crew training, weather and the seasonal schedule may affect availability; our team will confirm your dates."],
      ["Does an online request confirm my flight?", "No. A-JET reviews your itinerary and sends availability, service details and a written quotation. A booking is confirmed separately with the team."],
    ],
  },
  mn: {
    kicker: "Нэг аялал. Бодолцсон бүрдэл бүр.", title: "Нислэг бол аяллын зөвхөн эхлэл.",
    intro: "Нисдэг тэрэгний хувийн нислэг, VIP кейтеринг, гэрэл зураг болон видео үйлчилгээг таны төлөвлөгөөнд нэгтгэнэ. Аялалд тань юу чухал болохыг бидэнд хэлээрэй.",
    request: "Энэ үйлчилгээг хүсэх", all: "Үйлчилгээтэй танилцах", serviceLabel: "Үндсэн үйлчилгээ", extrasLabel: "Аяллаа бүрэн төлөвлөх", extrasNote: "Нэмэлт хүсэлтүүд. Үйлчилгээ бүрийн боломж, үнийг манай баг тусад нь баталгаажуулна.",
    services: [
      { id: "charter", index: "01", name: "Нисдэг тэрэгний үйлчилгээ", body: "Бизнес уулзалт, Монгол орноор аялах аялал эсвэл онцгой мөчид зориулсан хувийн нислэг. Чиглэл, хуваарь, хамт явах хүмүүсээ та сонгоорой.", detail: "EC145-ийн бүхээгт өөрийн хүрээллээр аялаарай. Маршрут, ачаа, цаашдын төлөвлөгөөгөө хуваалцана уу. Манай баг нисдэг тэрэг, буух талбай, түлш цэнэглэх төлөвлөгөөг хянаад нислэгийг баталгаажуулна.", image: "/img/ajet/ec145-rooftop.webp", alt: "Хотын дээврийн буух талбай дээрх A-JET EC145 нисдэг тэрэг" },
      { id: "catering", index: "02", name: "VIP кейтеринг", body: "Sparrow-тай хамтарсан кейтерингийг таны амт, хүсэл, арга хэмжээнд тохируулан зохицуулна. Нислэгийн өмнө, дараа болон аяллынхаа хүрээнд төлөвлөх боломжтой.", detail: "Зочдын тоо, цаг, хоолны сонголт, дэглэм, харшлын мэдээллээ урьдчилан хэлээрэй. Манай баг Sparrow-тай цэс, үйлчилгээний хэлбэр, боломжийг тохиролцож баталгаажуулна.", image: "/img/ajet/ec145-cabin.webp", alt: "A-JET EC145 нисдэг тэрэгний зорчигчийн бүхээг" },
      { id: "photography", index: "03", name: "Гэрэл зураг, видео", body: "Аяллын дурсамж, онцгой мөч эсвэл тусгай зураг авалт. Гэрэл зураг, видео үйлчилгээг нислэгтэйгээ хамт төлөвлөөрэй.", detail: "Зураг авалтын санаа, байршил, зориулалт, хүссэн цагаа хуваалцаарай. Бүтээлч төлөвлөгөө, нислэгийн хэлбэр, баг, шаардлагатай зөвшөөрлийг урьдчилан тохиролцоно. Тусгай камер суурилуулах болон агаарын зураг авалтыг үйл ажиллагааны баг тусад нь хянана.", image: "/img/ajet/studio-detail.webp", alt: "Студид дүрсэлсэн A-JET нисдэг тэрэг" },
    ],
    catering: "Sparrow кейтеринг", photography: "Гэрэл зураг / видео", transfers: "Угтах / үдэх тээвэр",
    cabinKicker: "EC145-ийн бүхээгт", cabinTitle: "Хамт явах хүмүүст тань орон зай. Мөч бүрд анхаарал.",
    cabinIntro: "Найм хүртэлх зорчигчтой аялах Airbus EC145. Хамт олноороо тав тухтай нисэх бүхээг, таны аялалд тохирсон зохицуулалт.",
    seats: "8 хүртэл", seatsLabel: "Зорчигчийн суудал", engines: "2", enginesLabel: "Хөдөлгүүр", cabinNote: "Тухайн нисдэг тэрэгний тохиргоо, чиглэл, нислэгийн нөхцөлөөс хамааран зорчигчийн тоо, ачааны боломжийг баталгаажуулна.",
    cabinView: "Бүхээг", exteriorView: "Гаднаас", studioView: "3D-ээр үзэх", cabinAlt: "Суудал, чихэвчтэй A-JET EC145-ийн бодит зорчигчийн бүхээг", exteriorAlt: "Хотын дээврийн буух талбайд зогсож буй A-JET EC145-ийн бодит зураг",
    care: [
      { title: "Анхааралтай угталт", body: "Уулзах цэг, аяллын мэдээлэл тодорхой. Хөөрөхийн өмнө танд зориулсан зааварчилгаа." },
      { title: "Тав тухыг бодолцсон", body: "Суудал, чихэвч, ачаа болон тусгай хэрэгцээгээ аяллын өмнө бидэнд хэлээрэй." },
      { title: "Нууцлалыг хүндэтгэсэн", body: "Таны хөтөлбөр болон зураг авалтын зохицуулалтыг хүсэлд тань нийцүүлэн тохиролцоно." },
    ],
    transferKicker: "Газарт үргэлжлэх аялал", transferTitle: "Тайван угталт. Анхааралтай үдэлт.",
    transferBody: "Нисэх буудлын угталт, цаашдын хүргэлт зэрэг газрын тээврээ A-JET-ийн багтай хамт төлөвлөөрэй. A-JET-ийн брэндтэй хоёр автомашинаар үйлчлэх шийдлийг хөгжүүлж байна. Тухайн өдрийн боломжийг хүсэлтийн үед баталгаажуулна.",
    transferStatus: "Газрын тээвэр · хүсэлтээр", transferAction: "Газрын тээврээ ярилцах",
    requestsTitle: "Хэзээ аялахыг хүсэж байгаагаа хэлээрэй.", requestsBody: "Цахим хүсэлтээ хэдийд ч илгээж болно. Нислэгийн боломж нь хуваарь, баг, техникийн үйлчилгээ, цаг агаараас хамаарна. Хүсэлт илгээх нь захиалга баталгаажсан гэсэн үг биш.",
    missionsTitle: "Аялал, онцгой мөч, чухал үүрэгт.", missions: [
      { title: "Монголыг нээх аялал", body: "Гадаадын зочдын аялалд нислэг болон нэмэлт үйлчилгээг хөтөлбөрийн дагуу нэгтгэн төлөвлөнө." },
      { title: "Бизнес ба хувийн аялал", body: "Уулзалт, алслагдсан чиглэл, эрхэм хүмүүстэйгээ өнгөрүүлэх цагт тань тохирсон хуваарь." },
      { title: "Эрэн хайх, аврах ажиллагааны дэмжлэг", body: "A-JET эрэн хайх, аврах ажиллагаанд оролцдог. Тусгай хүсэлтийг холбогдох үйл ажиллагааны багтай хянана. Энэ вэбсайт нь яаралтай тусламжийн дуудлага хүлээн авах суваг биш." },
    ],
    pricingTitle: "Танд зориулсан төлөвлөгөө. Бичгээр өгөх санал.", pricingBody: "Чиглэл, огноо, хүссэн үйлчилгээгээ илгээгээрэй. Манай баг боломж, төлбөр тооцох нөхцөл болон үнийн саналыг бичгээр баталгаажуулна.",
    faq: [
      ["Нислэгээс гадна үйлчилгээ авч болох уу?", "Болно. Sparrow кейтеринг, гэрэл зураг, видео болон угтах, үдэх тээврийн хүсэлтийг нэг дор илгээж болно. Үйлчилгээ бүрийн боломж, хүрээг тусад нь баталгаажуулна."],
      ["Хэдэн зорчигч нисэх боломжтой вэ?", "EC145-ийн бүхээгт найм хүртэлх зорчигч багтана. Эцсийн тоо, ачааны боломж нь тохиргоо, чиглэл, ачаалал болон нислэгийн нөхцөлөөс хамаарна."],
      ["Өвлийн улиралд хүсэлт илгээж болох уу?", "Болно. Цахим хүсэлтээ хэдийд ч илгээж болно. Өвлийн техникийн үйлчилгээ, нисгэгчийн сургалт, цаг агаар, улирлын хуваарь нислэгийн боломжид нөлөөлөх тул огноог манай баг баталгаажуулна."],
      ["Цахим хүсэлт илгээснээр нислэг баталгаажих уу?", "Үгүй. A-JET аяллын мэдээллийг хянаж, боломж, үйлчилгээний дэлгэрэнгүй, үнийн саналыг илгээнэ. Захиалгыг багтай тусад нь баталгаажуулна."],
    ],
  },
} as const;

export const serviceName = (locale: Locale, id: ServiceId) => journeyCopy[locale].services.find((s) => s.id === id)!.name;
