import Link from "next/link";
import { notFound } from "next/navigation";
import StudioHero from "@/components/StudioHero";
import MediaView from "@/components/MediaView";
import ServiceCollection from "@/components/ServiceCollection";
import ExperienceCollection from "@/components/ExperienceCollection";
import JourneyProcess from "@/components/JourneyProcess";
import { getMediaSlots, getSiteCopy, mediaUrl, type MediaSlot } from "@/lib/content";
import { isVideoKey } from "@/lib/media";
import { isLocale, t } from "@/lib/i18n";
import { brandStory } from "@/lib/brand";
import { journeyCopy } from "@/lib/journey";
export default async function Home({params}:{params:Promise<{locale:string}>}) {
 const {locale}=await params; if(!isLocale(locale))notFound(); const mn=locale==='mn';
 const [copy,slots]=await Promise.all([getSiteCopy(locale),getMediaSlots()]); const d=t(locale,copy),story=brandStory[locale];
 const hero=slots.find(x=>x.key==='hero')!;
 const usesBrandImage=['/img/hero.jpg','/img/ajet-hero-poster.png','/img/brand/window-view.webp'].includes(hero.imageKey);
 const slotMedia=(item:MediaSlot)=>({src:mediaUrl(item.imageKey),video:isVideoKey(item.imageKey),poster:item.posterKey?mediaUrl(item.posterKey):undefined,style:{objectPosition:`${item.focalX}% ${item.focalY}%`}});
 return <div className="signature-home">
      <section className="hero brand-hero immersive-hero">
        <div className="immersive-hero__media">
            {usesBrandImage ? <StudioHero locale={locale} /> : <MediaView {...slotMedia(hero)} alt={hero.alt[locale]} loading="eager" fetchPriority="high" />}
        </div>
        <div className="immersive-hero__veil" aria-hidden="true" />
        <div className="hero__inner wrap">
          <div className="brand-hero__copy">
            <p className="eyebrow">{d.hero.kicker}</p>
            <h1>{d.hero.title}</h1>
            <p className="hero__sub">{d.hero.sub}</p>
            <div className="hero__actions">
              <Link href={`/${locale}/quote`} className="btn">{d.hero.cta}<span aria-hidden="true">↗</span></Link>
              <Link href={`/${locale}/estimate`} className="link-arrow">{d.hero.cta2}</Link>
            </div>
          </div>

        </div>
        <div className="brand-hero__bottom wrap">
          <span>{story.heritage}</span>
          <a href="#experience">{story.discover}<span aria-hidden="true">↓</span></a>
          <span className="brand-hero__location">Ulaanbaatar · Mongolia</span>
        </div>
      </section>


 <section className="signature-intro section" id="experience"><div className="wrap signature-split"><div><p className="eyebrow">A-JET AVIATION / MONGOLIA</p><h2>{mn?'Тэнгэрт эрх чөлөө.\nАялалд тань анхаарал.':'Freedom above.\nCare, all around.'}</h2><img className="signature-symbol" src="/img/brand/ajet-symbol.svg" alt="" width="90" height="60"/></div><div><p className="signature-lede">{story.intro}</p><div className="signature-values">{story.values.map(x=><article key={x.title}><div><h3>{x.title}</h3><p>{x.body}</p></div></article>)}</div></div></div></section>
 <section className="section signature-services" id="services"><div className="wrap"><div className="section__head"><div><p className="eyebrow">{mn?'Таны аяллын бүрдэл':'YOUR JOURNEY, CONSIDERED'}</p><h2>{mn?'Нислэгээс\nцааш үргэлжлэх халамж.':'Beyond the flight.'}</h2></div><p className="lede">{journeyCopy[locale].intro}</p></div><ServiceCollection locale={locale}/></div></section>
 <section className="signature-aircraft" id="fleet"><div className="wrap signature-aircraft-heading"><p className="eyebrow">Airbus EC145</p><h2>{mn?'Таны хувийн орон зай.\nТэнгэрийн уудамд.':'Your own space.\nAn open horizon.'}</h2></div><Link href={`/${locale}/fleet`} className="signature-aircraft-image" aria-label={mn?'EC145 нисдэг тэрэгтэй танилцах':'Explore the EC145'}><img src="/img/ajet-hero-production.webp" alt={mn?'A-JET EC145 студийн дүрслэл':'A-JET EC145 studio visualisation'} loading="lazy" width="1920" height="1080"/><span>{mn?'Нисдэг тэрэгтэй танилцах':'Explore the aircraft'} ↗</span></Link><div className="wrap signature-aircraft-foot"><p>{mn?'8 хүртэл зорчигч · Хоёр хөдөлгүүртэй · Хувийн нислэг':'Up to 8 passengers · Twin engine · Private charter'}</p><span>{mn?'Тохиргоо, чиглэлээс хамааран баталгаажуулна':'Configuration and route subject to confirmation'}</span></div></section>
 <ExperienceCollection locale={locale}/>
 <section className="signature-airport"><img src="/img/brand/window-view.webp" alt="" loading="lazy" width="1600" height="900"/><div className="wrap"><p className="eyebrow">AIRPORT HELICOPTER EXPRESS</p><h2>{mn?'Бууснаас эхлээд\nаялал тань үргэлжилнэ.':'Your arrival.\nA new perspective.'}</h2><p>{mn?'Нисэх буудлаас хот руу, хотоос нисэх буудал руу. Агаарын болон газрын тээврээ хамт төлөвлөөрэй.':'Airport to city. City to airport. Connect your flight with a thoughtfully arranged onward journey.'}</p><Link className="btn" href={`/${locale}/airport-express`}>{mn?'Чиглэлүүдтэй танилцах':'Explore Airport Express'} ↗</Link></div></section>
 <JourneyProcess locale={locale}/>
 <section className="section"><div className="wrap signature-split"><div><p className="eyebrow">{mn?'Асуулт, хариулт':'A FEW USEFUL DETAILS'}</p><h2>{mn?'Аяллын өмнө\nмэдэх зүйлс.':'Before you begin.'}</h2></div><div className="signature-faq">{journeyCopy[locale].faq.map(([q,a])=><details key={q}><summary>{q}<span aria-hidden="true">＋</span></summary><p>{a}</p></details>)}</div></div></section>
 <section className="signature-finale section"><div className="wrap"><p className="eyebrow">{mn?'Таны дараагийн аялал':'YOUR NEXT CHAPTER'}</p><h2>{mn?'Хаашаа нисэх вэ?':'Where shall we take you?'}</h2><div className="hero__actions"><Link className="btn" href={`/${locale}/estimate`}>{mn?'Аяллаа төлөвлөх':'Design your journey'} ↗</Link><Link className="link-arrow" href={`/${locale}/quote`}>{mn?'Багтай холбогдох':'Speak to our team'} ↗</Link></div></div></section>
 </div>;
}
