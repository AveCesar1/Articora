const path = require('path');
const fs = require('fs');
require('dotenv').config();

// Usamos better-sqlite3
const Database = require('better-sqlite3');

// Rutas relativas al proyecto
const dbPath = path.resolve(__dirname, '..', 'database', 'articora.db');
const initSqlPath = path.join(__dirname, '..', 'database', 'init.sql');
const indexesSqlPath = path.join(__dirname, '..', 'database', 'indexes.sql');
const configTablesSqlPath = path.join(__dirname, '..', 'database', 'config_tables.sql');

// Crear directorio de base de datos si no existe
const dbDir = path.dirname(dbPath);
if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
    console.log('Directorio de base de datos creado:', dbDir);
}

let db;
try {
    db = new Database(dbPath, {
        verbose: process.env.NODE_ENV === 'development' ? console.log : null,
        nativeBinding: process.env.NODE_ENV === 'production' ? 
            path.join(__dirname, '..', 'node_modules', 'better-sqlite3', 'build', 'Release', 'better_sqlite3.node') : 
            undefined
    });

    db.pragma('journal_mode = WAL');
    db.pragma('foreign_keys = ON');
    db.pragma('busy_timeout = 5000');
    db.pragma('cache_size = -2000');
    db.pragma('synchronous = NORMAL');

    console.log('✅ Conectado a la base de datos SQLite con better-sqlite3');
    console.log('📊 Ruta de la base de datos:', dbPath);
} catch (error) {
    console.error('❌ Error al conectar a la base de datos:', error.message);
    process.exit(1);
}

function executeSqlFile(filePath, description) {
    if (!fs.existsSync(filePath)) {
        console.error(`❌ Archivo ${description} no encontrado: ${filePath}`);
        return false;
    }

    const sql = fs.readFileSync(filePath, 'utf-8');

    // Intento rápido: ejecutar todo el SQL de una vez. db.exec maneja múltiples sentencias.
    try {
        db.exec(sql);
        console.log(`✅ ${description} ejecutado correctamente (db.exec)`);
        return true;
    } catch (execError) {
        console.warn(`⚠️ Ejecución con db.exec falló: ${execError.message}. Intentando ejecución por sentencias individuales...`);
    }

    // División simple por punto y coma para fallback
    const rawStatements = sql
        .split(';')
        .map(s => s.trim())
        .filter(s => s.length > 0);

    // Separar CREATE TABLE (y CREATE INDEX) primero para asegurar que las tablas existan
    const createStmts = rawStatements.filter(s => /^CREATE\s+(TABLE|INDEX)/i.test(s));
    const otherStmts = rawStatements.filter(s => !/^CREATE\s+(TABLE|INDEX)/i.test(s));

    let anySuccess = false;

    // Ejecutar CREATEs primero
    for (const stmt of createStmts) {
        try {
            db.prepare(stmt).run();
            anySuccess = true;
        } catch (stmtError) {
            console.error(`  ❌ Error en CREATE: ${stmt.substring(0, 140)}...`);
            console.error(`      ${stmtError.message}`);
            // continuar
        }
    }

    // Desactivar temporalmente foreign_keys para insertar datos que referencien tablas aún no completas
    let fkWasOn = false;
    try {
        const fk = db.pragma('foreign_keys', { simple: true });
        fkWasOn = fk === 1 || fk === '1' || fk === true;
    } catch (e) {
        fkWasOn = false;
    }

    if (fkWasOn) db.pragma('foreign_keys = OFF');

    // Ejecutar las demás sentencias
    for (const stmt of otherStmts) {
        try {
            if (!stmt || stmt.match(/^\s*--/)) continue;
            db.prepare(stmt).run();
            anySuccess = true;
        } catch (stmtError) {
            console.error(`  ❌ Error en sentencia: ${stmt.substring(0, 140)}...`);
            console.error(`      ${stmtError.message}`);
            // continuar
        }
    }

    // Restaurar foreign_keys si estaba activado
    if (fkWasOn) db.pragma('foreign_keys = ON');

    if (anySuccess) {
        console.log(`⚠️ ${description} ejecutado parcialmente o completamente mediante ejecución por sentencias.`);
        return true;
    } else {
        console.error(`❌ Error al ejecutar ${description}: ninguna sentencia se ejecutó correctamente`);
        return false;
    }
}

