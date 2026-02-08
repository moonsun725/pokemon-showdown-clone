import { Pokemon } from "../0_pokemon.js";
import { ItemRegistry } from "../../04_Ability/ItemAbilities.js";

export class ItemManager {
    private owner: Pokemon;
    public currentId: string | null = null;

    constructor(owner: Pokemon, itemId?: string)
    {
        this.owner = owner;
        this.currentId = itemId || null;
        this.Init();
    }

    Init() 
    {
        if (!this.currentId) return;
        const logic = ItemRegistry[this.currentId];
        if (logic && logic.Init) logic.Init(this.owner);
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