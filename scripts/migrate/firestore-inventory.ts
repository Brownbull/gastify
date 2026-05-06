#!/usr/bin/env tsx
/**
 * Firestore Production Inventory — Full Admin Export
 *
 * Phase A prereq A.12. Uses Firebase Admin SDK with the BoletApp service
 * account to enumerate ALL users and ALL collections, producing a complete
 * inventory with row counts, field shapes, and non-portable patterns.
 *
 * Run from the gastify repo root:
 *   npx tsx scripts/migrate/firestore-inventory.ts                     # production (default)
 *   npx tsx scripts/migrate/firestore-inventory.ts --app staging       # staging
 *   npx tsx scripts/migrate/firestore-inventory.ts --export            # also dump all docs to JSON
 *
 * Requires: BoletApp service account keys at
 *   /home/khujta/projects/bmad/boletapp/scripts/keys/serviceAccountKey.json
 */

import { initializeApp, cert, getApps, type ServiceAccount } from 'firebase-admin/app';
import { getFirestore, type DocumentData } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join } from 'path';

const BOLETAPP_ROOT = '/home/khujta/projects/bmad/boletapp';

const args = process.argv.slice(2);
const isStaging = args.includes('--app') && args[args.indexOf('--app') + 1] === 'staging';
const doExport = args.includes('--export');

const projectId = isStaging ? 'boletapp-staging' : 'boletapp-d609f';
const keyFile = isStaging ? 'serviceAccountKey.staging.json' : 'serviceAccountKey.json';
const keyPath = join(BOLETAPP_ROOT, 'scripts', 'keys', keyFile);

const COLLECTIONS = [
  'transactions',
  'merchant_mappings',
  'category_mappings',
  'subcategory_mappings',
  'item_name_mappings',
  'trusted_merchants',
  'airlocks',
  'personalRecords',
  'notifications',
] as const;

const SINGLETON_DOCS = [
  'preferences/settings',
  'credits/balance',
  'insightProfile/profile',
] as const;

interface CollectionStats {
  name: string;
  totalDocs: number;
  perUser: Record<string, number>;
  sampleFields: string[];
  allFieldsUnion: string[];
  nonPortablePatterns: string[];
}

interface SingletonStats {
  name: string;
  existsCount: number;
  totalUsers: number;
  sampleFields: string[];
  nonPortablePatterns: string[];
}

function detectNonPortable(data: DocumentData, prefix = ''): string[] {
  const patterns: string[] = [];
  for (const [key, value] of Object.entries(data)) {
    const fullKey = prefix ? `${prefix}.${key}` : key;
    if (value === null || value === undefined) continue;

    if (value.constructor?.name === 'Timestamp' || (value._seconds !== undefined && value._nanoseconds !== undefined)) {
      patterns.push(`${fullKey}: Firestore Timestamp → TIMESTAMPTZ`);
    } else if (Array.isArray(value)) {
      if (value.length > 0 && typeof value[0] === 'object' && value[0] !== null) {
        patterns.push(`${fullKey}: nested object array (${value.length} items) → separate table`);
      } else {
        patterns.push(`${fullKey}: primitive array → TEXT[] or separate table`);
      }
    } else if (typeof value === 'number' && !Number.isInteger(value) &&
               (key.toLowerCase().includes('price') || key.toLowerCase().includes('total'))) {
      patterns.push(`${fullKey}: money as float (${value}) → BIGINT _minor`);
    } else if (typeof value === 'object' && !Array.isArray(value) && value.constructor?.name !== 'Timestamp') {
      patterns.push(`${fullKey}: nested map → JSONB or flatten`);
      patterns.push(...detectNonPortable(value as DocumentData, fullKey));
    }
  }
  return patterns;
}

