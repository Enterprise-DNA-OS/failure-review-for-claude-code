import fs from 'node:fs';
import crypto from 'node:crypto';
import ExcelJS from 'exceljs';
export const required=['process_step','function_text','mode','effect','cause'];
export const allowed=[...required,'prevention','detection','severity','occurrence','detection_rating','action_priority','priority_basis'];
export function rating(value){
 if(value===''||value===null||value===undefined)return null;
 if(!/^(?:[1-9]|10)$/.test(String(value).trim()))throw Error(`Rating must be an integer 1 to 10: ${value}`);
 return Number(value);
}
export async function readWorkbook(file,mapping){
 const bytes=fs.readFileSync(file);
 if(bytes.length>20*1024*1024)throw Error('Workbook exceeds 20 MiB limit');
 if(!mapping.sheet||!Number.isInteger(mapping.start_row)||!Number.isInteger(mapping.end_row)||mapping.start_row<1||mapping.end_row<mapping.start_row||mapping.end_row>20000)throw Error('Mapping needs sheet, start_row and end_row (1..20000)');
 for(const k of required)if(!mapping.columns?.[k])throw Error(`Mapping needs ${k}`);
 for(const [k,v] of Object.entries(mapping.columns||{}))if(!allowed.includes(k)||!Number.isInteger(v)||v<1||v>256)throw Error(`Invalid mapped column ${k}`);
 if(new Set(Object.values(mapping.columns)).size!==Object.keys(mapping.columns).length)throw Error('Mapped columns must be distinct');
 const wb=new ExcelJS.Workbook();await wb.xlsx.load(bytes);const sheet=wb.getWorksheet(mapping.sheet);
 if(!sheet)throw Error(`Unknown sheet ${mapping.sheet}; available: ${wb.worksheets.map(s=>s.name).join(', ')}`);
 if(mapping.end_row>sheet.rowCount)throw Error('Mapping extends past workbook rows');
 const value=(cell)=>{
  const v=cell.value;
  if(v instanceof Date)return v.toISOString();
  if(v&&typeof v==='object'){
   if('formula' in v||'sharedFormula' in v)throw Error(`Formula cell ${cell.address}: export values before importing`);
   if(v.richText)return v.richText.map(x=>x.text).join('');
   if(v.hyperlink)return v.text||'';
   throw Error(`Unsupported value at ${cell.address}`);
  }
  return String(v??'').trim();
 };
 const rows=[];let blank=0;
 for(let n=mapping.start_row;n<=mapping.end_row;n++){
  const raw={};for(let c=1;c<=sheet.columnCount;c++) {const cell=sheet.getCell(n,c);raw[c]=value(cell);}
  if(!Object.values(raw).some(Boolean)){blank++;continue;}
  const fields=Object.fromEntries(allowed.map(k=>[k,mapping.columns[k]?raw[mapping.columns[k]]||'':'']));
  for(const k of required)if(!fields[k])throw Error(`Row ${n}: missing ${k}; adjust the explicit mapping or repair the source`);
  for(const k of ['severity','occurrence','detection_rating'])fields[k]=rating(fields[k]);
  fields.action_priority=fields.action_priority.toUpperCase()||null;
  if(fields.action_priority&&!['H','M','L'].includes(fields.action_priority))throw Error(`Row ${n}: priority must be H, M or L`);
  rows.push({number:n,fields,raw});
 }
 if(!rows.length)throw Error('No failure rows in mapped range');
 return {bytes,sha256:crypto.createHash('sha256').update(bytes).digest('hex'),rows,blank};
}
