import { Component, signal, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IplService } from '../../services/ipl.service';
import { AuthService } from '../../services/auth.service';
import { CricketLoaderComponent } from '../cricket-loader/cricket-loader.component';
import { StatTileComponent } from '../shared/stat-tile/stat-tile.component';
import { ProgressBarComponent } from '../shared/progress-bar/progress-bar.component';

type SubTab = 'dashboard' | 'leaderboards' | 'stats';

@Component({
    selector: 'app-standings',
    standalone: true,
    imports: [CommonModule, CricketLoaderComponent, StatTileComponent, ProgressBarComponent],
    templateUrl: './standings.component.html',
    styleUrl: './standings.component.css'
})
export class StandingsComponent {
    private iplService = inject(IplService);
    public authService = inject(AuthService);
    Math = Math;

    activeSubTab = signal<SubTab>('dashboard');
    userStats = this.iplService.userStats;
    matches = this.iplService.matches;
    predictions = this.iplService.predictions;

    dataLoaded = computed(() => this.matches().length > 0);

    currentUserStats = computed(() => {
        const uid = this.authService.currentUser()?.uid;
        return this.userStats().find(s => s.userId === uid) || null;
    });

    selectedUserId = signal<string | null>(null);

    // EXTENDED STATS FOR PLAYER CARDS
    allUserStatsExtended = computed(() => {
        const users = this.userStats();
        const predsMap = this.iplService.allPredictionsByMatch();
        const matches = this.iplService.matches().filter(m => m.status === 'completed');

        return users.map(user => {
            let bestMatch = 0;
            let exactScores = 0;
            let perfects = 0;

            matches.forEach(m => {
                const matchPreds = predsMap.get(m.id) || [];
                const p = matchPreds.find(pred => pred.userId === user.userId);
                if (p && m.result) {
                    const pts = this.iplService.calcPoints(p, m.result);
                    if (pts > bestMatch) bestMatch = pts;

                    // Exact Score Logic
                    if (p.team1Score !== undefined && m.result.team1Score !== undefined &&
                        p.team2Score !== undefined && m.result.team2Score !== undefined) {
                        if (p.team1Score === m.result.team1Score && p.team2Score === m.result.team2Score) {
                            exactScores++;
                        }
                    }

                    // Perfect Predictor Logic (All 10 categories correct)
                    // Simplified: check if bonus pts for all correct categories were awarded
                    // Based on IplService.calcPoints returning +25 for 10/10
                    // We can re-check categories here
                    let correctCategories = 0;
                    const isM = (a?: string, b?: string) => a && b && a.toLowerCase().trim() === b.toLowerCase().trim();
                    if (isM(p.winner, m.result.winner)) correctCategories++;
                    if (isM(p.firstInningRange, m.result.firstInningRange)) correctCategories++;
                    if (isM(p.secondInningRange, m.result.secondInningRange)) correctCategories++;
                    if (isM(p.teamMore4s, m.result.teamMore4s)) correctCategories++;
                    if (isM(p.teamMore6s, m.result.teamMore6s)) correctCategories++;
                    if (isM(p.playerMax6s, m.result.playerMax6s)) correctCategories++;
                    if (isM(p.playerMost4s, m.result.playerMost4s)) correctCategories++;
                    if (isM(p.playerOfMatch, m.result.playerOfMatch)) correctCategories++;
                    if (isM(p.fantasyPlayer, m.result.fantasyPlayer)) correctCategories++;
                    if (isM(p.bestEconomy, m.result.bestEconomy)) correctCategories++;
                    if (correctCategories === 10) perfects++;
                }
            });

            return {
                ...user,
                avgPts: user.totalPredictions > 0 ? (user.totalPoints / user.totalPredictions).toFixed(1) : '0.0',
                accuracy: user.totalPredictions > 0 ? Math.round((user.correctWinners / user.totalPredictions) * 100) : 0,
                bestMatch,
                exactScores,
                perfects
            };
        });
    });

    // HIGHLIGHTS LOGIC
    latestWeeklyWinner = computed(() => {
        const weeks = this.weeklyWinners();
        return weeks.length > 0 ? weeks[0] : null;
    });

    dailyWinner = computed(() => {
        // Most recent match winner (if completed)
        const completed = this.completedMatches();
        if (completed.length === 0) return null;

        const lastMatch = completed[completed.length - 1];
        const preds = this.iplService.allPredictionsByMatch().get(lastMatch.id) || [];
        if (preds.length === 0) return null;

        const scored = preds.map(p => ({
            userId: p.userId,
            username: p.username || 'User',
            points: lastMatch.result ? this.iplService.calcPoints(p, lastMatch.result) : 0
        })).sort((a, b) => b.points - a.points);

        return scored[0].points > 0 ? scored[0] : null;
    });

    mostWinsUser = computed(() => {
        const sorted = [...this.userStats()].sort((a, b) => b.correctWinners - a.correctWinners);
        return sorted.length > 0 ? sorted[0] : null;
    });

    mostAccurateUser = computed(() => {
        const sorted = [...this.userStats()].sort((a, b) => {
            const accA = a.totalPredictions > 0 ? (a.correctWinners / a.totalPredictions) : 0;
            const accB = b.totalPredictions > 0 ? (b.correctWinners / b.totalPredictions) : 0;
            return accB - accA;
        });
        return sorted.length > 0 ? sorted[0] : null;
    });

