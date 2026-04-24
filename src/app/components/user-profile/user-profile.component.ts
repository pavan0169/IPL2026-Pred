import { Component, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IplService } from '../../services/ipl.service';
import { AuthService } from '../../services/auth.service';
import { Match, Prediction } from '../../models/ipl.models';

type ProfileSection = 'insights' | 'achievements' | 'timeline' | 'h2h' | 'dna' | 'settings';
type TimelineFilter = 'all' | 'podium' | 'other';

interface CategoryStat {
    key: string;
    label: string;
    pts: number;
    correct: number;
    total: number;
    accuracy: number;
    totalPoints: number;
}

interface TimelineEntry {
    match: Match;
    prediction: Prediction | null;
    pointsEarned: number;
    matchRank: number;
    totalPlayers: number;
    correctCategories: number;
    totalCategories: number;
    isPodium: boolean;
    categoryBreakdown: { key: string; label: string; correct: boolean; predValue: string; actualValue: string; pts: number }[];
}

interface Achievement {
    id: string;
    name: string;
    description: string;
    icon: string;
    unlocked: boolean;
    progress?: string;
    tier?: 'gold' | 'silver' | 'bronze';
}

interface Insight {
    icon: string;
    text: string;
    type: 'strength' | 'weakness' | 'neutral' | 'fun';
}

@Component({
    selector: 'app-user-profile',
    standalone: true,
    imports: [CommonModule, FormsModule],
    templateUrl: './user-profile.component.html',
    styleUrl: './user-profile.component.css'
})
export class UserProfileComponent {
    // ── State Signals ──
    activeSection = signal<ProfileSection | null>('insights');
    timelineFilter = signal<TimelineFilter>('all');
    selectedRivalId = signal<string | null>(null);
    expandedTimelineMatch = signal<string | null>(null);
    timelineLimit = signal<number>(10);
    viewingUserId = signal<string | null>(null); // null = own profile

    constructor(private iplService: IplService, private authService: AuthService) { }

    // ══════════════════════════════════════
    //  CORE USER DATA
    // ══════════════════════════════════════
    get currentUserId(): string | null {
        return this.authService.currentUser()?.uid ?? null;
    }

    // The effective user being viewed (defaults to logged-in user)
    effectiveUserId = computed(() => this.viewingUserId() ?? this.currentUserId);

    isViewingOwnProfile = computed(() => {
        const viewing = this.viewingUserId();
        return !viewing || viewing === this.currentUserId;
    });

    // Username and initial for the VIEWED user
    viewedUsername = computed(() => {
        const uid = this.effectiveUserId();
        if (!uid) return 'Player';
        if (uid === this.currentUserId) return this.authService.currentUser()?.username ?? 'Player';
        const user = this.iplService.userStats().find(u => u.userId === uid);
        return user?.username ?? 'Player';
    });

    viewedUserInitial = computed(() => {
        const name = this.viewedUsername();
        return name ? name.charAt(0).toUpperCase() : '?';
    });

    get currentUsername(): string {
        return this.authService.currentUser()?.username ?? 'Player';
    }

    get currentUserInitial(): string {
        const name = this.currentUsername;
        return name ? name.charAt(0).toUpperCase() : '?';
    }

    // All players list for the sidebar
    allPlayers = computed(() => {
        return this.iplService.userStats().map(u => ({
            userId: u.userId,
            username: u.username,
            initial: u.username ? u.username.charAt(0).toUpperCase() : '?',
            rank: u.rank,
            totalPoints: u.totalPoints,
            isCurrentUser: u.userId === this.currentUserId
        }));
    });

    switchProfile(userId: string | null) {
        this.viewingUserId.set(userId);
        // Reset section state when switching
        this.activeSection.set('insights');
        this.timelineFilter.set('all');
        this.expandedTimelineMatch.set(null);
        this.timelineLimit.set(10);
        this.selectedRivalId.set(null);
    }

    myStats = computed(() => {
        const uid = this.effectiveUserId();
        if (!uid) return null;
        const stats = this.iplService.userStats();
        return stats.find(s => s.userId === uid) ?? null;
    });

    allStats = computed(() => this.iplService.userStats());

    rank = computed(() => {
        const stats = this.myStats();
        return stats?.rank ?? 0;
    });

    totalPlayers = computed(() => this.iplService.userStats().length);

