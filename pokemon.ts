import data from './data.json' with { type: 'json' };

// 1. 기술 인터페이스 정의 (C++의 struct 역할)
export interface Move {
    name: string;
    power: number;
    type: string;
}

export class Pokemon {
    public name: string;
    public hp: number;
    public maxHp: number;
    public atk: number;
    // 2. 기술 배열 추가 (C++의 std::vector<Move> 느낌)
    public moves: Move[] = [];

    constructor(name: string, hp: number, atk: number) {
        this.name = name;
        this.maxHp = hp;
        this.hp = hp;
        this.atk = atk;
        for(var i = 0; i<4; i++)
        {
            this.learnMove(data.moves[i]!);
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
    useMove(moveIndex: number, target: Pokemon): void {
        const move = this.moves[moveIndex];
        if (!move) {
            console.log("잘못된 기술 선택입니다.");
            return;
        }

        console.log(`${this.name}의 ${move.name} 공격!`);
        target.takeDamage(move.power); // 실제 계산은 더 복잡하지만 우선 power로 적용
    }

    takeDamage(amount: number): void {
        this.hp -= amount;
        console.log(`${this.name}의 남은 HP: ${this.hp}`);
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
    const pData = data.pokedex.find(p => p.name === name);

    if (!pData) {
        throw new Error(`${name}을(를) 도감에서 찾을 수 없습니다.`);
    }

    // 2. 찾은 데이터로 객체 생성 및 반환
    return new Pokemon(pData.name, pData.hp, pData.atk);
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