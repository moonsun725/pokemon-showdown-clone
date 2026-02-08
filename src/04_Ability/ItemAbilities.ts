// src/Game/Components/ItemManager.ts
import { Pokemon } from "../00_Pokemon/0_pokemon.js"; 

export interface ItemLogic {
    name: string;
    
    // 타이밍별 훅
    OnTurnEnd?(owner: Pokemon): void; // 먹다남은음식
    OnDamageCalc?(owner: Pokemon, damage: number): number; // 생명의구슬
    // 아이템은 소모성일 수 있으므로 제거 메서드 필요할 수도 있음
}

export const ItemRegistry: { [id: string]: ItemLogic } = {
    "Leftovers": { // 먹다남은음식
        name: "먹다남은음식",
        OnTurnEnd: (owner) => {
            if (owner.Stats.hp < owner.Stats.maxHp) {
                const recovery = Math.floor(owner.Stats.maxHp / 16);
                owner.recoverHp(recovery);
                console.log(`🍎 [Item] ${owner.name}은(는) 먹다남은음식으로 회복했다.`);
            }
        }
    }
};