    // ══════════════════════════════════════
    //  TIER SYSTEM
    // ══════════════════════════════════════
    tier = computed<{ name: string; icon: string; color: string; borderGradient: string }>(() => {
        const stats = this.allStats();
        const my = this.myStats();
        if (!my || stats.length === 0) return { name: 'Rookie', icon: '🌱', color: '#64748b', borderGradient: 'linear-gradient(135deg, #64748b, #94a3b8)' };

        const leader = stats[0]?.totalPoints || 1;
        const pct = (my.totalPoints / leader) * 100;

        if (pct >= 80) return { name: 'Champion', icon: '🏆', color: '#fbbf24', borderGradient: 'linear-gradient(135deg, #fbbf24, #f59e0b, #d97706)' };
        if (pct >= 50) return { name: 'Contender', icon: '⚔️', color: '#6366f1', borderGradient: 'linear-gradient(135deg, #6366f1, #8b5cf6, #a855f7)' };
        if (pct >= 25) return { name: 'Rising Star', icon: '🌟', color: '#10b981', borderGradient: 'linear-gradient(135deg, #10b981, #34d399, #6ee7b7)' };
        return { name: 'Rookie', icon: '🌱', color: '#64748b', borderGradient: 'linear-gradient(135deg, #64748b, #94a3b8)' };
    });

    // ══════════════════════════════════════
    //  QUICK STATS
    // ══════════════════════════════════════
    winRate = computed(() => {
        const my = this.myStats();
        if (!my || my.totalPredictions === 0) return 0;
        return Math.round((my.correctWinners / my.totalPredictions) * 100);
    });

    completedMatches = computed(() => {
        return this.iplService.matches().filter(m => !!m.result && m.result.winner !== 'cancelled');
    });

    totalMatchCount = computed(() => this.iplService.matches().length);

    matchesPlayed = computed(() => {
        const uid = this.effectiveUserId();
        if (!uid) return 0;
        const preds = this.iplService.predictions().filter(p => p.userId === uid);
        const completedIds = new Set(this.completedMatches().map(m => m.id));
        return preds.filter(p => completedIds.has(p.matchId)).length;
    });

    tournamentProgress = computed(() => {
        const completed = this.completedMatches().length;
        const total = this.totalMatchCount();
        return total > 0 ? Math.round((completed / total) * 100) : 0;
    });

    avgPointsPerMatch = computed(() => {
        const my = this.myStats();
        const played = this.matchesPlayed();
        if (!my || played === 0) return 0;
        return Math.round((my.totalPoints / played) * 10) / 10;
    });

    // ══════════════════════════════════════
    //  CURRENT FORM (Last 5)
    // ══════════════════════════════════════
    currentForm = computed<{ matchId: string; matchLabel: string; points: number; matchRank: number; isPodium: boolean }[]>(() => {
        const timeline = this.predictionTimeline();
        return timeline.slice(0, 5).map(t => ({
            matchId: t.match.id,
            matchLabel: `${t.match.team1.shortName} v ${t.match.team2.shortName}`,
            points: t.pointsEarned,
            matchRank: t.matchRank,
            isPodium: t.matchRank <= 3
        }));
    });

    // ══════════════════════════════════════
    //  CURRENT STREAK (podium = top 3)
    // ══════════════════════════════════════
    currentStreak = computed<{ count: number; type: 'podium' | 'cold' | 'none' }>(() => {
        const form = this.currentForm();
        if (form.length === 0) return { count: 0, type: 'none' };

        const firstType = form[0].isPodium ? 'podium' : 'cold';
        let count = 0;
        for (const f of form) {
            if ((f.isPodium && firstType === 'podium') || (!f.isPodium && firstType === 'cold')) {
                count++;
            } else {
                break;
            }
        }
        return { count, type: firstType as 'podium' | 'cold' };
    });

    // ══════════════════════════════════════
    //  SEASON HIGH
    // ══════════════════════════════════════
    seasonHigh = computed<{ points: number; matchLabel: string; date: string } | null>(() => {
        const timeline = this.predictionTimeline();
        if (timeline.length === 0) return null;

        let best: TimelineEntry | null = null;
        for (const t of timeline) {
            if (!best || t.pointsEarned > best.pointsEarned) best = t;
        }
        if (!best || best.pointsEarned === 0) return null;

        return {
            points: best.pointsEarned,
            matchLabel: `${best.match.team1.shortName} v ${best.match.team2.shortName}`,
            date: new Date(best.match.date).toLocaleDateString(undefined, { day: 'numeric', month: 'short' })
        };
    });

