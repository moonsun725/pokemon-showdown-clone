import { Pokemon } from "../00_Pokemon/0_pokemon.js";
import { type Move } from "../01_Moves/move.js";
import { TryApplyStatus } from "../03_BattleSystem/StatusSystem.js";
import type { VolatileStatus } from '../03_BattleSystem/VolatileStatus.js';

export interface AbilityLogic {
    // 대부분의 경우 user, target을 구분해서 받지 않고, "적용 대상(target)" 하나만 받음
    Execute(target: Pokemon, data: any, damage?: number, source?: Pokemon, move?: Move): boolean | void;
    // 객기, 베놈쇼크: 한쪽만 검사 | 자이로볼, 히트스탬프: 쌍방 검사라 user랑 target 구분할 필요 있음
    GetPowerMultiplier?(target: Pokemon, user: Pokemon, data: any) : number;
}
// =========================================================
// 레지스트리 (Registry)
// 기술의 effect(문자열)와 실제 로직을 매핑
// =========================================================

export const AbilityRegistry: { [key: string]: AbilityLogic } = {

    // 1. 상태이상 계열 (Status Effects)
    "PAR": { 
        Execute: (target) => {
            if (!target.Stats.types.includes("Electric")) 
                TryApplyStatus(target, "BRN");
        }
    },
    "BRN": {
        Execute: (target) => {
            if (!target.Stats.types.includes("Fire")) 
                TryApplyStatus(target, "BRN");
        }
    },
    "PSN": {
        Execute: (target) => {
            if (!target.Stats.types.includes("Poison") && !target.Stats.types.includes("Steel")) 
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
                    target.Rank.modifyRank(item.stat, item.value);
                    console.log(`📊 ${target.name}의 ${item.stat} ${item.value}랭크 변화!`);
                });
            } 
            // 3. ★ 단일 객체인지 확인 (울음소리 같은 경우)
            else {
                // 배열이 아니면 그냥 바로 적용
                target.Rank.modifyRank(data.stat, data.value);
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
            target.volatileList.Add(data.id, status);
        }
    },

    // 반동 (반동은 무조건 '나'에게 데미지를 줌 -> JSON에서 target: "Self" 설정 필수)
    "Recoil": {
        Execute: (target, data, damage) => {
            const ratio = data?.recoilRate || 0;
            if (damage && damage > 0) 
            {
                console.log("[moveAbility]/[Recoil]: 반동으로 피해를 입었다!");
                target.Stats.takeDamage(Math.floor(damage * ratio));
            } 
                
            
        }
    },

    "Drain": {
        Execute: (target, data, damage) => {
            const ratio = data?.drainRate || 0;
            if (damage && damage > 0) 
                target.Stats.recoverHp(Math.floor(damage * ratio));
        }
    },

    "Recover": {
        Execute: (target, data) => {
            const ratio = data?.recoverRate || 0;
            target.Stats.recoverHp(Math.floor(target.Stats.maxHp * ratio));
        }
    },

    "StateCheck": { // 객기, 병상첨병, 베놈쇼크, 근성(특성)
        Execute: () => {},
        GetPowerMultiplier : (target, _, data) => {
            const stateType = data?.targetState || "every";
            const multiplier = data?.multiplier || 1.0;
            if ((target.BattleState.Get() !== null && stateType === "every" ) || target.BattleState.Get() === stateType)
            {
                console.log(`[moveAbility]/[StateCheck]: 기술 위력 ${multiplier}배 적용!`);
                return multiplier;
            }
            return 1.0;
        }
    },

    "TwoTurn": { // 두 턴 기술 (솔라빔, 공중날기 등)
        Execute: (target, data, _, __, move) => {
            // target은 JSON 설정에 따라 'Self'(나)로 들어옴
            const chargeId = data.chargeId; // 예: "SolarBeam_Charge"
            const msg = data.msg || "기을(를) 모으고 있다!";

            // 1. 이미 충전 상태인지 확인
            if (target.volatileList.Has(chargeId)) {
                // 충전 완료! 상태를 지우고 공격 진행 (true)
                target.volatileList.Remove(chargeId);
                console.log(`✨ [TwoTurn] ${target.name}의 공격 충전 완료!`);
                return true; 
            } 
            // 2. 충전 상태가 아님 -> 충전 시작하고 공격 중단 (false)
            else {
                // 충전 상태 부여 (지속시간 2턴: 이번턴 + 다음턴)
                target.volatileList.Add(chargeId, { 
                    typeId: chargeId, 
                    duration: 2, 
                    data: { lockedMove: true } // 행동 고정
                });
                console.log(`✨ ${target.name}는 ${msg}`);
                if (move)
                {
                    const moveIndex = target.moves.list.findIndex(m => m.def.name === move.name);
                    if (moveIndex !== -1) 
                        target.BattleState.setLock(moveIndex);
                
                }
                return false; // 기술 중단하도록 false 반환
            }
            
        }
    }
};