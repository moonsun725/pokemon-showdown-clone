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
    OnHit(target: Pokemon, move: Move, user: Pokemon): void;
    OnEndMove(user: Pokemon, move: Move): void;
}

// 기본값 (Null Object Pattern) - 구현하지 않은 메서드는 아무 일도 안 함
const DefaultAbility: MoveAbility = {
    OnUse: () => {},
    OnHit: () => {},
    OnEndMove: () => {}
};

// =========================================================
// 메인 실행 함수 (Dispatcher)
// =========================================================
export function ApplyEffect(move: Move, target: Pokemon, user: Pokemon, trigger: EffectTrigger): void {
    
    // 1. 기술에 효과(effect)가 정의되어 있는지 확인
    if (!move.effect) return;

    // 2. 확률 체크 (OnUse는 보통 100%지만, 데이터에 chance가 있다면 반영)
    // chance가 undefined면 100%로 간주
    const chance = move.chance ?? 100;
    if (Math.random() * 100 > chance) return;

    // 3. 레지스트리에서 해당 효과의 로직 가져오기
    const logic = AbilityRegistry[move.effect];

    if (logic) {
        // 4. Trigger(타이밍)에 맞는 메서드 실행
        if (trigger === 'OnUse') {
            logic.OnUse(user, move);
        } else if (trigger === 'OnHit') {
            logic.OnHit(target, move, user);
        }
    } else {
        console.warn(`⚠️ [MoveAbility] 구현되지 않은 효과 스크립트: ${move.effect}`);
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
    }
};
