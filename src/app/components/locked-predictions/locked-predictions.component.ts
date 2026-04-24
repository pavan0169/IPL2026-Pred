import { Component, signal, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IplService } from '../../services/ipl.service';
import { AuthService } from '../../services/auth.service';
import { storage, auth } from '../../firebase.config';

@Component({
  selector: 'app-locked-predictions',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './locked-predictions.component.html',
  styleUrl: './locked-predictions.component.css'
})
export class LockedPredictionsComponent implements OnInit, OnDestroy {
  userStats() { return this.iplService.userStats(); }
  matches() { return this.iplService.matches(); }
  predictions() { return this.iplService.predictions(); }
  isSharing = signal(false);
  autoShareMessage = signal<string | null>(null);
  private autoSharedMatches = new Set<string>();
  private readonly ADMIN_PHONE = '17702689332';
  private autoShareTimer: any;
  showActualValues = signal<boolean>(false);

  constructor(public iplService: IplService, public authService: AuthService) { }

  canToggleValues(): boolean {
    return this.authService.currentUser()?.email === 'pavan.tv1999@gmail.com';
  }

  toggleValues() {
    this.showActualValues.update(v => !v);
  }

  ngOnInit() {
    // Check for auto-share every 20 seconds
    this.autoShareTimer = setInterval(() => this.checkAutoShare(), 20000);
    // Initial check after 2 seconds
    setTimeout(() => this.checkAutoShare(), 2000);
  }

  ngOnDestroy() {
    if (this.autoShareTimer) {
      clearInterval(this.autoShareTimer);
    }
  }

  private checkAutoShare() {
    if (this.isSharing()) return;

    const matches = this.activeMatches();
    const now = new Date().getTime();

    for (const match of matches) {
      const startTime = new Date(match.date).getTime();
      const matchId = match.id;

      // Only auto-trigger if the match locked in the LAST 5 MINUTES
      // This prevents old locked matches from popping up whenever you open the app
      const isRecentLock = now >= startTime && now <= (startTime + 5 * 60000);

      if (isRecentLock && !this.autoSharedMatches.has(matchId) && !match.result) {
        console.log(`[Auto-Share] Match ${matchId} recently locked! Triggering automatic share...`);
        this.autoSharedMatches.add(matchId);
        this.autoShareMessage.set(`🏆 Match Locked! Automatically sharing predictions for ${match.team1.shortName} vs ${match.team2.shortName}...`);

        const cardId = `match-card-${matchId}`;
        const cardEl = document.getElementById(cardId);
        if (cardEl) {
          this.shareAsImage(match, cardEl);
        }
        break; // Only trigger one at a time
      }
    }
  }

  activeMatches() {
    const matches = this.matches();
    const now = new Date();
    // Shift time back by 8 hours so "today" definition lasts until 8 AM next day
    const shiftedNow = new Date(now.getTime() - (8 * 60 * 60 * 1000));
    const todayStr = shiftedNow.toDateString();

    // 1. Try to find matches scheduled for today (effective day)
    const todayMatches = matches.filter(m => new Date(m.date).toDateString() === todayStr || m.status === 'live');

    if (todayMatches.length > 0) {
      return todayMatches.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    }

    // 2. Fallback: Find the most recent past match or current interval match
    const getMatchTime = (m: any) => new Date(m.date).getTime();
    const sorted = [...matches].sort((a, b) => getMatchTime(a) - getMatchTime(b));
    const nowMs = now.getTime();

    let baseMatch = null;
    for (let i = 0; i < sorted.length; i++) {
      const start = getMatchTime(sorted[i]);
      const nextStart = i + 1 < sorted.length ? getMatchTime(sorted[i + 1]) : Infinity;
      // If current time is within this match's window or it has a result and it's from today
      if (start <= nowMs && nowMs < nextStart) {
        baseMatch = sorted[i];
        break;
      }
    }

    if (!baseMatch) {
      const past = sorted.filter(m => getMatchTime(m) <= nowMs || !!m.result);
      if (past.length) baseMatch = past[past.length - 1];
    }

    if (!baseMatch) return [];

    const baseDateStr = new Date(baseMatch.date).toDateString();
    return sorted.filter(m => new Date(m.date).toDateString() === baseDateStr);
  }

  isCorrect(match: any, pred: any, category: string): boolean {
    if (!match?.result || !pred) return false;

    if (category === 'score') {
      return Number(pred.team1Score) === Number(match.result.team1Score) &&
        Number(pred.team2Score) === Number(match.result.team2Score);
    }

    const p = IplService.normalizeData(pred);
    const r = IplService.normalizeData(match.result);

    return this.iplService.isStringMatch((p as any)[category], (r as any)[category]);
  }

