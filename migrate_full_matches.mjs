import { initializeApp } from 'firebase/app';
import { getFirestore, doc, writeBatch } from 'firebase/firestore';
import fs from 'fs';

// NEW Project Config
const newConfig = {
    apiKey: "AIzaSyArmMeU94mWjWA_1a9dMZOFpI3JtS-7L_Q",
    authDomain: "ipl2026-pred.firebaseapp.com",
    projectId: "ipl2026-pred",
    storageBucket: "ipl2026-pred.firebasestorage.app",
    messagingSenderId: "179782583695",
    appId: "1:179782583695:web:ba448c264ccfd16555b7fa",
    measurementId: "G-GZ0L6DKE8B"
};

const IPL_TEAMS = [
    { id: 'csk', name: 'Chennai Super Kings', shortName: 'CSK', color: '#F9CD1B', emoji: '🦁' },
    { id: 'mi', name: 'Mumbai Indians', shortName: 'MI', color: '#004BA0', emoji: '🔵' },
    { id: 'rcb', name: 'Royal Challengers', shortName: 'RCB', color: '#CC0000', emoji: '🔴' },
    { id: 'kkr', name: 'Kolkata Knight Riders', shortName: 'KKR', color: '#3A225D', emoji: '💜' },
    { id: 'dc', name: 'Delhi Capitals', shortName: 'DC', color: '#0078BC', emoji: '🔷' },
    { id: 'srh', name: 'Sunrisers Hyderabad', shortName: 'SRH', color: '#FF822A', emoji: '🌅' },
    { id: 'rr', name: 'Rajasthan Royals', shortName: 'RR', color: '#EA1A85', emoji: '💗' },
    { id: 'pbks', name: 'Punjab Kings', shortName: 'PBKS', color: '#ED1B24', emoji: '🦅' },
    { id: 'lsg', name: 'Lucknow Super Giants', shortName: 'LSG', color: '#A72B2A', emoji: '🦊' },
    { id: 'gt', name: 'Gujarat Titans', shortName: 'GT', color: '#1C1C1C', emoji: '⚡' },
];

