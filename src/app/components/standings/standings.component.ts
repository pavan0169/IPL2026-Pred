import { Component, signal, computed } from '@angular/core';
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
    imports: [CommonModule],
    templateUrl: './standings.component.html',
    styleUrl: './standings.component.css'
})
export class StandingsComponent {
    activeTab = signal<'standings' | 'stats' | 'dashboard'>('dashboard');
    viewTab = signal<'today' | 'daily' | 'weekly' | 'overall'>('today');
    userStats() { return this.iplService.userStats(); }
    matches() { return this.iplService.matches(); }
    predictions() { return this.iplService.predictions(); }


    getLatestCompletedMatch() {
        const completed = this.matches()
            .filter(m => !!m.result)
            .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        return completed.length > 0 ? completed[0] : null;
    }

    todayStandings = computed(() => {
        const match = this.getLatestCompletedMatch();
        if (!match || !match.result) return [];

        const predictions = this.predictions().filter(p => p.matchId === match.id);
        const users = this.iplService.userStats();

        console.log('--- DEBUG TODAY STANDINGS ---');
        console.log('Match Result:', JSON.stringify(match.result));
        console.log('User Stats Length:', users.length);
        if (predictions.length > 0) {
            console.log('Sample Prediction:', JSON.stringify(predictions[0]));
        }

        const standings = users.map(user => {
            const pred = predictions.find(p => p.userId === user.userId);
            const points = pred ? this.iplService.calcPoints(pred, match.result!) : 0;
            return {
                userId: user.userId,
                username: user.username,
                matchPoints: points,
                prediction: pred
            };
        }).sort((a, b) => b.matchPoints - a.matchPoints);

        // Assign rank with tie handling
        let rank = 1;
        standings.forEach((s, i) => {
            if (i > 0 && s.matchPoints < standings[i - 1].matchPoints) {
                rank = i + 1;
            }
            (s as any).rank = rank;
        });

        return standings;
    });

    weeklyChampions = computed(() => {
        const matches = this.matches();
        const predictions = this.predictions();
        const completed = matches.filter(m => !!m.result);

        if (completed.length === 0) return [];

        const weeklyData = new Map<string, { label: string, matches: any[], scores: Map<string, number>, weekStart: Date }>();

        completed.forEach(m => {
            const d = new Date(m.date);
            // Monday-Sunday weeks
            const day = d.getDay();
            const diff = day === 0 ? 6 : day - 1; // 0=Sun, 1=Mon...
            const start = new Date(d);
            start.setDate(d.getDate() - diff);
            start.setHours(0, 0, 0, 0);
            const end = new Date(start);
            end.setDate(start.getDate() + 6);
            end.setHours(23, 59, 59, 999);

            const label = `${start.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} – ${end.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}`;
            if (!weeklyData.has(label)) {
                weeklyData.set(label, { label, matches: [], scores: new Map<string, number>(), weekStart: start });
            }
            const week = weeklyData.get(label)!;
            week.matches.push(m);

            const matchPreds = predictions.filter(p => p.matchId === m.id);
            matchPreds.forEach(p => {
                const pts = this.iplService.calcPoints(p, m.result!);
                week.scores.set(p.userId, (week.scores.get(p.userId) || 0) + pts);
            });
        });

        return Array.from(weeklyData.values()).map((w, idx) => {
            const sortedPlayers = Array.from(w.scores.entries())
                .map(([userId, points]) => ({
                    userId,
                    username: this.userStats().find(s => s.userId === userId)?.username || 'User',
                    points
                }))
                .sort((a, b) => b.points - a.points);

            return {
                label: w.label,
                weekNumber: 0, // Will sort and assign after
                matchCount: w.matches.length,
                topPlayers: sortedPlayers,
                weekStart: w.weekStart
            };
        }).sort((a, b) => b.weekStart.getTime() - a.weekStart.getTime())
            .map((w, idx, arr) => ({ ...w, weekNumber: arr.length - idx }));
    });