  getNormalizedValue(data: any, category: string): string {
    if (!data) return '-';
    if (category === 'score') return `${data.team1Score || 0}-${data.team2Score || 0}`;

    const normalized = IplService.normalizeData(data);
    return (normalized as any)[category] || '-';
  }

  getMatchPredictions(matchId: string) {
    const preds = this.predictions().filter(p => p.matchId === matchId);

    return this.userStats().map(user => ({
      user,
      pred: preds.find(p => p.userId === user.userId)
    })).sort((a, b) => a.user.username.localeCompare(b.user.username));
  }

  calculateMatchPoints(match: any, pred: any): number {
    if (!match?.result || !pred) return 0;
    return this.iplService.calcPoints(pred, match.result);
  }

  isTopScorer(match: any, pred: any): boolean {
    if (!match?.result || !pred) return false;
    const currentPts = this.calculateMatchPoints(match, pred);
    if (currentPts === 0) return false; // Don't highlight 0 points

    const allMatchPreds = this.getMatchPredictions(match.id);
    const maxPts = Math.max(...allMatchPreds.map(p => this.calculateMatchPoints(match, p.pred)));

    return currentPts === maxPts;
  }

  getActualPredictionCount(matchId: string) {
    return this.predictions().filter(p => p.matchId === matchId).length;
  }

  isMatchStarted(match: any): boolean {
    if (!match) return false;
    return new Date().getTime() >= new Date(match.date).getTime();
  }

  getTeamName(match: any, tid?: string) {
    if (!match || !tid) return '-';
    if (tid === match.team1.id) return match.team1.shortName;
    if (tid === match.team2.id) return match.team2.shortName;
    return tid;
  }

