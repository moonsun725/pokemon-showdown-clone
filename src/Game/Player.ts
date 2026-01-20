import { Pokemon} from './pokemon.js';
import type { Move } from './pokemon.js'
// (나중에 아이템 클래스도 import 필요)

export class Player {
    public id: string;           // 플레이어 이름 or ID
    public party: Pokemon[];     // 소지 포켓몬 (최대 6마리)
    public activePokemon: Pokemon; // 현재 필드에 나와있는 포켓몬 (포인터 역할)

    constructor(id: string, entry: Pokemon[]) {
        this.id = id;
        
        // 1. 엔트리 복사 (Deep Copy 권장, 일단은 그냥 할당)
        this.party = entry;

        // 2. 선봉 설정 (배열의 0번째가 선봉)
        if (this.party.length > 0) {
            this.activePokemon = this.party[0]!; // >< 임시처리
            console.log(`[System] ${this.id}의 선봉: ${this.activePokemon.name}`);
        } else {
            throw new Error("포켓몬 엔트리가 비어있습니다!");
        }
    }

    // 포켓몬 교체 메서드
    switchPokemon(index: number): boolean {
        const target = this.party[index];

        // 예외 처리: 없는 인덱스 or 이미 기절함 or 지금 나와있는 놈임
        if (!target) return false;
        if (target.hp <= 0) return false;
        if (target === this.activePokemon) return false;

        console.log(`🔄 [Switch] ${this.id}: ${this.activePokemon.name} -> ${target.name} 교체!`);
        
        // ★ 교체 로직 (포인터 변경)
        // 여기서 '랭크 초기화' 같은 로직이 들어가야 함 (나중에 구현)
        this.activePokemon = target; 
        
        return true;
    }


    // 패배 체크 (파티 전멸 확인)
    isDefeated(): boolean {
        // 모든 포켓몬의 HP가 0 이하면 패배
        return this.party.every(p => p.status == "FNT");
    }

    hasRemainingPokemon(): boolean
    {
        return !this.party.every(p => p.status == "FNT");
    }
}