    // ══════════════════════════════════════
    //  FORM TREND (improving or declining)
    // ══════════════════════════════════════
    formTrend = computed<'up' | 'down' | 'flat'>(() => {
        const form = this.currentForm();
        if (form.length < 3) return 'flat';
        const recentPodiums = form.slice(0, 3).filter(f => f.isPodium).length;
        const olderPodiums = form.slice(3).filter(f => f.isPodium).length;
        const olderTotal = form.slice(3).length;
        if (olderTotal === 0) return recentPodiums > 1 ? 'up' : 'flat';
        const recentRate = recentPodiums / 3;
        const olderRate = olderPodiums / olderTotal;
        if (recentRate > olderRate + 0.1) return 'up';
        if (recentRate < olderRate - 0.1) return 'down';
        return 'flat';
    });

    // Position counts across all matches
    positionCounts = computed<{ first: number; second: number; third: number }>(() => {
        const timeline = this.predictionTimeline();
        return {
            first: timeline.filter(t => t.matchRank === 1).length,
            second: timeline.filter(t => t.matchRank === 2).length,
            third: timeline.filter(t => t.matchRank === 3).length
        };
    });

    // Weekly wins calculation (Monday-Sunday weeks)
    weeklyWinsCount = computed(() => {
        const uid = this.effectiveUserId();
        if (!uid) return 0;

        const completedMatches = this.completedMatches();
        const predictions = this.iplService.predictions();
        const users = this.iplService.userStats();

        if (completedMatches.length === 0) return 0;

        const weeklyData = new Map<string, Map<string, number>>();

        completedMatches.forEach(m => {
            const d = new Date(m.date);
            // Monday-Sunday weeks
            const day = d.getDay();
            const diff = day === 0 ? 6 : day - 1; 
            const start = new Date(d);
            start.setDate(d.getDate() - diff);
            start.setHours(0, 0, 0, 0);
            const label = start.toDateString();

            if (!weeklyData.has(label)) {
                weeklyData.set(label, new Map<string, number>());
            }
            const weekScores = weeklyData.get(label)!;

            const matchPreds = predictions.filter(p => p.matchId === m.id);
            users.forEach(user => {
                const p = matchPreds.find(pred => pred.userId === user.userId);
                const pts = p ? this.iplService.calcPoints(p, m.result!) : 0;
                weekScores.set(user.userId, (weekScores.get(user.userId) || 0) + pts);
            });
        });

        let wins = 0;
        weeklyData.forEach((scores) => {
            const sorted = Array.from(scores.entries()).sort((a, b) => b[1] - a[1]);
            if (sorted.length > 0) {
                const maxPts = sorted[0][1];
                if (maxPts > 0) {
                    const winners = sorted.filter(s => s[1] === maxPts).map(s => s[0]);
                    if (winners.includes(uid)) wins++;
                }
            }
        });

        return wins;
    });

    podiumRate = computed(() => {
        const played = this.matchesPlayed();
        if (played === 0) return 0;
        const pos = this.positionCounts();
        return Math.round(((pos.first + pos.second + pos.third) / played) * 100);
    });

    // ══════════════════════════════════════
    //  CATEGORY ACCURACY (Radar Data)
    // ══════════════════════════════════════
    categoryAccuracy = computed<CategoryStat[]>(() => {
        const uid = this.effectiveUserId();
        if (!uid) return [];

        const completed = this.completedMatches();
        const preds = this.iplService.predictions().filter(p => p.userId === uid);

        return IplService.SCORING_CATEGORIES.map(cat => {
            let correct = 0;
            let total = 0;
            let totalPoints = 0;

            completed.forEach(match => {
                if (!match.result) return;
                const pred = preds.find(p => p.matchId === match.id);
                if (!pred) return;

                const pNorm = IplService.normalizeData(pred);
                const rNorm = IplService.normalizeData(match.result);
                const pVal = (pNorm as any)[cat.key];
                const rVal = (rNorm as any)[cat.key];

                if (pVal && String(pVal).trim()) {
                    total++;
                    if (this.iplService.isStringMatch(pVal, rVal)) {
                        correct++;
                        totalPoints += cat.pts;
                    }
                }
            });

            return {
                key: cat.key,
                label: cat.label,
                pts: cat.pts,
                correct,
                total,
                accuracy: total > 0 ? Math.round((correct / total) * 100) : 0,
                totalPoints
            };
        });
    });

    // League average for radar comparison
    leagueAvgAccuracy = computed<number[]>(() => {
        const completed = this.completedMatches();
        const allPreds = this.iplService.predictions();
        const users = this.iplService.userStats();

        return IplService.SCORING_CATEGORIES.map(cat => {
            let totalCorrect = 0;
            let totalAttempts = 0;

            users.forEach(user => {
                const userPreds = allPreds.filter(p => p.userId === user.userId);
                completed.forEach(match => {
                    if (!match.result) return;
                    const pred = userPreds.find(p => p.matchId === match.id);
                    if (!pred) return;
                    const pNorm = IplService.normalizeData(pred);
                    const rNorm = IplService.normalizeData(match.result);
                    const pVal = (pNorm as any)[cat.key];
                    const rVal = (rNorm as any)[cat.key];
                    if (pVal && String(pVal).trim()) {
                        totalAttempts++;
                        if (this.iplService.isStringMatch(pVal, rVal)) {
                            totalCorrect++;
                        }
                    }
                });
            });

            return totalAttempts > 0 ? Math.round((totalCorrect / totalAttempts) * 100) : 0;
        });
    });

