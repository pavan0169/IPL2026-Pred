import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { UserStats } from '../../../models/ipl.models';
import { ProgressBarComponent } from '../progress-bar/progress-bar.component';

@Component({
    selector: 'app-leaderboard-table',
    standalone: true,
    imports: [CommonModule, ProgressBarComponent],
    template: `
    <div class="table-card card">
      <div class="table-scroll">
        <table class="leaderboard-table">
          <thead>
            <tr>
              <th class="col-rank">#</th>
              <th class="col-player">Player</th>
              <th class="col-points">Total Points</th>
              <th class="col-stat">Wins</th>
              <th class="col-stat">Weekly Pts</th>
              <th class="col-stat">Accuracy</th>
              <th class="col-badges">Badges</th>
            </tr>
          </thead>
          <tbody>
            @for (stat of stats; track stat.userId; let i = $index) {
            <tr class="lb-row" (click)="rowClick.emit(stat.userId)">
              <td class="col-rank">
                <span class="rank-num" [class.top-3]="i < 3">{{ i + 1 }}</span>
              </td>
              <td class="col-player">
                <div class="player-cell">
                  <div class="mini-avatar">{{ stat.username.charAt(0) | uppercase }}</div>
                  <span class="player-name">{{ stat.username }}</span>
                </div>
              </td>
              <td class="col-points">
                <div class="points-cell">
                  <app-progress-bar [value]="stat.totalPoints" [max]="maxPoints" height="6px"></app-progress-bar>
                  <span class="points-val">{{ stat.totalPoints }}</span>
                </div>
              </td>
              <td class="col-stat">{{ stat.correctWinners }}</td>
              <td class="col-stat">22</td> <!-- Mocked for now -->
              <td class="col-stat">30%</td> <!-- Mocked for now -->
              <td class="col-badges">
                <div class="badge-group">
                  @if (i === 0) { <span class="badge badge-gold">WEEKLY</span> }
                  @if (i === 0) { <span class="badge badge-alt">MAX PTS</span> }
                  @if (i === 1) { <span class="badge badge-info">TODAY</span> }
                </div>
              </td>
            </tr>
            }
          </tbody>
        </table>
      </div>
    </div>
  `,
    styles: [`
    .table-card { padding: 0; overflow: hidden; }
    .table-scroll { width: 100%; overflow-x: auto; }
    
    .leaderboard-table {
      width: 100%;
      border-collapse: collapse;
      text-align: left;
    }
    
    th {
      padding: 1.25rem 1rem;
      font-size: 0.72rem;
      font-weight: 700;
      color: var(--text-muted);
      text-transform: uppercase;
      letter-spacing: 0.1em;
      background: var(--surface-2);
      border-bottom: 1px solid var(--border);
    }
    
    .lb-row {
      transition: background var(--transition);
      cursor: pointer;
      border-bottom: 1px solid var(--border);
    }
    .lb-row:hover {
      background: var(--surface);
    }
    .lb-row:last-child { border-bottom: none; }
    
    td { padding: 1rem; vertical-align: middle; }
    
    .col-rank { width: 60px; text-align: center; }
    .rank-num {
      font-weight: 800;
      font-family: 'Outfit', sans-serif;
      color: var(--text-muted);
    }
    .rank-num.top-3 { color: var(--accent); font-size: 1.1rem; }
    
    .player-cell { display: flex; align-items: center; gap: 0.75rem; }
    .mini-avatar {
      width: 32px;
      height: 32px;
      background: var(--accent-light);
      color: var(--accent);
      border-radius: 8px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: 800;
      font-size: 0.85rem;
    }
    .player-name { font-weight: 600; font-size: 0.95rem; }
    
    .points-cell {
      display: flex;
      align-items: center;
      gap: 1rem;
      min-width: 150px;
    }
    .points-val {
      font-weight: 800;
      font-family: 'Outfit', sans-serif;
      color: var(--text-primary);
      min-width: 30px;
      text-align: right;
    }
    
    .col-stat { width: 100px; font-weight: 600; color: var(--text-secondary); text-align: center; }
    
    .badge-group { display: flex; gap: 0.4rem; flex-wrap: wrap; }
    .badge {
      font-size: 0.6rem;
      padding: 0.2rem 0.5rem;
      border-radius: 4px;
      font-weight: 700;
      letter-spacing: 0.05em;
    }
    .badge-gold { background: #fffbeb; color: #b45309; border: 1px solid #fde68a; }
    .badge-alt { background: #fdf2f8; color: #be185d; border: 1px solid #fbcfe8; }
    .badge-info { background: #f0f9ff; color: #0369a1; border: 1px solid #bae6fd; }

    @media (max-width: 768px) {
      .col-stat, .col-badges { display: none; }
    }
  `]
})
export class LeaderboardTableComponent {
    @Input({ required: true }) stats: UserStats[] = [];
    @Input() maxPoints: number = 100;
    @Output() rowClick = new EventEmitter<string>();
}
