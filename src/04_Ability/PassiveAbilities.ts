// src/Game/Components/AbilityManager.ts
import { Pokemon } from "../00_Pokemon/0_pokemon.js"; 

// 특성 로직 인터페이스 (필요한 메서드만 구현하면 됨)
export interface AbilityLogic {
    name: string;
    description?: string;
    
    // 타이밍별 훅 (Hooks)
    OnSwitchIn?(owner: Pokemon): void; // 위협
    OnTurnEnd?(owner: Pokemon): void;  // 가속
    OnDamageCalc?(owner: Pokemon, damage: number): number; // 천하장사 (데미지 보정)
}

// 특성 레지스트리 (여기에 로직 추가)
export const AbilityRegistry: { [id: string]: AbilityLogic } = {
    "SpeedBoost": { // 가속
        name: "가속",
        OnTurnEnd: (owner) => {
            owner.Rank.modifyRank("spe", 1);
            console.log(`🚀 [Ability] ${owner.name}의 가속! 스피드가 올랐다.`);
        }
    },
    "Intimidate": { // 위협 (구현 예시)
        name: "위협",
        OnSwitchIn: (owner) => {
            console.log(`🦁 [Ability] ${owner.name}의 위협!`);
            // 실제로는 room.ts에서 상대방을 찾아야 해서 여기서 구현하기 좀 까다로움 (나중에 처리)
        }
    }
};