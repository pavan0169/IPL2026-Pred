import { Component, signal, computed, ViewChild, ElementRef, AfterViewInit, OnDestroy, effect, NgZone, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IplService } from '../../services/ipl.service';
import { AuthService } from '../../services/auth.service';
import { CricketLoaderComponent } from '../cricket-loader/cricket-loader.component';
import { StatTileComponent } from '../shared/stat-tile/stat-tile.component';
import { ProgressBarComponent } from '../shared/progress-bar/progress-bar.component';
import { GoogleChartsService } from '../../services/google-charts.service';

type SubTab = 'dashboard' | 'leaderboards' | 'stats';

interface ChartSeries {
    userId: string;
    username: string;
    color: string;
    data: number[];
}

interface ChartDataPayload {
    labels: string[];
    series: ChartSeries[];
    matchDates: Date[];
}

@Component({
    selector: 'app-standings',
    standalone: true,
    imports: [CommonModule, FormsModule],
    templateUrl: './standings.component.html',
    styleUrl: './standings.component.css'
})
export class StandingsComponent implements AfterViewInit, OnDestroy {
    activeTab = signal<'leaderboards' | 'analytics'>('leaderboards');
    viewTab = signal<'overall' | 'weekly' | 'daily' | 'today'>('overall');
    userStats() { return this.iplService.userStats(); }

    // ---- Chart State ----
    @ViewChild('chartContainer') chartContainerRef!: ElementRef<HTMLDivElement>;
    selectedPlayers = signal<Set<string>>(new Set());
    dateRange = signal<'7d' | '30d' | 'all'>('all');
    chartLoading = signal(true);
    private chartInstance: any = null;
    private resizeListener: (() => void) | null = null;
    private chartInitialized = false;

    /** Player colors — reuses getPlayerColor() palette */
    private readonly playerColors = [
        '#6366f1', '#f43f5e', '#10b981', '#f59e0b', '#0ea5e9',
        '#8b5cf6', '#ec4899', '#14b8a6', '#f97316', '#64748b'
    ];

    // ---- Computed: full chart data (all players, all matches) ----
    chartData = computed<ChartDataPayload>(() => {
        const matches = this.matches()
            .filter(m => !!m.result && m.result.winner !== 'cancelled')
            .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

        const predictions = this.predictions();
        const users = this.iplService.userStats();

        if (matches.length === 0 || users.length === 0) {
            return { labels: [], series: [], matchDates: [] };
        }

        const labels: string[] = [];
        const matchDates: Date[] = [];
        const cumulativePoints = new Map<string, number[]>();

        // Initialize cumulative tracking for each user
        users.forEach(u => cumulativePoints.set(u.userId, []));

        let runningTotals = new Map<string, number>();
        users.forEach(u => runningTotals.set(u.userId, 0));

        matches.forEach((m, idx) => {
            const d = new Date(m.date);
            const matchLabel = `M${m.id.substring(1)} (${d.toLocaleDateString(undefined, { day: 'numeric', month: 'short' })})`;
            labels.push(matchLabel);
            matchDates.push(d);

            const matchPreds = predictions.filter(p => p.matchId === m.id);

            users.forEach(user => {
                const pred = matchPreds.find(p => p.userId === user.userId);
                const pts = pred ? this.iplService.calcPoints(pred, m.result!) : 0;
                const running = (runningTotals.get(user.userId) || 0) + pts;
                runningTotals.set(user.userId, running);
                cumulativePoints.get(user.userId)!.push(running);
            });
        });

        const series: ChartSeries[] = users.map((u, i) => ({
            userId: u.userId,
            username: u.username,
            color: this.playerColors[i % this.playerColors.length],
            data: cumulativePoints.get(u.userId) || []
        }));

        return { labels, series, matchDates };
    });