    // ══════════════════════════════════════
    //  PREDICTION TIMELINE
    // ══════════════════════════════════════
    predictionTimeline = computed<TimelineEntry[]>(() => {
        const uid = this.effectiveUserId();
        if (!uid) return [];

        const completed = this.completedMatches();
        const preds = this.iplService.predictions();
        const allUsers = this.iplService.userStats();

        return completed.map(match => {
            const pred = preds.find(p => p.matchId === match.id && p.userId === uid) ?? null;
            const pointsEarned = pred && match.result ? this.iplService.calcPoints(pred, match.result) : 0;

            // Calculate match rank
            const matchPreds = preds.filter(p => p.matchId === match.id);
            const allScores = allUsers.map(u => {
                const up = matchPreds.find(p => p.userId === u.userId);
                return { userId: u.userId, pts: up && match.result ? this.iplService.calcPoints(up, match.result) : 0 };
            }).sort((a, b) => b.pts - a.pts);

            const matchRank = allScores.findIndex(s => s.userId === uid) + 1;

            // Category breakdown
            let correctCategories = 0;
            const totalCategories = 10;
            const categoryBreakdown = IplService.SCORING_CATEGORIES.map(cat => {
                if (!pred || !match.result) return { key: cat.key, label: cat.label, correct: false, predValue: '-', actualValue: '-', pts: 0 };
                const pNorm = IplService.normalizeData(pred);
                const rNorm = IplService.normalizeData(match.result);
                const pVal = String((pNorm as any)[cat.key] || '-');
                const rVal = String((rNorm as any)[cat.key] || '-');
                const isCorrect = this.iplService.isStringMatch(pVal, rVal) && pVal !== '-';
                if (isCorrect) correctCategories++;
                return { key: cat.key, label: cat.label, correct: isCorrect, predValue: pVal || '-', actualValue: rVal || '-', pts: isCorrect ? cat.pts : 0 };
            });

            // Podium = top 3 finish
            const isPodium = matchRank <= 3;

            return {
                match,
                prediction: pred,
                pointsEarned,
                matchRank,
                totalPlayers: allUsers.length,
                correctCategories,
                totalCategories,
                isPodium,
                categoryBreakdown
            };
        }).sort((a, b) => new Date(b.match.date).getTime() - new Date(a.match.date).getTime());
    });

    filteredTimeline = computed(() => {
        const filter = this.timelineFilter();
        const all = this.predictionTimeline();
        if (filter === 'podium') return all.filter(t => t.isPodium);
        if (filter === 'other') return all.filter(t => !t.isPodium && t.prediction);
        return all;
    });

    displayedTimeline = computed(() => {
        return this.filteredTimeline().slice(0, this.timelineLimit());
    });

    hasMoreTimeline = computed(() => {
        return this.filteredTimeline().length > this.timelineLimit();
    });

