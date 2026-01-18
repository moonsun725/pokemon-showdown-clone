//moveAbility.ts

import { calculateDamage } from "../src/BattleSystem/dmgCalc.js";

{
    export interface MoveAbility {
        OnUse(user: Pokemon): void;
        OnHit(target: Pokemon): void;
        OnDamageCalc(damage: number): number;
        OnEndMove(user: Pokemon): void;
    }
}
//passiveAbility.ts

{
    export interface passiveAbility {
        OnUse(user: Pokemon): void;
        OnHit(target: Pokemon): void;
        OnDamageCalc(damage: number): number;
        OnEndMove(user: Pokemon): void;
    }
}
// StatusSystem.ts

{
    export interface StatusSystem {
        OnUse(user: Pokemon): void;
        OnHit(target: Pokemon): void;
        OnDamageCalc(damage: number): number;
        OnEndMove(user: Pokemon): void;
    }
}

// room.ts
{
    StartTurn();
    MainTurn();
    Endturn();
}

MainTurn(): void{
    TryMove();
    UseMove();
    CheckAcuracy();
    HitMove(attcker, defender, move);
    AfterHit();
}

TryMove(attacker, move): void {
    if (attacker.canMove()) {
        // 계속 진행
    }
}

UseMove(attacker, defender, move): void {
    attacker.useMove(move, defender);
    attacker.moveAbility.OnUse(attacker);
    attacker.passiveAbility.OnUse(attacker);
    attacker.Status.OnUse(attacker);
}

HitMove(attacker, defender, move): void {
    calculateDamage(attacker, defender, move);
}

AfterHit(): void {
    defender.takeDamage()
    attacker.MoveAbility.OnHit();
    defender.MoveAbility.OnTakeDamage();
    move.OnHit();
}
//