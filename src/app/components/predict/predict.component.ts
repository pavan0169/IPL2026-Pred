import { Component, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IplService } from '../../services/ipl.service';
import { Match, Prediction, getMatchPlayers } from '../../models/ipl.models';

@Component({
    selector: 'app-predict',
    standalone: true,
    imports: [CommonModule, FormsModule],
    templateUrl: './predict.component.html',
    styleUrl: './predict.component.css'
})
export class PredictComponent {
    allMatches() { return this.iplService.matches(); }
    selectedMatchId = signal<string | null>(null);

    // Rolling window: 2 days before today → 6 days ahead
    visibleMatches = computed(() => {
        const now = new Date();
        const start = new Date(now);
        start.setDate(start.getDate() - 2);
        start.setHours(0, 0, 0, 0);

        const end = new Date(now);
        end.setDate(end.getDate() + 7);
        end.setHours(23, 59, 59, 999);

        return this.allMatches().filter(m => {
            const t = new Date(m.date).getTime();
            return t >= start.getTime() && t <= end.getTime();
        });
    });

    team1Score = signal(150);
    team2Score = signal(150);
    winner = signal('');

    firstInningRange = signal('');
    secondInningRange = signal('');
    teamMore4s = signal('');
    teamMore6s = signal('');
    playerMax6s = signal('');
    fantasyPlayer = signal('');
    playerOfMatch = signal('');
    superStriker = signal('');
    mostDotBalls = signal('');

    canSubmit = computed(() => {
        return !!(this.winner() && this.firstInningRange() && this.secondInningRange() &&
            this.teamMore4s() && this.teamMore6s() && this.playerMax6s() &&
            this.fantasyPlayer() && this.playerOfMatch() && this.superStriker() &&
            this.mostDotBalls());
    });

    submitted = signal(false);

    constructor(public iplService: IplService) { }

    selectedMatch = computed(() => {
        const id = this.selectedMatchId();
        return id ? this.allMatches().find(m => m.id === id) ?? null : null;
    });

    matchPlayers = computed(() => {
        const match = this.selectedMatch();
        if (!match) return [];
        return getMatchPlayers(match.team1.id, match.team2.id);
    });

    existingPrediction = computed(() => {
        const id = this.selectedMatchId();
        return id ? this.iplService.getPredictionForMatch(id) : undefined;
    });

    // Pre-compute per-match prediction summaries once instead of calling
    // getPredictionForMatch() inside the @for loop on every change-detection cycle.
    matchSummaries = computed(() => {
        const preds = this.iplService.predictions();
        const matches = this.visibleMatches();
        const result: Record<string, { pred: any; points: number }> = {};

        for (const match of matches) {
            const pred = this.iplService.getPredictionForMatch(match.id);
            const points = pred && match.result ? this.iplService.calcPoints(pred, match.result) : 0;
            result[match.id] = { pred, points };
        }
        return result;
    });

    predFor(matchId: string) { return this.matchSummaries()[matchId]?.pred; }
    ptsFor(matchId: string) { return this.matchSummaries()[matchId]?.points ?? 0; }

    selectMatch(match: Match) {
        if (this.selectedMatchId() === match.id) {
            this.selectedMatchId.set(null);
            return;
        }
        this.selectedMatchId.set(match.id);
        this.submitted.set(false);
        const existing = this.iplService.getPredictionForMatch(match.id);
        if (existing) {
            this.team1Score.set(existing.team1Score);
            this.team2Score.set(existing.team2Score);
            this.winner.set(existing.winner);
            this.firstInningRange.set(existing.firstInningRange || '');
            this.secondInningRange.set(existing.secondInningRange || '');
            this.teamMore4s.set(existing.teamMore4s || '');
            this.teamMore6s.set(existing.teamMore6s || '');
            this.playerMax6s.set(existing.playerMax6s || '');
            this.fantasyPlayer.set(existing.fantasyPlayer || '');
            this.playerOfMatch.set(existing.playerOfMatch || '');
            this.superStriker.set(existing.superStriker || '');
            this.mostDotBalls.set(existing.mostDotBalls || '');
        } else {
            this.team1Score.set(150);
            this.team2Score.set(150);
            this.winner.set('');
            this.firstInningRange.set('');
            this.secondInningRange.set('');
            this.teamMore4s.set('');
            this.teamMore6s.set('');
            this.playerMax6s.set('');
            this.fantasyPlayer.set('');
            this.playerOfMatch.set('');
            this.superStriker.set('');
            this.mostDotBalls.set('');
        }
    }

    isMatchLocked(match: Match): boolean {
        const matchTime = new Date(match.date).getTime();
        const now = new Date().getTime();
        return now >= (matchTime - 60000);
    }

    canPredict(match: Match): boolean {
        return match.status === 'upcoming' && !this.isMatchLocked(match);
    }

    submitPrediction() {
        const match = this.selectedMatch();
        if (!match || !this.canSubmit()) return;
        this.iplService.submitPrediction({
            matchId: match.id,
            team1Score: this.team1Score(),
            team2Score: this.team2Score(),
            winner: this.winner(),
            firstInningRange: this.firstInningRange(),
            secondInningRange: this.secondInningRange(),
            teamMore4s: this.teamMore4s(),
            teamMore6s: this.teamMore6s(),
            playerMax6s: this.playerMax6s(),
            fantasyPlayer: this.fantasyPlayer(),
            playerOfMatch: this.playerOfMatch(),
            superStriker: this.superStriker(),
            mostDotBalls: this.mostDotBalls()
        });
        this.submitted.set(true);
    }

    getPredictionPoints(matchId: string): number {
        const pred = this.iplService.getPredictionForMatch(matchId);
        const match = this.allMatches().find(m => m.id === matchId);
        if (!pred || !match?.result) return 0;
        return this.iplService.calcPoints(pred, match.result);
    }

    formatDate(dateStr: string): string {
        const d = new Date(dateStr);
        return d.toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' });
    }

    formatTime(dateStr: string): string {
        const d = new Date(dateStr);
        return d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
    }

    statusLabel(status: string): string {
        return { upcoming: 'Upcoming', live: '🔴 Live', completed: 'Completed' }[status] ?? status;
    }
}