    // ══════════════════════════════════════
    //  ACHIEVEMENTS
    // ══════════════════════════════════════
    achievements = computed<Achievement[]>(() => {
        const my = this.myStats();
        const timeline = this.predictionTimeline();
        const catAcc = this.categoryAccuracy();
        const streak = this.currentStreak();
        const form = this.currentForm();

        const played = this.matchesPlayed();
        const totalPts = my?.totalPoints ?? 0;

        // Hat-trick check: 3 consecutive podium (top 3) finishes
        let maxPodiumStreak = 0;
        let curPodiumStreak = 0;
        const sorted = [...timeline].reverse(); // oldest first
        for (const t of sorted) {
            if (t.isPodium) { curPodiumStreak++; maxPodiumStreak = Math.max(maxPodiumStreak, curPodiumStreak); }
            else { curPodiumStreak = 0; }
        }

        // Exact score predictions
        const exactScores = timeline.filter(t => {
            if (!t.prediction || !t.match.result) return false;
            return +t.prediction.team1Score === +t.match.result.team1Score &&
                +t.prediction.team2Score === +t.match.result.team2Score;
        }).length;

        // Best category
        const bestCat = catAcc.reduce((a, b) => a.accuracy > b.accuracy ? a : b, catAcc[0]);
        // High scorers (25+ in a match)
        const highScoreMatches = timeline.filter(t => t.pointsEarned >= 25).length;

        // #1 finishes
        const rank1Count = timeline.filter(t => t.matchRank === 1).length;

        return [
            {
                id: 'first-blood', name: 'First Blood', description: 'Play your first match',
                icon: '🗡️', unlocked: played > 0, progress: played > 0 ? undefined : `${played}/1 match`,
                tier: 'bronze' as const
            },
            {
                id: 'hat-trick', name: 'Hat-Trick Hero', description: '3 consecutive podium (top 3) finishes',
                icon: '🎩', unlocked: maxPodiumStreak >= 3, progress: maxPodiumStreak < 3 ? `${maxPodiumStreak}/3 streak` : undefined,
                tier: 'silver' as const
            },
            {
                id: 'century', name: 'Century Club', description: 'Reach 100 total points',
                icon: '💯', unlocked: totalPts >= 100, progress: totalPts < 100 ? `${totalPts}/100 pts` : undefined,
                tier: 'gold' as const
            },
            {
                id: 'double-century', name: 'Double Century', description: 'Reach 200 total points',
                icon: '🔥', unlocked: totalPts >= 200, progress: totalPts < 200 ? `${totalPts}/200 pts` : undefined,
                tier: 'gold' as const
            },
            {
                id: 'oracle', name: 'Oracle', description: '3+ exact score predictions',
                icon: '🔮', unlocked: exactScores >= 3, progress: exactScores < 3 ? `${exactScores}/3 exact` : undefined,
                tier: 'gold' as const
            },
            {
                id: 'clutch', name: 'Clutch Master', description: 'Finish #1 in a match 3 times',
                icon: '👑', unlocked: rank1Count >= 3, progress: rank1Count < 3 ? `${rank1Count}/3 wins` : undefined,
                tier: 'gold' as const
            },
            {
                id: 'category-king', name: 'Category King', description: '80%+ accuracy in any category',
                icon: '🎯', unlocked: catAcc.some(c => c.accuracy >= 80 && c.total >= 3),
                progress: !catAcc.some(c => c.accuracy >= 80 && c.total >= 3) ? `Best: ${bestCat?.accuracy ?? 0}%` : undefined,
                tier: 'silver' as const
            },
            {
                id: 'podium-master', name: 'Podium Regular', description: '60%+ podium rate (min 5 matches)',
                icon: '🏅', unlocked: this.podiumRate() >= 60 && played >= 5, progress: this.podiumRate() < 60 || played < 5 ? `${this.podiumRate()}% podium rate` : undefined,
                tier: 'silver' as const
            },
            {
                id: 'high-roller', name: 'High Roller', description: 'Score 25+ points in a single match',
                icon: '🎰', unlocked: highScoreMatches > 0, progress: highScoreMatches === 0 ? `Best: ${this.seasonHigh()?.points ?? 0} pts` : undefined,
                tier: 'silver' as const
            },
            {
                id: 'iron-man', name: 'Iron Man', description: 'Predict all completed matches',
                icon: '🦾', unlocked: played > 0 && played >= this.completedMatches().length,
                progress: played < this.completedMatches().length ? `${played}/${this.completedMatches().length} matches` : undefined,
                tier: 'bronze' as const
            },
            {
                id: 'underdog', name: 'Underdog Whisperer', description: 'Correctly predict 5+ upsets',
                icon: '🐺', unlocked: false, // Would need upset detection logic
                progress: 'Track upsets',
                tier: 'gold' as const
            },
            {
                id: 'pom-specialist', name: 'PoM Specialist', description: 'Get Player of Match right 5 times',
                icon: '⭐',
                unlocked: (catAcc.find(c => c.key === 'playerOfMatch')?.correct ?? 0) >= 5,
                progress: (catAcc.find(c => c.key === 'playerOfMatch')?.correct ?? 0) < 5
                    ? `${catAcc.find(c => c.key === 'playerOfMatch')?.correct ?? 0}/5`
                    : undefined,
                tier: 'gold' as const
            }
        ];
    });

    unlockedCount = computed(() => this.achievements().filter(a => a.unlocked).length);

