#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { getDb,REPO_ROOT } from './lib/db.mjs';
import { page,table,record,writeOut } from './lib/render.mjs';
import { readWorkbook,rating,allowed } from './lib/pq-import.mjs';

export const reads={
 analyses:'select code,name,owner,method,review_due from analyses order by code',
 worksheet:'select analysis_code,code,process_step,mode,effect,cause,severity,occurrence,detection_rating,rpn,action_priority,revision,reviewed from failure_register order by analysis_code,code',
 'risk-review':"select code,analysis_code analysis,mode,severity,action_priority,rpn,reviewed,open_actions,current_controls from failure_register order by severity desc nulls first,code",
 'actions-due':"select code,analysis,failure,owner,due,status,overdue,evidence_stale from action_register where status<>'verified' order by due,code",
 'high-severity':'select code,analysis_code analysis,mode,severity,action_priority,open_actions,reviewed from failure_register where severity>=9 order by severity desc,code',
 unreviewed:'select code,analysis_code analysis,mode,revision from failure_register where not reviewed order by code',
 'control-gaps':'select code,analysis_code analysis,mode,revision,current_controls from failure_register where current_controls=0 order by code',
 'stale-analyses':"select a.code,a.name,a.owner,a.review_due from analyses a where greatest(a.updated_at,coalesce((select max(f.updated_at) from failures f where f.analysis_id=a.id),a.created_at),coalesce((select max(n.created_at) from notes n where n.analysis_id=a.id),a.created_at))<now()-interval '30 days' order by a.code",
 'owner-workload':"select owner,count(*)::int active_actions,count(*) filter(where overdue)::int overdue_actions,count(*) filter(where status='completed')::int awaiting_verification from action_register where status<>'verified' group by owner order by owner",
 'recurring-causes':'select lower(trim(cause)) cause,count(*)::int failure_count,count(distinct analysis_id)::int analyses from failures group by lower(trim(cause)) order by failure_count desc,cause',
 'rating-gaps':"select code,analysis_code analysis,severity,occurrence,detection_rating,action_priority,rating_basis,priority_basis from failure_register where severity is null or occurrence is null or detection_rating is null or action_priority is null or rating_basis='' or priority_basis='' order by code",
 compliance:'select * from review_findings order by rule,analysis,code',
 attention:'select * from review_findings order by rule,analysis,code',
 notes:'select a.code analysis,n.actor,n.body,n.created_at from notes n join analyses a on a.id=n.analysis_id order by n.created_at,n.id',
 audit:'select entity,record_id,operation,actor,created_at from audit_log order by created_at,id',
 imports:'select a.code analysis,b.filename,b.sha256,b.row_count,b.actor,b.created_at from import_batches b join analyses a on a.id=b.analysis_id order by b.created_at,b.id',
 controls:'select c.code,f.code failure,c.characteristic,c.method,c.frequency,c.reaction,c.owner,c.failure_revision,f.revision current_revision from controls c join failures f on f.id=c.failure_id order by c.code',
 reviews:'select f.code failure,r.revision,r.actor,r.evidence,r.rationale,r.created_at from reviews r join failures f on f.id=r.failure_id order by r.created_at,r.id'
};
const entities=new Set(['analyses','failures','actions','controls']);
export async function resolve(db,entity,ref){
 if(!entities.has(entity))throw Error('Unknown entity');
 if(!ref)throw Error(`A ${entity} reference is required`);
 const label=entity==='analyses'?'name':entity==='failures'?'mode':entity==='actions'?'description':'characteristic';
 const rows=await db.query(`select id,code,${label} name from ${entity} order by code`);
 const q=String(ref).toLowerCase();
 let matches=rows.filter(r=>r.id===q||r.code.toLowerCase()===q||r.name.toLowerCase()===q);
 if(!matches.length)matches=rows.filter(r=>r.id.startsWith(q)||r.code.toLowerCase().startsWith(q)||r.name.toLowerCase().includes(q));
 if(matches.length!==1)throw Error(`${matches.length?'Ambiguous':'Unknown'} ${entity} reference ${ref}. Candidates: ${(matches.length?matches:rows).map(r=>`${r.code} (${r.name})`).join(', ')}`);
 return matches[0].id;
}
function options(args){const out={};for(const a of args){if(!a.startsWith('--'))continue;const p=a.indexOf('=');out[a.slice(2,p<0?undefined:p)]=p<0?true:a.slice(p+1);}return out;}
function need(o,k){if(typeof o[k]!=='string'||!o[k].trim())throw Error(`--${k}= is required`);return o[k].trim();}
export function date(s){if(!/^\d{4}-\d{2}-\d{2}$/.test(s)||!Number.isFinite(Date.parse(s))||new Date(s).toISOString().slice(0,10)!==s)throw Error('Date must be a real YYYY-MM-DD date');return s;}
const fieldMap={'step':'process_step','function':'function_text','mode':'mode','effect':'effect','cause':'cause','prevention':'prevention','detection':'detection','severity':'severity','occurrence':'occurrence','detection-rating':'detection_rating','priority':'action_priority','priority-basis':'priority_basis'};
function failureFields(o,create=false){
 const fields={};for(const [key,col] of Object.entries(fieldMap))if(key in o)fields[col]=need(o,key);
 if(create)for(const k of ['step','function','mode','effect','cause'])need(o,k);
 for(const c of ['severity','occurrence','detection_rating'])if(c in fields)fields[c]=rating(fields[c]);
 if('action_priority' in fields){fields.action_priority=fields.action_priority.toUpperCase();if(!['H','M','L'].includes(fields.action_priority))throw Error('Priority must be H, M or L');}
 return fields;
}
async function insert(db,entity,values){const keys=Object.keys(values);return (await db.query(`insert into ${entity}(${keys.join(',')}) values(${keys.map((_,i)=>'$'+(i+1)).join(',')}) returning *`,Object.values(values)))[0];}
async function failureDetail(db,id){const row=(await db.query('select * from failure_register where id=$1',[id]))[0];return {...row,actions:await db.query('select * from actions where failure_id=$1 order by code',[id]),controls:await db.query('select * from controls where failure_id=$1 order by code',[id]),reviews:await db.query('select * from reviews where failure_id=$1 order by created_at,id',[id])};}
async function draft(db,cmd,ref){
 let sections,title;
 if(cmd==='weekly-review'){
  title='Weekly failure review';sections=[];
  for(const c of ['risk-review','attention','actions-due'])sections.push({title:c,html:table(await db.query(reads[c]))});
 }else{
  const id=await resolve(db,'analyses',ref);const a=(await db.query('select * from analyses where id=$1',[id]))[0];
  title=cmd==='draft-fmea'?`FMEA working paper: ${a.code}`:`Action register: ${a.code}`;
  sections=[{title:'Analysis',html:record(a)},{title:'Records',html:table(await db.query(cmd==='draft-fmea'?'select code,process_step,function_text,mode,effect,cause,severity,occurrence,detection_rating,rpn,action_priority,revision,reviewed from failure_register where analysis_id=$1 order by code':'select * from action_register where analysis=$1 order by due,code',[cmd==='draft-fmea'?id:a.code]))}];
 }
 return [{file:writeOut('drafts',`${cmd}-${Date.now()}`,page({title,subtitle:'Draft for engineering review. No certification or process release.',sections}))}];
}
export async function run(db,args){
 const cmd=args[0]||'help',o=options(args),pos=args.slice(1).filter(a=>!a.startsWith('--'));
 if(cmd==='help'||cmd==='--help')return [{commands:[...Object.keys(reads),'analysis','failure','add-analysis','add-failure','revise-failure','add-action','complete-action','verify-action','add-control','review-failure','log','set-review-date','import','export','weekly-review','draft-fmea','draft-action-register'],syntax:'Use --key=value, --actor="Name" for writes. Read docs/cli.md.'}];
 if(reads[cmd])return db.query(reads[cmd]);
 if(cmd==='analysis'){
  const id=await resolve(db,'analyses',pos[0]);return [{...(await db.query('select * from analyses where id=$1',[id]))[0],failures:await db.query('select * from failure_register where analysis_id=$1 order by code',[id]),notes:await db.query('select * from notes where analysis_id=$1 order by created_at,id',[id])}];
 }
 if(cmd==='failure')return [await failureDetail(db,await resolve(db,'failures',pos[0]))];
 if(['weekly-review','draft-fmea','draft-action-register'].includes(cmd)){
  await db.exec('BEGIN READ ONLY');try{return await draft(db,cmd,pos[0]);}finally{await db.exec('ROLLBACK');}
 }
 if(cmd==='export'){
  const folder=path.resolve(need(o,'out'));fs.mkdirSync(folder,{mode:0o700});
  await db.exec('BEGIN READ ONLY');try{
   for(const entity of ['analyses','failures','actions','controls','reviews','notes','import_batches','audit_log'])fs.writeFileSync(path.join(folder,entity+'.json'),JSON.stringify(await db.query(`select * from ${entity} order by id`),null,2)+'\n',{mode:0o600,flag:'wx'});
   return [{folder,entities:8,source_workbooks:'base64 in import_batches.json',restore:'portable archive; not a database restore'}];
  }finally{await db.exec('ROLLBACK');}
 }
 const mutations=['add-analysis','add-failure','revise-failure','add-action','complete-action','verify-action','add-control','review-failure','log','set-review-date','import'];
 if(!mutations.includes(cmd))throw Error(`Unknown command ${cmd}`);
 const actor=need(o,'actor');await db.exec('BEGIN');
 try{
  await db.query("select set_config('app.actor',$1,true)",[actor]);
  let result;
  if(cmd==='add-analysis')result=await insert(db,'analyses',{code:need(o,'code'),name:need(o,'name'),owner:need(o,'owner'),method:o.method||'PFMEA',rating_basis:o['rating-basis']||'',review_due:o['review-due']?date(o['review-due']):null});
  if(cmd==='add-failure')result=await insert(db,'failures',{analysis_id:await resolve(db,'analyses',need(o,'analysis')),code:need(o,'code'),...failureFields(o,true)});
  if(cmd==='revise-failure'){
   const id=await resolve(db,'failures',need(o,'failure'));need(o,'reason');
   const f=await failureDetail(db,id),fields=failureFields(o);
   if(!Object.keys(fields).length)throw Error('No failure fields supplied');
   // A recorded priority needs a fresh basis whenever its ratings or priority change.
   if(['severity','occurrence','detection_rating','action_priority'].some(k=>k in fields)&&!('priority_basis' in fields))fields.priority_basis='';
   result=(await db.query(`update failures set ${Object.keys(fields).map((k,i)=>`${k}=$${i+2}`).join(',')} where id=$1 returning *`,[id,...Object.values(fields)]))[0];
   await insert(db,'notes',{analysis_id:f.analysis_id,actor,body:`Revision ${result.revision} of ${result.code}: ${o.reason}`});
  }
  if(cmd==='add-action')result=await insert(db,'actions',{failure_id:await resolve(db,'failures',need(o,'failure')),code:need(o,'code'),description:need(o,'description'),owner:need(o,'owner'),due:date(need(o,'due'))});
  if(cmd==='complete-action'||cmd==='verify-action'){
   const id=await resolve(db,'actions',need(o,'action'));const a=(await db.query('select * from actions where id=$1 for update',[id]))[0];
   const f=(await db.query('select * from failures where id=$1 for update',[a.failure_id]))[0];const evidence=need(o,'evidence');
   if(cmd==='complete-action'){
    if(a.status==='verified')throw Error('Verified action is immutable through this command; create a follow-up action');
    result=(await db.query("update actions set status='completed',completion_evidence=$2,completed_by=$3,completed_at=now(),completion_revision=$4 where id=$1 returning *",[id,evidence,actor,f.revision]))[0];
   }else{
    if(a.status!=='completed')throw Error('Complete action before verification');
    if(a.completed_by.toLowerCase()===actor.toLowerCase())throw Error('Verification requires a different named reviewer');
    if(a.completion_revision!==f.revision)throw Error('Failure changed; record current completion evidence again');
    result=(await db.query("update actions set status='verified',verification_evidence=$2,verified_by=$3,verified_at=now() where id=$1 returning *",[id,evidence,actor]))[0];
   }
  }
  if(cmd==='add-control'){
   const id=await resolve(db,'failures',need(o,'failure'));const f=(await db.query('select * from failures where id=$1 for update',[id]))[0];
   result=await insert(db,'controls',{failure_id:id,code:need(o,'code'),characteristic:need(o,'characteristic'),method:need(o,'method'),frequency:need(o,'frequency'),reaction:need(o,'reaction'),owner:need(o,'owner'),failure_revision:f.revision});
  }
  if(cmd==='review-failure'){
   const id=await resolve(db,'failures',need(o,'failure'));await db.query('select id from failures where id=$1 for update',[id]);
   const f=await failureDetail(db,id);
   if(!f.severity||!f.occurrence||!f.detection_rating||!f.rating_basis||!f.action_priority||!f.priority_basis||!f.prevention||!f.detection)throw Error('Ratings, rating basis, priority basis and controls must be recorded before review');
   if(f.action_priority==='H'&&!f.actions.length&&!o.rationale)throw Error('High priority needs an action or a recorded rationale');
   result=await insert(db,'reviews',{failure_id:id,revision:f.revision,actor,evidence:need(o,'evidence'),rationale:o.rationale||''});
  }
  if(cmd==='log')result=await insert(db,'notes',{analysis_id:await resolve(db,'analyses',need(o,'analysis')),actor,body:need(o,'body')});
  if(cmd==='set-review-date')result=(await db.query('update analyses set review_due=$2 where id=$1 returning *',[await resolve(db,'analyses',need(o,'analysis')),date(need(o,'due'))]))[0];
  if(cmd==='import'){
   if(pos[0]!=='pq-fmea')throw Error('Use import pq-fmea --file=export.xlsx --mapping=map.json --analysis=CODE --actor=Name [--dry-run]');
   const id=await resolve(db,'analyses',need(o,'analysis'));await db.query('select id from analyses where id=$1 for update',[id]);
   const mapping=JSON.parse(fs.readFileSync(need(o,'mapping'),'utf8'));const data=await readWorkbook(need(o,'file'),mapping);
   const prior=(await db.query('select * from import_batches where analysis_id=$1 and sha256=$2',[id,data.sha256]))[0];
   if(prior){
    const canonical=v=>v&&typeof v==='object'&&!Array.isArray(v)?Object.fromEntries(Object.keys(v).sort().map(k=>[k,canonical(v[k])])):v;
    if(JSON.stringify(canonical(prior.mapping))!==JSON.stringify(canonical(mapping)))throw Error('Same workbook with changed mapping: import into a fresh analysis for reconciliation');
    result={skipped:true,rows:prior.row_count,sha256:data.sha256};
   }
   else{
    if((await db.query('select id from failures where analysis_id=$1 limit 1',[id])).length)throw Error('Import requires an empty analysis; use a new analysis for a revised export');
    const batch=await insert(db,'import_batches',{analysis_id:id,filename:path.basename(o.file),sha256:data.sha256,mapping:JSON.stringify(mapping),source_base64:data.bytes.toString('base64'),row_count:data.rows.length,actor});
    const a=(await db.query('select code from analyses where id=$1',[id]))[0];
    for(const r of data.rows)await insert(db,'failures',{analysis_id:id,code:`${a.code}-R${r.number}`,...r.fields,import_id:batch.id,source_row:r.number,source_values:JSON.stringify(r.raw)});
    result={imported:data.rows.length,blank_rows:data.blank,sha256:data.sha256,review:'Required for every imported failure',dry_run:!!o['dry-run']};
   }
  }
  await db.exec(o['dry-run']?'ROLLBACK':'COMMIT');return [result];
 }catch(error){await db.exec('ROLLBACK');throw error;}
}
export function format(rows){
 if(!rows.length)return 'No records.';
 if(rows.some(r=>Object.values(r).some(v=>v&&typeof v==='object'&&!(v instanceof Date))))return JSON.stringify(rows,null,2);
 const cols=Object.keys(rows[0]);const val=v=>v instanceof Date?v.toISOString():String(v??'');const widths=cols.map(c=>Math.min(55,Math.max(c.length,...rows.map(r=>val(r[c]).length))));
 return [cols.map((c,i)=>c.padEnd(widths[i])).join(' | '),cols.map((_,i)=>'-'.repeat(widths[i])).join('-|-'),...rows.map(r=>cols.map((c,i)=>val(r[c]).replace(/[\r\n]+/g,' ').slice(0,widths[i]).padEnd(widths[i])).join(' | '))].join('\n');
}
if(process.argv[1]&&import.meta.url===pathToFileURL(path.resolve(process.argv[1])).href){
 let db;try{db=await getDb();const rows=await run(db,process.argv.slice(2));console.log(process.argv.includes('--json')?JSON.stringify(rows,null,2):format(rows));}catch(e){console.error(e.message);process.exitCode=1;}finally{if(db)await db.close();}
}
