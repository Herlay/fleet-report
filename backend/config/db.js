import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

const pool = mysql.createPool(process.env.MYSQL_PUBLIC_URL);

const testConnection = async () => {
    try {
        const connection = await pool.getConnection();
        console.log('MySQL Database Connected Successfully');
        connection.release();
    } catch (error) {
        console.error('Database Connection Failed:', error);
        process.exit(1);
    }
};

testConnection();

export default pool;