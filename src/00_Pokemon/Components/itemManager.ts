import { Pokemon } from "../0_pokemon.js";
import { ItemRegistry } from "../../04_Ability/ItemAbilities.js";

export class ItemManager {
    private owner: Pokemon;
    public currentId: string | null = null;

    constructor(owner: Pokemon, itemId?: string) {
        this.owner = owner;
        this.currentId = itemId || null;
    }

    OnTurnEnd() {
        if (!this.currentId) return;
        const logic = ItemRegistry[this.currentId];
        if (logic && logic.OnTurnEnd) logic.OnTurnEnd(this.owner);
    }
    
    // ...
}