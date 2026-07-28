const cron = require('node-cron');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { spawn } = require('child_process');
const { runDailyUrlChecks } = require('./lib/url_checker');
const { runCommentChecks } = require('./lib/offensive_checker');

function createBackupDB(sourceDbPath, backupDir, encryptionKeyHex) {
    return new Promise((resolve, reject) => {
        if (!fs.existsSync(backupDir)) {
            fs.mkdirSync(backupDir, { recursive: true });
        }

        const monthName = new Date().toISOString().slice(0, 7); // YYYY-MM
        const tempDbPath = path.join(backupDir, `articora-${monthName}.db.tmp`);
        const encryptedPath = path.join(backupDir, `articora-${monthName}.db.enc`);

        console.log(`Creando backup para: ${monthName}...`);

        try {
            fs.copyFileSync(sourceDbPath, tempDbPath);
            console.log(`Copiando base de datos a: ${tempDbPath}`);
        } catch (err) {
            return reject(new Error(`Falló al copiar la base de datos: ${err.message}`));
        }

        const key = Buffer.from(encryptionKeyHex, 'hex');
        const iv = crypto.randomBytes(16);
        const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);
        const input = fs.createReadStream(tempDbPath);
        const output = fs.createWriteStream(encryptedPath);

        output.write(iv);
        input.pipe(cipher).pipe(output);

        output.on('finish', () => {
            fs.unlink(tempDbPath, (err) => {
                if (err) console.warn(`No se pudo eliminar el archivo temporal: ${err.message}`);
                else console.log(`Archivo temporal eliminado: ${tempDbPath}`);
            });
            console.log(`Backup encriptado creado: ${encryptedPath}`);
            resolve(encryptedPath);
        });

        output.on('error', reject);
        cipher.on('error', reject);
        input.on('error', reject);
    });
}

function startCronJobs(options = {}) {
    const db = options.db;
    const debugging = !!options.debugging;
    const encryptionKey = options.encryptionKey || process.env.ENCRYPTION_KEY;
    const appRoot = options.appRoot || __dirname;

    // Horas concretas de ejecución:
    const REBUILD_IDF_AT = '0 2 * * *';
    const VERIFY_URLS_AT = '0 3 * * *';
    const VERIFY_COMMENTS_AT = '0 4 * * *';
    const RESET_WEEKLY_UPLOADS_AT = '0 0 * * 0';
    const MONTHLY_BACKUP_AT = '0 0 1 * *';

    // Se ejecuta todos los días a las 02:00: recalcula IDF.
    cron.schedule(REBUILD_IDF_AT, () => {
        console.log('Recalculando IDF...');
        const python = spawn('python3', ['tf-idf/recalc_idf.py']);
        python.stdout.on('data', (data) => console.log(data.toString()));
        python.stderr.on('data', (data) => console.error(data.toString()));
    });

    // Se ejecuta todos los días a las 03:00: verifica URLs rotas.
    cron.schedule(VERIFY_URLS_AT, () => {
        try {
            console.log('Ejecutando verificación diaria de URLs...');
            runDailyUrlChecks(db).then((r) => {
                if (debugging) console.log('runDailyUrlChecks result', r);
            }).catch(e => console.error('runDailyUrlChecks failed', e && e.message));
        } catch (e) {
            console.error('Error programando verificación de URLs:', e && e.message);
        }
    });

    // Se ejecuta todos los días a las 04:00: revisa lenguaje ofensivo en comentarios y contenido público.
    cron.schedule(VERIFY_COMMENTS_AT, () => {
        try {
            console.log('Ejecutando verificación diaria de lenguaje ofensivo en comentarios...');
            runCommentChecks(db).then(r => {
                if (debugging) console.log('runCommentChecks result', r);
            }).catch(e => console.error('runCommentChecks failed', e && e.message));
        } catch (e) {
            console.error('Error programando verificación de lenguaje ofensivo:', e && e.message);
        }
    });

    // Se ejecuta cada domingo a las 00:00: reinicia weekly_file_uploads.
    cron.schedule(RESET_WEEKLY_UPLOADS_AT, () => {
        try {
            console.log('Ejecutando reset semanal de weekly_file_uploads...');
            db.prepare('UPDATE users SET weekly_file_uploads = 0').run();
            console.log('Reset semanal completado: weekly_file_uploads = 0 para todos los usuarios');
        } catch (e) {
            console.error('Error al resetear weekly_file_uploads:', e && e.message);
        }
    });

    // Se ejecuta el día 1 de cada mes a las 00:00: genera backup encriptado.
    cron.schedule(MONTHLY_BACKUP_AT, async () => {
        try {
            const backupDir = path.join(appRoot, 'database', 'backups');
            const sourceDb = path.join(appRoot, 'database', 'articora.db');

            if (!encryptionKey) {
                console.warn('ENCRYPTION_KEY faltante – backup omitido');
                return;
            }

            await createBackupDB(sourceDb, backupDir, encryptionKey);

            const files = fs.readdirSync(backupDir)
                .filter(f => f.startsWith('articora-') && f.endsWith('.db.enc'))
                .sort();
            const toDelete = files.slice(0, -3);
            for (const file of toDelete) {
                fs.unlinkSync(path.join(backupDir, file));
                console.log(`Eliminando backup antiguo: ${file}`);
            }
        } catch (err) {
            console.error('Falló el backup mensual:', err);
        }
    });

    // Backups al inicio: si no existen, crea uno inicial.
    (async () => {
        try {
            const backupDir = path.join(appRoot, 'database', 'backups');
            const sourceDb = path.join(appRoot, 'database', 'articora.db');

            if (!fs.existsSync(backupDir)) fs.mkdirSync(backupDir, { recursive: true });

            const existingBackups = fs.readdirSync(backupDir)
                .filter(f => f.startsWith('articora-') && f.endsWith('.db.enc'));

            if (existingBackups.length === 0 && encryptionKey) {
                console.log('No se encontraron backups – creando backup inicial...');
                await createBackupDB(sourceDb, backupDir, encryptionKey);
            } else if (!encryptionKey) {
                console.warn('ENCRYPTION_KEY faltante – no se puede crear backup encriptado');
            } else {
                console.log(`${existingBackups.length} backup(s) existente(s) encontrado(s).`);
            }
        } catch (err) {
            console.error('Falló la verificación de backup al iniciar:', err);
        }
    })();
}

module.exports = { startCronJobs };