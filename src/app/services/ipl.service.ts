import { Injectable, signal, computed, inject } from '@angular/core';
import { Match, Team, Prediction, UserStats, MatchResult } from '../models/ipl.models';
import { db } from '../firebase.config';
import { collection, onSnapshot, doc, setDoc, updateDoc, writeBatch, deleteField, getDocs, addDoc, query } from 'firebase/firestore';
import { AuthService, User } from './auth.service';

interface MatchState {
    status: 'upcoming' | 'live' | 'completed' | 'cancelled';
    result?: MatchResult;
}

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
    static readonly SCORING_CATEGORIES = [
        { key: 'winner', label: 'Match Winner', pts: 3 },
        { key: 'firstInningRange', label: '1st Inning Range', pts: 3 },
        { key: 'secondInningRange', label: '2nd Inning Range', pts: 3 },
        { key: 'teamMore4s', label: 'Team with more 4s', pts: 2 },
        { key: 'teamMore6s', label: 'Team with more 6s', pts: 2 },
        { key: 'playerMax6s', label: 'Player with Maximum 6s', pts: 3 },
        { key: 'most4s', label: 'Player with Maximum 4s', pts: 4 },
        { key: 'playerOfMatch', label: 'Player of the Match', pts: 5 },
        { key: 'economy', label: 'Bowler (Less Economy)', pts: 4 },
        { key: 'superStriker', label: 'Super Striker of the match', pts: 4 }
    ];

    private _matches = signal<Match[]>([]);
    private _predictions = signal<Prediction[]>([]);
    private _users = signal<User[]>([]);
    private _resultsReference = signal<Record<string, MatchState>>({});

    matches = this._matches.asReadonly();
    predictions = this._predictions.asReadonly();
    users = this._users.asReadonly();
    resultsReference = this._resultsReference.asReadonly();
    teams = IPL_TEAMS;

    // Computed map for O(1) match lookup
    private _matchMap = computed(() => {
        const map = new Map<string, Match>();
        this._matches().forEach(m => map.set(m.id, m));
        return map;
    });

    // Computed map of current user's predictions: matchId -> Prediction
    myPredictions = computed(() => {
        const uid = this.authService.currentUser()?.uid;
        const map = new Map<string, Prediction>();
        if (!uid) return map;
        this._predictions()
            .filter(p => p.userId === uid)
            .forEach(p => map.set(p.matchId, p));
        return map;
    });

    // Computed map of ALL predictions by match: matchId -> Prediction[]
    allPredictionsByMatch = computed(() => {
        const map = new Map<string, Prediction[]>();
        this._predictions().forEach(p => {
            if (!map.has(p.matchId)) map.set(p.matchId, []);
            map.get(p.matchId)!.push(p);
        });
        return map;
    });

    constructor(private authService: AuthService) {
        if (typeof window !== 'undefined') {
            this.initFirestore();
        }
    }

    private initFirestore() {
        // Listen for matches collection
        onSnapshot(collection(db, 'matches'), (snapshot) => {
            const dataMap = new Map<string, any>();
            snapshot.docs.forEach(docSnap => {
                dataMap.set(docSnap.id, docSnap.data());
            });

            const updated = SEED_MATCHES.map(m => {
                const state = dataMap.get(m.id);
                if (state) {
                    return {
                        ...m,
                        status: state.status || 'upcoming',
                        result: state.result
                    };
                }
                return m;
            });
            this._matches.set(updated);
        });

        // Listen for match results reference (backup state) - keep in appData for now as it's small
        onSnapshot(doc(db, 'appData', 'matchResultsReference'), (docSnap) => {
            const data = docSnap.data() || {};
            this._resultsReference.set(data);
        });

        // Listen for all predictions from the flat 'predictions' collection
        onSnapshot(collection(db, 'predictions'), (snapshot) => {
            const allPreds: Prediction[] = [];
            snapshot.docs.forEach(d => {
                const pred = d.data() as Prediction;
                allPreds.push(pred);
            });
            this._predictions.set(allPreds);
        });

        onSnapshot(collection(db, 'users'), (snapshot) => {
            const allUsers: User[] = [];
            snapshot.docs.forEach(d => {
                const data = d.data() as User;
                data.username = AuthService.formatUsername(data.username);
                allUsers.push(data);
            });
            this._users.set(allUsers);
        });
    }

    userStats = computed<UserStats[]>(() => {
        const preds = this._predictions();
        const matchesMap = this._matchMap();
        const userMap = new Map<string, UserStats>();

        preds.forEach(p => {
            const match = matchesMap.get(p.matchId);
            if (!match) return; // Skip predictions for non-existent matches

            const formattedName = AuthService.formatUsername(p.username || 'User');
            if (!userMap.has(p.userId)) {
                userMap.set(p.userId, { userId: p.userId, username: formattedName, totalPredictions: 0, correctWinners: 0, totalPoints: 0, rank: 0 });
            }
            const stats = userMap.get(p.userId)!;
            stats.username = formattedName; // Ensure we use updated name
            stats.totalPredictions++;

            if (match.result) {
                const pts = this.calcPoints(p, match.result);
                stats.totalPoints += pts;

                // Specifically count winner for the "wins" label
                if (this.isStringMatch(p.winner, match.result.winner)) {
                    stats.correctWinners++;
                }
            }
        });

        const statsArr = Array.from(userMap.values()).sort((a, b) => b.totalPoints - a.totalPoints);
        statsArr.forEach((s, idx) => s.rank = idx + 1);

        const currentUser = this.authService.currentUser();
        if (currentUser && !userMap.has(currentUser.uid!)) {
            const formattedName = AuthService.formatUsername(currentUser.username);
            statsArr.push({ userId: currentUser.uid!, username: formattedName, totalPredictions: 0, correctWinners: 0, totalPoints: 0, rank: statsArr.length + 1 });
        }

        return statsArr;
    });

    submitPrediction(pred: Omit<Prediction, 'id' | 'userId' | 'submittedAt'>) {
        const currentUser = this.authService.currentUser();
        if (!currentUser || !currentUser.uid) return;

        const docId = `${pred.matchId}_${currentUser.uid}`;
        const newPred: Prediction = {
            id: docId,
            matchId: pred.matchId,
            userId: currentUser.uid,
            username: currentUser.username,
            submittedAt: new Date().toISOString(),
            team1Score: pred.team1Score,
            team2Score: pred.team2Score,
            winner: pred.winner,
            firstInningRange: pred.firstInningRange,
            secondInningRange: pred.secondInningRange,
            teamMore4s: pred.teamMore4s,
            teamMore6s: pred.teamMore6s,
            playerMax6s: pred.playerMax6s,
            most4s: pred.most4s,
            playerOfMatch: pred.playerOfMatch,
            economy: pred.economy,
            superStriker: pred.superStriker
        };

        setDoc(doc(db, 'predictions', docId), newPred);
    }

    adminUpdatePrediction(predictionId: string, updates: Partial<Prediction>) {
        if (!predictionId) return;
        setDoc(doc(db, 'predictions', predictionId), updates, { merge: true });
    }

    getPredictionForMatch(matchId: string): Prediction | undefined {
        return this.myPredictions().get(matchId);
    }

    async updateMatchResult(matchId: string, result: MatchResult) {
        const currentUser = this.authService.currentUser();
        result.lastEditedAt = new Date().toISOString();
        result.lastEditedBy = currentUser?.username || currentUser?.email || 'Admin';

        // Save to active state matches collection
        await setDoc(doc(db, 'matches', matchId), {
            status: 'completed',
            result: result,
            updatedAt: new Date().toISOString()
        }, { merge: true });

        // Also save to permanent reference backup
        await setDoc(doc(db, 'appData', 'matchResultsReference'), {
            [`${matchId}`]: {
                status: 'completed',
                result: result
            }
        }, { merge: true });
    }

    async seedResultsReference(data: Record<string, MatchState>) {
        const batch = writeBatch(db);

        // Update the permanent reference backup
        batch.set(doc(db, 'appData', 'matchResultsReference'), data, { merge: true });

        // Forcefully update the active state matches collection so live standings refresh natively
        for (const [matchId, matchState] of Object.entries(data)) {
            const liveMatchDoc = doc(db, 'matches', matchId);
            batch.set(liveMatchDoc, {
                status: matchState.status || 'completed',
                result: matchState.result,
                updatedAt: new Date().toISOString()
            }, { merge: true });
        }

        await batch.commit();
        alert('Active Matches and Historical reference successfully seeded with match results!');
    }

    async seedPredictions(data: any[]) {
        if (!Array.isArray(data)) {
            alert('Seed data for predictions must be an array');
            return;
        }
        const batch = writeBatch(db);
        data.forEach((p: any) => {
            if (!p.id) return;
            const docRef = doc(db, 'predictions', p.id);
            batch.set(docRef, p, { merge: true });
        });
        await batch.commit();
        alert(`Successfully seeded ${data.length} predictions!`);
    }

    async restoreAllFromReference() {
        const reference = this._resultsReference();
        if (Object.keys(reference).length === 0) return;

        const batch = writeBatch(db);
        Object.entries(reference).forEach(([matchId, data]) => {
            batch.set(doc(db, 'matches', matchId), data, { merge: true });
        });

        await batch.commit();
        alert('All match results successfully restored from historical reference!');
    }

    async restoreMatchFromReference(matchId: string) {
        const reference = this._resultsReference();
        const historical = reference[matchId];
        if (!historical || !historical.result) return;

        await updateDoc(doc(db, 'appData', 'matchStates'), {
            [`${matchId}`]: historical
        });
    }

    updateMatchStatus(matchId: string, status: 'upcoming' | 'live' | 'completed' | 'cancelled') {
        setDoc(doc(db, 'matches', matchId), { status }, { merge: true });
    }

    isStringMatch(p?: string | number, r?: string | number): boolean {
        if (p === undefined || r === undefined || p === null || r === null) return false;

        // Coerce to string and normalize
        const ps = String(p).toLowerCase().trim();
        const rs = String(r).toLowerCase().trim();

        if (!ps || !rs) return false;
        return ps === rs;
    }

    /**
     * Standardizes prediction or result data regardless of which field names were used.
     * This handles backwards compatibility between NEW and LEGACY formats.
     */
    static normalizeData(data: any): {
        winner?: string;
        firstInningRange?: string;
        secondInningRange?: string;
        teamMore4s?: string;
        teamMore6s?: string;
        playerMax6s?: string;
        playerOfMatch?: string;
        team1Score?: number;
        team2Score?: number;
        most4s?: string;
        economy?: string;
        superStriker?: string;
    } {
        if (!data) return {};

        return {
            team1Score: data.team1Score !== undefined ? +data.team1Score : undefined,
            team2Score: data.team2Score !== undefined ? +data.team2Score : undefined,
            winner: data.winner || '',
            firstInningRange: data.firstInningRange || '',
            secondInningRange: data.secondInningRange || '',
            teamMore4s: data.teamMore4s || '',
            teamMore6s: data.teamMore6s || '',
            playerMax6s: data.playerMax6s || '',
            most4s: data.most4s || '',
            playerOfMatch: data.playerOfMatch || '',
            economy: data.economy || '',
            superStriker: data.superStriker || ''
        };
    }

    calcPoints(pred: Prediction, result: MatchResult): number {
        if (!pred || !result) return 0;
        if (result.winner === 'cancelled') return 0;

        const p = IplService.normalizeData(pred);
        const r = IplService.normalizeData(result);

        let pts = 0;
        let correctCategories = 0;

        IplService.SCORING_CATEGORIES.forEach(cat => {
            const isMatch = this.isStringMatch((p as any)[cat.key], (r as any)[cat.key]);
            if (isMatch) {
                pts += cat.pts;
                correctCategories++;
            }
        });

        // Bonus: Exact score prediction (+10 pts)
        if (p.team1Score !== undefined && p.team2Score !== undefined &&
            r.team1Score !== undefined && r.team2Score !== undefined) {
            if (+p.team1Score === +r.team1Score && +p.team2Score === +r.team2Score) {
                pts += 10;
            }
        }

        // Bonus: All correct answers (+25 pts)
        if (correctCategories === 10) {
            pts += 25;
        }

        return pts;
    }

    async recalculateAllScores() {
        if (!this.authService.isAdmin()) return;

        const matches = this._matches().filter(m => !!m.result);
        const predictions = this._predictions();
        const users = this._users();

        const batch = writeBatch(db);

        users.forEach(user => {
            let totalPoints = 0;
            let correctWinners = 0;
            const userPreds = predictions.filter(p => p.userId === user.uid);

            userPreds.forEach(p => {
                const match = matches.find(m => m.id === p.matchId);
                if (match?.result) {
                    const pts = this.calcPoints(p, match.result);
                    totalPoints += pts;

                    const pNorm = IplService.normalizeData(p);
                    const rNorm = IplService.normalizeData(match.result);
                    if (this.isStringMatch(pNorm.winner, rNorm.winner)) {
                        correctWinners++;
                    }
                }
            });

            if (user.uid) {
                const userRef = doc(db, 'users', user.uid);
                batch.update(userRef, {
                    totalPoints: totalPoints || 0,
                    correctWinners: correctWinners || 0,
                    totalPredictions: userPreds.length || 0,
                    updatedAt: new Date().toISOString()
                });
            }
        });

        await batch.commit();
        alert('All user scores have been recalculated from scratch based on the latest mapping logic!');
    }

    async adminSendMatchEmail(matchId: string) {
        if (!this.authService.isAdmin()) return;

        const match = this._matches().find(m => m.id === matchId);
        if (!match || !match.result) {
            alert('Cannot send email for match without result');
            return;
        }

        try {
            // Fetch all users to build bcc list
            const usersSnapshot = await getDocs(collection(db, 'users'));
            const bccList: string[] = [];
            usersSnapshot.forEach(doc => {
                const data = doc.data();
                if (data && data['email']) bccList.push(data['email']);
            });

            if (bccList.length === 0) {
                alert('No users found in database to send email to.');
                return;
            }

            // Get Top 3 Leaderboard
            const stats = [...this.userStats()].sort((a, b) => b.totalPoints - a.totalPoints).slice(0, 3);
            const top3Html = stats.map((s, i) => `<li style="margin-bottom: 8px;"><strong>#${i + 1} ${s.username}</strong> &mdash; ${s.totalPoints} pts</li>`).join('');

            const getTeamName = (teamId?: string) => {
                if (!teamId) return 'Unknown';
                const team = this.teams.find(t => t.id === teamId);
                return team ? team.name : teamId;
            };

            const winnerName = getTeamName(match.result.winner);

            const html = `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #111827;">
                    <h2 style="color: #4f46e5; border-bottom: 2px solid #e5e7eb; padding-bottom: 10px;">Match Results are In! 🏏</h2>
                    <p style="font-size: 16px; line-height: 1.5;">The results for <strong>${match.team1.name} vs ${match.team2.name}</strong> have been evaluated and points have been allocated!</p>
                    
                    <div style="background: #f3f4f6; padding: 20px; border-radius: 12px; margin: 25px 0; border: 1px solid #e5e7eb;">
                        <h3 style="margin-top: 0; color: #1f2937; margin-bottom: 15px;">Match Summary</h3>
                        <ul style="list-style: none; padding-left: 0; margin: 0; font-size: 15px; line-height: 1.8;">
                            <li>🏆 <strong>Winner:</strong> ${winnerName}</li>
                            <li>📊 <strong>Score:</strong> ${match.result.team1Score} - ${match.result.team2Score}</li>
                            <li>💥 <strong>Max 6s Player:</strong> ${match.result.playerMax6s || '-'}</li>
                            <li>⭐ <strong>Player of the Match:</strong> ${match.result.playerOfMatch || '-'}</li>
                        </ul>
                    </div>
                    
                    <h3 style="color: #fb923c; margin-top: 30px;">Current Top 3 Leaderboard 🎖️</h3>
                    <ul style="font-size: 16px; list-style-type: none; padding-left: 0; background: #fffcf2; padding: 15px; border-radius: 8px; border-left: 4px solid #fb923c;">
                        ${top3Html}
                    </ul>
                    
                    <div style="text-align: center; margin: 40px 0;">
                        <a href="https://iplpred2026.web.app/standings" style="background: #4f46e5; color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px; display: inline-block;">Check Detailed Standings</a>
                    </div>
                    
                    <p style="font-size: 12px; color: #6b7280; margin-top: 40px; text-align: center; border-top: 1px solid #e5e7eb; padding-top: 20px;">
                        This is an automated message from the IPL Prediction League system.<br>
                        May the best predictor win!
                    </p>
                </div>
            `;

            await addDoc(collection(db, 'mail'), {
                to: ['tvskalyan2008@gmail.com'], // Sent to admin, bcc to everyone else
                bcc: bccList,
                message: {
                    subject: `🏏 Match Results: ${match.team1.shortName} vs ${match.team2.shortName}!`,
                    html: html
                }
            });

            alert('Email successfully queued for sending relative to Firebase Extension!');
        } catch (error) {
            console.error('Error sending email:', error);
            alert('Failed to send email. Check console.');
        }
    }

    resetMatchResult(matchId: string) {
        setDoc(doc(db, 'matches', matchId), {
            status: 'upcoming',
            result: deleteField()
        }, { merge: true });

        setDoc(doc(db, 'appData', 'matchResultsReference'), {
            [`${matchId}.status`]: 'upcoming',
            [`${matchId}.result`]: deleteField()
        }, { merge: true });
    }

    async resetData() {
        if (!confirm('Are you sure you want to COMPLETELY WIPE all user predictions and all match results? This cannot be undone!')) return;

        try {
            const batch = writeBatch(db);

            // 1. Delete all match states
            const matchDocs = await getDocs(collection(db, 'matches'));
            matchDocs.docs.forEach(d => batch.delete(d.ref));

            // 2. Delete all predictions
            const predDocs = await getDocs(collection(db, 'predictions'));
            predDocs.docs.forEach(d => batch.delete(d.ref));

            await batch.commit();
            alert('Database reset successful.');
        } catch (err) {
            console.error(err);
            alert('Error resetting database.');
        }
    }
}
