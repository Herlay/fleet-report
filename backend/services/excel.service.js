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
    if (val === null || val === undefined) return 0;
    if (typeof val === 'number') return val;
    
    if (typeof val === 'string') {
         const cleaned = val.replace(/[^0-9.-]/g, ''); 
        const parsed = parseFloat(cleaned);
        return isNaN(parsed) ? 0 : parsed;
    }
    return 0;
};

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

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
        trip_date = VALUES(trip_date), profit = VALUES(profit), 
        maintenance = VALUES(maintenance), fleet_manager = VALUES(fleet_manager), brand = VALUES(brand)
`;

const maintSql = `
    INSERT INTO maintenance_logs (
        record_id, maintenance_date, item_description, amount, truck_number, fleet_name, brand
    ) VALUES ?
    ON DUPLICATE KEY UPDATE 
        maintenance_date = VALUES(maintenance_date), amount = VALUES(amount),
        truck_number = VALUES(truck_number), fleet_name = VALUES(fleet_name),
        brand = VALUES(brand), item_description = VALUES(item_description)
`;

export const processExcelFile = async (input) => {
    const CHUNK_SIZE = 100; 
    let finalTripsCount = 0;
    let finalMaintCount = 0;
    let tripsSkipped = 0;

    // ==========================================
    // MODE 1: ZERO-MEMORY STREAMING (Google Sync)
    // ==========================================
    if (typeof input === 'string') {
        console.log(`[STREAM MODE] Processing massive Excel file line-by-line...`);
        
        const options = {
            worksheets: 'emit',
            sharedStrings: 'cache'
        };
        
        // This is the magic reader that uses almost zero RAM
        const workbookReader = new ExcelJS.stream.xlsx.WorkbookReader(input, options);

        for await (const worksheet of workbookReader) {
            const isTrips = worksheet.id === 1;
            const isMaint = worksheet.name === 'Maintainance' || worksheet.name === 'Maintenance';

            // --- PROCESS TRIPS ---
            if (isTrips) {
                console.log(`Streaming Trips Data...`);
                let tripsChunk = [];

                for await (const row of worksheet) {
                    if (row.number < 3) continue; 

                    const sn = getSafeValue(row.getCell(2));
                    if (!sn) continue; 

                    const rawDate = row.getCell(6).value; 
                    const parsedDate = parseExcelDate(rawDate);
                    const truckNumber = getSafeValue(row.getCell(11));
                    const brand = getSafeValue(row.getCell(27));

                    if (parsedDate && truckNumber && brand) {
                        const rawTripId = getSafeValue(row.getCell(3));
                        const deterministicTripId = `TRP-${truckNumber}-${parsedDate}-${sn}`.replace(/[^a-zA-Z0-9_-]/g, '');
                        const finalTripId = rawTripId || deterministicTripId;

                        tripsChunk.push([
                            sn, finalTripId, getSafeValue(row.getCell(4)), getSafeValue(row.getCell(5)) || 'UNKNOWN', 
                            parsedDate, getSafeValue(row.getCell(7)), getSafeValue(row.getCell(8)) || 'No Description', 
                            getSafeValue(row.getCell(9)) || 'No Container', getSafeValue(row.getCell(10)), truckNumber, 
                            getSafeValue(row.getCell(12)), getSafeValue(row.getCell(13)), getSafeValue(row.getCell(14)), 
                            getSafeValue(row.getCell(15)), getSafeValue(row.getCell(16)), safeFloat(getSafeValue(row.getCell(17))), 
                            safeFloat(getSafeValue(row.getCell(18))), safeFloat(getSafeValue(row.getCell(19))), 
                            safeFloat(getSafeValue(row.getCell(20))), safeFloat(getSafeValue(row.getCell(21))), 
                            safeFloat(getSafeValue(row.getCell(22))), safeFloat(getSafeValue(row.getCell(23))), 
                            safeFloat(getSafeValue(row.getCell(24))), getSafeValue(row.getCell(25)), 
                            getSafeValue(row.getCell(26)), brand, safeFloat(getSafeValue(row.getCell(28))), 
                            getFridayWeekStart(parsedDate)
                        ]);

                        finalTripsCount++;

                        // Insert instantly when we hit 100 records, then empty the array
                        if (tripsChunk.length >= CHUNK_SIZE) {
                            await pool.query(tripSql, [tripsChunk]);
                            tripsChunk = []; 
                            await sleep(10); // Let server breathe
                        }
                    } else {
                        tripsSkipped++;
                    }
                }

                // Flush remaining trips
                if (tripsChunk.length > 0) {
                    await pool.query(tripSql, [tripsChunk]);
                    tripsChunk = [];
                }
            }
            
            // --- PROCESS MAINTENANCE ---
            else if (isMaint) {
                console.log(`Streaming Maintenance Data...`);
                let maintChunk = [];

                for await (const row of worksheet) {
                    if (row.number < 2) continue; 

                    const rawDate = row.getCell(1).value; 
                    const itemDesc = getSafeValue(row.getCell(2)); 
                    const amount = safeFloat(getSafeValue(row.getCell(3))); 
                    const truckNo = getSafeValue(row.getCell(4)); 
                    const fleetName = getSafeValue(row.getCell(5)); 
                    const brand = getSafeValue(row.getCell(6));            
                    
                    const parsedDate = parseExcelDate(rawDate);

                    if (parsedDate && amount > 0 && truckNo) {
                        // --- FIXED: Expanded unique ID fingerprint from 10 to 40 characters ---
                        const safeDesc = (itemDesc || '').substring(0, 40).replace(/[^a-zA-Z0-9]/g, '');
                        const rawSignature = `MNT_${truckNo}_${parsedDate}_${amount}_${safeDesc}`;
                        const uniqueKey = rawSignature.replace(/[^a-zA-Z0-9_-]/g, '');

                        maintChunk.push([
                            uniqueKey, parsedDate, itemDesc, amount, truckNo, fleetName, brand
                        ]);

                        finalMaintCount++;

                        if (maintChunk.length >= CHUNK_SIZE) {
                            await pool.query(maintSql, [maintChunk]);
                            maintChunk = [];
                            await sleep(10);
                        }
                    }
                }

                // Flush remaining maintenance
                if (maintChunk.length > 0) {
                    await pool.query(maintSql, [maintChunk]);
                    maintChunk = [];
                }
            }
        }
    } 
    
    // ==========================================
    // MODE 2: RAM BUFFER (Manual File Uploads)
    // ==========================================
    else {
        console.log(`[BUFFER MODE] Reading small file upload from RAM...`);
        const workbook = new ExcelJS.Workbook();
        await workbook.xlsx.load(input);

        // --- Trips ---
        const tripsSheet = workbook.getWorksheet(1); 
        if (tripsSheet) {
            let tripsRecords = [];
            for (let i = 3; i <= tripsSheet.rowCount; i++) {
                const row = tripsSheet.getRow(i);
                const sn = getSafeValue(row.getCell(2));
                if (!sn) continue; 

                const rawDate = row.getCell(6).value; 
                const parsedDate = parseExcelDate(rawDate);
                const truckNumber = getSafeValue(row.getCell(11));
                const brand = getSafeValue(row.getCell(27));

                if (parsedDate && truckNumber && brand) {
                    const rawTripId = getSafeValue(row.getCell(3));
                    const deterministicTripId = `TRP-${truckNumber}-${parsedDate}-${sn}`.replace(/[^a-zA-Z0-9_-]/g, '');
                    const finalTripId = rawTripId || deterministicTripId;

                    tripsRecords.push([
                        sn, finalTripId, getSafeValue(row.getCell(4)), getSafeValue(row.getCell(5)) || 'UNKNOWN', 
                        parsedDate, getSafeValue(row.getCell(7)), getSafeValue(row.getCell(8)) || 'No Description', 
                        getSafeValue(row.getCell(9)) || 'No Container', getSafeValue(row.getCell(10)), truckNumber, 
                        getSafeValue(row.getCell(12)), getSafeValue(row.getCell(13)), getSafeValue(row.getCell(14)), 
                        getSafeValue(row.getCell(15)), getSafeValue(row.getCell(16)), safeFloat(getSafeValue(row.getCell(17))), 
                        safeFloat(getSafeValue(row.getCell(18))), safeFloat(getSafeValue(row.getCell(19))), 
                        safeFloat(getSafeValue(row.getCell(20))), safeFloat(getSafeValue(row.getCell(21))), 
                        safeFloat(getSafeValue(row.getCell(22))), safeFloat(getSafeValue(row.getCell(23))), 
                        safeFloat(getSafeValue(row.getCell(24))), getSafeValue(row.getCell(25)), 
                        getSafeValue(row.getCell(26)), brand, safeFloat(getSafeValue(row.getCell(28))), 
                        getFridayWeekStart(parsedDate)
                    ]);
                    finalTripsCount++;
                } else {
                    tripsSkipped++;
                }
            }

            for (let i = 0; i < tripsRecords.length; i += CHUNK_SIZE) {
                const chunk = tripsRecords.slice(i, i + CHUNK_SIZE);
                await pool.query(tripSql, [chunk]);
            }
        }

        // --- Maintenance ---
        const maintSheet = workbook.getWorksheet('Maintainance') || workbook.getWorksheet('Maintenance'); 
        if (maintSheet) {
            let maintRecords = [];
            for (let i = 2; i <= maintSheet.rowCount; i++) {
                const row = maintSheet.getRow(i);
                const rawDate = row.getCell(1).value; 
                const itemDesc = getSafeValue(row.getCell(2)); 
                const amount = safeFloat(getSafeValue(row.getCell(3))); 
                const truckNo = getSafeValue(row.getCell(4)); 
                const fleetName = getSafeValue(row.getCell(5)); 
                const brand = getSafeValue(row.getCell(6));            
                const parsedDate = parseExcelDate(rawDate);

                if (parsedDate && amount > 0 && truckNo) {
                    // --- FIXED: Expanded unique ID fingerprint from 10 to 40 characters ---
                    const safeDesc = (itemDesc || '').substring(0, 40).replace(/[^a-zA-Z0-9]/g, '');
                    const rawSignature = `MNT_${truckNo}_${parsedDate}_${amount}_${safeDesc}`;
                    const uniqueKey = rawSignature.replace(/[^a-zA-Z0-9_-]/g, '');

                    maintRecords.push([
                        uniqueKey, parsedDate, itemDesc, amount, truckNo, fleetName, brand
                    ]);
                    finalMaintCount++;
                }
            }

            for (let i = 0; i < maintRecords.length; i += CHUNK_SIZE) {
                const chunk = maintRecords.slice(i, i + CHUNK_SIZE);
                await pool.query(maintSql, [chunk]);
            }
        }
    }

    return { 
        count: finalTripsCount, 
        maintCount: finalMaintCount,
        skipped: tripsSkipped 
    };
};