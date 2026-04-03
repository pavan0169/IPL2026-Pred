import { Component, Input, computed } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
    selector: 'app-progress-bar',
    standalone: true,
    imports: [CommonModule],
    template: `
    <div class="progress-container" [style.height]="height">
      <div class="progress-bar-inner" 
           [style.width.%]="percentage"
           [style.background]="color || 'var(--accent-gradient-2)'">
      </div>
    </div>
  `,
    styles: [`
    .progress-container {
      width: 100%;
      background: var(--surface-2);
      border-radius: 50px;
      overflow: hidden;
      position: relative;
    }
    .progress-bar-inner {
      height: 100%;
      border-radius: 50px;
      transition: width 1s cubic-bezier(0.34, 1.56, 0.64, 1);
      box-shadow: 0 0 10px rgba(139, 92, 246, 0.2);
    }
  `]
})
export class ProgressBarComponent {
    @Input({ required: true }) value: number = 0;
    @Input({ required: true }) max: number = 100;
    @Input() height: string = '8px';
    @Input() color?: string;

    get percentage(): number {
        if (this.max === 0) return 0;
        return Math.min(Math.max((this.value / this.max) * 100, 0), 100);
    }
}
