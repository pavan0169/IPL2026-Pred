import { Component, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IplService } from '../../services/ipl.service';

interface MatchGroup {
  dateLabel: string;
  matches: any[];
}

@Component({
  selector: 'app-past-predictions',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './past-predictions.component.html',
  styleUrl: './past-predictions.component.css'
})
export class PastPredictionsComponent {
  expandedMatchId = signal<string | null>(null);

  constructor(public iplService: IplService) {}

  // Group completed matches by date
  daywiseMatches = computed<MatchGroup[]>(() => {
    // Filter matches that have a result (this is our new source of truth for "past" matches)
    const matches = this.iplService.matches().filter(m => !!m.result);
    
    // Sort matches by date descending (most recent first)
    const sorted = [...matches].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    
    const groups: MatchGroup[] = [];
    sorted.forEach(m => {
      const dateLabel = this.formatGroupDate(m.date);
      let group = groups.find(g => g.dateLabel === dateLabel);
      if (!group) {
        group = { dateLabel, matches: [] };
        groups.push(group);
      }
      group.matches.push(m);
    });
    
    return groups;
  });

  toggleMatch(matchId: string) {
    this.expandedMatchId.update(id => id === matchId ? null : matchId);
  }

  getPredictionsForMatch(matchId: string) {
    const match = this.iplService.matches().find(m => m.id === matchId);
    const allPredictions = this.iplService.predictions().filter(p => p.matchId === matchId);
    const users = this.iplService.userStats();

    return users.map(user => {
      const pred = allPredictions.find(p => p.userId === user.userId);
      const points = (pred && match?.result) ? this.iplService.calcPoints(pred, match.result) : 0;
      return { user, pred, points };
    }).sort((a, b) => b.points !== a.points ? b.points - a.points : a.user.username.localeCompare(b.user.username));
  }

  formatGroupDate(dateStr: string): string {
    return new Date(dateStr).toLocaleDateString(undefined, { 
      weekday: 'long', 
      day: 'numeric', 
      month: 'long',
      year: 'numeric' 
    });
  }

  formatShortDate(dateStr: string): string {
    return new Date(dateStr).toLocaleDateString(undefined, { 
      weekday: 'short', 
      day: 'numeric', 
      month: 'short' 
    });
  }

  getTeamName(match: any, teamId?: string): string {
    if (!teamId) return '-';
    if (teamId === match.team1.id) return match.team1.shortName;
    if (teamId === match.team2.id) return match.team2.shortName;
    return teamId;
  }
}