    dailyChampions = computed(() => {
        const matches = this.matches();
        const predictions = this.predictions();
        const completed = matches
            .filter(m => !!m.result)
            .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

        return completed.map(m => {
            const matchPreds = predictions.filter(p => p.matchId === m.id);
            const scoredPlayers = this.iplService.userStats().map(user => {
                const pred = matchPreds.find(p => p.userId === user.userId);
                const pts = pred ? this.iplService.calcPoints(pred, m.result!) : 0;
                return { userId: user.userId, username: user.username, points: pts, predicted: !!pred };
            }).sort((a, b) => b.points - a.points);

            return {
                match: m,
                dateLabel: new Date(m.date).toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' }),
                players: scoredPlayers
            };
        });
    });

    playerStats = computed(() => {
        const matches = this.matches();
        const predictions = this.predictions();
        const users = this.userStats();
        const completed = matches.filter(m => !!m.result);
        const totalCompleted = completed.length;

        // Pre-calculate weekly winners
        const weeklyWinnersRaw = this.weeklyChampions();
        const allWeeklyWinnerIds = weeklyWinnersRaw.map(w => {
            const maxPts = w.topPlayers[0]?.points;
            if (maxPts === undefined || maxPts === 0) return [];
            return w.topPlayers.filter(tp => tp.points === maxPts).map(tp => tp.userId);
        }).flat();

        return users.map(user => {
            const uid = user.userId;
            let rank1Count = 0;
            let rank2Count = 0;
            let bestScore = 0;
            let totalMatchPts = 0;
            let matchesPlayed = 0;
            let exactScoreCount = 0;
            let perfectCount = 0;
            let correctCategoryTotal = 0;
            let categoryAttempts = 0;

            const weeklyWins = allWeeklyWinnerIds.filter(id => id === uid).length;

            completed.forEach(m => {
                const matchPreds = predictions.filter(p => p.matchId === m.id);
                const pred = matchPreds.find(p => p.userId === uid);

                // Per-match leaderboard rank
                const scored = users.map(u => {
                    const up = matchPreds.find(p => p.userId === u.userId);
                    return { userId: u.userId, pts: up ? this.iplService.calcPoints(up, m.result!) : 0 };
                }).sort((a, b) => b.pts - a.pts);
                const myPos = scored.findIndex(s => s.userId === uid);
                if (myPos === 0) rank1Count++;
                else if (myPos === 1) rank2Count++;

                if (!pred) return;
                matchesPlayed++;
                const pts = this.iplService.calcPoints(pred, m.result!);
                totalMatchPts += pts;
                if (pts > bestScore) bestScore = pts;

                // Exact score bonus
                if (pred.team1Score !== undefined && pred.team2Score !== undefined &&
                    m.result!.team1Score !== undefined && m.result!.team2Score !== undefined &&
                    +pred.team1Score === +m.result!.team1Score && +pred.team2Score === +m.result!.team2Score) {
                    exactScoreCount++;
                }

                // Category accuracy
                const checks: [any, any][] = [
                    [pred.winner, m.result!.winner],
                    [pred.firstInningRange, m.result!.firstInningRange],
                    [pred.secondInningRange, m.result!.secondInningRange],
                    [pred.teamMore4s, m.result!.teamMore4s],
                    [pred.teamMore6s, m.result!.teamMore6s],
                    [pred.playerMax6s, m.result!.playerMax6s],
                    [pred.fantasyPlayer, m.result!.fantasyPlayer],
                    [pred.playerOfMatch, m.result!.playerOfMatch],
                    [pred.superStriker, m.result!.superStriker],
                    [pred.mostDotBalls, m.result!.mostDotBalls],
                ];
                checks.forEach(([p, r]) => {
                    if (p !== undefined && p !== null && String(p).trim() !== '') {
                        categoryAttempts++;
                        if (this.iplService.isStringMatch(String(p), String(r ?? ''))) correctCategoryTotal++;
                    }
                });
                if (checks.every(([p, r]) => this.iplService.isStringMatch(String(p ?? ''), String(r ?? '')))) {
                    perfectCount++;
                }
            });

            return {
                userId: uid,
                username: user.username,
                totalPoints: user.totalPoints,
                rank: user.rank,
                correctWinners: user.correctWinners,
                totalPredictions: user.totalPredictions,
                rank1Count,
                rank2Count,
                weeklyWins,
                bestScore,
                avgPts: matchesPlayed > 0 ? Math.round((totalMatchPts / matchesPlayed) * 10) / 10 : 0,
                exactScoreCount,
                perfectCount,
                participationRate: totalCompleted > 0 ? Math.round((matchesPlayed / totalCompleted) * 100) : 0,
                accuracy: categoryAttempts > 0 ? Math.round((correctCategoryTotal / categoryAttempts) * 100) : 0,
                matchesPlayed,
                totalCompleted,
            };
        }).sort((a, b) => b.totalPoints - a.totalPoints);
    });

