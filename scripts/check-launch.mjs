// Checks presence only. Never print secret values.
const groups={
 'Database':['DATABASE_URL'],
 'Public domain':['PUBLIC_SITE_URL'],
 'Staff authentication':['CF_ACCESS_TEAM_DOMAIN','CF_ACCESS_AUD','ADMIN_ALLOWED_EMAILS','ADMIN_ROLE_MAPPINGS'],
 'Email delivery':['RESEND_API_KEY','QUOTE_FROM_EMAIL','QUOTE_TO_EMAIL'],
 'Spam protection':['NEXT_PUBLIC_TURNSTILE_SITE_KEY','TURNSTILE_SECRET_KEY'],
 'Media uploads':['S3_ENDPOINT','S3_BUCKET','S3_ACCESS_KEY_ID','S3_SECRET_ACCESS_KEY','NEXT_PUBLIC_MEDIA_BASE_URL'],
};let missing=0;for(const [group,keys]of Object.entries(groups)){const absent=keys.filter(key=>!process.env[key]?.trim());missing+=absent.length;console.log(`${absent.length?'MISSING':'PRESENT'} ${group}${absent.length?`: ${absent.join(', ')}`:''}`);}
try{if(new URL(process.env.PUBLIC_SITE_URL).protocol!=='https:')throw Error();}catch{missing++;console.log('MISSING valid HTTPS public domain');}
console.log('Manual checks: migrations 0001–0005; staff sign-in; test enquiry and delivery; client content/privacy approval; tile provider terms; backup and restore.');
console.log('No analytics tracker is installed. Select provider and privacy requirements before activation.');
process.exitCode=missing?1:0;
