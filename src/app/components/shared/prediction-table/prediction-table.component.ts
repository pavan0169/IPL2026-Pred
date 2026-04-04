import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Match, Prediction, UserStats } from '../../../models/ipl.models';
import { IplService } from '../../../services/ipl.service';

@Component({
  selector: 'app-prediction-table',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './prediction-table.component.html',
  styleUrl: './prediction-table.component.css'
})
export class PredictionTableComponent {
  @Input({ required: true }) match!: Match;
  @Input({ required: true }) users: UserStats[] = [];
  @Input({ required: true }) predictions: Prediction[] = [];

  categories = [
    { key: 'winner', label: 'Winner', icon: '🏆', pts: 3 },
    { key: 'exactScore', label: 'Exact Score', icon: '🎯', pts: 10 },
    { key: 'firstInningRange', label: 'Inning 1 Range', icon: '🏟️', pts: 3 },
    { key: 'secondInningRange', label: 'Inning 2 Range', icon: '🏟️', pts: 3 },
    { key: 'teamMore4s', label: 'Most 4s (Team)', icon: '⚡', pts: 2 },
    { key: 'teamMore6s', label: 'Most 6s (Team)', icon: '🚀', pts: 2 },
    { key: 'playerMax6s', label: 'Max 6s Player', icon: '🔥', pts: 3 },
    { key: 'most4s', label: 'Most 4s Player', icon: '🏏', pts: 4 },
    { key: 'playerOfMatch', label: 'Player of Match', icon: '⭐', pts: 5 },
    { key: 'economy', label: 'Bowler (Economy)', icon: '🧤', pts: 4 },
    { key: 'superStriker', label: 'Super Striker', icon: '🌪️', pts: 4 },
  ];

  getBarColor(index: number): string {
    const colors = [
      'linear-gradient(135deg, #6366f1 0%, #a855f7 100%)',
      'linear-gradient(135deg, #3b82f6 0%, #2dd4bf 100%)',
      'linear-gradient(135deg, #f59e0b 0%, #ef4444 100%)',
      'linear-gradient(135deg, #10b981 0%, #3b82f6 100%)',
      'linear-gradient(135deg, #8b5cf6 0%, #ec4899 100%)',
      'linear-gradient(135deg, #f43f5e 0%, #fb923c 100%)'
    ];
    return colors[index % colors.length];
  }

  getPredictionValue(userId: string, category: string): string {
    const pred = this.predictions.find(p => {
      // Robust lookup: match on userId field OR try to extract from id (matchId_userId)
      const pUserId = p.userId || p.id?.split('_')[1];
      return pUserId === userId && p.matchId === this.match.id;
    });
    if (!pred) return '-';
    if (category === 'exactScore') return `${pred.team1Score || 0}-${pred.team2Score || 0}`;

    const normalized = IplService.normalizeData(pred);
    return (normalized as any)[category] || '-';
  }

  getResultValue(category: string): string {
    if (!this.match.result) return '-';
    if (category === 'exactScore') return `${this.match.result.team1Score || 0}-${this.match.result.team2Score || 0}`;

    const normalized = IplService.normalizeData(this.match.result);
    return (normalized as any)[category] || '-';
  }

  isCorrect(userId: string, category: string): boolean {
    if (!this.match.result) return false;
    const pred = this.predictions.find(p => {
      const pUserId = p.userId || p.id?.split('_')[1];
      return pUserId === userId && p.matchId === this.match.id;
    });
    if (!pred) return false;

    if (category === 'exactScore') {
      return pred.team1Score === this.match.result.team1Score &&
        pred.team2Score === this.match.result.team2Score;
    }

    const p = IplService.normalizeData(pred);
    const r = IplService.normalizeData(this.match.result);

    const pVal = (p as any)[category];
    const rVal = (r as any)[category];

    if (!pVal || !rVal) return false;
    return pVal.toString().toLowerCase().trim() === rVal.toString().toLowerCase().trim();
  }
}
