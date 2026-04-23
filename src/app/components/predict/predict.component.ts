import { Component, computed, signal, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IplService } from '../../services/ipl.service';
import { AuthService } from '../../services/auth.service';
import { Match, Prediction, getMatchPlayers } from '../../models/ipl.models';

import { SearchableSelectComponent } from '../shared/searchable-select/searchable-select.component';

@Component({
    selector: 'app-predict',
    standalone: true,
    imports: [CommonModule, FormsModule, SearchableSelectComponent],
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

    matchGroups = computed(() => {
        const matches = this.visibleMatches();
        const now = new Date().getTime();

        const upcoming = matches.filter(m =>
            (m.status === 'upcoming' && new Date(m.date).getTime() > now) ||
            m.status === 'live'
        );

        const completed = matches
            .filter(m => !!m.result || (m.status === 'upcoming' && new Date(m.date).getTime() <= now))
            .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

        return [
            { title: 'Upcoming Matches', icon: '⏳', matches: upcoming },
            { title: 'Completed Matches', icon: '✅', matches: completed }
        ];
    });

    team1Score = signal(150);
    team2Score = signal(150);
    winner = signal('');

    firstInningRange = signal('');
    secondInningRange = signal('');
    teamMore4s = signal('');
    teamMore6s = signal('');
    playerMax6s = signal('');
    most4s = signal('');
    playerOfMatch = signal('');
    economy = signal('');
    superStriker = signal(''); // Canonical Super Striker

    canSubmit = computed(() => {
        return !!(this.winner() && this.firstInningRange() && this.secondInningRange() &&
            this.teamMore4s() && this.teamMore6s() && this.playerMax6s() &&
            this.most4s() && this.playerOfMatch() &&
            this.economy() && this.superStriker());
    });

    submitted = signal(false);

    // --- Bulk Upload State ---
    @ViewChild('fileInput') fileInput!: ElementRef<HTMLInputElement>;
    validationErrors = signal<string[]>([]);
    validationWarnings = signal<string[]>([]);
    uploadData = signal<any>(null);
    showConfirmation = signal(false);
    newPredictionsCount = signal(0);
    updatedPredictionsCount = signal(0);
    showSuccessToast = signal(false);
    successMessage = signal('');
    isProcessingUpload = signal(false);
    
    constructor(
        public iplService: IplService,
        private authService: AuthService
    ) { }

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
        const myPreds = this.iplService.myPredictions();
        const matches = this.visibleMatches();
        const result: Record<string, { pred: any; points: number }> = {};

        for (const match of matches) {
            const pred = myPreds.get(match.id);
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
            this.playerOfMatch.set(existing.playerOfMatch || '');

            // Canonical mapping for loading
            const normalized = IplService.normalizeData(existing);
            this.most4s.set(normalized.most4s || '');
            this.economy.set(normalized.economy || '');
            this.superStriker.set(normalized.superStriker || '');
        } else {
            this.team1Score.set(150);
            this.team2Score.set(150);
            this.winner.set('');
            this.firstInningRange.set('');
            this.secondInningRange.set('');
            this.teamMore4s.set('');
            this.teamMore6s.set('');
            this.playerMax6s.set('');
            this.most4s.set('');
            this.playerOfMatch.set('');
            this.economy.set('');
            this.superStriker.set('');
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
            most4s: this.most4s(),
            playerOfMatch: this.playerOfMatch(),
            economy: this.economy(),
            superStriker: this.superStriker()
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

    // ══════════════════════════════════════
    //  BULK PREDICTION (JSON)
    // ══════════════════════════════════════

    downloadPredictions() {
        const currentUser = this.authService.currentUser();
        if (!currentUser) return;

        // 1. Get next 6 unlocked upcoming matches
        const now = new Date().getTime();
        const unlockedMatches = this.allMatches()
            .filter(m => m.status === 'upcoming' && new Date(m.date).getTime() > (now + 60000))
            .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
            .slice(0, 6);

        if (unlockedMatches.length === 0) {
            alert('No unlocked upcoming matches available to predicting bulk.');
            return;
        }

        const matchesPayload = unlockedMatches.map(m => {
            const pred = this.iplService.getPredictionForMatch(m.id);
            const teamOptions = [m.team1.shortName, m.team2.shortName, 'Equal'];

            // Safely grab player names
            const players = getMatchPlayers(m.team1.id, m.team2.id).map(p => p.label);

            return {
                matchId: m.id,
                matchNumber: parseInt(m.id.substring(1)) || 0,
                team1: m.team1.name,
                team2: m.team2.name,
                venue: m.venue || 'TBA',
                dateTime: m.date,
                lockTime: new Date(new Date(m.date).getTime() - 60000).toISOString(),
                isLocked: false,
                predictions: {
                    matchWinner: {
                        currentValue: pred?.winner ? (pred.winner === m.team1.id ? m.team1.name : m.team2.name) : "",
                        options: [m.team1.name, m.team2.name]
                    },
                    team1Score: {
                        currentValue: pred?.team1Score || "",
                        options: [],
                        note: "Enter integer score (e.g. 150)"
                    },
                    team2Score: {
                        currentValue: pred?.team2Score || "",
                        options: [],
                        note: "Enter integer score (e.g. 150)"
                    },
                    firstInningScore: {
                        currentValue: pred?.firstInningRange || "",
                        options: ["<150", "150-174", "175-199", "200-224", "225+"]
                    },
                    secondInningScore: {
                        currentValue: pred?.secondInningRange || "",
                        options: ["<150", "150-174", "175-199", "200-224", "225+"]
                    },
                    teamWithMore4s: {
                        currentValue: pred?.teamMore4s ? (pred.teamMore4s === 'tie' ? 'tie' : (pred.teamMore4s === m.team1.id ? m.team1.id : m.team2.id)) : "",
                        options: [m.team1.id, m.team2.id, "tie"]
                    },
                    teamWithMore6s: {
                        currentValue: pred?.teamMore6s ? (pred.teamMore6s === 'tie' ? 'tie' : (pred.teamMore6s === m.team1.id ? m.team1.id : m.team2.id)) : "",
                        options: [m.team1.id, m.team2.id, "tie"]
                    },
                    playerMaximum6s: {
                        currentValue: pred?.playerMax6s || "",
                        options: players,
                        note: "Enter valid player ID / string"
                    },
                    playerMaximum4s: {
                        currentValue: pred?.most4s || "",
                        options: players,
                        note: "Enter valid player ID / string"
                    },
                    playerOfTheMatch: {
                        currentValue: pred?.playerOfMatch || "",
                        options: players,
                        note: "Enter valid player ID / string"
                    },
                    bowlerLessEconomy: {
                        currentValue: pred?.economy || "",
                        options: players,
                        note: "Enter valid player ID / string"
                    },
                    superStriker: {
                        currentValue: pred?.superStriker || "",
                        options: players,
                        note: "Enter valid player ID / string"
                    }
                }
            };
        });

        const json = {
            version: "1.0",
            downloadedAt: new Date().toISOString(),
            userId: currentUser.uid,
            username: currentUser.username,
            matches: matchesPayload
        };

        const str = JSON.stringify(json, null, 2);
        const blob = new Blob([str], { type: 'application/json' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        
        const safeUsername = currentUser.username.replace(/[^a-z0-9]/gi, '_').toLowerCase();
        const dateStr = new Date().toISOString().split('T')[0];
        
        a.href = url;
        a.download = `predictions_${safeUsername}_${dateStr}.json`;
        a.click();
        window.URL.revokeObjectURL(url);
    }

    uploadFileClick() {
        if (this.fileInput && this.fileInput.nativeElement) {
            this.fileInput.nativeElement.click();
        }
    }

    onFileSelected(event: any) {
        const file = event.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e: any) => {
            try {
                const json = JSON.parse(e.target.result);
                this.validateUploadedJSON(json);
            } catch (err) {
                this.validationErrors.set(['Invalid JSON format. Please ensure the file is correctly formatted.']);
            }
            // Clear input so same file can be re-selected if needed
            if (this.fileInput) {
                this.fileInput.nativeElement.value = '';
            }
        };
        reader.readAsText(file);
    }

    validateUploadedJSON(json: any) {
        const errors: string[] = [];
        const warnings: string[] = [];
        let newCount = 0;
        let updateCount = 0;

        if (!json.version || json.version !== '1.0') {
            errors.push('Invalid or missing version field. Expected "1.0".');
        }

        if (!json.matches || !Array.isArray(json.matches)) {
            errors.push('Missing or invalid matches array.');
        }

        const validMatchesToSave: any[] = [];
        const allMatches = this.allMatches();

        if (json.matches && Array.isArray(json.matches)) {
            json.matches.forEach((match: any) => {
                const existingMatch = allMatches.find(m => m.id === match.matchId);
                if (!existingMatch) {
                    errors.push(`Match ${match.matchId} not found in database.`);
                    return;
                }

                if (this.isMatchLocked(existingMatch)) {
                    errors.push(`Match ${match.matchId} is locked (predictions closed).`);
                    return;
                }

                const predictions = match.predictions;
                if (!predictions) {
                    warnings.push(`Match ${match.matchId} has no predictions block.`);
                    return;
                }

                const getValue = (val: any) => {
                    if (val === undefined || val === null) return undefined;
                    return typeof val === 'object' ? val.currentValue : val;
                };

                // Dropdown field mapping (to validate values)
                const ddFields = [
                    { k: 'matchWinner', lookup: [existingMatch.team1.name, existingMatch.team2.name] },
                    { k: 'firstInningScore', lookup: ["<150", "150-174", "175-199", "200-224", "225+"] },
                    { k: 'secondInningScore', lookup: ["<150", "150-174", "175-199", "200-224", "225+"] },
                    { k: 'teamWithMore4s', lookup: [existingMatch.team1.id, existingMatch.team2.id, "tie"] },
                    { k: 'teamWithMore6s', lookup: [existingMatch.team1.id, existingMatch.team2.id, "tie"] }
                ];

                ddFields.forEach(field => {
                    const value = getValue(predictions[field.k]);
                    if (value) {
                        if (!field.lookup.includes(value)) {
                            errors.push(`Invalid value "${value}" for ${field.k} in match ${match.matchId}. Valid options: ${field.lookup.join(', ')}`);
                        }
                    }
                });

                // Text field checks 
                ['playerMaximum6s', 'playerMaximum4s', 'playerOfTheMatch', 'bowlerLessEconomy', 'superStriker'].forEach(field => {
                    const value = getValue(predictions[field]);
                    if (value && typeof value !== 'string') {
                        errors.push(`${field} must be a string in match ${match.matchId}.`);
                    }
                    if (value === '') {
                        warnings.push(`${field} is empty in match ${match.matchId} - will not be saved.`);
                    }
                });

                // Exact Score checks
                ['team1Score', 'team2Score'].forEach(field => {
                    const value = getValue(predictions[field]);
                    if (value !== undefined && value !== '') {
                        const num = Number(value);
                        if (isNaN(num) || num < 50 || num > 280) {
                            errors.push(`Invalid score "${value}" for ${field} in match ${match.matchId}. Must be an integer between 50 and 280.`);
                        }
                    } else if (value === '') {
                        warnings.push(`${field} is empty in match ${match.matchId} - defaults to 150.`);
                    }
                });

                if (errors.length === 0) {
                    validMatchesToSave.push({ matchMeta: existingMatch, payload: predictions });
                    if (this.iplService.getPredictionForMatch(match.matchId)) {
                        updateCount++;
                    } else {
                        newCount++;
                    }
                }
            });
        }

        if (errors.length > 0) {
            this.validationErrors.set(errors);
            this.validationWarnings.set(warnings);
        } else {
            this.validationErrors.set([]);
            this.validationWarnings.set(warnings);
            this.uploadData.set({ entries: validMatchesToSave });
            this.newPredictionsCount.set(newCount);
            this.updatedPredictionsCount.set(updateCount);
            this.showConfirmation.set(true);
        }
    }

    closeModal() {
        this.validationErrors.set([]);
    }

    cancelUpload() {
        this.showConfirmation.set(false);
        this.uploadData.set(null);
    }

    async confirmUpload() {
        this.isProcessingUpload.set(true);
        const data = this.uploadData();
        if (!data || !data.entries) return;

        for (const entry of data.entries) {
            const m = entry.matchMeta as Match;
            const p = entry.payload;

            const getValue = (val: any) => {
                if (val === undefined || val === null) return undefined;
                return typeof val === 'object' ? val.currentValue : val;
            };

            const pMatchWinner = getValue(p.matchWinner);
            let winnerId = '';
            if (pMatchWinner === m.team1.name) winnerId = m.team1.id;
            if (pMatchWinner === m.team2.name) winnerId = m.team2.id;
            
            this.iplService.submitPrediction({
                matchId: m.id,
                team1Score: parseInt(getValue(p.team1Score) || '150'),
                team2Score: parseInt(getValue(p.team2Score) || '150'),
                winner: winnerId,
                firstInningRange: getValue(p.firstInningScore) || '',
                secondInningRange: getValue(p.secondInningScore) || '',
                teamMore4s: getValue(p.teamWithMore4s) || '',
                teamMore6s: getValue(p.teamWithMore6s) || '',
                playerMax6s: getValue(p.playerMaximum6s) || '',
                most4s: getValue(p.playerMaximum4s) || '',
                playerOfMatch: getValue(p.playerOfTheMatch) || '',
                economy: getValue(p.bowlerLessEconomy) || '',
                superStriker: getValue(p.superStriker) || ''
            });

            await new Promise(r => setTimeout(r, 50));
        }

        // Output toast
        this.isProcessingUpload.set(false);
        this.showConfirmation.set(false);
        const total = this.newPredictionsCount() + this.updatedPredictionsCount();
        this.successMessage.set(`${total} prediction${total !== 1 ? 's' : ''} saved successfully`);
        this.showSuccessToast.set(true);
        setTimeout(() => {
            this.showSuccessToast.set(false);
        }, 5000);
    }
}
