import { Component, computed, signal, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IplService } from '../../services/ipl.service';
import { Match, TEAM_SQUADS } from '../../models/ipl.models';

export interface TeamMatchGuideStats {
  teamId: string;
  teamName: string;
  teamColor: string;
  teamEmoji: string;
  matchesPlayed: number;
  matchesWon: number;

  matchWinner: { won: number; total: number; };
  scoreRanges: { range: string; count: number; }[];
  most4s: { won: number; total: number; };
  most6s: { won: number; total: number; };
  playerMost6s: { playerName: string; count: number; }[];
  playerMost4s: { playerName: string; count: number; }[];
  playerOfMatch: { players: { playerName: string; count: number; }[]; totalFromThisTeam: number; };
  bowlerEconomy: { players: { playerName: string; count: number; }[]; totalFromThisTeam: number; };
  superStriker: { players: { playerName: string; count: number; }[]; totalFromThisTeam: number; };
}

@Component({
  selector: 'app-match-guide',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './match-guide.component.html',
  styleUrls: ['./match-guide.component.css']
})
export class MatchGuideComponent implements OnInit {
  private iplService = inject(IplService);
  teams = this.iplService.teams;
  selectedTeamId = signal<string>('');
  selectedMatchId = signal<string>('');
  viewMode = signal<'team' | 'match'>('team');

  constructor() {}

  ngOnInit() {
    if (this.teams.length > 0) {
      this.selectedTeamId.set(this.teams[0].id);
    }
  }

  nextMatches = computed(() => {
    const allMatches = this.iplService.matches();
    const upcoming = allMatches.filter(m => m.status === 'upcoming');
    return upcoming.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()).slice(0, 3);
  });

  private computeTeamStats(tid: string): TeamMatchGuideStats | null {
    if (!tid) return null;
    const team = this.teams.find(t => t.id === tid);
    if (!team) return null;

    const allMatches = this.iplService.matches();
    const playedMatches = allMatches.filter(m => 
      m.status === 'completed' && m.result && (m.team1.id === tid || m.team2.id === tid)
    );

    const squads = TEAM_SQUADS[tid] || [];
    const squadNames = new Set(squads.map(p => p.name.toLowerCase()));

    let matchesWon = 0;
    let most4sWon = 0;
    let most6sWon = 0;
    
    const scoreRangesMap = new Map<string, number>();
    const playerMost6sMap = new Map<string, number>();
    const playerMost4sMap = new Map<string, number>();
    const playerOfMatchMap = new Map<string, number>();
    const bowlerEconomyMap = new Map<string, number>();
    const superStrikerMap = new Map<string, number>();

    let totalPoMFromTeam = 0;
    let totalEcoFromTeam = 0;
    let totalSSFromTeam = 0;

    for (const m of playedMatches) {
      const res = m.result!;
      if (this.iplService.isStringMatch(res.winner, tid)) matchesWon++;

      const teamScore = (m.team1.id === tid) ? res.team1Score : res.team2Score;
      if (teamScore !== undefined) {
        let bucket = '';
        if (teamScore < 150) bucket = '< 150';
        else if (teamScore <= 174) bucket = '150 - 174';
        else if (teamScore <= 199) bucket = '175 - 199';
        else if (teamScore <= 224) bucket = '200 - 224';
        else bucket = '225+';
        scoreRangesMap.set(bucket, (scoreRangesMap.get(bucket) || 0) + 1);
      }

      if (this.iplService.isStringMatch(res.teamMore4s, tid)) most4sWon++;
      if (this.iplService.isStringMatch(res.teamMore6s, tid)) most6sWon++;

      if (res.playerMax6s && squadNames.has(res.playerMax6s.toLowerCase())) {
        playerMost6sMap.set(res.playerMax6s, (playerMost6sMap.get(res.playerMax6s) || 0) + 1);
      }
      
      if (res.most4s && squadNames.has(res.most4s.toLowerCase())) {
        playerMost4sMap.set(res.most4s, (playerMost4sMap.get(res.most4s) || 0) + 1);
      }

      if (res.playerOfMatch && squadNames.has(res.playerOfMatch.toLowerCase())) {
        playerOfMatchMap.set(res.playerOfMatch, (playerOfMatchMap.get(res.playerOfMatch) || 0) + 1);
        totalPoMFromTeam++;
      }

      if (res.economy && squadNames.has(res.economy.toLowerCase())) {
        bowlerEconomyMap.set(res.economy, (bowlerEconomyMap.get(res.economy) || 0) + 1);
        totalEcoFromTeam++;
      }

      if (res.superStriker && squadNames.has(res.superStriker.toLowerCase())) {
        superStrikerMap.set(res.superStriker, (superStrikerMap.get(res.superStriker) || 0) + 1);
        totalSSFromTeam++;
      }
    }

    const sortMap = (map: Map<string, number>) => Array.from(map.entries())
      .map(([playerName, count]) => ({ playerName, count }))
      .sort((a, b) => b.count - a.count);

    const scoreRanges = Array.from(scoreRangesMap.entries())
      .map(([range, count]) => ({ range, count }))
      .sort((a, b) => {
        const order = ['225+', '200 - 224', '175 - 199', '150 - 174', '< 150'];
        return order.indexOf(a.range) - order.indexOf(b.range);
      });

    return {
      teamId: team.id,
      teamName: team.name,
      teamColor: team.color,
      teamEmoji: team.emoji,
      matchesPlayed: playedMatches.length,
      matchesWon,
      matchWinner: { won: matchesWon, total: playedMatches.length },
      scoreRanges,
      most4s: { won: most4sWon, total: playedMatches.length },
      most6s: { won: most6sWon, total: playedMatches.length },
      playerMost6s: sortMap(playerMost6sMap),
      playerMost4s: sortMap(playerMost4sMap),
      playerOfMatch: { players: sortMap(playerOfMatchMap), totalFromThisTeam: totalPoMFromTeam },
      bowlerEconomy: { players: sortMap(bowlerEconomyMap), totalFromThisTeam: totalEcoFromTeam },
      superStriker: { players: sortMap(superStrikerMap), totalFromThisTeam: totalSSFromTeam }
    };
  }

  singleStats = computed(() => {
    return this.computeTeamStats(this.selectedTeamId());
  });

  compareStats = computed(() => {
    const mid = this.selectedMatchId();
    if (!mid) return null;
    const match = this.iplService.matches().find(m => m.id === mid);
    if (!match) return null;
    const t1 = this.computeTeamStats(match.team1.id);
    const t2 = this.computeTeamStats(match.team2.id);
    if (!t1 || !t2) return null;
    return { t1, t2 };
  });

  selectTeam(id: string) {
    this.selectedTeamId.set(id);
    this.viewMode.set('team');
  }

  selectMatch(id: string) {
    this.selectedMatchId.set(id);
    this.viewMode.set('match');
  }

  getWinRate(won: number, total: number) {
    if (total === 0) return 0;
    return Math.round((won / total) * 100);
  }
  
  getDots(count: number): number[] {
    return Array(Math.min(count, 10)).fill(0);
  }

  getBarWidth(won: number, total: number): string {
    return `${this.getWinRate(won, total)}%`;
  }
}
