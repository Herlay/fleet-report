
export const getFridayWeekStart = (dateInput) => {
    if (!dateInput) return null;

    const date = new Date(dateInput);

    //Check if date is valid
    if (isNaN(date.getTime())) {
        console.warn(`Invalid Date encountered: ${dateInput}`);
        return null;
    }

// 0=Sun, 1=Mon, ..., 5=Fri, 6=Sat
    const day = date.getDay(); 
    
    // Calculate distance to previous Friday
    // Fri(5) -> 0 days ago
    // Sat(6) -> 1 day ago
    // Thu(4) -> 6 days ago
    const diff = (day - 5 + 7) % 7; 
    
    date.setDate(date.getDate() - diff);
    
    return date.toISOString().split('T')[0];
};

export const parseExcelDate = (excelDate) => {
    if (!excelDate) return null;

    if (excelDate instanceof Date) {
        return isNaN(excelDate.getTime()) ? null : excelDate;
    }

    if (typeof excelDate === 'number') {
        return new Date(Math.round((excelDate - 25569) * 86400 * 1000));
    }

    if (typeof excelDate === 'string') {
        const parsed = new Date(excelDate);
        return isNaN(parsed.getTime()) ? null : parsed;
    }

    return null;
};