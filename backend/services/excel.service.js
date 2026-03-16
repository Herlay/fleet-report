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
    
    // --- 1. PROCESS TRIPS (FINANCE DATA) ---
    const tripsSheet = workbook.getWorksheet(1); 
    const tripsRecords = [];
    let tripsSkipped = 0;

    console.log(`🚀 Processing Trips: ${tripsSheet.name}. Total Rows: ${tripsSheet.rowCount}`);

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
        await pool.query(tripSql, [tripsRecords]);
    }

  // --- 2. PROCESS MAINTENANCE TAB ---
    const maintSheet = workbook.getWorksheet('Maintainance') || workbook.getWorksheet('Maintenance'); 
    const maintRecords = [];
    
    if (maintSheet) {
        console.log(`🔧 Processing Maintenance: ${maintSheet.name}. Total Rows: ${maintSheet.rowCount}`);
        
        // Assuming your headers are on row 1, data starts on row 2
        for (let i = 2; i <= maintSheet.rowCount; i++) {
            const row = maintSheet.getRow(i);
            
            const rawDate = row.getCell(1).value; // Column A: DATE
            const itemDesc = getSafeValue(row.getCell(2)); // Column B: ITEM
            const amount = safeFloat(getSafeValue(row.getCell(3))); // Column C: AMOUNT
            const truckNo = getSafeValue(row.getCell(4)); // Column D: TRUCK
            const fleetName = getSafeValue(row.getCell(5)); // Column E: FLEET
            const brand = getSafeValue(row.getCell(6)); // Column F: BRAND            
            
            const parsedDate = parseExcelDate(rawDate);

            // Only insert if it has a date, amount, and truck assigned
            if (parsedDate && amount > 0 && truckNo) {
                
                // 🔥 THE MAGIC: Create a unique signature for this exact repair
                // Example: "2025-12-31_T11971LA_30000_offaite_repair..."
                const rawSignature = `${parsedDate}_${truckNo}_${amount}_${itemDesc || 'no_desc'}`;
                // Remove spaces and special characters to make it a clean database ID
                const uniqueKey = rawSignature.replace(/[^a-zA-Z0-9_-]/g, '').substring(0, 200);

                maintRecords.push([
                    uniqueKey,        // 1. record_id (Primary Key)
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
                    fleet_name = VALUES(fleet_name),
                    brand = VALUES(brand),
                    item_description = VALUES(item_description)
            `;
            
            await pool.query(maintSql, [maintRecords]);
        }
    }

    console.log(`Final DB Sync: ${tripsRecords.length} trips, ${maintRecords.length} maintenance logs processed.`);
    return { 
        count: tripsRecords.length, 
        maintCount: maintRecords.length,
        skipped: tripsSkipped 
    };
};