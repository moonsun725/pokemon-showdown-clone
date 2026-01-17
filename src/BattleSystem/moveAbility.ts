// BattleSystem/moveAbilities.ts
import { Pokemon } from '../Game/pokemon.js';
import { TryApplyStatus } from './StatusSystem.js'; // ★ 분리된 로직 호출

// 인터페이스 유지
export interface MoveAbility {
    OnHit(target: Pokemon): void;
    // OnUse, OnEndMove 등은 필요할 때 구현
}

// =========================================================
// 레지스트리 (Registry)
// 기술의 효과(Effect)가 실제로 하는 일을 정의
// =========================================================
const AbilityRegistry: { [scriptName: string]: MoveAbility } = {
    
    // 1. 상태이상 계열 (Status Effects)
    // 직접 status = "PAR" 하지 않고, 매니저에게 위임함
    "paralysis": {
        OnHit: (target: Pokemon) => {
            console.log("⚡ 기술 효과: 마비 시도 중...");
            TryApplyStatus(target, "PAR"); 
        }
    },
    "burn": {
        OnHit: (target: Pokemon) => {
            console.log("🔥 기술 효과: 화상 시도 중...");
            TryApplyStatus(target, "BRN");
        }
    },
    "poison": {
        OnHit: (target: Pokemon) => {
            console.log("☠️ 기술 효과: 독 시도 중...");
            TryApplyStatus(target, "PSN");
        }
    },

    // 2. 나중에 생길 비-상태이상 계열 (Non-Status Effects)
    // 예: 랭크 다운, 반동 데미지 등은 여기서 직접 처리하거나 StatSystem 호출
    /*
    "lower_defense": {
        OnHit: (target: Pokemon) => {
            target.modifyRank("def", -1);
        }
    }
    */
};

// =========================================================
// 메인 실행 함수
// =========================================================
export function ApplyEffect(scriptKey: string, chance: number, target: Pokemon): void {
    
    // 1. 확률 체크 (Move의 영역)
    const random = Math.random() * 100;
    if (random > chance) return;

    // 2. 레지스트리에서 스크립트 실행
    const ability = AbilityRegistry[scriptKey];
    if (ability) {
        ability.OnHit(target);
    } else {
        // 만약 레지스트리에 없는데 scriptKey가 "PAR" 같은 상태 태그라면
        // 바로 StatusSystem으로 넘겨버리는 숏컷을 만들 수도 있음 (선택사항)
        console.warn(`[MoveAbility] 구현되지 않은 스크립트: ${scriptKey}`);
    }
}