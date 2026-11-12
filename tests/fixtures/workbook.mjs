import ExcelJS from 'exceljs';
export async function fixture(file,{bad=false,formula=false}={}){
 const wb=new ExcelJS.Workbook(),ws=wb.addWorksheet('FMEA');
 ws.addRow(['SYNTHETIC TEST FIXTURE, NOT A VENDOR EXPORT']);
 ws.addRow(['Failure chain','','','','','Controls','','Ratings']);
 ws.addRow(['Step','Function','Mode','Effect','Cause','Prevention','Detection','S','O','D','AP','Basis','Other source column']);
 ws.addRow(['Mix','Blend batch','Wrong ratio','Rejected batch','Worn valve','Recipe check','Sample test',8,4,6,'H','Fictional rating review','Keep this extra value']);
 ws.addRow(['Mix','Blend batch',bad?'':'Uneven mix','Rejected batch','Short cycle','Timer check','Sample test','','','','','','Second unmapped value']);
 ws.mergeCells('A4:A5');ws.mergeCells('B4:B5');
 if(formula)ws.getCell('H4').value={formula:'4+4',result:8};
 await wb.xlsx.writeFile(file);
}
