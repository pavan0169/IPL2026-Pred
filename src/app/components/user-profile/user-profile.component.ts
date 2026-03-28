import { Component, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IplService } from '../../services/ipl.service';
import { AuthService } from '../../services/auth.service';
import { Match, Prediction } from '../../models/ipl.models';

@Component({
    selector: 'app-user-profile',
    standalone: true,
    imports: [CommonModule],
    templateUrl: './user-profile.component.html',
    styleUrls: ['./user-profile.component.css']
})
export class UserProfileComponent {
    activeTab = signal<'past' | 'live' | 'upcoming'>('upcoming');

    constructor(private iplService: IplService, private authService: AuthService) { }

    get currentUser() {
        return this.authService.currentUser();
    }

    get profile() {
        const currentUser = this.currentUser;
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

    get myPredictions(): Prediction[] {
        const uid = this.currentUser?.uid;
        if (!uid) return [];
        return this.iplService.predictions().filter(p => p.userId === uid);
    }

    get pastPredictions() {
        return this.myPredictions
            .filter(p => {
                const match = this.iplService.matches().find(m => m.id === p.matchId);
                return match?.status === 'completed';
            })
            .map(p => {
                const match = this.iplService.matches().find(m => m.id === p.matchId)!;
                const pts = match?.result ? this.iplService.calcPoints(p, match.result) : 0;
                return { pred: p, match, points: pts };
            })
            .sort((a, b) => new Date(b.match.date).getTime() - new Date(a.match.date).getTime());
    }

    get livePredictions() {
        return this.myPredictions
            .filter(p => {
                const match = this.iplService.matches().find(m => m.id === p.matchId);
                return match?.status === 'live';
            })
            .map(p => {
                const match = this.iplService.matches().find(m => m.id === p.matchId)!;
                return { pred: p, match };
            });
    }

    get upcomingPredictions() {
        return this.myPredictions
            .filter(p => {
                const match = this.iplService.matches().find(m => m.id === p.matchId);
                return match?.status === 'upcoming';
            })
            .map(p => {
                const match = this.iplService.matches().find(m => m.id === p.matchId)!;
                return { pred: p, match };
            })
            .sort((a, b) => new Date(a.match.date).getTime() - new Date(b.match.date).getTime());
    }

    get accuracy(): number {
        const p = this.profile;
        if (!p || p.totalPredictions === 0) return 0;
        return Math.round((p.correctWinners / p.totalPredictions) * 100);
    }

    get rank(): number {
        return this.profile?.rank ?? 0;
    }

    get totalUsers(): number {
        return this.iplService.userStats().length;
    }

    getTeamName(match: Match, tid?: string): string {
        if (!tid) return '-';
        if (tid === match.team1.id) return match.team1.shortName;
        if (tid === match.team2.id) return match.team2.shortName;
        if (tid === 'tie') return 'Tie';
        return '-';
    }

    getDetailedPoints(pred: Prediction, match: Match) {
        const result = match?.result;
        if (!pred || !result) return [];

        const details: { label: string; pts: number; earned: boolean; myValue: string; actualValue: string }[] = [];

        const teamName = (tid?: string) => {
            if (!tid) return '-';
            if (tid === match.team1.id) return match.team1.shortName;
            if (tid === match.team2.id) return match.team2.shortName;
            if (tid === 'tie') return 'Tie';
            return tid;
        };

        const addDtl = (label: string, pVal: string | undefined, rVal: string | undefined, pts: number) => {
            const isMatch = !!(pVal && rVal && pVal.toLowerCase() === rVal.toLowerCase() && pVal !== '-' && rVal !== '-');
            details.push({ label, pts: isMatch ? pts : 0, earned: isMatch, myValue: pVal || '-', actualValue: rVal || '-' });
            return isMatch;
        };

        addDtl('Match Winner', teamName(pred.winner), teamName(result.winner), 3);

        const exactScoreMatch = pred.team1Score === result.team1Score && pred.team2Score === result.team2Score;
        details.push({
            label: 'Exact Score',
            pts: exactScoreMatch ? 10 : 0,
            earned: exactScoreMatch,
            myValue: `${pred.team1Score ?? '-'} – ${pred.team2Score ?? '-'}`,
            actualValue: `${result.team1Score ?? '-'} – ${result.team2Score ?? '-'}`
        });

        addDtl(`${match.team1.shortName} Inn Range`, pred.firstInningRange, result.firstInningRange, 3);
        addDtl(`${match.team2.shortName} Inn Range`, pred.secondInningRange, result.secondInningRange, 3);
        addDtl('Most 4s', teamName(pred.teamMore4s), teamName(result.teamMore4s), 2);
        addDtl('Most 6s', teamName(pred.teamMore6s), teamName(result.teamMore6s), 2);
        addDtl('Player Max 6s', pred.playerMax6s, result.playerMax6s, 3);
        addDtl('Fantasy Player', pred.fantasyPlayer, result.fantasyPlayer, 4);
        addDtl('Player of Match', pred.playerOfMatch, result.playerOfMatch, 5);
        addDtl('Super Striker', pred.superStriker, result.superStriker, 4);
        addDtl('Most Dot Balls', pred.mostDotBalls, result.mostDotBalls, 4);

        return details;
    }

    formatDate(dateStr: string): string {
        return new Date(dateStr).toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' });
    }

    formatTime(dateStr: string): string {
        return new Date(dateStr).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
    }
}