    // ---- Computed: filtered chart data ----
    chartFilteredData = computed<ChartDataPayload>(() => {
        const full = this.chartData();
        const selected = this.selectedPlayers();
        const range = this.dateRange();

        if (full.labels.length === 0) return full;

        // Date range filter
        let startIdx = 0;
        if (range !== 'all' && full.matchDates.length > 0) {
            const now = new Date();
            const daysAgo = range === '7d' ? 7 : 30;
            const cutoff = new Date(now.getTime() - daysAgo * 24 * 60 * 60 * 1000);
            startIdx = full.matchDates.findIndex(d => d >= cutoff);
            if (startIdx === -1) startIdx = full.matchDates.length; // no matches in range
        }

        const labels = full.labels.slice(startIdx);
        const matchDates = full.matchDates.slice(startIdx);

        // Player filter
        const series = full.series
            .filter(s => selected.has(s.userId))
            .map(s => ({
                ...s,
                data: s.data.slice(startIdx)
            }));

        return { labels, series, matchDates };
    });

    allPlayersSelected = computed(() => {
        const users = this.iplService.userStats();
        return this.selectedPlayers().size >= users.length;
    });

    noPlayersSelected = computed(() => this.selectedPlayers().size === 0);
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
                const pNorm = IplService.normalizeData(pred);
                const rNorm = IplService.normalizeData(m.result!);

