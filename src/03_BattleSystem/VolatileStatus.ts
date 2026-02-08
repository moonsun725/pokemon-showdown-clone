import { Pokemon } from '../00_Pokemon/0_pokemon.js';

export interface VolatileStatus {
    typeId: string;       // 상태 ID (예: "LeechSeed", "Confusion", "Flinch")
    source?: Pokemon | undefined;   // 시전자 (씨뿌리기 회복 대상 등을 위해 필요)
    duration?: number;  // 남은 턴 수 (-1이면 무한)
    data?: any;         // 기타 데이터 (김밥말이 데미지, 앵콜된 기술 등)
    // 이 상태가 매 턴 종료시 하는 행동 (선택 사항)
    // 물론 Registry에서 처리해도 되지만, 데이터를 들고 있는 쪽이 편할 때도 있음
}

export interface VolatileLogic {
    // 효과 부여 시점
    Init?(status: VolatileStatus, data?: any): void
    // 턴 시작 전 행동 불능 체크 (풀죽음, 혼란, 잠듦 등)
    OnBeforeMove?(pokemon: Pokemon, volatileData: any): boolean; 
    
    // 턴 종료 시 효과 (씨뿌리기, 김밥말이, 멸망의노래 등)
    OnTurnEnd?(pokemon: Pokemon, volatileData: any): void;
    
    // 맞았을 때 발동 (울퉁불퉁멧 효과 등)
    OnBeingHit?(pokemon: Pokemon, attacker: Pokemon, damage: number): void;
}

export const VolatileRegistry: { [key: string]: VolatileLogic } = {
    
    // 1. 씨뿌리기 로직
    "LeechSeed": {
        OnTurnEnd: (pokemon, data) => {
            const source = data.source; // 건 사람
            if (!source || source.hp <= 0) return;

            const drain = Math.floor(pokemon.Stats.maxHp / 8);
            pokemon.Stats.takeDamage(drain);
            source.recoverHp(drain);
            console.log(`🌿 ${pokemon.name}의 체력을 흡수했다!`);
        }
    },

    // 2. 풀죽음 (Flinch)
    "Flinch": {
        OnBeforeMove: (pokemon) => {
            console.log(`😫 ${pokemon.name}는 풀죽어서 움직일 수 없다!`);
            // 풀죽음은 1턴만 지속되므로 여기서 바로 지워줘도 됨 (혹은 duration 관리)
            pokemon.volatileList.Remove("Flinch"); 
            return false; // 행동 불가!
        }
    },

    // 3. 혼란 (Confusion)
    "Confusion": {
        Init: (status, data) =>{
            const wakeTurn = Math.floor(Math.random() * (data.duration)) + 1;
            status.duration = wakeTurn;
        },
        OnBeforeMove: (pokemon) => {
            console.log(`🌀 ${pokemon.name}는 혼란에 빠져 있다!`);
            
            // 33% 확률로 자해
            if (Math.random() < 0.33) {
                console.log(`💥 자신을 공격하고 말았다!`);
                pokemon.useMove(5, pokemon);
                return false; // 행동 불가
            }
            return true; // 행동 가능
        },
    }

};