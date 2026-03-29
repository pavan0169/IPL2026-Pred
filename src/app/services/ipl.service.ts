import { Injectable, signal, computed } from '@angular/core';
import { Match, Team, Prediction, UserStats, MatchResult } from '../models/ipl.models';
import { db } from '../firebase.config';
import { collection, onSnapshot, doc, setDoc, updateDoc, writeBatch, deleteField } from 'firebase/firestore';
import { AuthService } from './auth.service';

const IPL_TEAMS: Team[] = [
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

const SEED_MATCHES: Match[] = [
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
    { id: 'm27', team1: IPL_TEAMS[5], team2: IPL_TEAMS[0], date: '2026-04-18T19:30:00+05:30', time: '', venue: 'Rajiv Gandhi Stadium, Hyderabad', status: 'upcoming' },
    { id: 'm28', team1: IPL_TEAMS[3], team2: IPL_TEAMS[6], date: '2026-04-19T15:30:00+05:30', time: '', venue: 'Eden Gardens, Kolkata', status: 'upcoming' },
    { id: 'm29', team1: IPL_TEAMS[7], team2: IPL_TEAMS[8], date: '2026-04-19T19:30:00+05:30', time: '', venue: 'Maharaja Yadavindra Singh Stadium, Mullanpur', status: 'upcoming' },
    { id: 'm30', team1: IPL_TEAMS[9], team2: IPL_TEAMS[1], date: '2026-04-20T19:30:00+05:30', time: '', venue: 'Narendra Modi Stadium, Ahmedabad', status: 'upcoming', cricinfoId: 'f72cb89b-3085-4556-a814-d28a44885b0e' },
    { id: 'm31', team1: IPL_TEAMS[5], team2: IPL_TEAMS[4], date: '2026-04-21T19:30:00+05:30', time: '', venue: 'Rajiv Gandhi Stadium, Hyderabad', status: 'upcoming', cricinfoId: '771739a7-564d-412d-a181-05722657e8f6' },
    { id: 'm32', team1: IPL_TEAMS[8], team2: IPL_TEAMS[6], date: '2026-04-22T19:30:00+05:30', time: '', venue: 'Ekana Cricket Stadium, Lucknow', status: 'upcoming', cricinfoId: '0d462688-8d5b-4aef-936c-094c7b664bb3' },
    { id: 'm33', team1: IPL_TEAMS[1], team2: IPL_TEAMS[0], date: '2026-04-23T19:30:00+05:30', time: '', venue: 'Wankhede Stadium, Mumbai', status: 'upcoming', cricinfoId: 'ef0699eb-29be-4949-8e4f-474e90a6be6b' },
    { id: 'm34', team1: IPL_TEAMS[2], team2: IPL_TEAMS[9], date: '2026-04-24T19:30:00+05:30', time: '', venue: 'M. Chinnaswamy Stadium, Bengaluru', status: 'upcoming', cricinfoId: 'bff622ad-fe85-46f0-8969-80a3df72face' },
    { id: 'm35', team1: IPL_TEAMS[4], team2: IPL_TEAMS[7], date: '2026-04-25T15:30:00+05:30', time: '', venue: 'Arun Jaitley Stadium, Delhi', status: 'upcoming', cricinfoId: '0a8f942f-d951-4dd4-9543-3077af3c91eb' },
    { id: 'm36', team1: IPL_TEAMS[6], team2: IPL_TEAMS[5], date: '2026-04-25T19:30:00+05:30', time: '', venue: 'Sawai Mansingh Stadium, Jaipur', status: 'upcoming', cricinfoId: 'c2c75e2e-df87-47fa-8ccd-8473058efae5' },
    { id: 'm37', team1: IPL_TEAMS[9], team2: IPL_TEAMS[0], date: '2026-04-26T15:30:00+05:30', time: '', venue: 'Narendra Modi Stadium, Ahmedabad', status: 'upcoming', cricinfoId: '3bfe7704-4818-4501-9708-35261cb09f96' },
    { id: 'm38', team1: IPL_TEAMS[8], team2: IPL_TEAMS[3], date: '2026-04-26T19:30:00+05:30', time: '', venue: 'Ekana Cricket Stadium, Lucknow', status: 'upcoming', cricinfoId: 'eab75760-b25e-421f-8321-eb0806cbb784' },
    { id: 'm39', team1: IPL_TEAMS[4], team2: IPL_TEAMS[2], date: '2026-04-27T19:30:00+05:30', time: '', venue: 'Arun Jaitley Stadium, Delhi', status: 'upcoming', cricinfoId: '0ed37800-881a-401b-a1fe-f41adb244741' },
    { id: 'm40', team1: IPL_TEAMS[7], team2: IPL_TEAMS[6], date: '2026-04-28T19:30:00+05:30', time: '', venue: 'Maharaja Yadavindra Singh Stadium, Mullanpur', status: 'upcoming', cricinfoId: '80dbe709-8a04-48b2-878d-988042000536' },
    { id: 'm41', team1: IPL_TEAMS[1], team2: IPL_TEAMS[5], date: '2026-04-29T19:30:00+05:30', time: '', venue: 'Wankhede Stadium, Mumbai', status: 'upcoming', cricinfoId: '595e2ad6-5b3a-4f81-9c8f-84ee3633b8c7' },
    { id: 'm42', team1: IPL_TEAMS[9], team2: IPL_TEAMS[2], date: '2026-04-30T19:30:00+05:30', time: '', venue: 'Narendra Modi Stadium, Ahmedabad', status: 'upcoming', cricinfoId: 'abe1482c-3e40-43c8-be6f-9da9da643111' },
    { id: 'm43', team1: IPL_TEAMS[6], team2: IPL_TEAMS[4], date: '2026-05-01T19:30:00+05:30', time: '', venue: 'Sawai Mansingh Stadium, Jaipur', status: 'upcoming', cricinfoId: 'f2c8b750-3dcd-41c0-acbf-0e9c179eddaf' },
    { id: 'm44', team1: IPL_TEAMS[0], team2: IPL_TEAMS[1], date: '2026-05-02T19:30:00+05:30', time: '', venue: 'M. A. Chidambaram Stadium, Chennai', status: 'upcoming', cricinfoId: 'ca40682e-02d0-40a0-9a4c-f2a9c8754de0' },
    { id: 'm45', team1: IPL_TEAMS[5], team2: IPL_TEAMS[3], date: '2026-05-03T15:30:00+05:30', time: '', venue: 'Rajiv Gandhi Stadium, Hyderabad', status: 'upcoming', cricinfoId: '178d76ff-214e-46a7-8fe2-27ab7afb75d3' },
    { id: 'm46', team1: IPL_TEAMS[9], team2: IPL_TEAMS[7], date: '2026-05-03T19:30:00+05:30', time: '', venue: 'Narendra Modi Stadium, Ahmedabad', status: 'upcoming', cricinfoId: '37b02340-7238-41b7-bcf3-8ae4215e4bee' },
    { id: 'm47', team1: IPL_TEAMS[1], team2: IPL_TEAMS[8], date: '2026-05-04T19:30:00+05:30', time: '', venue: 'Wankhede Stadium, Mumbai', status: 'upcoming', cricinfoId: '34d1e7e5-a498-4a9b-bb89-5a273ef81b8d' },
    { id: 'm48', team1: IPL_TEAMS[4], team2: IPL_TEAMS[0], date: '2026-05-05T19:30:00+05:30', time: '', venue: 'Arun Jaitley Stadium, Delhi', status: 'upcoming', cricinfoId: 'c741ba65-dc7d-40cb-8e2c-7a415f3df8ab' },
    { id: 'm49', team1: IPL_TEAMS[5], team2: IPL_TEAMS[7], date: '2026-05-06T15:30:00+05:30', time: '', venue: 'Rajiv Gandhi Stadium, Hyderabad', status: 'upcoming', cricinfoId: 'd9c104ce-83e8-4342-97d5-33d7ece256b4' },
    { id: 'm50', team1: IPL_TEAMS[8], team2: IPL_TEAMS[2], date: '2026-05-07T19:30:00+05:30', time: '', venue: 'Ekana Cricket Stadium, Lucknow', status: 'upcoming', cricinfoId: '79770ea7-9819-4414-97fe-f01444aa8ccf' },
    { id: 'm51', team1: IPL_TEAMS[4], team2: IPL_TEAMS[3], date: '2026-05-08T19:30:00+05:30', time: '', venue: 'Arun Jaitley Stadium, Delhi', status: 'upcoming', cricinfoId: '058243dd-5399-42b2-ae68-d3e9796fa3b2' },
    { id: 'm52', team1: IPL_TEAMS[6], team2: IPL_TEAMS[9], date: '2026-05-09T19:30:00+05:30', time: '', venue: 'Sawai Mansingh Stadium, Jaipur', status: 'upcoming', cricinfoId: '1511024c-7c43-453d-b3db-2ee6d6ee6c6e' },
    { id: 'm53', team1: IPL_TEAMS[0], team2: IPL_TEAMS[8], date: '2026-05-10T15:30:00+05:30', time: '', venue: 'M. A. Chidambaram Stadium, Chennai', status: 'upcoming', cricinfoId: '129a6173-9149-481f-9eeb-e1c8afe1533f' },
    { id: 'm54', team1: IPL_TEAMS[2], team2: IPL_TEAMS[1], date: '2026-05-10T19:30:00+05:30', time: '', venue: 'Nava Raipur Cricket Stadium, Nava Raipur', status: 'upcoming', cricinfoId: '634ea924-b96f-478a-bd6f-48370174f344' },
    { id: 'm55', team1: IPL_TEAMS[7], team2: IPL_TEAMS[4], date: '2026-05-11T19:30:00+05:30', time: '', venue: 'HPCA Cricket Stadium, Dharamshala', status: 'upcoming', cricinfoId: '9c3b727a-2767-4e2b-a30c-855b3c6b59aa' },
    { id: 'm56', team1: IPL_TEAMS[9], team2: IPL_TEAMS[5], date: '2026-05-12T19:30:00+05:30', time: '', venue: 'Narendra Modi Stadium, Ahmedabad', status: 'upcoming', cricinfoId: 'ae3b8240-34ff-48ea-b74b-4840ab72ae33' },
    { id: 'm57', team1: IPL_TEAMS[2], team2: IPL_TEAMS[3], date: '2026-05-13T19:30:00+05:30', time: '', venue: 'Nava Raipur Cricket Stadium, Nava Raipur', status: 'upcoming', cricinfoId: 'ef86ee7b-dbea-4e3c-9bbf-af77da1ff223' },
    { id: 'm58', team1: IPL_TEAMS[7], team2: IPL_TEAMS[1], date: '2026-05-14T19:30:00+05:30', time: '', venue: 'HPCA Cricket Stadium, Dharamshala', status: 'upcoming', cricinfoId: 'df78909a-2ab7-4760-b679-705c381bd2d3' },
    { id: 'm59', team1: IPL_TEAMS[8], team2: IPL_TEAMS[0], date: '2026-05-15T19:30:00+05:30', time: '', venue: 'Ekana Cricket Stadium, Lucknow', status: 'upcoming', cricinfoId: '999ec29a-1cdf-48e0-b8c5-9d3ae95a45c3' },
    { id: 'm60', team1: IPL_TEAMS[3], team2: IPL_TEAMS[9], date: '2026-05-16T19:30:00+05:30', time: '', venue: 'Eden Gardens, Kolkata', status: 'upcoming', cricinfoId: 'a30ef3c8-1002-4181-9167-39b9b7ea7760' },
    { id: 'm61', team1: IPL_TEAMS[7], team2: IPL_TEAMS[2], date: '2026-05-17T15:30:00+05:30', time: '', venue: 'HPCA Cricket Stadium, Dharamshala', status: 'upcoming', cricinfoId: '26e1c31e-1033-4d72-887e-2c6ccb09b82f' },
    { id: 'm62', team1: IPL_TEAMS[4], team2: IPL_TEAMS[6], date: '2026-05-17T19:30:00+05:30', time: '', venue: 'Arun Jaitley Stadium, Delhi', status: 'upcoming', cricinfoId: '0ea0c97c-6fb6-4728-832e-5abd0820edc2' },
    { id: 'm63', team1: IPL_TEAMS[0], team2: IPL_TEAMS[5], date: '2026-05-18T19:30:00+05:30', time: '', venue: 'M. A. Chidambaram Stadium, Chennai', status: 'upcoming', cricinfoId: '66477e53-9cd5-4be2-bc3d-78114722da72' },
    { id: 'm64', team1: IPL_TEAMS[6], team2: IPL_TEAMS[8], date: '2026-05-19T19:30:00+05:30', time: '', venue: 'Sawai Mansingh Stadium, Jaipur', status: 'upcoming', cricinfoId: '39a0b9c4-bcb7-4dd6-b21c-e9bf537edce7' },
    { id: 'm65', team1: IPL_TEAMS[3], team2: IPL_TEAMS[1], date: '2026-05-20T19:30:00+05:30', time: '', venue: 'Eden Gardens, Kolkata', status: 'upcoming', cricinfoId: 'e5b677a2-6e87-4c9e-baa5-d997644501f1' },
    { id: 'm66', team1: IPL_TEAMS[0], team2: IPL_TEAMS[9], date: '2026-05-21T19:30:00+05:30', time: '', venue: 'M. A. Chidambaram Stadium, Chennai', status: 'upcoming', cricinfoId: '2b441eeb-c4be-4d4e-892e-92f2e47b33df' },
    { id: 'm67', team1: IPL_TEAMS[5], team2: IPL_TEAMS[2], date: '2026-05-22T15:30:00+05:30', time: '', venue: 'Rajiv Gandhi Stadium, Hyderabad', status: 'upcoming', cricinfoId: '25c031c2-2776-48a7-824c-fe66e0e6cf48' },
    { id: 'm68', team1: IPL_TEAMS[8], team2: IPL_TEAMS[7], date: '2026-05-23T19:30:00+05:30', time: '', venue: 'Ekana Cricket Stadium, Lucknow', status: 'upcoming', cricinfoId: '913bdcbf-179f-452e-a2ed-75f807b7c2b0' },
    { id: 'm69', team1: IPL_TEAMS[1], team2: IPL_TEAMS[6], date: '2026-05-24T15:30:00+05:30', time: '', venue: 'Wankhede Stadium, Mumbai', status: 'upcoming', cricinfoId: 'e1ecf776-e9eb-4456-82df-e6c8b6e12cd3' },
    { id: 'm70', team1: IPL_TEAMS[3], team2: IPL_TEAMS[4], date: '2026-05-24T19:30:00+05:30', time: '', venue: 'Eden Gardens, Kolkata', status: 'upcoming', cricinfoId: 'aec16058-7741-4f3d-a1b0-68d7210b29c9' },
];

@Injectable({ providedIn: 'root' })
export class IplService {
    private _matches = signal<Match[]>([]);
    private _predictions = signal<Prediction[]>([]);

    matches = this._matches.asReadonly();
    predictions = this._predictions.asReadonly();
    teams = IPL_TEAMS;

    constructor(private authService: AuthService) {
        if (typeof window !== 'undefined') {
            this.initFirestore();
        }
    }

    private initFirestore() {
        const matchStatesRef = doc(db, 'appData', 'matchStates');
        onSnapshot(matchStatesRef, async (snapshot) => {
            if (!snapshot.exists()) {
                await setDoc(matchStatesRef, {});
                this._matches.set([...SEED_MATCHES]);
            } else {
                const states: any = snapshot.data() || {};
                const updatedMatches = SEED_MATCHES.map(m => {
                    const extra = states[m.id];
                    if (extra) {
                        return { ...m, ...extra };
                    }
                    return m;
                });
                this._matches.set(updatedMatches);
            }
        });

        onSnapshot(collection(db, 'user_predictions'), (snapshot) => {
            const allPreds: Prediction[] = [];
            snapshot.docs.forEach(d => {
                const data = d.data();
                if (data && data['predictions']) {
                    Object.values(data['predictions']).forEach((p: any) => {
                        allPreds.push(p as Prediction);
                    });
                }
            });
            this._predictions.set(allPreds);
        });
    }

    userStats = computed<UserStats[]>(() => {
        const preds = this._predictions();
        const matches = this._matches();
        const userMap = new Map<string, UserStats>();

        preds.forEach(p => {
            const match = matches.find(m => m.id === p.matchId);
            if (!userMap.has(p.userId)) {
                userMap.set(p.userId, { userId: p.userId, username: p.username || 'User', totalPredictions: 0, correctWinners: 0, totalPoints: 0, rank: 0 });
            }
            const stats = userMap.get(p.userId)!;
            stats.totalPredictions++;

            if (match?.result) {
                const pts = this.calcPoints(p, match.result);
                stats.totalPoints += pts;
                if (p.winner === match.result.winner) stats.correctWinners++;
            }
        });

        const statsArr = Array.from(userMap.values()).sort((a, b) => b.totalPoints - a.totalPoints);
        statsArr.forEach((s, idx) => s.rank = idx + 1);

        const currentUser = this.authService.currentUser();
        if (currentUser && !userMap.has(currentUser.uid!)) {
            statsArr.push({ userId: currentUser.uid!, username: currentUser.username, totalPredictions: 0, correctWinners: 0, totalPoints: 0, rank: statsArr.length + 1 });
        }

        return statsArr;
    });

    submitPrediction(pred: Omit<Prediction, 'id' | 'userId' | 'submittedAt'>) {
        const currentUser = this.authService.currentUser();
        if (!currentUser || !currentUser.uid) return;

        const docId = `${pred.matchId}_${currentUser.uid}`;
        const newPred: Prediction = {
            ...pred,
            id: docId,
            userId: currentUser.uid,
            username: currentUser.username,
            submittedAt: new Date().toISOString()
        };

        const updatePayload = {
            userId: currentUser.uid,
            username: currentUser.username,
            predictions: {
                [pred.matchId]: newPred
            }
        };

        setDoc(doc(db, 'user_predictions', currentUser.uid), updatePayload, { merge: true });
    }

    adminUpdatePrediction(predictionId: string, updates: Partial<Prediction>) {
        const parts = predictionId.split('_');
        if (parts.length !== 2) return;
        const matchId = parts[0];
        const uid = parts[1];

        const payload: Record<string, any> = {};
        for (const key of Object.keys(updates)) {
            payload[`predictions.${matchId}.${key}`] = (updates as any)[key];
        }
        updateDoc(doc(db, 'user_predictions', uid), payload);
    }

    getPredictionForMatch(matchId: string): Prediction | undefined {
        const currentUser = this.authService.currentUser();
        if (!currentUser || !currentUser.uid) return undefined;
        return this._predictions().find(p => p.matchId === matchId && p.userId === currentUser.uid);
    }

    updateMatchResult(matchId: string, result: MatchResult) {
        const currentUser = this.authService.currentUser();
        const updatedResult: MatchResult = {
            ...result,
            lastEditedAt: new Date().toISOString(),
            lastEditedBy: currentUser?.username || currentUser?.email || 'Admin'
        };

        updateDoc(doc(db, 'appData', 'matchStates'), {
            [`${matchId}.status`]: 'completed',
            [`${matchId}.result`]: updatedResult
        });
    }

    updateMatchStatus(matchId: string, status: 'upcoming' | 'live' | 'completed') {
        updateDoc(doc(db, 'appData', 'matchStates'), {
            [`${matchId}.status`]: status
        });
    }

    calcPoints(pred: Prediction, result: MatchResult): number {
        let pts = 0;
        let correctCategories = 0;

        const isStringMatch = (p?: string, r?: string) => {
            return p && r && p.toLowerCase().trim() === r.toLowerCase().trim();
        };

        // 1. Winning team (3 pts)
        if (isStringMatch(pred.winner, result.winner)) { pts += 3; correctCategories++; }

        // 2. First Innings range (3 pts)
        if (isStringMatch(pred.firstInningRange, result.firstInningRange)) { pts += 3; correctCategories++; }

        // 3. Second Innings range (3 pts)
        if (isStringMatch(pred.secondInningRange, result.secondInningRange)) { pts += 3; correctCategories++; }

        // 4. More 4s (2 pts)
        if (isStringMatch(pred.teamMore4s, result.teamMore4s)) { pts += 2; correctCategories++; }

        // 5. More 6s (2 pts)
        if (isStringMatch(pred.teamMore6s, result.teamMore6s)) { pts += 2; correctCategories++; }

        // 6. Max 6s Player (3 pts)
        if (isStringMatch(pred.playerMax6s, result.playerMax6s)) { pts += 3; correctCategories++; }

        // 7. Fantasy Player (4 pts)
        if (isStringMatch(pred.fantasyPlayer, result.fantasyPlayer)) { pts += 4; correctCategories++; }

        // 8. Player of Match (5 pts)
        if (isStringMatch(pred.playerOfMatch, result.playerOfMatch)) { pts += 5; correctCategories++; }

        // 9. Super Striker (4 pts)
        if (isStringMatch(pred.superStriker, result.superStriker)) { pts += 4; correctCategories++; }

        // 10. Most Dot Balls (4 pts)
        if (isStringMatch(pred.mostDotBalls, result.mostDotBalls)) { pts += 4; correctCategories++; }

        // Bonus: Exact score prediction (+10 pts)
        if (pred.team1Score !== undefined && result.team1Score !== undefined &&
            pred.team2Score !== undefined && result.team2Score !== undefined) {
            if (pred.team1Score === result.team1Score && pred.team2Score === result.team2Score) {
                pts += 10;
            }
        }

        // Bonus: All correct answers (+25 pts)
        if (correctCategories === 10) {
            pts += 25;
        }

        return pts;
    }

    resetMatchResult(matchId: string) {
        updateDoc(doc(db, 'appData', 'matchStates'), {
            [`${matchId}.status`]: 'upcoming',
            [`${matchId}.result`]: deleteField()
        });
    }

    async resetData() {
        if (!confirm('Are you sure you want to COMPLETELY WIPE all user predictions and all match results? This cannot be undone!')) return;

        try {
            await setDoc(doc(db, 'appData', 'matchStates'), {});

            const uniqueUsers = new Set(this._predictions().map(p => p.userId));
            const batch = writeBatch(db);

            uniqueUsers.forEach(uid => {
                batch.delete(doc(db, 'user_predictions', uid));
            });

            await batch.commit();
            alert('Database reset successful.');
        } catch (err) {
            console.error(err);
            alert('Error resetting database.');
        }
    }
}
