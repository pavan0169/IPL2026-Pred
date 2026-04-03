import { Component, OnInit, signal, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BreakpointObserver, Breakpoints, LayoutModule } from '@angular/cdk/layout';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { ThemeService } from './services/theme.service';
import { AuthService } from './services/auth.service';
import { SessionService } from './services/session.service';
import { PredictComponent } from './components/predict/predict.component';
import { StandingsComponent } from './components/standings/standings.component';
import { LockedPredictionsComponent } from './components/locked-predictions/locked-predictions.component';
import { AdminComponent } from './components/admin/admin.component';
import { LandingComponent } from './components/landing/landing.component';
import { UserProfileComponent } from './components/user-profile/user-profile.component';
import { PastPredictionsComponent } from './components/past-predictions/past-predictions.component';
import { LeagueListComponent } from './components/league-list/league-list.component';
import { CricketLoaderComponent } from './components/cricket-loader/cricket-loader.component';

type Tab = 'predict' | 'standings' | 'locked' | 'admin' | 'leagues' | 'profile' | 'history';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, LayoutModule, PredictComponent, StandingsComponent, LockedPredictionsComponent, AdminComponent, LandingComponent, UserProfileComponent, PastPredictionsComponent, CricketLoaderComponent],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css'
})
export class AppComponent implements OnInit {
  activeTab = signal<Tab>('predict');
  isMobile = signal(false);
  authLoading = signal(true);
  tabSwitching = signal(false);

  tabs: { id: Tab; label: string; icon: SafeHtml }[];

