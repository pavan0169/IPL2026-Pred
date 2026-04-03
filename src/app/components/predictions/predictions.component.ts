import { Component, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IplService } from '../../services/ipl.service';
import { PredictionTableComponent } from '../shared/prediction-table/prediction-table.component';

@Component({
  selector: 'app-predictions',
  standalone: true,
  imports: [CommonModule, PredictionTableComponent],
  templateUrl: './predictions.component.html',
  styleUrl: './predictions.component.css'
})
export class PredictionsComponent {
  private iplService = inject(IplService);

  activeMatch = computed(() => {
    const matches = this.iplService.matches();
    const now = new Date();

    // 1. Check for live or completed first (these are definitely locked)
    // Also include matches where the start time has already passed
    const lockedMatches = matches.filter(m =>
      m.status === 'live' ||
      m.status === 'completed' ||
      new Date(m.date) <= now
    );

    if (lockedMatches.length > 0) {
      // Sort by date descending and get the most recent locked/live/completed match
      return lockedMatches.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0];
    }

    // 2. If no match is locked yet, show the first upcoming match
    return matches.find(m => m.status === 'upcoming') || matches[0];
  });

  lockedAtDisplay = computed(() => {
    const match = this.activeMatch();
    if (!match) return '--';

    const date = new Date(match.date);
    // Format: Apr 1, 09:59 AM
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) +
      ', ' +
      date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
  });

  userStats = this.iplService.userStats;
  allPredictions = this.iplService.predictions;
}
