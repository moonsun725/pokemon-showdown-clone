import type { Pokemon } from "./pokemon.js";

export class BattleStateManager 
{
    owner: Pokemon;
    status: string | null;
    constructor(owner: Pokemon)
    {
        this.owner = owner;
        this.status = null;
    }
    reset()
    {
        this.status = null;
    }
}