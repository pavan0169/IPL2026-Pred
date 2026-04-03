import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { UserStats } from '../../../models/ipl.models';

@Component({
    selector: 'app-player-card',
    standalone: true,
    imports: [CommonModule],
    template: `
    <div class="player-card card fade-in-up">
      <div class="rank-badge" [class.rank-1]="rank === 1" [class.rank-2]="rank === 2" [class.rank-3]="rank === 3">
        {{ rank }}
      </div>
      
      <div class="card-header">
        <div class="avatar shadow-glow">{{ stats.username.charAt(0) | uppercase }}</div>
        <div class="player-info">
          <h3 class="player-name">{{ stats.username }}</h3>
          <span class="total-pts">{{ stats.totalPoints }} Total Pts</span>
        </div>
      </div>

      <div class="stats-grid">
        <div class="grid-item">
          <div class="icon">🏆</div>
          <span class="label">Daily Wins</span>
          <span class="value">{{ stats.correctWinners }}</span>
        </div>
        <div class="grid-item">
          <div class="icon">📅</div>
          <span class="label">Weekly Wins</span>
          <span class="value">2</span> <!-- Mocked for now -->
        </div>
        <div class="grid-item">
          <div class="icon">📊</div>
          <span class="label">Avg Pts</span>
          <span class="value">8.3</span> <!-- Mocked for now -->
        </div>
        <div class="grid-item">
          <div class="icon">🎯</div>
          <span class="label">Accuracy</span>
          <span class="value">30%</span> <!-- Mocked for now -->
        </div>
        <div class="grid-item">
          <div class="icon">🏅</div>
          <span class="label">Best Match</span>
          <span class="value">15</span> <!-- Mocked for now -->
        </div>
        <div class="grid-item">
          <div class="icon">✅</div>
          <span class="label">Winners</span>
          <span class="value">3</span> <!-- Mocked for now -->
        </div>
        <div class="grid-item">
          <div class="icon">💎</div>
          <span class="label">Exact Sc.</span>
          <span class="value">0</span> <!-- Mocked for now -->
        </div>
        <div class="grid-item">
          <div class="icon">⭐</div>
          <span class="label">Perfect</span>
          <span class="value">0</span> <!-- Mocked for now -->
        </div>
      </div>
    </div>
  `,
    styles: [`
    .player-card {
      padding: 1.5rem;
      display: flex;
      flex-direction: column;
      gap: 1.5rem;
      min-width: 280px;
      overflow: visible;
    }
    .rank-badge {
      position: absolute;
      top: -12px;
      left: -12px;
      width: 32px;
      height: 32px;
      background: var(--surface-solid);
      border: 2px solid var(--border-glow);
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: 800;
      font-size: 0.9rem;
      z-index: 10;
      box-shadow: var(--shadow);
    }
    .rank-1 { background: #ffd700; color: #000; border-color: #fff; }
    .rank-2 { background: #c0c0c0; color: #000; border-color: #fff; }
    .rank-3 { background: #cd7f32; color: #000; border-color: #fff; }

    .card-header {
      display: flex;
      align-items: center;
      gap: 1rem;
    }
    .avatar {
      width: 54px;
      height: 54px;
      background: var(--accent-gradient-2);
      color: #fff;
      border-radius: 14px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 1.5rem;
      font-weight: 800;
      font-family: 'Outfit', sans-serif;
    }
    .player-info {
      display: flex;
      flex-direction: column;
      gap: 0.1rem;
    }
    .player-name {
      margin: 0;
      font-size: 1.15rem;
      color: var(--text-primary);
    }
    .total-pts {
      font-size: 0.85rem;
      font-weight: 600;
      color: var(--accent);
    }

    .stats-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 0.75rem;
    }
    .grid-item {
      background: var(--surface-2);
      padding: 1rem 0.5rem;
      border-radius: 12px;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 0.35rem;
      text-align: center;
      transition: all var(--transition);
      border: 1px solid transparent;
    }
    .grid-item:hover {
      background: var(--surface);
      transform: scale(1.05);
      border-color: var(--border-glow);
    }
    .icon {
      font-size: 1.25rem;
      margin-bottom: 0.2rem;
    }
    .label {
      font-size: 0.65rem;
      font-weight: 600;
      color: var(--text-muted);
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }
    .value {
      font-size: 1.1rem;
      font-weight: 800;
      font-family: 'Outfit', sans-serif;
      color: var(--text-primary);
    }
  `]
})
export class PlayerCardComponent {
    @Input({ required: true }) stats!: UserStats;
    @Input({ required: true }) rank!: number;
}
