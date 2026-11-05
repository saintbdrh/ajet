import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin, isAdminResponse } from "@/lib/admin-api";
import { getDatabase } from "@/lib/db";
export const runtime="nodejs";
const headers={"Cache-Control":"private, no-store"};
const idSchema=z.string().trim().min(5).max(60);
const schema=z.discriminatedUnion('action',[
 z.object({action:z.literal('note'),id:idSchema,body:z.string().trim().min(1).max(1000)}),
 z.object({action:z.literal('claim'),id:idSchema}),
 z.object({action:z.literal('release'),id:idSchema}),
]);
export async function GET(request:Request){
 const auth=await requireAdmin(request,['dispatcher']);if(isAdminResponse(auth))return auth;
 const id=idSchema.safeParse(new URL(request.url).searchParams.get('id'));if(!id.success)return NextResponse.json({ok:false,error:'Invalid request.'},{status:400,headers});
 const db=await getDatabase();if(!db)return NextResponse.json({ok:false,error:'Database unavailable.'},{status:503,headers});
 try{const quote=await db.prepare('SELECT assigned_to FROM quotes WHERE id = ?').bind(id.data).first<{assigned_to:string|null}>();if(!quote)return NextResponse.json({ok:false,error:'Request not found.'},{status:404,headers});
 const notes=await db.prepare('SELECT id, actor, body, created_at FROM quote_internal_notes WHERE quote_id = ? ORDER BY created_at DESC, id DESC LIMIT 100').bind(id.data).all();if(!notes.success)throw new Error('read');return NextResponse.json({ok:true,assignedTo:quote.assigned_to,notes:notes.results},{headers});}catch{return NextResponse.json({ok:false,error:'Request collaboration is unavailable. Check database migrations.'},{status:503,headers});}
}
export async function POST(request:Request){
 const auth=await requireAdmin(request,['dispatcher']);if(isAdminResponse(auth))return auth;
 const raw=await request.json().catch(()=>null),parsed=schema.safeParse(raw);if(!parsed.success)return NextResponse.json({ok:false,error:'Invalid collaboration action.'},{status:400,headers});
 const db=await getDatabase();if(!db)return NextResponse.json({ok:false,error:'Database unavailable.'},{status:503,headers});const action=parsed.data;
 try{const result=await db.transaction(async tx=>{
 const quote=await tx.prepare('SELECT assigned_to FROM quotes WHERE id = ? FOR UPDATE').bind(action.id).first<{assigned_to:string|null}>();if(!quote)return 404;
 if(action.action==='claim'&&quote.assigned_to&&quote.assigned_to!==auth.email)return 409;
 if(action.action==='release'&&quote.assigned_to!==auth.email&&auth.role!=='owner')return 403;
 if(action.action==='note'){
  const saved=await tx.prepare('INSERT INTO quote_internal_notes (quote_id, actor, body) VALUES (?, ?, ?)').bind(action.id,auth.email,action.body).run();if(!saved.success)throw new Error('note');
 }else{
  const saved=await tx.prepare('UPDATE quotes SET assigned_to = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').bind(action.action==='claim'?auth.email:null,action.id).run();if(!saved.success)throw new Error('assignment');
 }
 const audit=await tx.prepare("INSERT INTO admin_audit_log (actor, action, entity, entity_id, detail) VALUES (?, ?, 'quote', ?, ?)").bind(auth.email,`quote_${action.action}`,action.id,action.action==='note'?'Internal note added.':action.action).run();if(!audit.success)throw new Error('audit');return 200;
 });return NextResponse.json(result===200?{ok:true}:{ok:false,error:result===409?'Already assigned to another dispatcher.':result===404?'Request not found.':'Only the assigned dispatcher or owner can release this request.'},{status:result,headers});}catch{return NextResponse.json({ok:false,error:'Could not save. Check database migrations and retry.'},{status:503,headers});}
}
