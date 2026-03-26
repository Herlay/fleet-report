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
    if (typeof val === 'string') val = val.replace(/,/g, ''); 
    const parsed = parseFloat(val);
    return isNaN(parsed) ? 0 : parsed;
};

export const processExcelFile = async (buffer) => {
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(buffer);
    
    const CHUNK_SIZE = 500; 

    // --- 1. PROCESS TRIPS (FINANCE DATA) ---
    const tripsSheet = workbook.getWorksheet(1); 
    const tripsRecords = [];
    let tripsSkipped = 0;

    if (tripsSheet) {
        console.log(`Processing Trips: ${tripsSheet.name}. Total Rows: ${tripsSheet.rowCount}`);

        for (let i = 3; i <= tripsSheet.rowCount; i++) {
            const row = tripsSheet.getRow(i);
            const sn = getSafeValue(row.getCell(2));
            if (!sn) continue; 

            const rawDate = row.getCell(6).value; 
            const parsedDate = parseExcelDate(rawDate);
            const truckNumber = getSafeValue(row.getCell(11));
            const brand = getSafeValue(row.getCell(27));

            if (parsedDate && truckNumber && brand) {
                tripsRecords.push([
                    sn, 
                    getSafeValue(row.getCell(3)) || `GEN-${sn}-${i}`, 
                    getSafeValue(row.getCell(4)), 
                    getSafeValue(row.getCell(5)) || 'UNKNOWN', 
                    parsedDate,
                    getSafeValue(row.getCell(7)), 
                    getSafeValue(row.getCell(8)) || 'No Description', 
                    getSafeValue(row.getCell(9)) || 'No Container',
                    getSafeValue(row.getCell(10)), 
                    truckNumber, 
                    getSafeValue(row.getCell(12)),
                    getSafeValue(row.getCell(13)), 
                    getSafeValue(row.getCell(14)), 
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
                    getFridayWeekStart(parsedDate)
                ]);
            } else {
                tripsSkipped++;
            }
        }

        if (tripsRecords.length > 0) {
            const tripSql = `
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
            
            for (let i = 0; i < tripsRecords.length; i += CHUNK_SIZE) {
                const chunk = tripsRecords.slice(i, i + CHUNK_SIZE);
                await pool.query(tripSql, [chunk]);
            }
        }
    }

    // --- 2. PROCESS MAINTENANCE TAB ---
    const maintSheet = workbook.getWorksheet('Maintainance') || workbook.getWorksheet('Maintenance'); 
    const maintRecords = [];
    
    if (maintSheet) {
        console.log(`Processing Maintenance: ${maintSheet.name}. Total Rows: ${maintSheet.rowCount}`);
        
        for (let i = 2; i <= maintSheet.rowCount; i++) {
            const row = maintSheet.getRow(i);
            
            const rawDate = row.getCell(1).value; 
            const itemDesc = getSafeValue(row.getCell(2)); 
            const amount = safeFloat(getSafeValue(row.getCell(3))); 
            const truckNo = getSafeValue(row.getCell(4)); 
            const fleetName = getSafeValue(row.getCell(5)); 
            const brand = getSafeValue(row.getCell(6));            
            
            const parsedDate = parseExcelDate(rawDate);

            // ARCHITECT NOTE: We include the row index 'i' in the unique key.
            // This allows multiple identical entries (e.g. 3 parking fees) on the same day,
            // but prevents doubling if the same file is uploaded twice.
            if (parsedDate && amount > 0 && truckNo) {
                const rawSignature = `DATE_${parsedDate}_ROW_${i}`;
                const uniqueKey = rawSignature.replace(/[^a-zA-Z0-9_-]/g, '');

                maintRecords.push([
                    uniqueKey,        // 1. record_id
                    parsedDate,       // 2. maintenance_date
                    itemDesc,         // 3. item_description
                    amount,           // 4. amount
                    truckNo,          // 5. truck_number
                    fleetName,        // 6. fleet_name
                    brand             // 7. brand
                ]);
            }
        }

        if (maintRecords.length > 0) {
            const maintSql = `
                INSERT INTO maintenance_logs (
                    record_id, maintenance_date, item_description, amount, truck_number, fleet_name, brand
                ) VALUES ?
                ON DUPLICATE KEY UPDATE 
                    maintenance_date = VALUES(maintenance_date),
                    amount = VALUES(amount),
                    truck_number = VALUES(truck_number),
                    fleet_name = VALUES(fleet_name),
                    brand = VALUES(brand),
                    item_description = VALUES(item_description)
            `;
            
            console.log(`Inserting ${maintRecords.length} maintenance records in batches of ${CHUNK_SIZE}...`);
            for (let i = 0; i < maintRecords.length; i += CHUNK_SIZE) {
                const chunk = maintRecords.slice(i, i + CHUNK_SIZE);
                await pool.query(maintSql, [chunk]);
            }
        }
    }

    return { 
        count: tripsRecords.length, 
        maintCount: maintRecords.length,
        skipped: tripsSkipped 
    };
};