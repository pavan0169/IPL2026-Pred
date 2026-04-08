import { Component, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IplService } from '../../services/ipl.service';

@Component({
  selector: 'app-history',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="history-page fade-in">
      <div class="page-header">
        <h2>📅 Match History</h2>
        <p>Review results and points for completed matches</p>
      </div>

      <div class="history-grid">
        @for (match of completedMatches(); track match.id) {
          <div class="match-card card">
            <div class="match-header">
              <span class="match-date">{{ formatDate(match.date) }}</span>
              <span class="badge" [ngClass]="{'badge-completed': match.status !== 'cancelled', 'badge-cancelled': match.status === 'cancelled'}">
                {{ match.status | uppercase }}
              </span>
            </div>
            
            <div class="teams-display">
              <div class="team">
                <span class="team-emoji">{{ match.team1.emoji }}</span>
                <span class="team-name">{{ match.team1.shortName }}</span>
                <span class="score" *ngIf="match.result">{{ match.result.team1Score }}</span>
              </div>
              <div class="vs">vs</div>
              <div class="team">
                <span class="team-emoji">{{ match.team2.emoji }}</span>
                <span class="team-name">{{ match.team2.shortName }}</span>
                <span class="score" *ngIf="match.result">{{ match.result.team2Score }}</span>
              </div>
            </div>

            <div class="result-info" *ngIf="match.result">
              <span class="winner-label">Winner:</span>
              <span class="winner-name">{{ match.result.winner | uppercase }}</span>
            </div>
          </div>
        }
        @if (completedMatches().length === 0) {
          <div class="empty-state card">No matches completed yet.</div>
        }
      </div>
    </div>
  `,
  styles: [`
    .history-page { padding: 1rem; max-width: 1000px; margin: 0 auto; }
    .page-header { margin-bottom: 2rem; text-align: center; }
    .history-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 1.5rem; }
    .match-card { padding: 1.5rem; display: flex; flex-direction: column; gap: 1rem; }
    .match-header { display: flex; justify-content: space-between; align-items: center; }
    .match-date { font-size: 0.85rem; font-weight: 600; color: var(--text-muted); }
    .teams-display { display: flex; align-items: center; justify-content: space-around; padding: 1rem 0; border-bottom: 1px solid var(--border); }
    .team { display: flex; flex-direction: column; align-items: center; gap: 0.5rem; }
    .team-emoji { font-size: 1.5rem; }
    .team-name { font-weight: 800; font-size: 1.1rem; }
    .score { font-size: 1.25rem; font-weight: 900; color: var(--accent); }
    .vs { font-weight: 800; color: var(--text-muted); opacity: 0.5; }
    .result-info { display: flex; gap: 0.5rem; justify-content: center; font-weight: 700; font-size: 0.9rem; }
    .winner-name { color: var(--success); }
    .badge-cancelled { background: var(--error, #ef4444); color: white; padding: 0.2rem 0.5rem; border-radius: 4px; font-weight: 700; font-size: 0.75rem; }
  `]
})
export class HistoryComponent {
  completedMatches = computed(() => this.iplService.matches().filter(m => m.status === 'completed' || m.status === 'cancelled'));

  constructor(private iplService: IplService) { }

  formatDate(dateStr: string): string {
    return new Date(dateStr).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
  }
}
