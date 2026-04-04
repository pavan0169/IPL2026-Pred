import { Component, signal, computed, effect, untracked } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IplService } from '../../services/ipl.service';
import { MatchResult, Prediction, getMatchPlayers } from '../../models/ipl.models';
import { User } from '../../services/auth.service';

import { SearchableSelectComponent } from '../shared/searchable-select/searchable-select.component';

@Component({
    selector: 'app-admin',
    standalone: true,
    imports: [CommonModule, FormsModule, SearchableSelectComponent],
    templateUrl: './admin.component.html',
    styleUrl: './admin.component.css'
})
export class AdminComponent {
    Object = Object;
    matches() { return this.iplService.matches(); }
    hasAnyHistory = computed(() => Object.keys(this.iplService.resultsReference()).length > 0);
    hasAnyCompletedMatches = computed(() => this.matches().some(m => !!m.result));
    showBackupPanel = signal<boolean>(false);
    manualSeedInput = signal<string>('');
    manualPredSeedInput = signal<string>('');
    expandedMatchId = signal<string | null>(null);
    sendingEmail = signal<Record<string, boolean>>({});

    matchGroups = computed(() => {
        const _matches = this.matches();
        const nowMs = new Date().getTime();

        const pendingResults = _matches
            .filter(m => !m.result && (new Date(m.date).getTime() < nowMs || m.status === 'completed'))
            .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

        const upcoming = _matches
            .filter(m => !m.result && new Date(m.date).getTime() >= nowMs && m.status !== 'completed')
            .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

        const completed = _matches
            .filter(m => !!m.result)
            .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

        const groups = [
            { title: 'Pending Results', icon: '⚠️', matches: pendingResults },
            { title: 'Upcoming Matches', icon: '⏳', matches: upcoming },
            { title: 'Completed Matches', icon: '✅', matches: completed }
        ];

        // Filter out empty groups so the UI isn't cluttered
        return groups.filter(g => g.matches.length > 0);
    });

    // Per-match result form values
    formData: Record<string, {
        team1Score: number; team2Score: number; winner: string; status: string;
        firstInningRange?: string; secondInningRange?: string; teamMore4s?: string; teamMore6s?: string;
        playerMax6s?: string; most4s?: string; playerOfMatch?: string;
        economy?: string; superStriker?: string;
    }> = {};

    // User prediction override form
    editingUserPred = signal<{ userId: string; matchId: string } | null>(null);
    userPredForm: Partial<Prediction> = { 
        winner: '', 
        firstInningRange: '', 
        secondInningRange: '', 
        teamMore4s: '', 
        teamMore6s: '', 
        playerMax6s: '', 
        most4s: '', 
        playerOfMatch: '', 
        economy: '', 
        superStriker: '', 
        team1Score: 0, 
        team2Score: 0 
    };

    getMatchPlayers(team1Id: string, team2Id: string) {
        return getMatchPlayers(team1Id, team2Id);
    }

    constructor(public iplService: IplService) {
        // Automatically sync formData when matches() updates
        effect(() => {
            const currentMatches = this.matches();
            untracked(() => {
                currentMatches.forEach(m => {
                    // Only update if not currently expanded to avoid overwriting unsaved user edits
                    if (this.expandedMatchId() !== m.id) {
                        this.syncMatchToForm(m);
                    }
                });
            });
        });
    }

    private syncMatchToForm(m: any) {
        const normalized = IplService.normalizeData(m.result);
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
            most4s: normalized.most4s ?? '',
            playerOfMatch: m.result?.playerOfMatch ?? '',
            economy: normalized.economy ?? '',
            superStriker: normalized.superStriker ?? ''
        };
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

        if (!confirm('Are you sure you want to save this result? This will update standings for all users.')) return;