    // ══════════════════════════════════════
    //  AUTO-GENERATED INSIGHTS
    // ══════════════════════════════════════
    autoInsights = computed<Insight[]>(() => {
        const catAcc = this.categoryAccuracy();
        const timeline = this.predictionTimeline();
        const form = this.currentForm();
        const streak = this.currentStreak();
        const my = this.myStats();
        const insights: Insight[] = [];

        if (catAcc.length === 0 || !my) return insights;

        // Best category
        const best = catAcc.reduce((a, b) => a.accuracy > b.accuracy ? a : b, catAcc[0]);
        if (best && best.total >= 2) {
            insights.push({
                icon: '🎯',
                text: `You're a <strong>${best.label}</strong> specialist — ${best.accuracy}% accuracy!`,
                type: 'strength'
            });
        }

        // Worst category
        const worst = catAcc.filter(c => c.total >= 2).reduce((a, b) => a.accuracy < b.accuracy ? a : b, catAcc[0]);
        if (worst && worst.total >= 2 && worst.key !== best.key) {
            insights.push({
                icon: '📉',
                text: `<strong>${worst.label}</strong> is your kryptonite — only ${worst.accuracy}% accuracy. Focus here!`,
                type: 'weakness'
            });
        }

        // Podium streak
        if (streak.count >= 3) {
            if (streak.type === 'podium') {
                insights.push({ icon: '🔥', text: `You're on a <strong>${streak.count}-match podium streak!</strong> 🥇🥈🥉 Keep it going!`, type: 'strength' });
            } else {
                insights.push({ icon: '❄️', text: `${streak.count} matches outside podium — time for a comeback!`, type: 'weakness' });
            }
        }

        // Position insights
        const pos = this.positionCounts();
        if (pos.first > 0) {
            insights.push({ icon: '🥇', text: `<strong>${pos.first} first-place finishes</strong> — you're a match-day champion!`, type: 'strength' });
        }
        if (pos.first + pos.second + pos.third > 0) {
            insights.push({ icon: '🏅', text: `<strong>${pos.first + pos.second + pos.third} podium finishes</strong> (🥇${pos.first} 🥈${pos.second} 🥉${pos.third}) — <strong>${this.podiumRate()}% podium rate</strong>`, type: pos.first + pos.second + pos.third >= 5 ? 'strength' : 'neutral' });
        }

        // Average points insight
        const avgPts = this.avgPointsPerMatch();
        if (avgPts > 0) {
            insights.push({ icon: '📊', text: `You average <strong>${avgPts} pts/match</strong> — ${avgPts >= 10 ? 'excellent consistency!' : 'room to grow!'}`, type: avgPts >= 10 ? 'strength' : 'neutral' });
        }

        // PoM accuracy vs league
        const pomCat = catAcc.find(c => c.key === 'playerOfMatch');
        const leagueAvg = this.leagueAvgAccuracy();
        const pomAvgIdx = IplService.SCORING_CATEGORIES.findIndex(c => c.key === 'playerOfMatch');
        if (pomCat && pomCat.total >= 2 && pomAvgIdx >= 0) {
            const diff = pomCat.accuracy - leagueAvg[pomAvgIdx];
            if (diff > 10) {
                insights.push({ icon: '⭐', text: `Your <strong>Player of Match</strong> accuracy is ${diff}% above the league average!`, type: 'strength' });
            }
        }

        // High score highlight
        const high = this.seasonHigh();
        if (high) {
            insights.push({ icon: '🏅', text: `Season high: <strong>${high.points} pts</strong> in ${high.matchLabel} (${high.date})`, type: 'neutral' });
        }

        // Winner accuracy insight
        const winRate = this.winRate();
        if (winRate >= 50 && this.matchesPlayed() >= 3) {
            insights.push({ icon: '🎰', text: `Your match winner accuracy is <strong>${winRate}%</strong> — you know your cricket!`, type: winRate >= 60 ? 'strength' : 'neutral' });
        }

        // Participation
        const played = this.matchesPlayed();
        const completed = this.completedMatches().length;
        if (completed > 0 && played < completed) {
            const missed = completed - played;
            insights.push({ icon: '📅', text: `You missed <strong>${missed}</strong> match${missed > 1 ? 'es' : ''} — don't leave points on the table!`, type: 'weakness' });
        }

        return insights;
    });

