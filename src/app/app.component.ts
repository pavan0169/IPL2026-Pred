import { Component, OnInit, signal, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BreakpointObserver, Breakpoints, LayoutModule } from '@angular/cdk/layout';
import { ThemeService } from './services/theme.service';
import { AuthService } from './services/auth.service';
import { SessionService } from './services/session.service';
import { PredictComponent } from './components/predict/predict.component';
import { StandingsComponent } from './components/standings/standings.component';
import { AdminComponent } from './components/admin/admin.component';
import { LandingComponent } from './components/landing/landing.component';
import { LeagueListComponent } from './components/league-list/league-list.component';
import { UserProfileComponent } from './components/user-profile/user-profile.component';

type Tab = 'predict' | 'standings' | 'admin' | 'leagues' | 'profile';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, LayoutModule, PredictComponent, StandingsComponent, AdminComponent, LandingComponent, LeagueListComponent, UserProfileComponent],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css'
})
export class AppComponent implements OnInit {
  activeTab = signal<Tab>('predict');
  isMobile = signal(false);

  tabs: { id: Tab; label: string; icon: string }[] = [
    { id: 'predict', label: 'Predict', icon: '🏏' },
    { id: 'standings', label: 'Standings', icon: '🏆' },
    { id: 'admin', label: 'Admin', icon: '⚙️' },
    // { id: 'leagues', label: 'Leagues', icon: '👥' },
    { id: 'profile', label: 'Profile', icon: '👤' },
  ];

  get visibleTabs() {
    if (this.authService.isAdmin()) return this.tabs;
    return this.tabs.filter(t => t.id !== 'admin');
  }

  constructor(
    public themeService: ThemeService,
    public authService: AuthService,
    private sessionService: SessionService,
    private breakpointObserver: BreakpointObserver
  ) {
    // Reactively start/stop the inactivity timer based on login state
    effect(() => {
      if (this.authService.isLoggedIn()) {
        this.sessionService.start();
      } else {
        this.sessionService.stop();
      }
    });
  }

  ngOnInit() {
    this.breakpointObserver
      .observe([Breakpoints.HandsetPortrait, Breakpoints.HandsetLandscape, '(max-width: 768px)'])
      .subscribe(result => {
        this.isMobile.set(result.matches);
      });
  }

  setTab(tab: Tab) { this.activeTab.set(tab); }

  logout() {
    this.sessionService.stop();
    this.authService.logout();
  }
}
