import type { Pokemon } from "./pokemon.js";

export class BattleStateManager 
{
    owner: Pokemon;
    private status: string;
    constructor(owner: Pokemon)
    {
        this.owner = owner;
        this.status = "Normal";
    }
    Set(state: string)
    {
        this.status = state;
    }
    Get() : string
    {
        return this.status;
    }
    reset()
    {
        this.Set("Normal")
    }
    
}