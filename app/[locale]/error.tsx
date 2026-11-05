"use client";
import Link from "next/link";
import { useParams } from "next/navigation";
export default function ErrorPage({reset}:{error:Error & {digest?:string};reset:()=>void}){const params=useParams(),mn=params.locale==='mn',locale=mn?'mn':'en';return <section className="section"><div className="wrap"><p className="eyebrow">A-JET AVIATION</p><h1>{mn?'Энэ хуудсыг ачаалж чадсангүй.':'We could not load this page.'}</h1><p className="lede">{mn?'Түр хүлээгээд дахин оролдоно уу.':'Please try again in a moment.'}</p><div className="hero__actions"><button className="btn" onClick={()=>reset()}>{mn?'Дахин оролдох':'Try again'}</button><Link className="link-arrow" href={`/${locale}`}>{mn?'Нүүр хуудас':'Return home'} ↗</Link></div></div></section>;}