async function main() {
  console.log('╔═══════════════════════════════════════════════════════════╗');
  console.log(`║  Firestore Inventory — Full Admin Export                  ║`);
  console.log(`║  Project: ${projectId.padEnd(47)}║`);
  console.log(`║  Export docs: ${doExport ? 'YES' : 'NO (add --export to dump)'}${''.padEnd(doExport ? 38 : 22)}║`);
  console.log('╚═══════════════════════════════════════════════════════════╝\n');

  if (!existsSync(keyPath)) {
    console.error(`Service account key not found: ${keyPath}`);
    console.error('Copy from BoletApp project or check the path.');
    process.exit(1);
  }

  if (getApps().length === 0) {
    const sa = JSON.parse(readFileSync(keyPath, 'utf8')) as ServiceAccount;
    initializeApp({ credential: cert(sa), projectId });
  }

  const db = getFirestore();
  const auth = getAuth();

  // Enumerate all users via Firebase Auth
  console.log('Enumerating users via Firebase Auth...');
  const allUsers: Array<{ uid: string; email: string | undefined }> = [];
  let pageToken: string | undefined;
  do {
    const listResult = await auth.listUsers(1000, pageToken);
    for (const user of listResult.users) {
      allUsers.push({ uid: user.uid, email: user.email });
    }
    pageToken = listResult.pageToken;
  } while (pageToken);

  console.log(`Found ${allUsers.length} users\n`);

  const appId = projectId;
  const collectionStats: CollectionStats[] = [];
  const singletonStats: SingletonStats[] = [];
  const exportData: Record<string, Record<string, DocumentData[]>> = {};

  // Inventory each collection across all users
  for (const colName of COLLECTIONS) {
    process.stdout.write(`  ${colName}... `);
    const stats: CollectionStats = {
      name: colName,
      totalDocs: 0,
      perUser: {},
      sampleFields: [],
      allFieldsUnion: [],
      nonPortablePatterns: [],
    };

    if (doExport) exportData[colName] = {};

    for (const user of allUsers) {
      const colPath = `artifacts/${appId}/users/${user.uid}/${colName}`;
      const snapshot = await db.collection(colPath).get();
      const count = snapshot.size;
      if (count > 0) {
        stats.perUser[user.uid] = count;
        stats.totalDocs += count;

        // Analyze first doc for fields and non-portable patterns
        if (stats.sampleFields.length === 0) {
          const firstDoc = snapshot.docs[0].data();
          stats.sampleFields = Object.keys(firstDoc).sort();
          stats.nonPortablePatterns = [...new Set(detectNonPortable(firstDoc))];
        }

        // Union all field names across sampled docs
        for (const doc of snapshot.docs.slice(0, 5)) {
          for (const field of Object.keys(doc.data())) {
            if (!stats.allFieldsUnion.includes(field)) {
              stats.allFieldsUnion.push(field);
            }
          }
          const np = detectNonPortable(doc.data());
          for (const p of np) {
            if (!stats.nonPortablePatterns.includes(p)) {
              stats.nonPortablePatterns.push(p);
            }
          }
        }

        if (doExport) {
          exportData[colName][user.uid] = snapshot.docs.map(d => ({
            _id: d.id,
            _userId: user.uid,
            _userEmail: user.email,
            ...d.data(),
          }));
        }
      }
    }

    stats.allFieldsUnion.sort();
    const userCount = Object.keys(stats.perUser).length;
    console.log(`${stats.totalDocs} docs across ${userCount} users`);
    collectionStats.push(stats);
  }

  // Inventory singleton docs
  console.log('\n  Singleton documents:');
  for (const singletonPath of SINGLETON_DOCS) {
    process.stdout.write(`    ${singletonPath}... `);
    const stats: SingletonStats = {
      name: singletonPath,
      existsCount: 0,
      totalUsers: allUsers.length,
      sampleFields: [],
      nonPortablePatterns: [],
    };

    for (const user of allUsers) {
      const docPath = `artifacts/${appId}/users/${user.uid}/${singletonPath}`;
      const docRef = await db.doc(docPath).get();
      if (docRef.exists) {
        stats.existsCount++;
        if (stats.sampleFields.length === 0) {
          const data = docRef.data()!;
          stats.sampleFields = Object.keys(data).sort();
          stats.nonPortablePatterns = [...new Set(detectNonPortable(data))];
        }
      }
    }

    console.log(`${stats.existsCount}/${allUsers.length} users`);
    singletonStats.push(stats);
  }

  // Write JSON report
  const report = {
    exportedAt: new Date().toISOString(),
    firebaseProject: projectId,
    totalUsers: allUsers.length,
    users: allUsers.map(u => ({ uid: u.uid, email: u.email })),
    collections: collectionStats.map(s => ({
      name: s.name,
      totalDocuments: s.totalDocs,
      usersWithData: Object.keys(s.perUser).length,
      perUser: s.perUser,
      fields: s.allFieldsUnion,
      nonPortablePatterns: s.nonPortablePatterns,
    })),
    singletons: singletonStats.map(s => ({
      name: s.name,
      existsCount: s.existsCount,
      totalUsers: s.totalUsers,
      fields: s.sampleFields,
      nonPortablePatterns: s.nonPortablePatterns,
    })),
  };

  const reportPath = join(process.cwd(), 'docs', 'rebuild', 'FIRESTORE-EXPORT.json');
  writeFileSync(reportPath, JSON.stringify(report, null, 2) + '\n');

  if (doExport) {
    const dataPath = join(process.cwd(), 'docs', 'rebuild', 'firestore-data-export.json');
    writeFileSync(dataPath, JSON.stringify(exportData, null, 2) + '\n');
    console.log(`\nFull data export saved to: ${dataPath}`);
  }

  // Print summary
  const totalDocs = collectionStats.reduce((sum, s) => sum + s.totalDocs, 0) +
                    singletonStats.reduce((sum, s) => sum + s.existsCount, 0);

  console.log('\n' + '='.repeat(70));
  console.log('FIRESTORE INVENTORY SUMMARY');
  console.log('='.repeat(70));
  console.log(`Project: ${projectId}`);
  console.log(`Total users: ${allUsers.length}`);
  console.log(`Total documents: ${totalDocs}`);
  console.log('');

  console.log('Collection                  | Total | Users w/data | Fields | Non-portable');
  console.log('----------------------------|-------|--------------|--------|-------------');
  for (const s of collectionStats) {
    const name = s.name.padEnd(27);
    const total = String(s.totalDocs).padStart(5);
    const users = String(Object.keys(s.perUser).length).padStart(12);
    const fields = String(s.allFieldsUnion.length).padStart(6);
    const np = s.nonPortablePatterns.length > 0
      ? s.nonPortablePatterns.map(p => p.split(':')[0]).join(', ')
      : '(none)';
    console.log(`${name} | ${total} | ${users} | ${fields} | ${np}`);
  }

  console.log('');
  console.log('Singleton                   | Exists | Total Users | Fields');
  console.log('----------------------------|--------|-------------|-------');
  for (const s of singletonStats) {
    const name = s.name.padEnd(27);
    const exists = String(s.existsCount).padStart(6);
    const total = String(s.totalUsers).padStart(11);
    const fields = String(s.sampleFields.length).padStart(6);
    console.log(`${name} | ${exists} | ${total} | ${fields}`);
  }

  console.log(`\nReport saved to: ${reportPath}`);
}

main().catch(e => {
  console.error('Error:', e.message);
  process.exit(1);
});
