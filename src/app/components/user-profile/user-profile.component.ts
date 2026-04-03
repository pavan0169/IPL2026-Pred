import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IplService } from '../../services/ipl.service';
import { AuthService } from '../../services/auth.service';
import { Match, Prediction } from '../../models/ipl.models';
import { CricketLoaderComponent } from '../cricket-loader/cricket-loader.component';

@Component({
    selector: 'app-user-profile',
    standalone: true,
    imports: [CommonModule],
    templateUrl: './user-profile.component.html',
    styleUrl: './user-profile.component.css'
})
export class UserProfileComponent {
    activeTab = signal<'upcoming' | 'past'>('upcoming');
    expandedMatchId = signal<string | null>(null);

    constructor(private iplService: IplService, private authService: AuthService) { }

    toggleMatch(matchId: string) {
        if (this.expandedMatchId() === matchId) {
            this.expandedMatchId.set(null);
        } else {
            this.expandedMatchId.set(matchId);
        }
    }

    get currentUserId() {
        return this.authService.currentUser()?.uid ?? null;
    }

    get profile() {
        const currentUser = this.authService.currentUser();
        if (!currentUser) return null;
        const stats = this.iplService.userStats();
        const myStats = stats.find(s => s.userId === currentUser.uid);
        if (myStats) {
            return {
                ...myStats,
                avatarUrl: '',
                displayName: myStats.username,
                joinedLeagues: []
            };
        }
        return null;
    }

    get rank(): number {
        const uid = this.currentUserId;
        if (!uid) return 0;
        const stats = this.iplService.userStats();
        const idx = stats.findIndex(s => s.userId === uid);
        return idx >= 0 ? idx + 1 : 0;
    }

    get accuracy(): number {
        const p = this.profile;
        if (!p || p.totalPredictions === 0) return 0;
        return Math.round((p.correctWinners / p.totalPredictions) * 100);
    }

    rankEmoji(rank: number): string {
        return ['🥇', '🥈', '🥉'][rank - 1] ?? `#${rank}`;
    }

    /** Upcoming: matches starting within the next 24 hours */
    get upcomingPredictions() {
        const uid = this.currentUserId;
        if (!uid) return [];

        const matches = this.iplService.matches();
        const preds = this.iplService.predictions();

        const now = Date.now();
        const next24h = now + 24 * 60 * 60 * 1000;

        return matches
            .filter(m => {
                const t = new Date(m.date).getTime();
                if (t < now) return false; // Past matches belong in the Past tab

                const isNearFuture = m.status !== 'completed' && !m.result && t <= next24h;
                const hasPrediction = preds.some(p => p.matchId === m.id && p.userId === uid);

                return isNearFuture || (hasPrediction && !m.result);
            })
            .map(m => ({
                match: m,
                prediction: preds.find(p => p.matchId === m.id && p.userId === uid) ?? null
            }))
            .sort((a, b) => new Date(a.match.date).getTime() - new Date(b.match.date).getTime());
    }

    /** Past: matches with result the user predicted, with points breakdown */
    get pastPredictions() {
        const uid = this.currentUserId;
        if (!uid) return [];

        const now = Date.now();
        const matches = this.iplService.matches().filter(m => !!m.result || new Date(m.date).getTime() < now);
        const preds = this.iplService.predictions();

        return matches
            .map(m => {
                const pred = preds.find(p => p.matchId === m.id && p.userId === uid);
                const points = pred && m.result ? this.iplService.calcPoints(pred, m.result) : 0;
                return { match: m, prediction: pred ?? null, pointsEarned: points };
            })
            .sort((a, b) => new Date(b.match.date).getTime() - new Date(a.match.date).getTime());
    }

    formatDate(dateStr: string): string {
        return new Date(dateStr).toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' });
    }

    formatTime(dateStr: string): string {
        return new Date(dateStr).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
    }

    getTeamName(match: any, tid?: string): string {
        if (!tid) return '-';
        if (tid === match.team1.id) return match.team1.shortName;
        if (tid === match.team2.id) return match.team2.shortName;
        return tid;
    }

    getStatusLabel(status: string): string {
        if (status === 'live') return '⚡ LIVE';
        if (status === 'upcoming') return '🗓️ Upcoming';
        return '✅ Done';
    }

    /** Detailed point breakdown for a past match */
    getDetailedPoints(pred: any, match: any): { label: string; earned: boolean; pts: number; myValue: string; actualValue: string }[] {
        const result = match?.result;
        if (!pred || !result) return [];

        const teamName = (tid?: string) => {
            if (!tid) return undefined;
            if (tid === match.team1.id) return match.team1.shortName;
            if (tid === match.team2.id) return match.team2.shortName;
            return tid;
        };

        const details: any[] = [];
        const addDtl = (label: string, pVal: string | undefined, rVal: string | undefined, pts: number) => {
            const isMatch = this.iplService.isStringMatch(pVal, rVal) && pVal !== '-' && rVal !== '-';
            details.push({ label, pts: isMatch ? pts : 0, earned: !!isMatch, myValue: pVal || '-', actualValue: rVal || '-' });
            return !!isMatch;
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

        addDtl(`${match.team1.shortName} Score Range`, pred.firstInningRange, result.firstInningRange, 3);
        addDtl(`${match.team2.shortName} Score Range`, pred.secondInningRange, result.secondInningRange, 3);
        addDtl('Most 4s team', teamName(pred.teamMore4s), teamName(result.teamMore4s), 2);
        addDtl('Most 6s team', teamName(pred.teamMore6s), teamName(result.teamMore6s), 2);
        addDtl('Max 6s Player', pred.playerMax6s, result.playerMax6s, 3);
        addDtl('Player with Maximum 4s', pred.fantasyPlayer, result.fantasyPlayer, 4);
        addDtl('Player of Match', pred.playerOfMatch, result.playerOfMatch, 5);
        addDtl('Bowler       (Less Economy)', pred.superStriker, result.superStriker, 4);
        addDtl('Super Striker of the match', pred.mostDotBalls, result.mostDotBalls, 4);

        return details;
    }

    totalPastPoints(): number {
        return this.pastPredictions.reduce((sum, item) => sum + item.pointsEarned, 0);
    }
}