    // ══════════════════════════════════════
    //  PREDICTIVE DNA
    // ══════════════════════════════════════
    predictiveDNA = computed<{ archetype: string; icon: string; description: string; traits: { label: string; value: string; icon: string }[] }>(() => {
        const catAcc = this.categoryAccuracy();
        const timeline = this.predictionTimeline();
        const my = this.myStats();

        if (!my || catAcc.length === 0) {
            return { archetype: 'Unknown', icon: '❓', description: 'Not enough data yet', traits: [] };
        }

        // Player categories: playerMax6s, most4s, playerOfMatch, economy, superStriker
        const playerCats = catAcc.filter(c => ['playerMax6s', 'most4s', 'playerOfMatch', 'economy', 'superStriker'].includes(c.key));
        const teamCats = catAcc.filter(c => ['winner', 'teamMore4s', 'teamMore6s'].includes(c.key));
        const scoreCats = catAcc.filter(c => ['firstInningRange', 'secondInningRange'].includes(c.key));

        const playerAvg = playerCats.length > 0 ? playerCats.reduce((s, c) => s + c.accuracy, 0) / playerCats.length : 0;
        const teamAvg = teamCats.length > 0 ? teamCats.reduce((s, c) => s + c.accuracy, 0) / teamCats.length : 0;
        const scoreAvg = scoreCats.length > 0 ? scoreCats.reduce((s, c) => s + c.accuracy, 0) / scoreCats.length : 0;

        let archetype: string, icon: string, description: string;

        if (playerAvg > teamAvg && playerAvg > scoreAvg) {
            archetype = 'Player Whisperer';
            icon = '🧙';
            description = `Your player predictions (6s, 4s, PoM) have ${Math.round(playerAvg)}% accuracy — you know the players!`;
        } else if (teamAvg > playerAvg && teamAvg > scoreAvg) {
            archetype = 'Team Analyst';
            icon = '📊';
            description = `You excel at team-level predictions with ${Math.round(teamAvg)}% accuracy — strategic thinking pays off!`;
        } else if (scoreAvg > 40) {
            archetype = 'Score Sage';
            icon = '🎲';
            description = `You read the game flow well — ${Math.round(scoreAvg)}% accuracy on score ranges!`;
        } else {
            archetype = 'All-Rounder';
            icon = '🏏';
            description = `Balanced predictor across all categories — a true cricket mind!`;
        }

        const traits = [
            { label: 'Player Instinct', value: `${Math.round(playerAvg)}%`, icon: '👤' },
            { label: 'Team Strategy', value: `${Math.round(teamAvg)}%`, icon: '🏟️' },
            { label: 'Score Reading', value: `${Math.round(scoreAvg)}%`, icon: '📈' },
        ];

        return { archetype, icon, description, traits };
    });

    // ══════════════════════════════════════
    //  HEAD-TO-HEAD
    // ══════════════════════════════════════
    availableRivals = computed(() => {
        const uid = this.effectiveUserId();
        return this.iplService.userStats().filter(u => u.userId !== uid);
    });

    headToHead = computed(() => {
        const rivalId = this.selectedRivalId();
        const uid = this.effectiveUserId();
        if (!rivalId || !uid) return null;

        const completed = this.completedMatches();
        const preds = this.iplService.predictions();
        const rival = this.iplService.userStats().find(u => u.userId === rivalId);
        if (!rival) return null;

        let myWins = 0;
        let rivalWins = 0;
        let ties = 0;
        let biggestGap = 0;
        let biggestGapMatch = '';
        const comparisons: { matchLabel: string; myPts: number; rivalPts: number; date: string }[] = [];

        completed.forEach(match => {
            if (!match.result) return;
            const myPred = preds.find(p => p.matchId === match.id && p.userId === uid);
            const rivalPred = preds.find(p => p.matchId === match.id && p.userId === rivalId);
            if (!myPred && !rivalPred) return;

            const myPts = myPred ? this.iplService.calcPoints(myPred, match.result) : 0;
            const rivalPts = rivalPred ? this.iplService.calcPoints(rivalPred, match.result) : 0;

            if (myPts > rivalPts) myWins++;
            else if (rivalPts > myPts) rivalWins++;
            else ties++;

            if (Math.abs(myPts - rivalPts) > biggestGap) {
                biggestGap = Math.abs(myPts - rivalPts);
                biggestGapMatch = `${match.team1.shortName} v ${match.team2.shortName}`;
            }

            comparisons.push({
                matchLabel: `${match.team1.shortName} v ${match.team2.shortName}`,
                myPts,
                rivalPts,
                date: new Date(match.date).toLocaleDateString(undefined, { day: 'numeric', month: 'short' })
            });
        });

        // Category comparison
        const myCatAcc = this.categoryAccuracy();
        const rivalCatAcc = this.getRivalCategoryAccuracy(rivalId);

        // Rivalry score: closeness formula
        const totalMatches = myWins + rivalWins + ties;
        const rivalryScore = totalMatches > 0
            ? Math.round(100 - (Math.abs(myWins - rivalWins) / totalMatches) * 100)
            : 0;

        return {
            rivalName: rival.username,
            rivalId,
            myTotalPts: this.myStats()?.totalPoints ?? 0,
            rivalTotalPts: rival.totalPoints,
            myWins,
            rivalWins,
            ties,
            totalMatches,
            rivalryScore,
            biggestGap,
            biggestGapMatch,
            recentComparisons: comparisons.slice(0, 5),
            myCatAcc,
            rivalCatAcc
        };
    });

