import { Component, Input, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
    selector: 'app-cricket-loader',
    standalone: true,
    imports: [CommonModule],
    template: `
        <div class="cl-container" [class.cl-sm]="size === 'sm'" [class.cl-lg]="size === 'lg'">
            <!-- Stumps background -->
            <div class="cl-stumps">
                <div class="cl-stump"></div>
                <div class="cl-stump"></div>
                <div class="cl-stump"></div>
                <div class="cl-bail cl-bail-l"></div>
                <div class="cl-bail cl-bail-r"></div>
            </div>

            <!-- Spinning cricket ball -->
            <div class="cl-ball-wrap">
                <div class="cl-ball">
                    <div class="cl-seam"></div>
                </div>
                <div class="cl-glow"></div>
            </div>

            <!-- Text -->
            @if (size !== 'sm') {
            <div class="cl-text">{{ phrases[currentPhrase] }}</div>
            }
        </div>
    `,
    styles: [`
        .cl-container {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            gap: 1.2rem;
            padding: 2rem 1rem;
            user-select: none;
        }

        .cl-container.cl-sm {
            gap: 0.6rem;
            padding: 1rem 0.5rem;
        }

        .cl-container.cl-lg {
            gap: 1.6rem;
            padding: 3rem 1rem;
            min-height: 50vh;
        }

        /* ---- Stumps ---- */
        .cl-stumps {
            position: relative;
            width: 36px;
            height: 48px;
            display: flex;
            gap: 4px;
            justify-content: center;
            align-items: flex-end;
            opacity: 0.35;
            animation: cl-stumpsAppear 0.8s ease both;
        }

        .cl-sm .cl-stumps {
            width: 24px;
            height: 32px;
            gap: 3px;
        }

        .cl-stump {
            width: 3px;
            height: 100%;
            background: var(--text-muted);
            border-radius: 2px;
        }

        .cl-sm .cl-stump { width: 2px; }

        .cl-bail {
            position: absolute;
            top: -2px;
            width: 14px;
            height: 3px;
            background: var(--text-muted);
            border-radius: 2px;
        }

        .cl-sm .cl-bail { width: 10px; height: 2px; }

        .cl-bail-l {
            left: 2px;
            transform: rotate(-8deg);
        }

        .cl-bail-r {
            right: 2px;
            transform: rotate(8deg);
        }

        /* ---- Ball ---- */
        .cl-ball-wrap {
            position: relative;
            display: flex;
            align-items: center;
            justify-content: center;
        }

        .cl-ball {
            width: 40px;
            height: 40px;
            border-radius: 50%;
            background: radial-gradient(circle at 35% 35%, #dc2626, #991b1b 70%, #7f1d1d);
            position: relative;
            animation: cl-spin 1.4s cubic-bezier(0.45, 0.05, 0.55, 0.95) infinite;
            box-shadow: 0 0 20px rgba(220, 38, 38, 0.35), inset 0 -3px 6px rgba(0,0,0,0.3);
            z-index: 2;
        }

        .cl-sm .cl-ball {
            width: 28px;
            height: 28px;
        }

        .cl-seam {
            position: absolute;
            width: 100%;
            height: 100%;
            border-radius: 50%;
            border: 2px dashed rgba(255, 255, 255, 0.5);
            transform: rotateX(60deg);
        }

        .cl-glow {
            position: absolute;
            width: 56px;
            height: 56px;
            border-radius: 50%;
            background: radial-gradient(circle, rgba(220, 38, 38, 0.25), transparent 70%);
            animation: cl-pulse 1.8s ease-in-out infinite;
            z-index: 1;
        }

        .cl-sm .cl-glow {
            width: 40px;
            height: 40px;
        }

        /* ---- Text ---- */
        .cl-text {
            font-family: 'Outfit', sans-serif;
            font-weight: 600;
            font-size: 0.88rem;
            letter-spacing: 0.04em;
            color: var(--text-muted);
            animation: cl-fadeText 0.5s ease both;
            text-align: center;
        }

        /* ---- Keyframes ---- */
        @keyframes cl-spin {
            0%   { transform: rotate(0deg) scale(1); }
            25%  { transform: rotate(90deg) scale(1.08); }
            50%  { transform: rotate(180deg) scale(1); }
            75%  { transform: rotate(270deg) scale(0.95); }
            100% { transform: rotate(360deg) scale(1); }
        }

        @keyframes cl-pulse {
            0%, 100% { opacity: 0.4; transform: scale(1); }
            50%      { opacity: 0.8; transform: scale(1.3); }
        }

        @keyframes cl-stumpsAppear {
            from { opacity: 0; transform: translateY(10px); }
            to   { opacity: 0.35; transform: translateY(0); }
        }

        @keyframes cl-fadeText {
            from { opacity: 0; transform: translateY(6px); }
            to   { opacity: 1; transform: translateY(0); }
        }
    `]
})
export class CricketLoaderComponent implements OnInit, OnDestroy {
    @Input() size: 'sm' | 'md' | 'lg' = 'md';
    @Input() message?: string;

    phrases = [
        '🏏 Taking guard...',
        '🎳 Bowling in...',
        '🏟️ Setting the field...',
        '⚡ Powering up...',
        '🎯 Reading the pitch...',
        '🦁 Warming up...',
        '📊 Crunching numbers...',
        '🔥 Firing up...',
    ];

    currentPhrase = 0;
    private intervalId: any;

    ngOnInit() {
        if (this.message) {
            this.phrases = [this.message];
        }
        this.currentPhrase = Math.floor(Math.random() * this.phrases.length);
        this.intervalId = setInterval(() => {
            this.currentPhrase = (this.currentPhrase + 1) % this.phrases.length;
        }, 2200);
    }

    ngOnDestroy() {
        clearInterval(this.intervalId);
    }
}
