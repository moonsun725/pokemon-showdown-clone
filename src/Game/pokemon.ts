import data_M from '../Data/moves.json' with { type: 'json' };
import data_P from '../Data/pokedex.json' with { type: 'json' };
import getTypeEffectiveness from '../BattleSystem/typeChart.js';
import type { Rank } from '../BattleSystem/Rank.js';
import { RankToMultiplier } from '../BattleSystem/Rank.js';
import { calculateDamage } from '../BattleSystem/dmgCalc.js';

// 1. 기술 인터페이스 정의 (C++의 struct 역할)
export interface Move {
    name: string;
    power: number;
    type: string;
    accuracy: number | null; // 명중률 추가 (null은 명중률이 없는 기술)
    category: string; // 물리, 특수, 상태 구분(현재 사용 x)
}

export class Pokemon {
    public name: string;
    public hp: number;
    public maxHp: number;
    public atk: number;
    // 2. 기술 배열 추가 (C++의 std::vector<Move> 느낌)
    public moves: Move[] = [];

    // 26-01-15. 스피드 항목 추가
    public speed: number;
    // 26-01-15. 타입 항목 추가
    public types: string[] = [];

    public Rank: Rank = {
        atk: 0, 
        def: 0, 
        spd: 0,
        satk: 0,
        sdef: 0,
        acc: 0,
        eva: 0,
    }

    constructor(name: string, hp: number, atk: number, speed: number, types: string[]) 
    {
        this.name = name;
        this.hp = hp;
        this.maxHp = hp;
        this.atk = atk;
        this.speed = speed || 10; // 기본값 처리
        this.types = types; 
        for(var i = 0; i<4; i++)
        {
            this.learnMove(data_M.moves[i]!);
        }
    }

    // 상태 확인 메서드
    showCurrent(): void{
        console.log(`이름: ${this.name}, 체력: ${this.hp}, 공격 종족값: ${this.atk}`);
        this.moves.forEach(element => {
            if (element == null){
                throw new Error('더 이상 배운 기술이 없습니다!');
            }
            console.log("기술명:", element.name, "공격 타입:", element.type, "기술 위력:", element.power);
        });
    }

    // 기술 배우기 메서드
    learnMove(move: Move): void {
        this.moves.push(move);
        console.log(`${this.name}이(가) [${move.name}]을(를) 배웠다!`);
    }

    // 특정 기술로 공격하기
    useMove(moveIndex: number, target: Pokemon,): void {
        const move = this.moves[moveIndex];
        if (!move) {
            console.log("잘못된 기술 선택입니다.");
            return;
        }

        console.log(`[Battle] ${this.name}의 ${move.name} 공격!`);
        if (!this.CheckAcuracy(move, target)) {
            console.log(`상대 ${target.name}에게는 맞지 않았다!`);
            return;
        }

        let DMGRes = calculateDamage(this, target, move);

        let effectivenessMsg = "";
        if (DMGRes.effectiveness > 1) effectivenessMsg = " (효과가 굉장했다!)";
        if (DMGRes.effectiveness < 1 && DMGRes.effectiveness > 0) effectivenessMsg = " (효과가 별로인 듯하다...)";
        if (DMGRes.effectiveness === 0) effectivenessMsg = " (효과가 없다!)";
        console.log(`${effectivenessMsg}`);

        // 피해 적용
        target.takeDamage(DMGRes.damage);
        
    }

    modifyRank(stat: keyof Rank, amount: number): void {
        this.Rank[stat] += amount;
        
        // 작성하신 clamp 로직을 여기에 적용 (이미 잘 짜셨습니다!)
        this.Rank[stat] = Math.max(-6, Math.min(6, this.Rank[stat]));
        
        console.log(`${this.name}의 ${stat} 랭크가 ${this.Rank[stat]}이 되었다!`);
    }

    takeDamage(amount: number): void {
        this.hp -= amount;
        console.log(`${this.name}의 남은 HP: ${this.hp}`);
    }

    CheckAcuracy(move: Move, target: Pokemon): boolean {
        
        if (move.accuracy === null) {
            return true; // 명중률이 없는 기술은 항상 명중
        }
        else {
            // 명중률 계산 (간단한 예시)
            const random = Math.random() * 100;
            return random < move.accuracy;
        }
        
    }
}

// 2025-12-31
/*
// --- 실행부 ---
const pikachu = new Pokemon("피카츄", 100, 20);
const thunderbolt: Move = { name: "10만볼트", power: 90, type: "ELECTRIC" };

pikachu.learnMove(thunderbolt);
pikachu.useMove(0, pikachu); // 자기 자신 테스트 혹은 다른 객체 생성
*/

// 2026-01-06
// 데이터를 기반으로 포켓몬 생성 (C++의 팩토리 패턴과 유사)
export function createPokemon(name: string): Pokemon {
    // 1. JSON 데이터에서 이름이 일치하는 포켓몬 찾기 (C++의 find_if와 유사)
    const pData = data_P.pokedex.find(p => p.name === name);

    if (!pData) {
        throw new Error(`${name}을(를) 도감에서 찾을 수 없습니다.`);
    }

    // 2. 찾은 데이터로 객체 생성 및 반환
    return new Pokemon(pData.name, pData.hp, pData.atk, pData.speed, pData.type);
}


// 테스트용 코드
/*
try {
    const myPika = createPokemon("피카츄");
    const enemyChari = createPokemon("파이리");

    console.log(`배틀 시작: ${myPika.name} vs ${enemyChari.name}`);
    
    // 기술 데이터도 JSON에서 가져와 배우게 할 수 있습니다.
    
    const thunderMove = data.moves[0]!; // >< 예외처리 안 하겠다 선언(프로토타이핑)
    myPika.learnMove(thunderMove);
    myPika.showCurrent();
    enemyChari.showCurrent();

    myPika.useMove(0, enemyChari);
} catch (e) {
    console.error(e);
}
    */