    private getRivalCategoryAccuracy(rivalId: string): CategoryStat[] {
        const completed = this.completedMatches();
        const preds = this.iplService.predictions().filter(p => p.userId === rivalId);

        return IplService.SCORING_CATEGORIES.map(cat => {
            let correct = 0;
            let total = 0;
            let totalPoints = 0;

            completed.forEach(match => {
                if (!match.result) return;
                const pred = preds.find(p => p.matchId === match.id);
                if (!pred) return;
                const pNorm = IplService.normalizeData(pred);
                const rNorm = IplService.normalizeData(match.result);
                const pVal = (pNorm as any)[cat.key];
                const rVal = (rNorm as any)[cat.key];
                if (pVal && String(pVal).trim()) {
                    total++;
                    if (this.iplService.isStringMatch(pVal, rVal)) {
                        correct++;
                        totalPoints += cat.pts;
                    }
                }
            });

            return { key: cat.key, label: cat.label, pts: cat.pts, correct, total, accuracy: total > 0 ? Math.round((correct / total) * 100) : 0, totalPoints };
        });
    }



    // ══════════════════════════════════════
    //  UI ACTIONS
    // ══════════════════════════════════════
    toggleSection(section: ProfileSection) {
        if (this.activeSection() === section) {
            this.activeSection.set(null);
        } else {
            this.activeSection.set(section);
        }
    }

    toggleTimelineMatch(matchId: string) {
        this.expandedTimelineMatch.set(this.expandedTimelineMatch() === matchId ? null : matchId);
    }

    loadMoreTimeline() {
        this.timelineLimit.update(v => v + 10);
    }

    selectRival(rivalId: string) {
        this.selectedRivalId.set(rivalId || null);
    }

    // ══════════════════════════════════════
    //  DATA EXPORT
    // ══════════════════════════════════════
    exportData(format: 'json' | 'csv') {
        const timeline = this.predictionTimeline();
        if (format === 'json') {
            const data = timeline.map(t => ({
                match: `${t.match.team1.shortName} vs ${t.match.team2.shortName}`,
                date: t.match.date,
                pointsEarned: t.pointsEarned,
                matchRank: t.matchRank,
                correctCategories: t.correctCategories,
                prediction: t.prediction,
                result: t.match.result
            }));
            this.downloadFile(JSON.stringify(data, null, 2), 'my-predictions.json', 'application/json');
        } else {
            const headers = ['Match', 'Date', 'Points', 'Rank', 'Correct', 'Winner Pred', 'Winner Actual'];
            const rows = timeline.map(t => [
                `${t.match.team1.shortName} vs ${t.match.team2.shortName}`,
                new Date(t.match.date).toLocaleDateString(),
                t.pointsEarned,
                t.matchRank,
                `${t.correctCategories}/${t.totalCategories}`,
                t.prediction?.winner ?? '-',
                t.match.result?.winner ?? '-'
            ]);
            const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
            this.downloadFile(csv, 'my-predictions.csv', 'text/csv');
        }
    }

    private downloadFile(content: string, filename: string, type: string) {
        const blob = new Blob([content], { type });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        a.click();
        URL.revokeObjectURL(url);
    }

    // ══════════════════════════════════════
    //  UTILITY
    // ══════════════════════════════════════
    formatDate(dateStr: string): string {
        return new Date(dateStr).toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' });
    }

    getTeamName(match: Match, tid?: string): string {
        if (!tid) return '-';
        if (tid === match.team1.id) return match.team1.shortName;
        if (tid === match.team2.id) return match.team2.shortName;
        return tid;
    }

    rankEmoji(rank: number): string {
        return ['🥇', '🥈', '🥉'][rank - 1] ?? `#${rank}`;
    }

    getTrendArrow(trend: 'up' | 'down' | 'flat'): string {
        if (trend === 'up') return '↗';
        if (trend === 'down') return '↘';
        return '→';
    }

    getNodeColor(entry: TimelineEntry): string {
        if (entry.matchRank === 1) return '#fbbf24'; // gold for 1st
        if (entry.matchRank === 2) return '#94a3b8'; // silver for 2nd
        if (entry.matchRank === 3) return '#d97706'; // bronze for 3rd
        return '#64748b'; // muted for rest
    }

    getPositionEmoji(rank: number): string {
        if (rank === 1) return '🥇';
        if (rank === 2) return '🥈';
        if (rank === 3) return '🥉';
        return `#${rank}`;
    }

    Math = Math;
}