    dashboardHighlights = computed(() => {
        const stats = this.playerStats();
        const weekly = this.weeklyChampions();
        const daily = this.dailyChampions();

        if (stats.length === 0) return null;

        // Weekly winner (latest week)
        const weeklyWinner = weekly.length > 0 ? weekly[0].topPlayers[0] : null;

        // Daily winner (latest match)
        const dailyWinner = daily.length > 0 ? daily[0].players[0] : null;

        // Most wins (Overall rank 1 count)
        const mostWins = [...stats].sort((a, b) => b.rank1Count - a.rank1Count)[0];

        // Max points (Overall leader)
        const maxPoints = stats[0]; // Already sorted by totalPoints

        // Most accurate
        const mostAccurate = [...stats].sort((a, b) => b.accuracy - a.accuracy)[0];

        return {
            weeklyWinner: weeklyWinner ? { name: weeklyWinner.username, pts: weeklyWinner.points } : null,
            dailyWinner: dailyWinner ? { name: dailyWinner.username, pts: dailyWinner.points } : null,
            mostWins: mostWins ? { name: mostWins.username, count: mostWins.rank1Count } : null,
            maxPoints: maxPoints ? { name: maxPoints.username, pts: maxPoints.totalPoints } : null,
            mostAccurate: mostAccurate ? { name: mostAccurate.username, rate: mostAccurate.accuracy } : null
        };
    });

    dashboardLeaderboard = computed(() => {
        const stats = this.playerStats();
        const weekly = this.weeklyChampions();
        const daily = this.dailyChampions();

        if (stats.length === 0) return [];

        const maxPoints = stats[0].totalPoints;
        const maxWins = Math.max(...stats.map(s => s.rank1Count));
        const maxAcc = Math.max(...stats.map(s => s.accuracy));
        const currentDailyWinnerId = daily.length > 0 ? daily[0].players[0]?.userId : null;
        const currentWeeklyWinnerId = weekly.length > 0 ? weekly[0].topPlayers[0]?.userId : null;

        return stats.map(s => {
            const badges = [];
            if (s.userId === currentWeeklyWinnerId) badges.push({ type: 'weekly', label: 'weekly' });
            if (s.totalPoints === maxPoints) badges.push({ type: 'max', label: 'max pts' });
            if (s.rank1Count === maxWins && maxWins > 0) badges.push({ type: 'wins', label: 'most wins' });
            if (s.userId === currentDailyWinnerId) badges.push({ type: 'today', label: 'today' });
            if (s.accuracy === maxAcc && maxAcc > 0) badges.push({ type: 'accuracy', label: 'top acc' });

            // Points from latest weekly record
            const latestWeeklyPts = weekly.length > 0 ? (weekly[0].topPlayers.find(p => p.userId === s.userId)?.points || 0) : 0;

            return {
                ...s,
                weeklyPts: latestWeeklyPts,
                badges,
                pointsPercent: maxPoints > 0 ? Math.round((s.totalPoints / maxPoints) * 100) : 0
            };
        });
    });

    selectedUserId = signal<string | null>(null);