    setSubTab(tab: SubTab) {
        this.activeSubTab.set(tab);
    }

    getBarColor(index: number): string {
        const colors = ['#8b5cf6', '#ef4444', '#10b981', '#f59e0b', '#06b6d4', '#6366f1'];
        return colors[index % colors.length];
    }

    private sortedMatches() {
        const matches = this.matches();
        const getMatchTime = (m: any): number => new Date(m.date).getTime();
        return [...matches].sort((a, b) => getMatchTime(a) - getMatchTime(b));
    }

    activeMatchInfo() {
        const sorted = this.sortedMatches();
        const now = Date.now();
        const getMatchTime = (m: any): number => new Date(m.date).getTime();

        for (let i = 0; i < sorted.length; i++) {
            const start = getMatchTime(sorted[i]);
            const nextStart = i + 1 < sorted.length ? getMatchTime(sorted[i + 1]) : Infinity;
            if (start <= now && now < nextStart) {
                return { match: sorted[i], index: i, all: sorted };
            }
        }

        const past = sorted.filter(m => getMatchTime(m) <= now);
        if (past.length) {
            const lastPast = past[past.length - 1];
            return { match: lastPast, index: sorted.indexOf(lastPast), all: sorted };
        }
        return null;
    }

    activeMatch() {
        return this.activeMatchInfo()?.match || null;
    }

    nextMatch() {
        const info = this.activeMatchInfo();
        if (!info) return null;
        const { index, all } = info;
        return (index + 1 < all.length) ? all[index + 1] : null;
    }

    completedMatches() {
        return this.matches().filter(m => m.status === 'completed');
    }

    getActiveMatchPredictions() {
        const match = this.activeMatch();
        if (!match) return [];
        return this.getPredictionsForMatchId(match.id);
    }

    getNextMatchPredictions() {
        const match = this.nextMatch();
        if (!match) return [];
        return this.getPredictionsForMatchId(match.id);
    }

    private getPredictionsForMatchId(matchId: string) {
        const preds = this.iplService.allPredictionsByMatch().get(matchId) || [];
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
        const most4s = addDtl('Most 4s', pred.playerMost4s, result.playerMost4s, 4);
        const pom = addDtl('Player of Match', pred.playerOfMatch, result.playerOfMatch, 5);
        const fantasy = addDtl('Super Striker', pred.fantasyPlayer, result.fantasyPlayer, 4);
        const bestEconomy = addDtl('Best Economy', pred.bestEconomy, result.bestEconomy, 4);

        const allCorrect = pred.winner === result.winner &&
            pred.firstInningRange === result.firstInningRange &&
            pred.secondInningRange === result.secondInningRange &&
            pred.teamMore4s === result.teamMore4s &&
            pred.teamMore6s === result.teamMore6s &&
            max6s && fantasy && pom && most4s && bestEconomy;

        if (allCorrect) {
            details.push({ label: 'Perfect Predictor', pts: 25, earned: true, myValue: '100%', actualValue: '100%' });
        }

        return details;
    }

    // ---- Weekly Winners ----
    private getWeekKey(date: Date): string {
        // Get Monday of the week
        const d = new Date(date);
        const day = d.getDay();
        const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Monday
        const monday = new Date(d.setDate(diff));
        monday.setHours(0, 0, 0, 0);
        return monday.toISOString().split('T')[0];
    }

    weeklyWinners() {
        const completed = this.completedMatches();
        const preds = this.predictions();
        if (completed.length === 0) return [];

        // Group matches by week
        const weekMap = new Map<string, { matches: any[], monday: Date }>();
        for (const match of completed) {
            const key = this.getWeekKey(new Date(match.date));
            if (!weekMap.has(key)) {
                weekMap.set(key, { matches: [], monday: new Date(key) });
            }
            weekMap.get(key)!.matches.push(match);
        }

        // For each week, calculate user points
        const weeks: any[] = [];
        weekMap.forEach((data, key) => {
            const userPoints = new Map<string, { username: string, points: number }>();
            const allMatchPreds = this.iplService.allPredictionsByMatch();

            for (const match of data.matches) {
                const matchPreds = allMatchPreds.get(match.id) || [];
                for (const pred of matchPreds) {
                    if (!match.result) continue;
                    const pts = this.iplService.calcPoints(pred, match.result);
                    if (!userPoints.has(pred.userId)) {
                        userPoints.set(pred.userId, { username: pred.username || 'User', points: 0 });
                    }
                    userPoints.get(pred.userId)!.points += pts;
                }
            }

            const sorted = Array.from(userPoints.values()).sort((a, b) => b.points - a.points);
            if (sorted.length === 0) return;

            const sunday = new Date(data.monday);
            sunday.setDate(sunday.getDate() + 6);

            weeks.push({
                key,
                monday: data.monday,
                sunday,
                weekLabel: `${data.monday.toLocaleDateString(undefined, { day: 'numeric', month: 'short' })} – ${sunday.toLocaleDateString(undefined, { day: 'numeric', month: 'short' })}`,
                matchCount: data.matches.length,
                winner: sorted[0],
                runnerUp: sorted.length > 1 ? sorted[1] : null
            });
        });

        return weeks.sort((a, b) => b.monday.getTime() - a.monday.getTime());
    }
}
