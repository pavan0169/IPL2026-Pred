import { Injectable, signal, effect } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class ThemeService {
    isDark = signal<boolean>(this.getStoredTheme());

    constructor() {
        effect(() => {
            const dark = this.isDark();
            if (typeof document !== 'undefined') {
                document.body.classList.toggle('dark', dark);
            }
            if (typeof localStorage !== 'undefined') {
                localStorage.setItem('ipl-theme', dark ? 'dark' : 'light');
            }
        });
        // Apply immediately on init
        if (typeof document !== 'undefined') {
            document.body.classList.toggle('dark', this.isDark());
        }
    }

    toggle() {
        this.isDark.update(v => !v);
    }

    private getStoredTheme(): boolean {
        if (typeof localStorage === 'undefined') return false;
        const stored = localStorage.getItem('ipl-theme');
        if (stored) return stored === 'dark';
        return window.matchMedia?.('(prefers-color-scheme: dark)').matches ?? false;
    }
}