                const checks: [any, any][] = [
                    [pNorm.winner, rNorm.winner],
                    [pNorm.firstInningRange, rNorm.firstInningRange],
                    [pNorm.secondInningRange, rNorm.secondInningRange],
                    [pNorm.teamMore4s, rNorm.teamMore4s],
                    [pNorm.teamMore6s, rNorm.teamMore6s],
                    [pNorm.playerMax6s, rNorm.playerMax6s],
                    [pNorm.most4s, rNorm.most4s],
                    [pNorm.playerOfMatch, rNorm.playerOfMatch],
                    [pNorm.economy, rNorm.economy],
                    [pNorm.superStriker, rNorm.superStriker],
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

    // ═══════════════════════════════════════════════════
    // ANALYTICS DASHBOARD — Computed Signals
    // ═══════════════════════════════════════════════════

    // ---- Race Track Data ----
    raceTrackData = computed(() => {
        const stats = this.dashboardLeaderboard();
        if (stats.length === 0) return [];

        const leader = stats[0];
        const chartFull = this.chartData();

        return stats.map((p, i) => {
            const gapToLeader = leader.totalPoints - p.totalPoints;
            const leaderPercent = leader.totalPoints > 0
                ? Math.round((p.totalPoints / leader.totalPoints) * 1000) / 10
                : 0;
            const gapToNext = i > 0 ? stats[i - 1].totalPoints - p.totalPoints : 0;
            const gapFromPrev = i < stats.length - 1 ? p.totalPoints - stats[i + 1].totalPoints : 0;

            // Momentum: compare last 3 matches points vs average
            let momentum: 'rising' | 'falling' | 'steady' = 'steady';
            const series = chartFull.series.find(s => s.userId === p.userId);
            if (series && series.data.length >= 4) {
                const d = series.data;
                const last3Avg = (d[d.length - 1] - d[d.length - 4]) / 3;
                const prev3Avg = d.length >= 7
                    ? (d[d.length - 4] - d[d.length - 7]) / 3
                    : (d[d.length - 4] - d[0]) / Math.max(d.length - 4, 1);
                if (last3Avg > prev3Avg * 1.15) momentum = 'rising';
                else if (last3Avg < prev3Avg * 0.85) momentum = 'falling';
            }

            return {
                ...p,
                gapToLeader,
                leaderPercent,
                gapToNext,
                gapFromPrev,
                momentum,
                isLeader: i === 0,
                trackPosition: leaderPercent // 0-100 for CSS positioning
            };
        });
    });

    // ---- Momentum & Streaks Data ----
    momentumData = computed(() => {
        const stats = this.playerStats();
        const chartFull = this.chartData();
        const daily = this.dailyChampions();
        const weekly = this.weeklyChampions();

        if (stats.length === 0) return [];

        return stats.map((p, idx) => {
            const series = chartFull.series.find(s => s.userId === p.userId);
            const data = series?.data || [];

            // Points this week (latest weekly entry)
            const weeklyPts = weekly.length > 0
                ? (weekly[0].topPlayers.find((tp: any) => tp.userId === p.userId)?.points || 0)
                : 0;

            // Points per match velocity
            const velocity = p.matchesPlayed > 0
                ? Math.round((p.totalPoints / p.matchesPlayed) * 10) / 10
                : 0;

            // Last match points
            let lastMatchPts = 0;
            if (data.length >= 2) {
                lastMatchPts = data[data.length - 1] - data[data.length - 2];
            } else if (data.length === 1) {
                lastMatchPts = data[0];
            }

            // Win streak: count consecutive daily #1 finishes from the latest
            let winStreak = 0;
            for (const day of daily) {
                if (day.players[0]?.userId === p.userId) {
                    winStreak++;
                } else {
                    break;
                }
            }

            // Momentum direction
            let momentum: 'rising' | 'falling' | 'steady' = 'steady';
            if (data.length >= 4) {
                const last3Avg = (data[data.length - 1] - data[data.length - 4]) / 3;
                const prev3Avg = data.length >= 7
                    ? (data[data.length - 4] - data[data.length - 7]) / 3
                    : (data[data.length - 4] - data[0]) / Math.max(data.length - 4, 1);
                if (last3Avg > prev3Avg * 1.15) momentum = 'rising';
                else if (last3Avg < prev3Avg * 0.85) momentum = 'falling';
            }

            // Best and worst match
            let bestMatchPts = 0;
            let worstMatchPts = Infinity;
            for (let i = 1; i < data.length; i++) {
                const delta = data[i] - data[i - 1];
                if (delta > bestMatchPts) bestMatchPts = delta;
                if (delta < worstMatchPts) worstMatchPts = delta;
            }
            if (worstMatchPts === Infinity) worstMatchPts = 0;

            return {
                ...p,
                weeklyPts,
                velocity,
                lastMatchPts,
                winStreak,
                momentum,
                bestMatchPts,
                worstMatchPts,
                color: this.getPlayerColor(idx)
            };
        });
    });

    // ---- Competitive Landscape Data ----
    landscapeData = computed(() => {
        const stats = this.playerStats();
        if (stats.length === 0) return { tiers: [], rivalries: [] };

        const leader = stats[0];
        const maxPts = leader.totalPoints || 1;

        const players = stats.map((p, i) => {
            const pct = (p.totalPoints / maxPts) * 100;
            let tier: string;
            let tierLabel: string;
            let tierIcon: string;
            if (pct >= 80) { tier = 'champions'; tierLabel = 'Champions Zone'; tierIcon = '🏆'; }
            else if (pct >= 50) { tier = 'contenders'; tierLabel = 'Contenders Zone'; tierIcon = '⚔️'; }
            else if (pct >= 25) { tier = 'rising'; tierLabel = 'Rising Stars'; tierIcon = '🌟'; }
            else { tier = 'rookies'; tierLabel = 'Rookies'; tierIcon = '🌱'; }

            return {
                ...p,
                tier,
                tierLabel,
                tierIcon,
                pct: Math.round(pct * 10) / 10,
                color: this.getPlayerColor(i)
            };
        });

        // Find rivalries (players within 20 pts of each other)
        const rivalries: { player1: string; player2: string; gap: number }[] = [];
        for (let i = 0; i < stats.length; i++) {
            for (let j = i + 1; j < stats.length; j++) {
                const gap = Math.abs(stats[i].totalPoints - stats[j].totalPoints);
                if (gap <= 20 && gap > 0) {
                    rivalries.push({
                        player1: stats[i].username,
                        player2: stats[j].username,
                        gap
                    });
                }
            }
        }

        // Group players by tier
        const tiers = ['champions', 'contenders', 'rising', 'rookies']
            .map(t => ({
                id: t,
                label: players.find(p => p.tier === t)?.tierLabel || t,
                icon: players.find(p => p.tier === t)?.tierIcon || '',
                players: players.filter(p => p.tier === t)
            }))
            .filter(t => t.players.length > 0);

        return { tiers, rivalries };
    });

    // ---- Radar Chart Data ----
    radarSelectedPlayers = signal<Set<string>>(new Set());

    radarData = computed(() => {
        const stats = this.playerStats();
        if (stats.length === 0) return { axes: [], players: [] };

        const maxPoints = Math.max(...stats.map(s => s.totalPoints), 1);
        const maxWins = Math.max(...stats.map(s => s.rank1Count), 1);
        const maxAcc = Math.max(...stats.map(s => s.accuracy), 1);
        const maxAvg = Math.max(...stats.map(s => s.avgPts), 1);
        const maxBest = Math.max(...stats.map(s => s.bestScore), 1);
        const maxExact = Math.max(...stats.map(s => s.exactScoreCount), 1);

        const axes = [
            { key: 'points', label: 'Points' },
            { key: 'wins', label: 'Wins' },
            { key: 'accuracy', label: 'Accuracy' },
            { key: 'avgPts', label: 'Avg Pts' },
            { key: 'bestScore', label: 'Best' },
            { key: 'exactScores', label: 'Exact' }
        ];

        const players = stats.map((p, i) => ({
            userId: p.userId,
            username: p.username,
            color: this.getPlayerColor(i),
            values: [
                Math.round((p.totalPoints / maxPoints) * 100),
                Math.round((p.rank1Count / maxWins) * 100),
                Math.round((p.accuracy / maxAcc) * 100),
                Math.round((p.avgPts / maxAvg) * 100),
                Math.round((p.bestScore / maxBest) * 100),
                Math.round((p.exactScoreCount / maxExact) * 100)
            ],
            rawValues: [p.totalPoints, p.rank1Count, p.accuracy, p.avgPts, p.bestScore, p.exactScoreCount]
        }));

        return { axes, players };
    });

    radarFilteredPlayers = computed(() => {
        const selected = this.radarSelectedPlayers();
        const all = this.radarData().players;
        if (selected.size === 0) return all; // show all by default
        return all.filter(p => selected.has(p.userId));
    });

    // Radar SVG helpers
    getRadarPoint(value: number, axisIndex: number, totalAxes: number, radius: number = 120): string {
        const angle = (Math.PI * 2 * axisIndex) / totalAxes - Math.PI / 2;
        const r = (value / 100) * radius;
        const x = 150 + r * Math.cos(angle);
        const y = 150 + r * Math.sin(angle);
        return `${x},${y}`;
    }

    getRadarPolygon(values: number[], totalAxes: number, radius: number = 120): string {
        return values.map((v, i) => this.getRadarPoint(v, i, totalAxes, radius)).join(' ');
    }

    getRadarAxisEnd(axisIndex: number, totalAxes: number, radius: number = 130): { x: number; y: number } {
        const angle = (Math.PI * 2 * axisIndex) / totalAxes - Math.PI / 2;
        return {
            x: 150 + radius * Math.cos(angle),
            y: 150 + radius * Math.sin(angle)
        };
    }

    getRadarLabelPos(axisIndex: number, totalAxes: number): { x: number; y: number; anchor: string } {
        const angle = (Math.PI * 2 * axisIndex) / totalAxes - Math.PI / 2;
        const r = 145;
        const x = 150 + r * Math.cos(angle);
        const y = 150 + r * Math.sin(angle);
        let anchor = 'middle';
        if (Math.cos(angle) > 0.3) anchor = 'start';
        if (Math.cos(angle) < -0.3) anchor = 'end';
        return { x, y: y + 4, anchor };
    }

    toggleRadarPlayer(userId: string) {
        const current = new Set(this.radarSelectedPlayers());
        if (current.has(userId)) {
            current.delete(userId);
        } else {
            current.add(userId);
        }
        this.radarSelectedPlayers.set(current);
    }

    isRadarPlayerSelected(userId: string): boolean {
        const sel = this.radarSelectedPlayers();
        return sel.size === 0 || sel.has(userId);
    }

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

    constructor(
        public iplService: IplService,
        private googleCharts: GoogleChartsService,
        private ngZone: NgZone,
        private cdr: ChangeDetectorRef
    ) {
        // When chart data, player selection, or date range changes, redraw chart
        effect(() => {
            const data = this.chartFilteredData();
            // Trigger draw inside the effect to react to signal changes
            if (this.chartInitialized && data.labels.length > 0) {
                // Use setTimeout to let Angular render the container element first
                setTimeout(() => this.drawChart(data), 50);
            }
        });

        // Initialize selectedPlayers once user stats are available
        effect(() => {
            const users = this.iplService.userStats();
            if (users.length > 0 && this.selectedPlayers().size === 0) {
                this.selectedPlayers.set(new Set(users.map(u => u.userId)));
            }
        });

        // Watch for tab switches to analytics — re-render chart when the DOM element becomes available
        effect(() => {
            const tab = this.activeTab();
            if (tab === 'analytics' && this.chartInitialized) {
                // Force change detection so Angular re-creates the @if block and updates @ViewChild
                this.cdr.detectChanges();

                // Retry until the ViewChild element is available (Angular may need a frame)
                let retries = 0;
                const tryDraw = () => {
                    const container = this.chartContainerRef?.nativeElement;
                    if (container) {
                        const data = this.chartFilteredData();
                        if (data.labels.length > 0) {
                            this.chartInstance = null; // Force a fresh chart instance
                            this.drawChart(data);
                        }
                    } else if (retries < 5) {
                        retries++;
                        setTimeout(tryDraw, 100);
                    }
                };
                setTimeout(tryDraw, 50);
            }
        });
    }

    ngAfterViewInit() {
        // Load Google Charts and render once ready
        if (typeof window !== 'undefined') {
            this.googleCharts.ready.then(() => {
                this.chartLoading.set(false);
                this.chartInitialized = true;

                // Initial draw if data is already available
                const data = this.chartFilteredData();
                if (data.labels.length > 0) {
                    setTimeout(() => this.drawChart(data), 50);
                }

                // Responsive resize
                this.resizeListener = () => {
                    if (this.chartInstance && this.chartContainerRef?.nativeElement) {
                        this.drawChart(this.chartFilteredData());
                    }
                };
                window.addEventListener('resize', this.resizeListener);
            }).catch(err => {
                console.warn('Google Charts failed to load:', err);
                this.chartLoading.set(false);
            });
        }
    }

    ngOnDestroy() {
        if (this.resizeListener) {
            window.removeEventListener('resize', this.resizeListener);
        }
    }

    // ---- Chart Drawing ----
    private drawChart(payload: ChartDataPayload) {
        const container = this.chartContainerRef?.nativeElement;
        if (!container || !payload.labels.length || !payload.series.length) return;

        const google = (window as any).google;
        if (!google?.visualization) return;

        const dataTable = new google.visualization.DataTable();
        dataTable.addColumn('string', 'Match');

        payload.series.forEach(s => {
            dataTable.addColumn('number', s.username);
            dataTable.addColumn({ type: 'string', role: 'tooltip', p: { html: true } });
        });

        payload.labels.forEach((label, i) => {
            const row: any[] = [label];
            payload.series.forEach(s => {
                const pts = s.data[i] ?? 0;
                const tooltip = `<div style="padding:10px 14px;font-family:Inter,sans-serif;min-width:140px">
                    <div style="font-weight:800;font-size:13px;color:${s.color};margin-bottom:4px">${s.username}</div>
                    <div style="font-size:12px;color:#64748b">${label}</div>
                    <div style="font-size:18px;font-weight:900;margin-top:6px">${pts} pts</div>
                </div>`;
                row.push(pts, tooltip);
            });
            dataTable.addRow(row);
        });

        const isDark = document.body.classList.contains('dark');
        const textColor = isDark ? '#cbd5e1' : '#5e4b80';
        const gridColor = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)';
        const bgColor = 'transparent';

        const colors = payload.series.map(s => s.color);

        const options: any = {
            title: '',
            curveType: 'function',
            legend: { position: 'none' },
            tooltip: { isHtml: true, trigger: 'both' },
            backgroundColor: bgColor,
            chartArea: {
                left: 50,
                top: 20,
                right: 20,
                bottom: 50,
                width: '90%',
                height: '75%'
            },
            colors,
            lineWidth: 3,
            pointSize: 5,
            pointShape: 'circle',
            hAxis: {
                textStyle: { color: textColor, fontSize: 11, fontName: 'Inter' },
                gridlines: { color: gridColor },
                slantedText: true,
                slantedTextAngle: 45
            },
            vAxis: {
                textStyle: { color: textColor, fontSize: 11, fontName: 'Inter' },
                gridlines: { color: gridColor },
                minorGridlines: { count: 0 },
                title: 'Cumulative Points',
                titleTextStyle: { color: textColor, fontSize: 12, fontName: 'Inter', italic: false }
            },
            animation: {
                startup: true,
                duration: 600,
                easing: 'out'
            },
            focusTarget: 'category',
            crosshair: { trigger: 'both', orientation: 'vertical', color: isDark ? '#8b5cf6' : '#7c3aed', opacity: 0.3 }
        };

        this.ngZone.runOutsideAngular(() => {
            if (!this.chartInstance) {
                this.chartInstance = new google.visualization.LineChart(container);
            }
            this.chartInstance.draw(dataTable, options);
        });
    }

