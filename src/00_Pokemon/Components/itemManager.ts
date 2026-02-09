import { Pokemon } from "../0_pokemon.js";
import { ItemRegistry } from "../../04_Ability/ItemAbilities.js";
import type { Move } from "../../01_Moves/move.js";

export class ItemManager {
    private owner: Pokemon;
    public currentId: string | null = null;

    constructor(owner: Pokemon, itemId?: string)
    {
        this.owner = owner;
        this.currentId = itemId || null;
        this.Init();
    }
    Init() // 메서드는 발동 순서대로 정렬하는게 좋은 것 같아
    {
        if (!this.currentId) return;
        const logic = ItemRegistry[this.currentId];
        if (logic && logic.Init) logic.Init(this.owner);
    }


    GetDamageMod(move: any, currentPower: number): number {
        if (!this.currentId) return 1.0;
            
        const logic = ItemRegistry[this.currentId];
        if (logic && logic.OnDamageMod) {
            return logic.OnDamageMod(this.owner, move, currentPower);
        }
        return 1.0; // 특성 없으면 배율 1.0
    }

    OnAfterAttack(target: Pokemon, move: Move, damageDealt: number) : void
    {
        if (!this.currentId) return;
            
        const logic = ItemRegistry[this.currentId];
        if (logic && logic.OnAfterAttack) {
            logic.OnAfterAttack(this.owner, target, move, damageDealt);
        }
        
    }

    
    OnTurnEnd() 
    {
        if (!this.currentId) return;
        const logic = ItemRegistry[this.currentId];
        if (logic && logic.OnTurnEnd) logic.OnTurnEnd(this.owner);
    }

    OnTakeOff(newId: string | null = null) // 없는거는 탁떨이나 도둑질, 소모 매커니즘인거고 있는거는 트릭 같은 경우인거고 
    {
        if (!this.currentId) return;
        const logic = ItemRegistry[this.currentId];
        if (logic && logic.OnTakeOff) logic.OnTakeOff(this.owner);
        this.currentId = newId;
    }
    // ...
}