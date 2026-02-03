import type { Pokemon } from "./pokemon.js";

export interface IPokemonData {
    name: string;
    hp: number;
    atk: number;
    //def: number;
    //spa: number;
    //spd: number;
    spe: number;
    type: string[];
}

// src/Game/Components/StatsManager.ts
export class StatsManager {
    // 1. 기본 데이터 (Base Stats)
    private baseStats: IPokemonData;
    private owner: Pokemon;
    // 2. 현재 배틀 중인 수치 (Actual Stats)
    public hp: number;
    public maxHp: number;
    public atk: number;
    public types: string[]; // 나중에 물붓기 같은 기술 생각하면 동적으로 다뤄야 함...
    // ... def, spa, spd, spe 등등

    constructor(data: IPokemonData, owner: Pokemon) {
        this.baseStats = data;
        this.owner = owner;
        
        // (나중에 여기에 개체값/노력치 반영 공식 추가 가능)
        this.maxHp = data.hp; // (ex: data.hp * 2 + 110 ...)
        this.hp = this.maxHp;
        this.atk = data.atk;
        this.types = data.type;
        // ...
    }

    // 데미지 받을 때 HP 처리 등도 여기서? 아니면 포켓몬 클래스에서?
    // 보통 HP 관리는 여기서 메서드로 제공하는 게 깔끔함
    takeDamage(amount: number): boolean {
        this.hp -= amount;
        if (this.hp < 0) this.hp = 0;
        return this.hp === 0; // 기절 여부 반환
    }

    recoverHp(amount: number) : void
    {
        this.hp += amount;
        if(this.hp > this.maxHp) 
           this.hp = this.maxHp;
        console.log(`[pokemon]/[recoverHp]: ${this.baseStats.name}의 남은 HP: ${this.hp}`);
    }

    reset() : void
    {
        this.hp = this.maxHp;
        this.atk = this.baseStats.atk; // 종족값도 랭크에 따라서 실수치가 올라가는거라 리셋은 해줘야됨
        this.types = this.baseStats.type;
        console.log("[statManager]: 전투상태 초기화 완료")
    }
}