import { Pokemon } from '../Game/pokemon.js';
import type { Move } from '../Game/Moves/move.js';
import { TryApplyStatus } from './StatusSystem.js';
import type { VolatileStatus } from './VolatileStatus.js';

// 트리거 타입 정의: 언제 호출되었는가?
export type EffectTrigger = 'OnUse' | 'OnHit' | 'OnBasePower';

interface AbilityLogic {
    // 대부분의 경우 user, target을 구분해서 받지 않고, "적용 대상(target)" 하나만 받음
    Execute(target: Pokemon, data: any, damage?: number, source?: Pokemon): void;
    // 객기, 베놈쇼크: 한쪽만 검사 | 자이로볼, 히트스탬프: 쌍방 검사라 user랑 target 구분할 필요 있음
    GetPowerMultiplier?(target: Pokemon, user: Pokemon, data: any) : number;
}

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
    ): void 
{
    
    if (!move.effects) return;

    for (const entry of move.effects) // effects가 effect의 배열이니 foreach로 내용물 확인
    { 
        
        // 1. [필터링] 타이밍 체크
        // JSON에 타이밍이 적혀있는데, 지금 시점과 다르면 스킵!
        // (타이밍이 안 적혀있으면 '항상 발동'으로 간주하거나, 기본값 설정)
        const entryTiming = entry.timing || 'OnHit'; // 기본값은 상황에 따라
        if (entryTiming !== currentTiming) continue;

        // 2. 확률 체크
        const chance = entry.chance ?? 100;
        if (Math.random() * 100 > chance) continue;

        // 3. 타겟 결정 (JSON 데이터 기반)
        // entry.target이 'Self'면 attacker, 'Enemy'면 defender
        // 기본값: OnUse는 Self, OnHit은 Enemy로 설정하면 편함
        let actualTarget = defender; 
        if (entry.target === 'Self') {
            actualTarget = attacker;
        } else if (entry.target === 'Enemy') {
            actualTarget = defender;
        } else {
             // 타겟 명시가 없으면 타이밍에 따라 관례적으로 처리 (일단 무조건 포함하도록 짜긴 했는데 )
             actualTarget = (currentTiming === 'OnUse') ? attacker : defender; 
             console.log("[ProcessMoveEffects]: 부가효과의 타겟이 명시되어 있지 않음.")
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
// 위력 보정 전용 함수 (number 반환)
// =========================================================
export function GetPowerMultiplier(
    move: Move, 
    target: Pokemon, 
    user: Pokemon
): number {
    let multiplier = 1.0;
    
    if (!move.effects) return multiplier;

    for (const entry of move.effects) {
        // 타이밍이 OnBasePower인 것만 찾음
        if (entry.timing !== 'OnBasePower') continue;

        const logic = AbilityRegistry[entry.type];
        // 해당 로직에 GetPowerMultiplier 메서드가 있으면 실행
        if (logic && logic.GetPowerMultiplier) {

            let subject = target; // 기본적으로는 target
            if (entry.target === 'Self') {
                subject = user;
            }

            // ★ 여기서 user와 target을 둘 다 넘겨줌
            const result = logic.GetPowerMultiplier(subject, user, entry.data);
            multiplier *= result;
        }
    }
    return multiplier;
}


// =========================================================
// 레지스트리 (Registry)
// 기술의 effect(문자열)와 실제 로직을 매핑
// =========================================================

const AbilityRegistry: { [key: string]: AbilityLogic } = {

    // 1. 상태이상 계열 (Status Effects)
    "PAR": { 
        Execute: (target) => {
            if (!target.types.includes("Electric")) 
                TryApplyStatus(target, "BRN");
        }
    },
    "BRN": {
        Execute: (target) => {
            if (!target.types.includes("Fire")) 
                TryApplyStatus(target, "BRN");
        }
    },
    "PSN": {
        Execute: (target) => {
            if (!target.types.includes("Poison") && !target.types.includes("Steel")) 
                TryApplyStatus(target, "PSN");
        }
    },

    // 2. 랭크 변화 (Stat Change)
    "StatChange": {
        Execute: (target, data) => {
            // 1. 데이터가 없으면 리턴
            if (!data) return;

            // 2. ★ 배열인지 확인 (껍질깨기 같은 경우)
            if (Array.isArray(data)) {
                // 배열이면 내부를 돌면서 하나씩 적용
                data.forEach(item => {
                    target.modifyRank(item.stat, item.value);
                    console.log(`📊 ${target.name}의 ${item.stat} ${item.value}랭크 변화!`);
                });
            } 
            // 3. ★ 단일 객체인지 확인 (울음소리 같은 경우)
            else {
                // 배열이 아니면 그냥 바로 적용
                target.modifyRank(data.stat, data.value);
                console.log(`📊 ${target.name}의 ${data.stat} ${data.value}랭크 변화!`);
            }
        }
    },

    "AddVolatile": {
        Execute: (target, data, damage, user) => {
            const status: VolatileStatus = {
                typeId: data.id,
                source: user,
                duration: data.duration,
            };
            target.addVolatile(data.id, status);
        }
    },

    // 반동 (반동은 무조건 '나'에게 데미지를 줌 -> JSON에서 target: "Self" 설정 필수)
    "Recoil": {
        Execute: (target, data, damage) => {
            const ratio = data?.recoilRate || 0;
            if (damage && damage > 0) 
            {
                console.log("[moveAbility]/[Recoil]: 반동으로 피해를 입었다!");
                target.takeDamage(Math.floor(damage * ratio));
            } 
                
            
        }
    },

    "Drain": {
        Execute: (target, data, damage) => {
            const ratio = data?.drainRate || 0;
            if (damage && damage > 0) 
                target.recoverHp(Math.floor(damage * ratio));
        }
    },

    "Recover": {
        Execute: (target, data) => {
            const ratio = data?.recoverRate || 0;
            target.recoverHp(Math.floor(target.maxHp * ratio));
        }
    },

    "StateCheck": { // 객기, 병상첨병, 베놈쇼크, 근성(특성)
        Execute: () => {},
        GetPowerMultiplier : (target, _, data) => {
            const stateType = data?.targetState || "every";
            const multiplier = data?.multiplier || 1.0;
            if ((target.status !== null && stateType === "every" ) || target.status === stateType)
            {
                console.log(`[moveAbility]/[StateCheck]: 기술 위력 ${multiplier}배 적용!`);
                return multiplier;
            }
            return 1.0;
        }
    }
};
