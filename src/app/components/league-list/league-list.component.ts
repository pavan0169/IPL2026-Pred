import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LeagueService } from '../../services/league.service';
import { League } from '../../models/ipl.models';

@Component({
    selector: 'app-league-list',
    standalone: true,
    imports: [CommonModule, FormsModule],
    templateUrl: './league-list.component.html',
    styleUrls: ['./league-list.component.css']
})
export class LeagueListComponent {
    newLeagueName: string = '';
    joinLeagueId: string = '';

    constructor(public leagueService: LeagueService) { }

    async join(leagueId: string) {
        await this.leagueService.joinLeague(leagueId);
    }

    async createLeague() {
        if (this.newLeagueName.trim()) {
            await this.leagueService.createLeague(this.newLeagueName.trim());
            this.newLeagueName = '';
        }
    }

    async joinByInput() {
        if (this.joinLeagueId.trim()) {
            await this.leagueService.joinLeague(this.joinLeagueId.trim());
            this.joinLeagueId = '';
        }
    }
}
