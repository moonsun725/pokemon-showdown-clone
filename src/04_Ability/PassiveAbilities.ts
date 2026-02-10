// src/Game/Components/AbilityManager.ts
import { Pokemon } from "../00_Pokemon/0_pokemon.js"; 
import { type Move } from "../01_Moves/0_move.js";

// 특성 로직 인터페이스 (필요한 메서드만 구현하면 됨)
export interface AbilityLogic {
    name: string;
    description?: string;
    
    // 타이밍별 훅 (Hooks)
    OnSwitchIn?(owner: Pokemon): void; // 위협
    OnTurnEnd?(owner: Pokemon): void;  // 가속
    OnDamageCalc?(owner: Pokemon, damage: number): number; // 천하장사 (데미지 보정)
    OnAttacked?(owner: Pokemon, move: Move) : boolean // 공격받았을 때(저수, 타불, 부유 등)
    OnGetContact?(owner: Pokemon, attacker: Pokemon) : void
    OnTakeDamage?(owner: Pokemon, damage: number) : void
    OnDamageMod?(owner: Pokemon, move: Move, currentPower: number) : number
    OnStatBoost?(owner: Pokemon, field: any, weather: any) : number // 쓱쓱 이런거 필드나 날씨는 아직 안만들었으니까 any 처리하고
}

// 특성 레지스트리 (여기에 로직 추가)
export const AbilityRegistry: { [id: string]: AbilityLogic } = {
    "SpeedBoost": { // 가속
        name: "가속",
        OnTurnEnd: (owner) => {
            owner.Rank.modifyRank("spe", 1);
            console.log(`🚀 [Ability] ${owner.name}의 가속 \n ${owner.name}의 스피드가 올랐다.`);
        }
    },
    "Intimidate": { // 위협 (구현 예시)
        name: "위협",
        OnSwitchIn: (owner) => {
            console.log(`🦁 [Ability] ${owner.name}의 위협!`);
            // 실제로는 room.ts에서 상대방을 찾아야 해서 여기서 구현하기 좀 까다로움 (나중에 처리)
        }
    },
    "Static" : {
        name: "정전기",
        OnGetContact: (owner, attacker) => {
            console.log(`🦁 [Ability] ${owner.name}의 위협!`);
            attacker.tryApplyStatus("PAR");
        },
    },
    "Overgrow": {
        name: "심록",
        OnDamageMod: (owner, move, _) => {
            // 1. HP가 1/3 이하인지 확인
            if (owner.Stats.hp <= owner.Stats.maxHp / 3) {
                // 2. 풀 타입 기술인지 확인
                if (move.type === "Grass") {
                    console.log(`🌿 ${owner.name}의 심록\n 기술 위력이 올라갔다!`);
                    return 1.5; // 1.5배
                }
            }
            return 1.0;
        }
    },
    "Technician": {
        name: "테크니션",
        OnDamageMod: (owner, move, power) => {
            // 1. HP가 1/3 이하인지 확인
            if (power <= 60) {
                // 2. 풀 타입 기술인지 확인
                return 1.5;
            }
            return 1.0;
        }
    },
    "Guts" : {
        name: "근성",
        
    }
};