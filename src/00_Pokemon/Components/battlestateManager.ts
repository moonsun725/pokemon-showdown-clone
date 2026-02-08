import type { Pokemon } from "../0_pokemon.js";

export class BattleStateManager 
{
    owner: Pokemon;
    private status: string;
    public lockedMoveIndex: number | null = null;
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
        this.Set("Normal");
        this.lockedMoveIndex = null;
    }
    // ... (기존 코드) ...

    setLock(index: number) {
        this.lockedMoveIndex = index;
        console.log(`🔒 ${this.owner.name}의 행동이 ${index}번 기술로 고정되었습니다.`);
    }

    unlock() {
        this.lockedMoveIndex = null;
        console.log(`🔓 ${this.owner.name}의 행동 고정이 풀렸습니다.`);
    }

    isLocked(): boolean {
        return this.lockedMoveIndex !== null;
    }
    
}