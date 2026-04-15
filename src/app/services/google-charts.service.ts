import { Injectable } from '@angular/core';

/**
 * Lightweight service that dynamically loads the Google Charts library
 * from CDN. Avoids npm dependency issues with Angular 21.
 *
 * Usage:
 *   await this.googleCharts.ready;
 *   const chart = new google.visualization.LineChart(element);
 */
@Injectable({ providedIn: 'root' })
export class GoogleChartsService {
    private _ready: Promise<void> | null = null;

    /** Resolves when google.visualization is available */
    get ready(): Promise<void> {
        if (!this._ready) {
            this._ready = this.load();
        }
        return this._ready;
    }

    private load(): Promise<void> {
        return new Promise((resolve, reject) => {
            // Skip in SSR
            if (typeof window === 'undefined' || typeof document === 'undefined') {
                reject(new Error('Google Charts requires a browser environment'));
                return;
            }

            // If google.charts is already available (script was already injected)
            if ((window as any).google?.charts) {
                (window as any).google.charts.load('current', { packages: ['corechart'] });
                (window as any).google.charts.setOnLoadCallback(() => resolve());
                return;
            }

            // Inject the loader script
            const script = document.createElement('script');
            script.src = 'https://www.gstatic.com/charts/loader.js';
            script.async = true;
            script.defer = true;

            script.onload = () => {
                (window as any).google.charts.load('current', { packages: ['corechart'] });
                (window as any).google.charts.setOnLoadCallback(() => resolve());
            };

            script.onerror = () => reject(new Error('Failed to load Google Charts'));

            document.head.appendChild(script);
        });
    }
}
