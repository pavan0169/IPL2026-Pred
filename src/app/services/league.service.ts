import { Injectable, signal } from '@angular/core';
import { League, LeagueInvitation } from '../models/ipl.models';
import { db } from '../firebase.config';
import { collection, doc, setDoc, onSnapshot, updateDoc, arrayUnion, arrayRemove, deleteDoc } from 'firebase/firestore';
import { AuthService } from './auth.service';

@Injectable({ providedIn: 'root' })
export class LeagueService {
    private _leagues = signal<League[]>([]);
    leagues = this._leagues.asReadonly();

    constructor(private authService: AuthService) {
        if (typeof window !== 'undefined') {
            this.initFirestore();
        }
    }

    private initFirestore() {
        onSnapshot(collection(db, 'leagues'), (snapshot) => {
            const loaded = snapshot.docs.map(d => d.data() as League);
            this._leagues.set(loaded);
        });
    }

    getLeagues(): League[] {
        return this._leagues();
    }

    getLeagueById(id: string): League | undefined {
        return this._leagues().find(l => l.id === id);
    }

    async createLeague(name: string): Promise<League | null> {
        const currentUser = this.authService.currentUser();
        if (!currentUser || !currentUser.uid) return null;

        const id = this.generateId();
        const newLeague: League = {
            id,
            name,
            ownerId: currentUser.uid,
            memberIds: [currentUser.uid],
            createdAt: new Date().toISOString()
        };
        await setDoc(doc(db, 'leagues', id), newLeague);
        return newLeague;
    }

    async joinLeague(leagueId: string): Promise<boolean> {
        const currentUser = this.authService.currentUser();
        if (!currentUser || !currentUser.uid) return false;

        const ref = doc(db, 'leagues', leagueId);
        await updateDoc(ref, {
            memberIds: arrayUnion(currentUser.uid)
        });
        return true;
    }

    async leaveLeague(leagueId: string): Promise<boolean> {
        const currentUser = this.authService.currentUser();
        if (!currentUser || !currentUser.uid) return false;

        const league = this._leagues().find(l => l.id === leagueId);
        if (!league) return false;

        const ref = doc(db, 'leagues', leagueId);
        if (league.ownerId === currentUser.uid && league.memberIds.length === 1) {
            await deleteDoc(ref);
        } else {
            await updateDoc(ref, {
                memberIds: arrayRemove(currentUser.uid)
            });
        }
        return true;
    }

    private generateId(): string {
        return Math.random().toString(36).substr(2, 9);
    }
}