    // ---- Player Toggle Methods ----
    togglePlayer(userId: string) {
        const current = new Set(this.selectedPlayers());
        if (current.has(userId)) {
            // Prevent deselecting the last player
            if (current.size <= 1) return;
            current.delete(userId);
        } else {
            current.add(userId);
        }
        this.selectedPlayers.set(current);
    }

    isPlayerSelected(userId: string): boolean {
        return this.selectedPlayers().has(userId);
    }

    selectAllPlayers() {
        const users = this.iplService.userStats();
        this.selectedPlayers.set(new Set(users.map(u => u.userId)));
    }

    deselectAllPlayers() {
        // Keep the first player selected to prevent empty state
        const users = this.iplService.userStats();
        if (users.length > 0) {
            this.selectedPlayers.set(new Set([users[0].userId]));
        }
    }

    setDateRange(range: '7d' | '30d' | 'all') {
        this.dateRange.set(range);
    }

    getPlayerChartColor(userId: string): string {
        const users = this.iplService.userStats();
        const idx = users.findIndex(u => u.userId === userId);
        return this.playerColors[(idx >= 0 ? idx : 0) % this.playerColors.length];
    }

    shortenLabel(label: string): string {
        const map: { [key: string]: string } = {
            'Match Winner': 'Winner',
            '1st Inning Range': 'Score 1',
            '2nd Inning Range': 'Score 2',
            'Team with more 4s': 'Team 4s',
            'Team with more 6s': 'Team 6s',
            'Player with Maximum 6s': 'Player 6s',
            'Player with Maximum 4s': 'Player 4s',
            'Bowler (Less Economy)': 'Eco Bowler',
            'Super Striker of the match': 'Super Striker',
            'Player of the Match': 'Player of Match',
            'Exact Score Bonus': 'Exact Score',
            'Perfect Predictor': 'Perfect'
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
        return uid ? this.playerStats().find(s => s.userId === uid) : null;
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

        const details: any[] = [];
        const pNorm = IplService.normalizeData(pred);
        const rNorm = IplService.normalizeData(result);

        const teamName = (tid?: string) => {
            if (!tid) return undefined;
            const team = this.iplService.teams.find(t => t.id === tid);
            return team ? team.shortName : tid;
        };

        const isStringMatch = (pVal: any, rVal: any) => {
            return this.iplService.isStringMatch(pVal, rVal);
        };

        let correctCount = 0;

        IplService.SCORING_CATEGORIES.forEach(cat => {
            let pVal = (pNorm as any)[cat.key];
            let rVal = (rNorm as any)[cat.key];

            // For team-based categories, convert IDs to names for the UI
            if (['winner', 'teamMore4s', 'teamMore6s'].includes(cat.key)) {
                pVal = teamName(pVal);
                rVal = teamName(rVal);
            }

            const earned = isStringMatch(pVal, rVal) && !!pVal && !!rVal && pVal !== '-' && rVal !== '-';
            if (earned) correctCount++;

            details.push({
                label: cat.label,
                pts: earned ? cat.pts : 0,
                earned,
                myValue: pVal || '-',
                actualValue: rVal || '-'
            });
        });

        // Add Exact Score Bonus (Special handling as it's not a standard category)
        const exactScoreMatch = result.winner !== 'cancelled' && pred.team1Score === result.team1Score && pred.team2Score === result.team2Score;
        details.push({
            label: 'Exact Score Bonus',
            pts: exactScoreMatch ? 10 : 0,
            earned: exactScoreMatch,
            myValue: `${pred.team1Score ?? '-'}-${pred.team2Score ?? '-'}`,
            actualValue: `${result.team1Score ?? '-'}-${result.team2Score ?? '-'}`
        });

        // Add Perfect Predictor Bonus
        if (correctCount === 10) {
            details.push({
                label: 'Perfect Predictor',
                pts: 25,
                earned: true,
                myValue: '100%',
                actualValue: '100%'
            });
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
