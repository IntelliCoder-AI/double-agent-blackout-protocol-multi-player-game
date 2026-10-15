import type { Point } from './world';
export type Phase='lobby'|'reveal'|'investigation'|'discussion'|'vote'|'runoff'|'results';
export type Mode='social'|'coop';
export type Role='agent'|'traitor';
export interface PlayerView extends Point { id:string; name:string; color:string; ready:boolean; connected:boolean; room:string; score:number }
export interface ClueView { id:string; title:string; summary:string; kind:string; value:string; candidates?:string[]; verified:boolean; discrepancy?:string; sharedBy?:string; originalValue?:string }
export interface LinkView { id:string; from:string; to:string; label:string; explanation:string; author:string }
export interface ChannelView { kind:string; target:string; endsAt:number }
export interface ResultView { winner:'agents'|'traitor'|'draw'|'none'; reason:string; culprit:string; roles:{id:string;role:Role}[]; forged:string[]; audit:ClueView[]; timeline:{text:string;at:number}[] }
export interface PublicRoom { code:string; mode:Mode; hostId:string; phase:Phase; roundId:string|null; deadline:number|null; serverTime:number; players:PlayerView[]; suspects:{id:string;name:string}[]; board:ClueView[]; links:LinkView[]; repairs:Record<string,{step:number;complete:boolean;jammedUntil:number}>; jammed:Record<string,number>; chat:{id:string;name:string;text:string;at:number}[]; exfil:{endsAt:number}|null; elapsed:number; paused:boolean; pauseRemaining:number; dossier:boolean; result:ResultView|null; roundNumber:number; ruleHint:string; runoffTargets:string[] }
export interface SelfView { id:string; role:Role|null; clues:ClueView[]; grants:string[]; charges:number; cooldownUntil:number; channel:ChannelView|null; vote:string|null; voteSubmitted:boolean; abilitiesUsed:string[] }
export interface Snapshot { type:'snapshot'; room:PublicRoom|null; self:SelfView|null; serverTime:number }
export interface Command { id:string; type:string; roundId?:string|null; payload?:Record<string,unknown> }
