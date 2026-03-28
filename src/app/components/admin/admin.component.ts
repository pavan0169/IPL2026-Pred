import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IplService } from '../../services/ipl.service';
import { MatchResult, Prediction, getMatchPlayers } from '../../models/ipl.models';

@Component({
    selector: 'app-admin',
    standalone: true,
    imports: [CommonModule, FormsModule],
    templateUrl: './admin.component.html',
    styleUrl: './admin.component.css'
})
export class AdminComponent {
    matches() { return this.iplService.matches(); }
    expandedMatchId = signal<string | null>(null);

    // Per-match form values
    formData: Record<string, {
        team1Score: number; team2Score: number; winner: string; status: string;
        firstInningRange?: string; secondInningRange?: string; teamMore4s?: string; teamMore6s?: string;
        playerMax6s?: string; fantasyPlayer?: string; playerOfMatch?: string; superStriker?: string; mostDotBalls?: string;
    }> = {};

    getMatchPlayers(team1Id: string, team2Id: string) {
        return getMatchPlayers(team1Id, team2Id);
    }

    constructor(public iplService: IplService) {
        this.initForms();
    }

    // Removes login and logout methods since it is now protected by routing

    initForms() {
        this.matches().forEach(m => {
            this.formData[m.id] = {
                team1Score: m.result?.team1Score ?? 150,
                team2Score: m.result?.team2Score ?? 150,
                winner: m.result?.winner ?? m.team1.id,
                status: m.status,
                firstInningRange: m.result?.firstInningRange ?? '',
                secondInningRange: m.result?.secondInningRange ?? '',
                teamMore4s: m.result?.teamMore4s ?? '',
                teamMore6s: m.result?.teamMore6s ?? '',
                playerMax6s: m.result?.playerMax6s ?? '',
                fantasyPlayer: m.result?.fantasyPlayer ?? '',
                playerOfMatch: m.result?.playerOfMatch ?? '',
                superStriker: m.result?.superStriker ?? '',
                mostDotBalls: m.result?.mostDotBalls ?? ''
            };
        });
    }

    toggleExpand(matchId: string) {
        this.expandedMatchId.update(id => id === matchId ? null : matchId);
    }

    updateStatus(matchId: string) {
        const fd = this.formData[matchId];
        if (!fd) return;
        this.iplService.updateMatchStatus(matchId, fd.status as any);
    }

    saveResult(matchId: string) {
        const fd = this.formData[matchId];
        if (!fd) return;
        const result: MatchResult = {
            team1Score: +fd.team1Score,
            team2Score: +fd.team2Score,
            winner: fd.winner,
            firstInningRange: fd.firstInningRange,
            secondInningRange: fd.secondInningRange,
            teamMore4s: fd.teamMore4s,
            teamMore6s: fd.teamMore6s,
            playerMax6s: fd.playerMax6s,
            fantasyPlayer: fd.fantasyPlayer,
            playerOfMatch: fd.playerOfMatch,
            superStriker: fd.superStriker,
            mostDotBalls: fd.mostDotBalls
        };
        this.iplService.updateMatchResult(matchId, result);
        this.expandedMatchId.set(null);
    }

    resetMatch(matchId: string) {
        if (confirm('Reset this match result back to upcoming?')) {
            this.iplService.resetMatchResult(matchId);
            this.expandedMatchId.set(null);
        }
    }

    resetAll() {
        if (confirm('Reset all match data and predictions?')) {
            this.iplService.resetData();
            this.initForms();
        }
    }

    formatDate(dateStr: string): string {
        return new Date(dateStr).toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' });
    }

    formatTime(dateStr: string): string {
        return new Date(dateStr).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
    }

    getPredictions(matchId: string): Prediction[] {
        return this.iplService.predictions().filter(p => p.matchId === matchId);
    }

    updateUserPrediction(predictionId: string, team1Score: number, team2Score: number, winner: string) {
        if (!predictionId) return;
        this.iplService.adminUpdatePrediction(predictionId, {
            team1Score: +team1Score,
            team2Score: +team2Score,
            winner
        });
        alert('User prediction updated!');
    }
}