function initializeDatabase() {
    console.log('\n🔧 Inicializando base de datos...');

    try {
        const checkTable = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='users'");
        const tableExists = checkTable.get();
        if (tableExists) {
            console.log('📋 Base de datos ya inicializada, omitiendo creación de tablas.');
            return;
        }
    } catch (error) {
        // continue
    }

    executeSqlFile(initSqlPath, 'Esquema de base de datos');
}

function createIndexes() {
    console.log('\n⚡ Creando índices de optimización...');

    try {
        const checkIndex = db.prepare(
            "SELECT name FROM sqlite_master WHERE type='index' AND name='idx_users_username'"
        );
        const indexExists = checkIndex.get();
        if (indexExists) {
            console.log('📊 Índices ya existen, omitiendo creación.');
            return;
        }
    } catch (error) {
        // continue
    }

    executeSqlFile(indexesSqlPath, 'Índices de optimización');
}

function createConfigurationTables() {
    console.log('\n⚙️ Creando tablas de configuración...');

    try {
        const checkTable = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='user_interests'");
        const tableExists = checkTable.get();
        if (tableExists) {
            console.log('⚙️ Tablas de configuración ya existen, omitiendo creación.');
            return;
        }
    } catch (error) {
        // continue
    }

    executeSqlFile(configTablesSqlPath, 'Tablas de configuración');
}

function optimizeDatabase() {
    console.log('\n🚀 Optimizando base de datos...');
    try {
        db.pragma('optimize');
        db.prepare('ANALYZE').run();
        const integrity = db.prepare('PRAGMA integrity_check').get();
        if (integrity.integrity_check === 'ok') {
            console.log('✅ Integridad de la base de datos verificada');
        } else {
            console.warn('⚠️  Problemas de integridad detectados:', integrity.integrity_check);
        }
        console.log('🎯 Base de datos optimizada y lista para producción');
    } catch (error) {
        console.error('⚠️  Error durante la optimización:', error.message);
    }
}

function databaseMiddleware(req, res, next) {
    req.db = db;
    next();
}

async function initialize() {
    console.log('🚀 Iniciando Artícora - módulo de base de datos...\n');
    initializeDatabase();
    await new Promise(resolve => setTimeout(resolve, 100));
    createIndexes();
    await new Promise(resolve => setTimeout(resolve, 100));
    createConfigurationTables();
    optimizeDatabase();

    const tables = db.prepare("SELECT COUNT(*) as count FROM sqlite_master WHERE type='table'").get();
    const indexes = db.prepare("SELECT COUNT(*) as count FROM sqlite_master WHERE type='index'").get();

    console.log('\n📊 ESTADO DE LA BASE DE DATOS:');
    console.log(`   Tablas: ${tables.count}`);
    console.log(`   Índices: ${indexes.count}`);
    console.log(`   Ruta: ${dbPath}`);
    console.log('\n✅ Inicialización completada\n');
}

const dbHelpers = {
    getOne: (sql, params = []) => {
        try {
            const stmt = db.prepare(sql);
            return stmt.get(...params);
        } catch (error) {
            throw new Error(`Database get error: ${error.message}`);
        }
    },
    getAll: (sql, params = []) => {
        try {
            const stmt = db.prepare(sql);
            return stmt.all(...params);
        } catch (error) {
            throw new Error(`Database all error: ${error.message}`);
        }
    },
    run: (sql, params = []) => {
        try {
            const stmt = db.prepare(sql);
            return stmt.run(...params);
        } catch (error) {
            throw new Error(`Database run error: ${error.message}`);
        }
    },
    transaction: (callback) => {
        return db.transaction(callback)();
    }
};

process.on('SIGINT', () => {
    console.log('\n👋 Cerrando conexión a la base de datos...');
    try {
        db.prepare('PRAGMA optimize').run();
        db.close();
        console.log('✅ Conexión a la base de datos cerrada correctamente');
        process.exit(0);
    } catch (error) {
        console.error('❌ Error al cerrar la base de datos:', error);
        process.exit(1);
    }
});

module.exports = {
    db,
    initialize,
    databaseMiddleware,
    dbHelpers
};
