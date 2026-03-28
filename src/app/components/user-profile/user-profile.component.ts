import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IplService } from '../../services/ipl.service';
import { AuthService } from '../../services/auth.service';

@Component({
    selector: 'app-user-profile',
    standalone: true,
    imports: [CommonModule],
    templateUrl: './user-profile.component.html',
    styleUrls: ['./user-profile.component.css']
})
export class UserProfileComponent {
    constructor(private iplService: IplService, private authService: AuthService) { }

    get profile() {
        const currentUser = this.authService.currentUser();
        if (!currentUser) return null;
        const stats = this.iplService.userStats();
        const myStats = stats.find(s => s.userId === currentUser.uid);
        if (myStats) {
            return {
                ...myStats,
                avatarUrl: '',
                displayName: myStats.username,
                joinedLeagues: []
            };
        }
        return null;
    }
}
