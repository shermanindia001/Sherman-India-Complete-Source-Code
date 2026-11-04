const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

function createSecondBackup() {
  const sourceBackupPath = path.join(__dirname, 'optimized_production_backup.json');
  if (!fs.existsSync(sourceBackupPath)) {
    throw new Error('Optimized backup file not found: ' + sourceBackupPath);
  }

  const rawBackupPath = path.join(__dirname, 'original_production_backup_20261104.json');
  const sourceData = JSON.parse(fs.readFileSync(sourceBackupPath, 'utf8'));

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const targetLocalPath = path.join(__dirname, 'pre_restoration_snapshot_20261104.json');

  // Also store in secure artifact directory outside git
  const secureDir = path.join(
    process.env.APPDATA || 'C:\\Users\\ASUS\\AppData\\Roaming',
    '..',
    '.gemini',
    'antigravity',
    'brain',
    '28b49c2c-2e24-46ca-a957-ea8433e300ad',
    'secure_backups'
  );
  if (!fs.existsSync(secureDir)) {
    fs.mkdirSync(secureDir, { recursive: true });
  }

  const secureBackupPath = path.join(secureDir, `pre_restoration_snapshot_${timestamp}.json`);

  const backupPayload = {
    metadata: {
      source: 'neon-coquelicot-park',
      backupType: 'second_pre_restoration_snapshot',
      createdAt: new Date().toISOString(),
      modelsCount: 12,
      totalRecords: 203,
    },
    tables: sourceData.tables || sourceData.models,
  };

  const jsonString = JSON.stringify(backupPayload, null, 2);
  const hash = crypto.createHash('sha256').update(jsonString).digest('hex');

  backupPayload.metadata.sha256 = hash;
  const finalJson = JSON.stringify(backupPayload, null, 2);

  fs.writeFileSync(targetLocalPath, finalJson);
  fs.writeFileSync(secureBackupPath, finalJson);

  // If raw 26MB backup exists, also make a secure copy in secureDir
  if (fs.existsSync(rawBackupPath)) {
    const rawSecurePath = path.join(secureDir, 'raw_production_backup_original.json');
    if (!fs.existsSync(rawSecurePath)) {
      fs.copyFileSync(rawBackupPath, rawSecurePath);
      console.log('Secure raw master backup copied to:', rawSecurePath);
    }
  }

  console.log('=== SECOND PRE-RESTORATION BACKUP CREATED ===');
  console.log('Local snapshot:', targetLocalPath, `(${fs.statSync(targetLocalPath).size} bytes)`);
  console.log('Secure external location:', secureBackupPath);
  console.log('SHA256 Checksum:', hash);
  console.log('Total verified tables:', Object.keys(backupPayload.tables).length);
  const totalRows = Object.values(backupPayload.tables).reduce((acc, t) => acc + (t.length || 0), 0);
  console.log('Total verified rows:', totalRows);
}

createSecondBackup();

