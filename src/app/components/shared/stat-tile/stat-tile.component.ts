import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-stat-tile',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="stat-card" [class.mini]="mini">
      <div class="stat-header">
        <h4 class="stat-title">{{ label }}</h4>
      </div>
      <div class="stat-body">
        <span class="stat-main-value" [style.color]="color || 'var(--accent)'">{{ value }}</span>
        <span class="stat-meta" *ngIf="subValue">{{ subValue }}</span>
      </div>
    </div>
  `,
  styles: [`
    .stat-card {
      background: var(--surface);
      border-radius: 12px;
      padding: 1.25rem;
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
      box-shadow: var(--shadow);
      border: 1px solid var(--border);
      transition: transform 0.3s ease;
      min-height: 120px;
    }
    .stat-card:hover { transform: translateY(-3px); }
    
    .stat-title {
      font-size: 0.9rem;
      font-weight: 700;
      color: var(--text-primary);
      margin: 0;
    }
    
    .stat-body {
      display: flex;
      flex-direction: column;
      gap: 0.1rem;
    }
    
    .stat-main-value {
      font-size: 1.35rem;
      font-weight: 800;
      font-family: 'Outfit', sans-serif;
    }
    
    .stat-meta {
      font-size: 0.8rem;
      font-weight: 600;
      color: var(--text-muted);
    }
  `]
})
export class StatTileComponent {
  @Input({ required: true }) label: string = '';
  @Input({ required: true }) value: string | number = '';
  @Input() subValue?: string;
  @Input() color?: string;
  @Input() mini: boolean = false;
  @Input() icon?: string;
}