        const result: MatchResult = {
            team1Score: +fd.team1Score,
            team2Score: +fd.team2Score,
            winner: fd.winner,
            firstInningRange: fd.firstInningRange,
            secondInningRange: fd.secondInningRange,
            teamMore4s: fd.teamMore4s,
            teamMore6s: fd.teamMore6s,
            playerMax6s: fd.playerMax6s,
            most4s: fd.most4s,
            playerOfMatch: fd.playerOfMatch,
            economy: fd.economy,
            superStriker: fd.superStriker
        };
        this.iplService.updateMatchResult(matchId, result);
        this.expandedMatchId.set(null);
    }

    async sendMatchEmail(matchId: string) {
        if (!confirm('Are you sure you want to blast emails to ALL players for this match?')) return;

        this.sendingEmail.update(st => ({ ...st, [matchId]: true }));
        try {
            await this.iplService.adminSendMatchEmail(matchId);
        } finally {
            this.sendingEmail.update(st => ({ ...st, [matchId]: false }));
        }
    }

    resetMatch(matchId: string) {
        if (confirm('Reset this match result back to upcoming?')) {
            this.iplService.resetMatchResult(matchId);
            this.expandedMatchId.set(null);
        }
    }

    resetAll() {
        if (confirm('Are you sure you want to WIPE ALL DATA? This cannot be undone.')) {
            this.iplService.resetData();
        }
    }

    recalculateAllStandings() {
        if (confirm('Recalculate ALL user standings based on current results? This will sync all leaderboard scores.')) {
            this.iplService.recalculateAllScores();
        }
    }

    restoreAll() {
        if (confirm('Are you sure you want to restore all match results from the historical reference backup? This will overwrite current statuses.')) {
            this.iplService.restoreAllFromReference();
        }
    }

    hasHistory(matchId: string): boolean {
        return !!this.iplService.resultsReference()[matchId];
    }

    restoreMatch(matchId: string) {
        if (confirm('Restore this match result from the historical reference?')) {
            this.iplService.restoreMatchFromReference(matchId);
            this.expandedMatchId.set(null);
        }
    }

    onManualSeed() {
        try {
            const data = JSON.parse(this.manualSeedInput());
            if (confirm('Are you sure you want to seed the historical reference with this data? Existing references for these matches will be overwritten.')) {
                this.iplService.seedResultsReference(data);
                this.manualSeedInput.set('');
                this.showBackupPanel.set(false);
            }
        } catch (e) {
            alert('Invalid JSON format. Please ensure the data matches the MatchState record structure.');
        }
    }

    downloadResultsJson() {
        // Collect currently active completed results from the matches signal
        const activeMatches = this.matches();
        const activeResults: Record<string, any> = {};

        activeMatches.forEach(m => {
            if (m.result) {
                activeResults[m.id] = {
                    status: 'completed',
                    result: m.result
                };
            }
        });

        // Also merge with background reference (backup) if any
        const backupRef = this.iplService.resultsReference();
        const combinedData = { ...backupRef, ...activeResults };

        if (Object.keys(combinedData).length === 0) {
            alert('No completed matches found to export.');
            return;
        }

        const blob = new Blob([JSON.stringify(combinedData, null, 2)], { type: 'application/json' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `ipl_match_results_${new Date().toISOString().split('T')[0]}.json`;
        a.click();
        window.URL.revokeObjectURL(url);
    }

    onManualPredSeed() {
        try {
            const data = JSON.parse(this.manualPredSeedInput());
            if (confirm(`Are you sure you want to seed ${data.length} predictions? Existing predictions might be overwritten.`)) {
                this.iplService.seedPredictions(data);
                this.manualPredSeedInput.set('');
                this.showBackupPanel.set(false);
            }
        } catch (e) {
            alert('Invalid JSON format. Please ensure the data is an array of Prediction objects.');
        }
    }

    downloadPredictionsJson() {
        const preds = this.iplService.predictions();
        if (preds.length === 0) {
            alert('No predictions found to export.');
            return;
        }

        const blob = new Blob([JSON.stringify(preds, null, 2)], { type: 'application/json' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `ipl_predictions_${new Date().toISOString().split('T')[0]}.json`;
        a.click();
        window.URL.revokeObjectURL(url);
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

    getAllUsers(): User[] {
        return this.iplService.users();
    }

    getUserPrediction(userId: string, matchId: string): Prediction | undefined {
        return this.iplService.predictions().find(p => p.userId === userId && p.matchId === matchId);
    }

    openUserPredEditor(user: User, matchId: string) {
        if (!user.uid) return;
        const existing = this.getUserPrediction(user.uid, matchId);

        if (existing) {
            // Normalize for the form
            const normalized = IplService.normalizeData(existing);
            this.userPredForm = {
                ...existing,
                most4s: normalized.most4s,
                economy: normalized.economy,
                superStriker: normalized.superStriker
            };
        } else {
            this.userPredForm = {
                matchId: matchId,
                userId: user.uid,
                username: user.username,
                winner: '',
                firstInningRange: '',
                secondInningRange: '',
                teamMore4s: '',
                teamMore6s: '',
                playerMax6s: '',
                most4s: '',
                playerOfMatch: '',
                economy: '',
                superStriker: '',
                team1Score: 160,
                team2Score: 160
            };
        }

        this.editingUserPred.set({ userId: user.uid, matchId });
    }

    saveUserPredictionOverride() {
        const state = this.editingUserPred();
        if (!state) return;

        const predictionId = `${state.matchId}_${state.userId}`;

        // Use a simpler approach to ensure all fields are sent
        const updates = { ...this.userPredForm };
        delete (updates as any).id; // Ensure consistent ID handling if needed

        // We use adminUpdatePrediction but it needs to handle a full object or multiple fields.
        // Actually the current adminUpdatePrediction takes updates: Partial<Prediction>.
        this.iplService.adminUpdatePrediction(predictionId, updates);

        alert('User prediction updated successfully!');
        this.editingUserPred.set(null);
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