  formatDate(dateStr: string): string {
    return new Date(dateStr).toLocaleDateString(undefined, { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
  }

  getLockTime(dateStr: string): string {
    const lockTime = new Date(new Date(dateStr).getTime() - 60000);
    return lockTime.toLocaleDateString(undefined, { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
  }

  async shareAsImage(match: any, cardElement: HTMLElement) {
    if (this.isSharing()) return;
    this.isSharing.set(true);

    try {
      // 1. Prepare for capture: add a class to the card to ensure it's fully expanded and clean
      console.log('[Share] Preparing card for capture...');
      cardElement.classList.add('screenshot-mode');

      // Wait a tiny bit for any layout shifts
      await new Promise(r => setTimeout(r, 400));

      // 2. Dynamic Import html2canvas (Robust check)
      console.log('[Share] Loading html2canvas...');
      let h2cModule: any;
      try {
        h2cModule = await import('html2canvas');
      } catch (e) {
        throw new Error('Failed to load capture library. Check your internet connection.');
      }
      const html2canvas = h2cModule.default || h2cModule;

      // 3. Generate Canvas with 15s timeout
      console.log('[Share] Capturing element...');

      const captureOptions: any = {
        scrollX: 0,
        scrollY: 0,
        useCORS: true,
        backgroundColor: '#ffffff',
        logging: false,
        allowTaint: true,
        scale: 2.0, // Retina quality
        windowWidth: 1400, // Force the capture viewport to a desktop size
        onclone: (clonedDoc: Document) => {
          const container = clonedDoc.querySelector('.capture-container') as HTMLElement;
          const tableContainer = clonedDoc.querySelector('.table-container') as HTMLElement;
          const banner = clonedDoc.querySelector('.active-match-banner') as HTMLElement;
          const bannerRow = clonedDoc.querySelector('.banner-row') as HTMLElement;
          const midGroup = clonedDoc.querySelector('.banner-mid-group') as HTMLElement;
          const badge = clonedDoc.querySelector('.participation-badge') as HTMLElement;
          const card = clonedDoc.querySelector('.unified-insights-card') as HTMLElement;

          if (container && tableContainer) {
            // Force containers to expand to show ALL content (no scrolling in screenshot)
            container.style.display = 'flex';
            container.style.flexDirection = 'column';
            container.style.alignItems = 'stretch';
            container.style.width = 'max-content'; // Natural growth
            container.style.minWidth = '1200px';
            container.style.overflow = 'visible';

            tableContainer.style.width = '100%';
            tableContainer.style.overflow = 'visible';

            if (banner && bannerRow) {
              banner.style.width = '100%';
              banner.style.boxSizing = 'border-box';

              bannerRow.style.display = 'flex';
              bannerRow.style.flexDirection = 'row';
              bannerRow.style.alignItems = 'center';
              bannerRow.style.justifyContent = 'space-between';
              bannerRow.style.width = '100%';
              bannerRow.style.gap = '3rem';
              bannerRow.style.flexWrap = 'nowrap';
            }

            if (midGroup) {
              midGroup.style.display = 'flex';
              midGroup.style.flex = '1';
              midGroup.style.justifyContent = 'center';
              midGroup.style.gap = '4rem';
              midGroup.style.flexShrink = '0';
              midGroup.style.width = 'auto';
            }

            // Force points text to be WHITE in screenshot, even if inheritance tries to mess it up
            clonedDoc.querySelectorAll('.player-header-pts').forEach((el: any) => {
              el.setAttribute('style', el.getAttribute('style') + '; color: #ffffff !important; opacity: 1 !important;');
            });
            clonedDoc.querySelectorAll('.pts-tag').forEach((el: any) => {
              el.setAttribute('style', el.getAttribute('style') + '; color: #ffffff !important; opacity: 1 !important;');
            });

            const lockCallout = clonedDoc.querySelector('.match-lock-callout') as HTMLElement;
            if (lockCallout) {
              lockCallout.style.width = '100%';
              lockCallout.style.boxSizing = 'border-box';
              lockCallout.style.display = 'flex';
              lockCallout.style.justifyContent = 'center';
              lockCallout.style.alignItems = 'center';
              lockCallout.style.padding = '1rem';
            }

            if (badge) {
              badge.style.position = 'static';
              badge.style.flexShrink = '0';
              badge.style.marginLeft = '3rem';
            }

            if (card) {
              card.style.width = '1400px';
              card.style.minWidth = '1400px';
              card.style.maxWidth = 'none';
            }

            // Disable sticky columns in the clone because html2canvas breaks them
            clonedDoc.querySelectorAll('.sticky-col').forEach((el: any) => {
              el.style.position = 'static';
              el.style.borderRight = '1px solid #eee';
            });
          }
          // Hide elements we DON'T want in the picture
          clonedDoc.querySelectorAll('.swipe-hint, .btn-share-card, .sharing-overlay').forEach((el: any) => el.style.display = 'none');
        }
      };

      // Measure the actual scrollWidth to ensure the canvas is wide enough
      // We use a small timeout to let any 'screenshot-mode' CSS apply if needed
      const capturePromise = (html2canvas as any)(cardElement, captureOptions);

      const canvas = await Promise.race([
        capturePromise,
        new Promise((_, reject) => setTimeout(() => reject(new Error('Capture timed out (15s)')), 15000))
      ]) as HTMLCanvasElement;

      console.log('[Share] Canvas generated.');
      cardElement.classList.remove('screenshot-mode');

      // 4. Convert to Blob
      console.log('[Share] Converting to blob...');
      const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, 'image/png', 0.9));
      if (!blob) throw new Error('Failed to create image blob');

      const fileName = `IPL2026_Match${match.id.substring(1)}_${Date.now()}.png`;
      const file = new File([blob], fileName, { type: 'image/png' });

      // 5. PRIORITY 1: Try Native Share (Mobile/Supported Desktop)
      console.log('[Share] Attempting Native Share...');

      const shareDate = new Date(match.date).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
      const matchNum = match.id.substring(1);
      const shareTitle = `🏆 IPL 2026 Locked Predictions`;
      const shareText = `🏆 IPL 2026 Locked Predictions on ${shareDate}\n🏏 ${match.team1.shortName} vs ${match.team2.shortName} (Match ${matchNum})`;

      if (navigator.share) {
        try {
          const shareData: any = {
            files: [file],
            title: shareTitle,
            text: shareText
          };

          if (!navigator.canShare || navigator.canShare(shareData)) {
            await navigator.share(shareData);
            console.log('[Share] Native share successful.');
            return; // Success! Exit early.
          }
        } catch (sErr) {
          console.warn('[Share] Native share supported but failed/cancelled.', sErr);
        }
      }

      // 6. PRIORITY 2: Fallback to Firebase Storage Upload
      console.log('[Share] Falling back to Firebase upload...');
      let downloadURL = '';
      try {
        const storageTools = await import('firebase/storage');
        const { ref: storageRef, uploadBytes, getDownloadURL } = storageTools;
        const screenshotRef = storageRef(storage, `screenshots/${match.id}/${fileName}`);

        const uploadPromise = uploadBytes(screenshotRef, blob);
        const uploadResult = await Promise.race([
          uploadPromise,
          new Promise((_, reject) => setTimeout(() => reject(new Error('Upload timed out')), 15000))
        ]);

        downloadURL = await getDownloadURL((uploadResult as any).ref);
        console.log('[Share] Upload complete:', downloadURL);
      } catch (uErr) {
        // 7. PRIORITY 3: Fallback to Manual Download + WhatsApp message
        console.warn('[Share] Firebase upload failed - probably security rules. Using manual fallback...', uErr);

        // Trigger manual download
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = fileName;
        link.click();

        alert('Ready to Share! ✅\n\nI have DOWNLOADED the predictions to your device. Just attach the image to the WhatsApp chat that is about to open!');
      }

      // Final Step: Open WhatsApp to Admin (wa.me is being replaced by api.whatsapp.com for better auto-launch)
      const shareMessage = encodeURIComponent(`${shareText}\n\n${downloadURL ? 'View results: ' + downloadURL : '(See attached image)'}`);
      const waUrl = `https://api.whatsapp.com/send?phone=${this.ADMIN_PHONE}&text=${shareMessage}`;

      console.log('[Share] Opening WhatsApp messenger...');
      if (!window.open(waUrl, '_blank')) {
        window.location.href = waUrl;
      }

      console.log('[Share] Complete.');

    } catch (err: any) {
      console.error('Error sharing image:', err);
      alert(`Share failed: ${err.message || 'Unknown error'}`);
    } finally {
      this.isSharing.set(false);
      this.autoShareMessage.set(null); // Reset auto-share feedback
      cardElement.classList.remove('screenshot-mode');
    }
  }

  getPlayerGradient(username: string): string {
    const gradients = [
      'linear-gradient(135deg, #8b5cf6, #6d28d9)', // Indigo/Violet
      'linear-gradient(135deg, #ec4899, #be185d)', // Pink/Rose
      'linear-gradient(135deg, #3b82f6, #1d4ed8)', // Blue/Sky
      'linear-gradient(135deg, #f59e0b, #b45309)', // Orange/Amber
      'linear-gradient(135deg, #10b981, #047857)', // Teal/Emerald
      'linear-gradient(135deg, #06b6d4, #0891b2)', // Cyan/Teal
      'linear-gradient(135deg, #ef4444, #b91c1c)', // Red/Crimson
      'linear-gradient(135deg, #a855f7, #7e22ce)', // Violet/Fuchsia
      'linear-gradient(135deg, #fbbf24, #d97706)', // Yellow/Amber
      'linear-gradient(135deg, #6366f1, #4338ca)', // Indigo/Blue
      'linear-gradient(135deg, #475569, #1e293b)', // Slate/Carbon (Unique for Annamalai)
    ];

    if (!username) return gradients[0];

    // Simple hash to map username to a consistent index
    let hash = 0;
    for (let i = 0; i < username.length; i++) {
      hash = username.charCodeAt(i) + ((hash << 5) - hash);
    }
    // Manual overrides to avoid orange/green for specific users who requested it
    if (username.toLowerCase() === 'kalyan') return gradients[0]; // Indigo
    if (username.toLowerCase() === 'valliappan') return gradients[1]; // Pink/Rose
    if (username.toLowerCase() === 'annamalai') return gradients[10]; // Slate/Carbon

    const index = Math.abs(hash) % gradients.length;
    return gradients[index];
  }

  getPointsBadgeStyle(username: string): string {
    // Reverting to the premium amber/orange gradient for all users as requested
    return 'linear-gradient(135deg, #f59e0b, #d97706)';
  }

  getTeamColor(shortName: string): string {
    const code = (shortName || '').toUpperCase();
    // Return unique, high-contrast colors that are NOT green, orange, or black
    const colorMap: Record<string, string> = {
      'CSK': '#2563eb', // Blue
      'MI': '#0ea5e9',  // Sky
      'RCB': '#db2777', // Pink
      'KKR': '#6366f1', // Indigo (Instead of Dark Purple)
      'DC': '#06b6d4',  // Cyan
      'SRH': '#ef4444', // Red (Instead of Orange)
      'RR': '#d946ef',  // Fuchsia
      'PBKS': '#f43f5e', // Rose
      'LSG': '#8b5cf6', // Violet
      'GT': '#0284c7'   // Light Blue (Instead of Black)
    };
    return colorMap[code] || '#6366f1';
  }
}
