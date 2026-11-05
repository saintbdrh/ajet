/** No invented production domain: metadata activates when the owner configures it. */
export function publicSiteUrl():URL|null{
 try{const url=new URL(process.env.PUBLIC_SITE_URL??'');if(url.protocol!=='https:'||url.username||url.password||['localhost','127.0.0.1'].includes(url.hostname))return null;return new URL(url.origin);}catch{return null;}
}
