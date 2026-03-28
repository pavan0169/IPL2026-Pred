import { Injectable, NgZone } from '@angular/core';
import { AuthService } from './auth.service';

const INACTIVITY_LIMIT_MS = 20 * 60 * 1000; // 20 minutes

@Injectable({ providedIn: 'root' })
export class SessionService {
    private timer: ReturnType<typeof setTimeout> | null = null;
    private boundReset = this.resetTimer.bind(this);

    constructor(private authService: AuthService, private ngZone: NgZone) { }

    /** Call once from AppComponent after the user is confirmed logged-in */
    start() {
        this.attachListeners();
        this.scheduleLogout();
    }

    /** Call when user logs out (or on destroy) to clean up listeners and timer */
    stop() {
        this.clearTimer();
        this.detachListeners();
    }

    private attachListeners() {
        const events = ['mousemove', 'keydown', 'click', 'scroll', 'touchstart'];
        events.forEach(e => window.addEventListener(e, this.boundReset, { passive: true }));
    }

    private detachListeners() {
        const events = ['mousemove', 'keydown', 'click', 'scroll', 'touchstart'];
        events.forEach(e => window.removeEventListener(e, this.boundReset));
    }

    private resetTimer() {
        this.clearTimer();
        this.scheduleLogout();
    }

    private scheduleLogout() {
        // Run outside Angular zone so the timer doesn't trigger unnecessary CD cycles
        this.ngZone.runOutsideAngular(() => {
            this.timer = setTimeout(() => {
                this.ngZone.run(() => {
                    if (this.authService.isLoggedIn()) {
                        this.stop();
                        this.authService.logout();
                    }
                });
            }, INACTIVITY_LIMIT_MS);
        });
    }

    private clearTimer() {
        if (this.timer) {
            clearTimeout(this.timer);
            this.timer = null;
        }
    }
}