  constructor(
    public themeService: ThemeService,
    public authService: AuthService,
    private sessionService: SessionService,
    private breakpointObserver: BreakpointObserver,
    private sanitizer: DomSanitizer
  ) {
    const svg = (s: string): SafeHtml => this.sanitizer.bypassSecurityTrustHtml(s);

    this.tabs = [
      {
        id: 'predict', label: 'Predict',
        // Lightning bolt — amber-orange gradient, filled
        icon: svg(`<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24"><defs><linearGradient id="gi-predict" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="#fbbf24"/><stop offset="100%" stop-color="#f97316"/></linearGradient></defs><path d="M13 2L3 14h9l-1 8 10-12h-9z" fill="url(#gi-predict)"/><path d="M14 2l-2 10h7z" fill="url(#gi-predict)" opacity="0.5"/></svg>`)
      },
      {
        id: 'locked', label: 'Predictions',
        // Padlock — violet-pink gradient, filled body + keyhole
        icon: svg(`<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24"><defs><linearGradient id="gi-locked" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="#8b5cf6"/><stop offset="100%" stop-color="#ec4899"/></linearGradient></defs><rect x="3" y="11" width="18" height="12" rx="3" fill="url(#gi-locked)"/><path d="M7 11V8a5 5 0 0 1 10 0v3" fill="none" stroke="#8b5cf6" stroke-width="2.5" stroke-linecap="round"/><circle cx="12" cy="16.5" r="1.5" fill="white" opacity="0.9"/><rect x="11.25" y="17" width="1.5" height="2.5" rx="0.75" fill="white" opacity="0.9"/></svg>`)
      },
      {
        id: 'standings', label: 'Standings',
        // Trophy cup — gold gradient, cup + base + check
        icon: svg(`<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24"><defs><linearGradient id="gi-standings" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="#fde68a"/><stop offset="70%" stop-color="#f59e0b"/><stop offset="100%" stop-color="#d97706"/></linearGradient></defs><path d="M6 2h12v8a6 6 0 0 1-12 0V2z" fill="url(#gi-standings)"/><path d="M4 4H6v5a3.5 3.5 0 0 1-2-3.2V4z" fill="url(#gi-standings)" opacity="0.6"/><path d="M18 4h2v1.8A3.5 3.5 0 0 1 18 9V4z" fill="url(#gi-standings)" opacity="0.6"/><rect x="10" y="15" width="4" height="3" fill="url(#gi-standings)"/><rect x="7" y="18" width="10" height="2.5" rx="1.25" fill="url(#gi-standings)"/><path d="M9.5 7.5l1.5 1.5 3.5-3.5" stroke="white" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" fill="none" opacity="0.85"/></svg>`)
      },
      {
        id: 'history', label: 'History',
        // Clock face — cyan filled circle, white hands
        icon: svg(`<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24"><defs><linearGradient id="gi-history" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="#22d3ee"/><stop offset="100%" stop-color="#0891b2"/></linearGradient></defs><circle cx="12" cy="12" r="10" fill="url(#gi-history)"/><circle cx="12" cy="12" r="8" fill="url(#gi-history)" opacity="0.4"/><line x1="12" y1="7" x2="12" y2="12" stroke="white" stroke-width="2" stroke-linecap="round"/><line x1="12" y1="12" x2="15.5" y2="14" stroke="white" stroke-width="2" stroke-linecap="round"/><circle cx="12" cy="12" r="1" fill="white"/></svg>`)
      },
      {
        id: 'admin', label: 'Admin',
        // Cog gear — slate-indigo gradient, filled teeth + center hole
        icon: svg(`<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24"><defs><linearGradient id="gi-admin" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="#64748b"/><stop offset="100%" stop-color="#4338ca"/></linearGradient></defs><path d="M12 2a1.5 1.5 0 0 1 1.5 1.5v.97a7.03 7.03 0 0 1 2.12.87l.69-.69a1.5 1.5 0 0 1 2.12 2.12l-.69.69c.38.66.67 1.38.87 2.12h.97a1.5 1.5 0 0 1 0 3h-.97a7.03 7.03 0 0 1-.87 2.12l.69.69a1.5 1.5 0 0 1-2.12 2.12l-.69-.69a7.03 7.03 0 0 1-2.12.87v.97a1.5 1.5 0 0 1-3 0v-.97a7.03 7.03 0 0 1-2.12-.87l-.69.69a1.5 1.5 0 0 1-2.12-2.12l.69-.69A7.03 7.03 0 0 1 3.47 13.5H2.5a1.5 1.5 0 0 1 0-3h.97c.2-.74.49-1.46.87-2.12l-.69-.69A1.5 1.5 0 0 1 5.77 5.57l.69.69A7.03 7.03 0 0 1 8.5 5.47V4.5A1.5 1.5 0 0 1 10 3a1.5 1.5 0 0 1 2 0z" fill="url(#gi-admin)"/><circle cx="12" cy="12" r="3" fill="white" opacity="0.25"/><circle cx="12" cy="12" r="1.5" fill="white" opacity="0.15"/></svg>`)
      },
      // { id: 'leagues', label: 'Leagues', icon: svg('') },
      {
        id: 'profile', label: 'Profile',
        // Person silhouette — indigo-violet gradient
        icon: svg(`<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24"><defs><linearGradient id="gi-profile" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="#818cf8"/><stop offset="100%" stop-color="#7c3aed"/></linearGradient></defs><circle cx="12" cy="8" r="4.5" fill="url(#gi-profile)"/><path d="M3.5 22c0-4.69 3.81-8.5 8.5-8.5s8.5 3.81 8.5 8.5z" fill="url(#gi-profile)"/><circle cx="12" cy="8" r="2" fill="white" opacity="0.25"/></svg>`)
      },
    ];


    // Reactively start/stop the inactivity timer based on login state
    effect(() => {
      const loggedIn = this.authService.isLoggedIn();
      // Once we detect any auth state (logged in or not), loading is done
      this.authLoading.set(false);
      if (loggedIn) {
        this.sessionService.start();
      } else {
        this.sessionService.stop();
      }
    });
  }

  get visibleTabs() {
    if (this.authService.isAdmin()) return this.tabs;
    return this.tabs.filter(t => t.id !== 'admin');
  }

  ngOnInit() {
    this.breakpointObserver
      .observe([Breakpoints.HandsetPortrait, Breakpoints.HandsetLandscape, '(max-width: 768px)'])
      .subscribe(result => {
        this.isMobile.set(result.matches);
      });
  }

  setTab(tab: Tab) {
    if (this.activeTab() === tab) return;
    this.tabSwitching.set(true);
    this.activeTab.set(tab);
    // Brief flash so content feels like a transition
    setTimeout(() => this.tabSwitching.set(false), 200);
  }

  logout() {
    this.sessionService.stop();
    this.authService.logout();
  }
}
