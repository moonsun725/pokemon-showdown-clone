// src/Game/Components/ItemManager.ts
import { Pokemon } from "../00_Pokemon/0_pokemon.js";
import { type Move } from "../01_Moves/move.js"; 

export interface ItemLogic {
    name: string;
    
    // 타이밍별 훅
    Init?(owner: Pokemon): void // 항시 발동
    OnTurnEnd?(owner: Pokemon): void; // 먹다남은음식
    OnDamageCalc?(owner: Pokemon, damage: number): number; // 생명의구슬, 돌격조끼
    // 아이템은 소모성일 수 있으므로 제거 메서드 필요할 수도 있음
    FixedMove?() : boolean
    OnTakeOff?(owner: Pokemon) : void
    OnDamageMod?(owner: Pokemon, move: Move, currentPower: number) : number
    OnAfterAttack?(owner: Pokemon, target: Pokemon, move: Move, damageDealt: number) : void
}

export const ItemRegistry: { [id: string]: ItemLogic } = {
    "Leftovers": { // 먹다남은음식
        name: "먹다남은음식",
        OnTurnEnd: (owner) => {
            if (owner.Stats.hp < owner.Stats.maxHp) {
                const recovery = Math.floor(owner.Stats.maxHp / 16);
                owner.recoverHp(recovery);
                console.log(`🍎 [Item] ${owner.name}은(는) 먹다남은음식으로 조금 회복했다.`);
            }
        }
    },
    "Choice_Scarf" : {
        name: "구애스카프",
        Init: (owner) => {
            owner.Stats.Stats.spe = Math.floor(owner.Stats.Stats.spe * 1.5);
        },
        FixedMove: () => {
            return true;
        },
        OnTakeOff: (owner) => {
            owner.Stats.Stats.spe = Math.floor(owner.Stats.Stats.spe / 1.5);
        },
    },
    "Life_Orb" : {
        name: "생명의구슬",
        OnDamageMod: (owner, _, __) => {
            return 1.3;
        },
        // 2. 공격 후: 실제로 맞췄을 때만 반동 << 크으 이걸놓쳤네
        OnAfterAttack: (owner, target, move, damageDealt) => {
            // 데미지를 0보다 크게 입혔을 때만 반동
            if (damageDealt > 0 && move.category !== "Status") {
                const recoil = Math.floor(owner.Stats.maxHp / 10);
                owner.takeDamage(recoil);
                console.log(`🔴 [Item] 생명의구슬 반동! ${recoil} 데미지.`);
            }
        }
    }
    
};