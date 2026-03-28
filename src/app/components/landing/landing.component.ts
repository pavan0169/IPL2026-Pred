import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../services/auth.service';
import { ThemeService } from '../../services/theme.service';

type AuthMode = 'landing' | 'login' | 'signup' | 'phone';

@Component({
    selector: 'app-landing',
    standalone: true,
    imports: [CommonModule, FormsModule],
    templateUrl: './landing.component.html',
    styleUrl: './landing.component.css'
})
export class LandingComponent {
    mode = signal<AuthMode>('landing');

    // Login
    loginEmail = signal('');
    loginPassword = signal('');
    loginError = signal('');
    loginLoading = signal(false);

    // Signup
    signupName = signal('');
    signupEmail = signal('');
    signupPassword = signal('');
    signupConfirm = signal('');
    signupError = signal('');
    signupLoading = signal(false);

    // Phone
    phoneNumber = signal('');
    phoneCode = signal('');
    phoneStep = signal<1 | 2>(1);
    phoneError = signal('');
    phoneLoading = signal(false);

    features = [
        { icon: '🏏', title: 'Match Predictions', desc: 'Pick winners and predict scores for every IPL match' },
        { icon: '🏆', title: 'Live Leaderboard', desc: 'Compete with others and track your ranking in real time' },
        { icon: '⚡', title: 'Live Match Updates', desc: 'Follow live match statuses and results instantly' },
        { icon: '🎯', title: 'Scoring System', desc: 'Earn points based on prediction accuracy' },
    ];

    constructor(public authService: AuthService, public themeService: ThemeService) { }

    goTo(m: AuthMode) {
        this.mode.set(m);
        this.loginError.set('');
        this.signupError.set('');
        this.phoneError.set('');
        this.phoneStep.set(1);

        if (m === 'phone') {
            setTimeout(() => {
                this.authService.setupRecaptcha('recaptcha-container');
            }, 100);
        }
    }

    async onLogin() {
        this.loginLoading.set(true);
        this.loginError.set('');
        const result = await this.authService.login(this.loginEmail(), this.loginPassword());
        this.loginLoading.set(false);
        if (!result.success) this.loginError.set(result.error || 'Login failed.');
    }

    async onSignup() {
        if (this.signupPassword() !== this.signupConfirm()) {
            this.signupError.set('Passwords do not match.');
            return;
        }
        this.signupLoading.set(true);
        this.signupError.set('');
        const result = await this.authService.signup(this.signupName(), this.signupEmail(), this.signupPassword());
        this.signupLoading.set(false);
        if (!result.success) this.signupError.set(result.error || 'Signup failed.');
    }

    async onGoogleLogin() {
        this.loginLoading.set(true);
        const res = await this.authService.loginWithGoogle();
        this.loginLoading.set(false);
        if (!res.success) this.loginError.set(res.error || 'Google Login failed');
    }

    async onPhoneLogin() {
        if (!this.phoneNumber()) return;
        this.phoneLoading.set(true);
        this.phoneError.set('');
        const res = await this.authService.sendPhoneCode(this.phoneNumber());
        this.phoneLoading.set(false);
        if (res.success) {
            this.phoneStep.set(2);
        } else {
            this.phoneError.set(res.error || 'Failed to send SMS');
        }
    }

    async onPhoneVerify() {
        if (!this.phoneCode()) return;
        this.phoneLoading.set(true);
        this.phoneError.set('');
        const res = await this.authService.verifyPhoneCode(this.phoneCode());
        this.phoneLoading.set(false);
        if (!res.success) {
            this.phoneError.set(res.error || 'Invalid code');
        }
    }

    private delay(ms: number) {
        return new Promise(r => setTimeout(r, ms));
    }
}
