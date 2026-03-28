import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IplService } from '../../services/ipl.service';

@Component({
    selector: 'app-standings',
    standalone: true,
    imports: [CommonModule],
    templateUrl: './standings.component.html',
    styleUrl: './standings.component.css'
})
export class StandingsComponent {
    userStats() { return this.iplService.userStats(); }
    matches() { return this.iplService.matches(); }
    predictions() { return this.iplService.predictions(); }

    selectedUserId = signal<string | null>(null);

    constructor(public iplService: IplService) { }

    activeMatch() {
        const matches = this.matches();
        const now = Date.now();

        const getMatchTime = (m: any): number => {
            // date field is already a full ISO timestamp e.g. '2026-03-28T19:30:00+05:30'
            return new Date(m.date).getTime();
        };

        // 1. Match currently in progress: started up to 5 hours ago
        const liveMatch = matches.find(m => {
            const start = getMatchTime(m);
            return start <= now && now <= start + 5 * 60 * 60 * 1000;
        });
        if (liveMatch) return liveMatch;

        // 2. Next upcoming match (earliest start in the future)
        const upcoming = matches
            .filter(m => getMatchTime(m) > now)
            .sort((a, b) => getMatchTime(a) - getMatchTime(b));
        if (upcoming.length) return upcoming[0];

        // 3. Fallback: most recent past match
        return matches
            .filter(m => getMatchTime(m) <= now)
            .sort((a, b) => getMatchTime(b) - getMatchTime(a))[0] || matches[matches.length - 1];
    }

    completedMatches() {
        return this.matches().filter(m => m.status === 'completed');
    }

    getActiveMatchPredictions() {
        const match = this.activeMatch();
        if (!match) return [];
        const preds = this.predictions().filter(p => p.matchId === match.id);

        return this.userStats().map(user => ({
            user,
            pred: preds.find(p => p.userId === user.userId)
        })).sort((a, b) => b.user.totalPoints - a.user.totalPoints);
    }

    getTeamName(msg: any, tid?: string) {
        if (!msg || !tid) return '-';
        if (tid === msg.team1.id) return msg.team1.shortName;
        if (tid === msg.team2.id) return msg.team2.shortName;
        return tid;
    }

    rankEmoji(rank: number): string {
        return ['🥇', '🥈', '🥉'][rank - 1] ?? `#${rank}`;
    }

    calcAccuracy(pred: number, correct: number): number {
        if (pred === 0) return 0;
        return Math.round((correct / pred) * 100);
    }

    getPredictionForMatch(matchId: string) {
        return this.iplService.getPredictionForMatch(matchId);
    }

    getMatchPoints(matchId: string): number {
        const pred = this.iplService.getPredictionForMatch(matchId);
        const match = this.matches().find(m => m.id === matchId);
        if (!pred || !match?.result) return 0;
        return this.iplService.calcPoints(pred, match.result);
    }

    formatDate(dateStr: string): string {
        return new Date(dateStr).toLocaleDateString(undefined, { day: 'numeric', month: 'short' });
    }

    closeBreakdown() {
        this.selectedUserId.set(null);
    }

    selectedUserStats() {
        const uid = this.selectedUserId();
        return uid ? this.userStats().find(s => s.userId === uid) : null;
    }

    getUserBreakdownMatches() {
        const uid = this.selectedUserId();
        if (!uid) return [];
        return this.completedMatches().map(match => {
            const userPred = this.predictions().find(p => p.userId === uid && p.matchId === match.id);
            let points = 0;
            if (userPred && match.result) {
                points = this.iplService.calcPoints(userPred, match.result);
            }
            return {
                match,
                prediction: userPred,
                pointsEarned: points
            };
        }).filter(item => item.prediction);
    }

    getDetailedPoints(pred: any, match: any) {
        const result = match?.result;
        if (!pred || !result) return [];

        const details = [];

        const teamName = (tid?: string) => {
            if (!tid) return undefined;
            if (tid === match.team1.id) return match.team1.shortName;
            if (tid === match.team2.id) return match.team2.shortName;
            return tid;
        };

        const addDtl = (label: string, pVal: string | undefined, rVal: string | undefined, pts: number) => {
            const isMatch = pVal && rVal && pVal.toLowerCase() === rVal.toLowerCase() && pVal !== '-' && rVal !== '-';
            details.push({
                label,
                pts: isMatch ? pts : 0,
                earned: !!isMatch,
                myValue: pVal || '-',
                actualValue: rVal || '-'
            });
            return isMatch;
        };

        addDtl('Match Winner', teamName(pred.winner), teamName(result.winner), 3);

        const exactScoreMatch = pred.team1Score === result.team1Score && pred.team2Score === result.team2Score;
        details.push({
            label: 'Exact Score Bonus',
            pts: exactScoreMatch ? 10 : 0,
            earned: exactScoreMatch,
            myValue: `${pred.team1Score ?? '-'}-${pred.team2Score ?? '-'}`,
            actualValue: `${result.team1Score ?? '-'}-${result.team2Score ?? '-'}`
        });

        addDtl('1st Innings Range', pred.firstInningRange, result.firstInningRange, 3);
        addDtl('2nd Innings Range', pred.secondInningRange, result.secondInningRange, 3);
        addDtl('Most 4s', teamName(pred.teamMore4s), teamName(result.teamMore4s), 2);
        addDtl('Most 6s', teamName(pred.teamMore6s), teamName(result.teamMore6s), 2);

        const max6s = addDtl('Player Max 6s', pred.playerMax6s, result.playerMax6s, 3);
        const fantasy = addDtl('Fantasy Player', pred.fantasyPlayer, result.fantasyPlayer, 4);
        const pom = addDtl('Player of Match', pred.playerOfMatch, result.playerOfMatch, 5);
        const striker = addDtl('Super Striker', pred.superStriker, result.superStriker, 4);
        const dotBalls = addDtl('Most Dot Balls', pred.mostDotBalls, result.mostDotBalls, 4);

        const allCorrect = pred.winner === result.winner &&
            pred.firstInningRange === result.firstInningRange &&
            pred.secondInningRange === result.secondInningRange &&
            pred.teamMore4s === result.teamMore4s &&
            pred.teamMore6s === result.teamMore6s &&
            max6s && fantasy && pom && striker && dotBalls;

        if (allCorrect) {
            details.push({ label: 'Perfect Predictor', pts: 25, earned: true, myValue: '100%', actualValue: '100%' });
        }

        return details;
    }
}
