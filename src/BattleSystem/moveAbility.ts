import { Pokemon } from '../Game/pokemon.js';
import type { Move } from '../Game/Moves/move.js';
import { TryApplyStatus } from './StatusSystem.js';

// 트리거 타입 정의: 언제 호출되었는가?
export type EffectTrigger = 'OnUse' | 'OnHit';

// 인터페이스 정의
export interface MoveAbility {
    // 기술을 시전하자마자 발동 (주로 사용자 대상, 명중 여부 무관)
    OnUse(user: Pokemon, move: Move): void;
    
    // 기술이 명중했을 때 발동 (주로 피격자 대상)
    OnHit(target: Pokemon, move: Move, user: Pokemon, damage: number): void;
    OnAfterAttack(user: Pokemon, move: Move): void;
}

// 기본값 (Null Object Pattern) - 구현하지 않은 메서드는 아무 일도 안 함
const DefaultAbility: MoveAbility = {
    OnUse: () => {},
    OnHit: () => {},
    OnAfterAttack: () => {}
};

// =========================================================
// 메인 실행 함수 (Dispatcher)
// =========================================================
// src/Game/Ability/moveAbility.ts

export function ProcessMoveEffects(
    move: Move, 
    defender: Pokemon, // target (맞는 쪽)
    attacker: Pokemon, // user (쓰는 쪽)
    currentTiming: EffectTrigger, // 현재 시점 ('OnUse' or 'OnHit')
    damage: number = 0
): void {
    
    if (!move.effects) return;

    for (const entry of move.effects) {
        
        // 1. [필터링] 타이밍 체크
        // JSON에 타이밍이 적혀있는데, 지금 시점과 다르면 스킵!
        // (타이밍이 안 적혀있으면 '항상 발동'으로 간주하거나, 기본값 설정)
        const entryTiming = entry.timing || 'OnHit'; // 기본값은 상황에 따라
        if (entryTiming !== currentTiming) continue;

        // 2. 확률 체크
        const chance = entry.chance ?? 100;
        if (Math.random() * 100 > chance) continue;

        // 3. [중요] 타겟 결정 (JSON 데이터 기반)
        // entry.target이 'Self'면 attacker, 'Enemy'면 defender
        // 기본값: OnUse는 Self, OnHit은 Enemy로 설정하면 편함
        let actualTarget = defender; 
        if (entry.target === 'Self') {
            actualTarget = attacker;
        } else if (entry.target === 'Enemy') {
            actualTarget = defender;
        } else {
             // 타겟 명시가 없으면 타이밍에 따라 관례적으로 처리
             actualTarget = (currentTiming === 'OnUse') ? attacker : defender;
        }

        // 4. 로직 실행
        const logic = AbilityRegistry[entry.type];
        if (logic) {
            // 이제 로직에게 "누구한테(actualTarget)" 할지만 알려주면 됨
            logic.Execute(actualTarget, entry.data, damage); 
        }
    }
}

// =========================================================
// 레지스트리 (Registry)
// 기술의 effect(문자열)와 실제 로직을 매핑
// =========================================================
const AbilityRegistry: { [key: string]: MoveAbility } = {

    // 1. 상태이상 계열 (Status Effects)
    // OnHit 타이밍에 StatusSystem을 호출하여 상태 부여 시도
    "PAR": { ...DefaultAbility, OnHit: (t) => { 
        if(t.types.includes("Electric")) return;
        TryApplyStatus(t, "PAR"); } },
    "BRN": { ...DefaultAbility, OnHit: (t) => { 
        if(t.types.includes("Fire")) return; 
        TryApplyStatus(t, "BRN"); } },
    "PSN": { ...DefaultAbility, OnHit: (t) => { 
        if(t.types.includes("Poison") || t.types.includes("Steel")) return;
        TryApplyStatus(t, "PSN"); } },

    // 2. 랭크 변화 (Stat Change)
    // OnUse(내 버프)와 OnHit(상대 디버프)를 모두 처리하는 범용 로직
    "StatChange": {
        ...DefaultAbility,

       // ① OnUse: 내 스탯 변화 (selfChanges가 있을 때만)
        OnUse: (user: Pokemon, move: Move) => {
            const d = move.effectdata;
            if (d && d.selfChanges) {
                console.log(`💪 [OnUse] ${user.name}의 스탯 변화!`);
                d.selfChanges.forEach(c => {
                    // @ts-ignore
                    user.modifyRank(c.stat, c.value);
                    console.log(`   └ 사용자 ${c.stat} ${c.value}랭크`);
                });
            }
        },

        // ② OnHit: 적 스탯 변화 (targetChanges가 있을 때만)
        OnHit: (target: Pokemon, move: Move, user: Pokemon) => {
            const d = move.effectdata;
            if (d && d.targetChanges) {
                console.log(`📉 [OnHit] ${target.name}에게 디버프 적용!`);
                d.targetChanges.forEach(c => {
                    // @ts-ignore
                    target.modifyRank(c.stat, c.value);
                    console.log(`   └ 적 ${c.stat} ${c.value}랭크`);
                });
            }
        }
    
    },

    "Recoil": {
        ...DefaultAbility, // 기본값 먼저 깔아두기
        OnHit: (target: Pokemon, move: Move, user: Pokemon, damage: number) =>{
            user.takeDamage(damage)
        }
    }

};
