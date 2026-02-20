import ExcelJS from 'exceljs';
import pool from '../config/db.js';
import { getFridayWeekStart, parseExcelDate } from '../utils/date.utils.js';

const getSafeValue = (cell) => {
    if (!cell || cell.value === null || cell.value === undefined) return null;
    if (typeof cell.value === 'object') {
        if (Array.isArray(cell.value.richText)) return cell.value.richText.map(part => part.text).join('').trim();
        if (cell.value.text) return cell.value.text.toString().trim();
        if (cell.value.result !== undefined) return cell.value.result.toString().trim();
    }
    return cell.value.toString().trim();
};


const safeFloat = (val) => {
    const parsed = parseFloat(val);
    return isNaN(parsed) ? 0 : parsed;
};

export const processExcelFile = async (buffer) => {
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(buffer);
    
    const worksheet = workbook.getWorksheet(1);
    const records = [];
    const truckSyncList = new Set(); 
    let skippedRows = 0;

    console.log(`🚀 Processing: ${worksheet.name}. Total Rows: ${worksheet.rowCount}`);

    for (let i = 3; i <= worksheet.rowCount; i++) {
        const row = worksheet.getRow(i);
        const sn = getSafeValue(row.getCell(2));
        if (!sn) continue; 

      
        const cargoDesc = getSafeValue(row.getCell(8)) || 'No Description';
        const containerNo = getSafeValue(row.getCell(9)) || 'No Container';

        const rawDate = row.getCell(6).value; 
        const parsedDate = parseExcelDate(rawDate);
        const truckNumber = getSafeValue(row.getCell(11));
        const brand = getSafeValue(row.getCell(27));
        const fleet = getSafeValue(row.getCell(14));

        if (parsedDate && truckNumber && brand) {
            const weekStart = getFridayWeekStart(parsedDate);
            

            const rowData = [
                sn, 
                getSafeValue(row.getCell(3)) || `GEN-${sn}-${i}`, 
                getSafeValue(row.getCell(4)), 
                getSafeValue(row.getCell(5)) || 'UNKNOWN', 
                parsedDate,
                getSafeValue(row.getCell(7)), 
                cargoDesc, 
                containerNo,
                getSafeValue(row.getCell(10)), 
                truckNumber, 
                getSafeValue(row.getCell(12)),
                getSafeValue(row.getCell(13)), 
                fleet, 
                getSafeValue(row.getCell(15)),
                getSafeValue(row.getCell(16)),
                safeFloat(getSafeValue(row.getCell(17))), 
                safeFloat(getSafeValue(row.getCell(18))), 
                safeFloat(getSafeValue(row.getCell(19))), 
                safeFloat(getSafeValue(row.getCell(20))),
                safeFloat(getSafeValue(row.getCell(21))), 
                safeFloat(getSafeValue(row.getCell(22))), 
                safeFloat(getSafeValue(row.getCell(23))), 
                safeFloat(getSafeValue(row.getCell(24))), 
                getSafeValue(row.getCell(25)), 
                getSafeValue(row.getCell(26)), 
                brand,
                safeFloat(getSafeValue(row.getCell(28))), 
                weekStart
            ];
            records.push(rowData);
        } else {
            skippedRows++;
        }
    }

   
    const sql = `
        INSERT INTO trips (
            sn, trip_id, trip_category, data_entry_type, trip_date, 
            client, cargo_description, container_no, size, truck_number, 
            origin, destination, fleet, driver_name, shipping_line, 
            road_expenses, dispatch, fuel_cost, cost_per_litre, litres, 
            trip_rate, charges, profit, uploaded_week, fleet_manager, 
            brand, maintenance, week_start_date
        ) VALUES ?
        ON DUPLICATE KEY UPDATE 
            trip_date = VALUES(trip_date),
            profit = VALUES(profit), 
            maintenance = VALUES(maintenance),
            fleet_manager = VALUES(fleet_manager),
            brand = VALUES(brand)
    `;

    const [result] = await pool.query(sql, [records]);
  
    console.log(`Final DB Sync: ${records.length} records processed from Excel.`);
    return { count: records.length, skipped: skippedRows };
};

function formatDateForId(date) {
    if (!(date instanceof Date)) return '00000000';
    return date.toISOString().split('T')[0].replace(/-/g, '');
}