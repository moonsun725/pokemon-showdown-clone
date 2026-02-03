// mechanics.ts
import { Pokemon } from '../00_Pokemon/pokemon.js';
// Move 인터페이스가 pokemon.ts에 export 되어 있다고 가정 (안 되어 있으면 추가 필요)
import type { Move } from '../01_Moves/move.js'; 
import { GetPowerMultiplier } from './moveAbility.js';
import getTypeEffectiveness from './typeChart.js';
import { RankToMultiplier } from './Rank.js';

interface DamageResult {
    damage: number;
    isCritical: boolean;
    effectiveness: number; // 0, 0.25, 0.5, 1, 2, 4 등
}

export function calculateDamage(attacker: Pokemon, defender: Pokemon, move: Move): DamageResult {
    
    let basePower = move.power!;
    const powerModifier = GetPowerMultiplier(move, defender, attacker); 
    basePower *= powerModifier;
    let isCritical =  false;


    let Tmultiplier = 1.0;
        defender.Stats.types.forEach((defType) => {
            const eff = getTypeEffectiveness(move.type, defType);
            Tmultiplier *= eff;
        });

        let Rmultiplier = RankToMultiplier(attacker.Rank.rank.atk); // 공격 랭크 넣고 돌려
        let realAtk = Math.floor(attacker.Stats.atk * Rmultiplier); // 공격자 보정치
        console.log(`[DamageCalc]: 공격자 보정 공격력: ${realAtk} (원래: ${attacker.Stats.atk}, 랭크 배율: ${Rmultiplier})`);

        let realDef = 10; // 임시 초깃값

        // 자속보정
        let STAB = 1.0;
        if (attacker.Stats.types.includes(move.type)) {
            STAB = 1.5; // 동일 타입 공격 보너스
        }

        // 데미지 계산
        
        let baseDamage = Math.floor(basePower! * realAtk / realDef / 50); // 어차피 usemove에서 다 검증하고 보내주니까 power는 null일 수가 없다고 내가 말해줘야지...
        console.log(`[DamageCalc]: 기본 데미지 (보정 전): ${baseDamage}`);
        baseDamage = Math.floor(baseDamage * Tmultiplier); // ★ 상성에 따른 배율 적용
        baseDamage = Math.floor(baseDamage * STAB); // ★ 자속 보정 적용
        console.log(`[DamageCalc]: 기본 데미지 계산 완료: ${baseDamage} (상성 배율: ${Tmultiplier}, 자속 보정: ${STAB})`);
        if (baseDamage < 1) baseDamage = 1; // 최소 데미지 보정

    return {
        damage: baseDamage,
        isCritical: isCritical,
        effectiveness: Tmultiplier
    };
}