    getPlayerColor(index: number): string {
        const colors = [
            '#6366f1', // Indigo
            '#f43f5e', // Rose
            '#10b981', // Emerald
            '#f59e0b', // Amber
            '#0ea5e9', // Sky
            '#8b5cf6', // Violet
            '#ec4899', // Pink
            '#14b8a6', // Teal
            '#f97316', // Orange
            '#64748b'  // Slate
        ];
        return colors[index % colors.length];
    }

    constructor(public iplService: IplService) { }

    shortenLabel(label: string): string {
        const map: { [key: string]: string } = {
            'Match Winner': 'Winner',
            'Score Range': 'Score',
            'PBKS Score Range': 'PBKS Score',
            'GT Score Range': 'GT Score',
            'CSK Score Range': 'CSK Score',
            'RCB Score Range': 'RCB Score',
            'MI Score Range': 'MI Score',
            'DC Score Range': 'DC Score',
            'RR Score Range': 'RR Score',
            'LSG Score Range': 'LSG Score',
            'SRH Score Range': 'SRH Score',
            'KKR Score Range': 'KKR Score',
            'Most 4s team': 'Team 4s',
            'Most 6s team': 'Team 6s',
            'Max 6s Player': 'Player 6s',
            'Player with Maximum 4s': 'Player 4s',
            'Bowler (Less Economy)': 'Eco Bowler',
            'Fantasy Player (Most Runs)': 'Top Batsman',
            'Super Striker (10 balls min)': 'Super Striker',
            'Bowler (Most Dot Balls)': 'Dot Bowler',
            'Player of the Match': 'Player of Match'
        };
        return map[label] || label;
    }


    completedMatches() {
        return this.matches().filter(m => !!m.result);
    }


    getTeamName(msg: any, tid?: string) {
        if (!msg || !tid) return '-';
        if (tid === msg.team1.id) return msg.team1.shortName;
        if (tid === msg.team2.id) return msg.team2.shortName;
        return tid;
    }

    rankEmoji(rank: number): string {
        if (rank === 1) return '🥇';
        if (rank === 2) return '🥈';
        if (rank === 3) return '🥉';
        if (rank === 4) return '4️⃣';
        if (rank === 5) return '5️⃣';
        if (rank === 6) return '6️⃣';
        if (rank === 7) return '7️⃣';
        if (rank === 8) return '8️⃣';
        if (rank === 9) return '9️⃣';
        return `#${rank}`;
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
        const latestMatch = this.getLatestCompletedMatch();
        if (!latestMatch) return [];

        const userPred = this.predictions().find(p => p.userId === uid && p.matchId === latestMatch.id);
        if (!userPred) return [];

        const points = this.iplService.calcPoints(userPred, latestMatch.result!);
        return [{
            match: latestMatch,
            prediction: userPred,
            pointsEarned: points
        }];
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
            const isMatch = this.iplService.isStringMatch(pVal, rVal) && pVal !== '-' && rVal !== '-';
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

        addDtl(`${match.team1.shortName} Score Range`, pred.firstInningRange, result.firstInningRange, 3);
        addDtl(`${match.team2.shortName} Score Range`, pred.secondInningRange, result.secondInningRange, 3);
        addDtl('Most 4s team', teamName(pred.teamMore4s), teamName(result.teamMore4s), 2);
        addDtl('Most 6s team', teamName(pred.teamMore6s), teamName(result.teamMore6s), 2);

        const max6s = addDtl('Max 6s Player', pred.playerMax6s, result.playerMax6s, 3);
        const fantasy = addDtl('Player with Maximum 4s', pred.fantasyPlayer, result.fantasyPlayer, 4);
        const pom = addDtl('Player of Match', pred.playerOfMatch, result.playerOfMatch, 5);
        const striker = addDtl('Bowler       (Less Economy)', pred.superStriker, result.superStriker, 4);
        const dotBalls = addDtl('Super Striker of the match', pred.mostDotBalls, result.mostDotBalls, 4);

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