const SEED_MATCHES = [
    { id: 'm1', team1: IPL_TEAMS[2], team2: IPL_TEAMS[5], date: '2026-03-28T19:30:00+05:30', time: '', venue: 'M. Chinnaswamy Stadium, Bengaluru', status: 'upcoming' },
    { id: 'm2', team1: IPL_TEAMS[1], team2: IPL_TEAMS[3], date: '2026-03-29T19:30:00+05:30', time: '', venue: 'Wankhede Stadium, Mumbai', status: 'upcoming' },
    { id: 'm3', team1: IPL_TEAMS[6], team2: IPL_TEAMS[0], date: '2026-03-30T19:30:00+05:30', time: '', venue: 'ACA Cricket Stadium, Guwahati', status: 'upcoming' },
    { id: 'm4', team1: IPL_TEAMS[7], team2: IPL_TEAMS[9], date: '2026-03-31T19:30:00+05:30', time: '', venue: 'Maharaja Yadavindra Singh Stadium, Mullanpur', status: 'upcoming' },
    { id: 'm5', team1: IPL_TEAMS[8], team2: IPL_TEAMS[4], date: '2026-04-01T19:30:00+05:30', time: '', venue: 'Ekana Cricket Stadium, Lucknow', status: 'upcoming' },
    { id: 'm6', team1: IPL_TEAMS[3], team2: IPL_TEAMS[5], date: '2026-04-02T19:30:00+05:30', time: '', venue: 'Eden Gardens, Kolkata', status: 'upcoming' },
    { id: 'm7', team1: IPL_TEAMS[0], team2: IPL_TEAMS[7], date: '2026-04-03T19:30:00+05:30', time: '', venue: 'M. A. Chidambaram Stadium, Chennai', status: 'upcoming' },
    { id: 'm8', team1: IPL_TEAMS[4], team2: IPL_TEAMS[1], date: '2026-04-04T15:30:00+05:30', time: '', venue: 'Arun Jaitley Stadium, Delhi', status: 'upcoming' },
    { id: 'm9', team1: IPL_TEAMS[9], team2: IPL_TEAMS[6], date: '2026-04-04T19:30:00+05:30', time: '', venue: 'Narendra Modi Stadium, Ahmedabad', status: 'upcoming' },
    { id: 'm10', team1: IPL_TEAMS[5], team2: IPL_TEAMS[8], date: '2026-04-05T15:30:00+05:30', time: '', venue: 'Rajiv Gandhi Stadium, Hyderabad', status: 'upcoming' },
    { id: 'm11', team1: IPL_TEAMS[2], team2: IPL_TEAMS[0], date: '2026-04-05T19:30:00+05:30', time: '', venue: 'M. Chinnaswamy Stadium, Bengaluru', status: 'upcoming' },
    { id: 'm12', team1: IPL_TEAMS[3], team2: IPL_TEAMS[7], date: '2026-04-06T19:30:00+05:30', time: '', venue: 'Eden Gardens, Kolkata', status: 'upcoming' },
    { id: 'm13', team1: IPL_TEAMS[6], team2: IPL_TEAMS[1], date: '2026-04-07T19:30:00+05:30', time: '', venue: 'ACA Cricket Stadium, Guwahati', status: 'upcoming' },
    { id: 'm14', team1: IPL_TEAMS[4], team2: IPL_TEAMS[9], date: '2026-04-08T19:30:00+05:30', time: '', venue: 'Arun Jaitley Stadium, Delhi', status: 'upcoming' },
    { id: 'm15', team1: IPL_TEAMS[3], team2: IPL_TEAMS[8], date: '2026-04-09T19:30:00+05:30', time: '', venue: 'Eden Gardens, Kolkata', status: 'upcoming' },
    { id: 'm16', team1: IPL_TEAMS[6], team2: IPL_TEAMS[2], date: '2026-04-10T19:30:00+05:30', time: '', venue: 'ACA Cricket Stadium, Guwahati', status: 'upcoming' },
    { id: 'm17', team1: IPL_TEAMS[7], team2: IPL_TEAMS[5], date: '2026-04-11T15:30:00+05:30', time: '', venue: 'Maharaja Yadavindra Singh Stadium, Mullanpur', status: 'upcoming' },
    { id: 'm18', team1: IPL_TEAMS[0], team2: IPL_TEAMS[4], date: '2026-04-11T19:30:00+05:30', time: '', venue: 'M. A. Chidambaram Stadium, Chennai', status: 'upcoming' },
    { id: 'm19', team1: IPL_TEAMS[8], team2: IPL_TEAMS[9], date: '2026-04-12T15:30:00+05:30', time: '', venue: 'Ekana Cricket Stadium, Lucknow', status: 'upcoming' },
    { id: 'm20', team1: IPL_TEAMS[1], team2: IPL_TEAMS[2], date: '2026-04-12T19:30:00+05:30', time: '', venue: 'Wankhede Stadium, Mumbai', status: 'upcoming' },
    { id: 'm21', team1: IPL_TEAMS[5], team2: IPL_TEAMS[6], date: '2026-04-13T19:30:00+05:30', time: '', venue: 'Rajiv Gandhi Stadium, Hyderabad', status: 'upcoming', cricinfoId: '4a2b94e3-1e2d-45dc-b542-4764807e06e2' },
    { id: 'm22', team1: IPL_TEAMS[0], team2: IPL_TEAMS[3], date: '2026-04-14T19:30:00+05:30', time: '', venue: 'M. A. Chidambaram Stadium, Chennai', status: 'upcoming', cricinfoId: 'f30e699c-2e4f-48dd-98d2-4321d9e622e7' },
    { id: 'm23', team1: IPL_TEAMS[2], team2: IPL_TEAMS[8], date: '2026-04-15T19:30:00+05:30', time: '', venue: 'M. Chinnaswamy Stadium, Bengaluru', status: 'upcoming', cricinfoId: 'e8225a82-12c7-4bc8-8e40-4892f52d7d21' },
    { id: 'm24', team1: IPL_TEAMS[1], team2: IPL_TEAMS[7], date: '2026-04-16T19:30:00+05:30', time: '', venue: 'Wankhede Stadium, Mumbai', status: 'upcoming', cricinfoId: 'd0279d32-e120-4b96-b600-efa118f6ec12' },
    { id: 'm25', team1: IPL_TEAMS[9], team2: IPL_TEAMS[3], date: '2026-04-17T19:30:00+05:30', time: '', venue: 'Narendra Modi Stadium, Ahmedabad', status: 'upcoming', cricinfoId: 'c8f30ec3-a953-438a-ba4a-c5dedd97063a' },
    { id: 'm26', team1: IPL_TEAMS[2], team2: IPL_TEAMS[4], date: '2026-04-18T15:30:00+05:30', time: '', venue: 'M. Chinnaswamy Stadium, Bengaluru', status: 'upcoming', cricinfoId: 'd9242d24-f86f-4dbd-8291-3b00eadcda4a' },
];

function parseFirestoreValue(value) {
    if (value.stringValue !== undefined) return value.stringValue;
    if (value.integerValue !== undefined) return parseInt(value.integerValue);
    if (value.doubleValue !== undefined) return parseFloat(value.doubleValue);
    if (value.booleanValue !== undefined) return value.booleanValue;
    if (value.mapValue !== undefined) {
        const obj = {};
        for (const [key, val] of Object.entries(value.mapValue.fields || {})) {
            obj[key] = parseFirestoreValue(val);
        }
        return obj;
    }
    if (value.arrayValue !== undefined) {
        return (value.arrayValue.values || []).map(parseFirestoreValue);
    }
    if (value.nullValue !== undefined) return null;
    return value;
}

async function runMigration() {
    console.log('Initializing NEW app...');
    const app = initializeApp(newConfig, 're-migration-app');
    const db = getFirestore(app);

    const legacyMatchStates = JSON.parse(fs.readFileSync('legacy_matchStates.json', 'utf8'));
    const rawMatchStates = parseFirestoreValue({ mapValue: { fields: legacyMatchStates.fields } });

    console.log('Migrating Matches (Merging SEED + Legacy)...');
    const batch = writeBatch(db);
    for (const match of SEED_MATCHES) {
        const legacyState = rawMatchStates[match.id];
        const finalMatchDoc = {
            ...match,
            ...(legacyState || {})
        };
        batch.set(doc(db, 'matches', match.id), finalMatchDoc);
    }
    await batch.commit();

    console.log('Re-Migration COMPLETED successfully!');
}

runMigration().then(() => process.exit(0)).catch((e) => {
    console.error('Migration failed:', e);
    process.exit(1);
});
