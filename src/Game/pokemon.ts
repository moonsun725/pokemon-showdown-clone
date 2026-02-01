import data_P from '../Data/pokedex.json' with { type: 'json' };
import type { Move, MoveInstance } from './Moves/move.js';
import { GetMove } from './Moves/MoveManager.js';
import getTypeEffectiveness from '../BattleSystem/typeChart.js';
import type { Rank } from '../BattleSystem/Rank.js';
import { RankToMultiplier, RankToMultiplierAccEv, RankToMultiplierCrit } from '../BattleSystem/Rank.js';
import { calculateDamage } from '../BattleSystem/dmgCalc.js';
import { ProcessMoveEffects } from '../BattleSystem/moveAbility.js';
import { type VolatileStatus } from '../BattleSystem/VolatileStatus.js';
/*
// 변수/함수 목록
export class Pokemon {
    public name: string;
    public hp: number;
    public maxHp: number;
    public atk: number;
    public speed: number;

    public moves: Move[] = [];
    public types: string[] = [];

    public status: string | null = null; 

    public Rank: Rank = {
        atk: 0, 
        def: 0, 
        spd: 0,
        satk: 0,
        sdef: 0,
        acc: 0,
        eva: 0,
        crit: 0
    }

    constructor(name: string, hp: number, atk: number, speed: number, types: string[]) 
    
    showCurrent() : void
    learnMove(move: Move) : void
    useMove(moveIndex: number, target: Pokemon,)'modifyRank(stat: keyof Rank, amount: number) : void
    modifyRank(stat: keyof Rank, amount: number): void 
    takeDamage(amount: number): void
    CheckAcuracy(move: Move, target: Pokemon): boolean
    ResetCondition(): void
}

export function createPokemon(name: string): Pokemon
*/

export class Pokemon {
    public name: string;
    public hp: number;
    public maxHp: number;
    public atk: number;
    // 2. 기술 배열 추가 (C++의 std::vector<Move> 느낌)
    public moves: MoveInstance[] = [];

    // 26-01-15. 스피드 항목 추가
    public speed: number;
    // 26-01-15. 타입 항목 추가
    public types: string[] = [];
    //26-01-17. 상태이상 추가
    public status: string | null = null; // 'PAR', 'BRN', 'PSN' 등
    //26-02-01. 휘발성 효과 목록 추가
    public volatileStatus: Map<string, VolatileStatus> = new Map();
    
    public Rank: Rank = {
        atk: 0, 
        def: 0, 
        spa: 0,
        spd: 0,
        spe: 0,
        acc: 0,
        eva: 0,
        crit: 0
    }

    constructor(name: string, hp: number, atk: number, speed: number, types: string[]) 
    {
        this.name = name;
        this.hp = hp;
        this.maxHp = hp;
        this.atk = atk;
        this.speed = speed || 10; // 기본값 처리
        this.types = types; 
        
        this.learnMove("독가스"); 
        this.learnMove("플레어드라이브"); 
        this.learnMove("병상첨병"); 
        this.learnMove("객기");  
        this.learnMove("자신을 공격하고 말았디!");
        /*
        this.learnMove(data_M.moves[0] as unknown as Move); // 10만볼트(기준확인)
        this.learnMove(data_M.moves[3] as unknown as Move); // 맹독
        this.learnMove(data_M.moves[4] as unknown as Move); // 전광석화
        this.learnMove(data_M.moves[5] as unknown as Move); // 칼춤
        */
    }

    // 상태 확인 메서드
    showCurrent(): void{
        console.log(`이름: ${this.name}, 체력: ${this.hp}, 공격 종족값: ${this.atk}`);
        this.moves.forEach(element => {
            if (element == null){
                throw new Error('[pokemon]:더 이상 배운 기술이 없습니다!');
            }
            console.log("[pokemon]: 기술명:", element.def.name, "공격 타입:", element.def.type, "기술 위력:", element.def.power);
        });
    }

    // 기술 배우기 메서드
    learnMove(moveName: string): void {
        const originalMove = GetMove(moveName);
    
        if (!originalMove) {
            console.error(`[Error] '${moveName}'라는 기술은 존재하지 않습니다.`);
            return;
        }

        const newInstance: MoveInstance = {
            def: originalMove,          // 1. 정적 데이터는 참조만 (가볍게)
            currentPp: originalMove.pp,
            maxPp: originalMove.pp,
            
            // 2. ★ 가변 데이터는 '깊은 복사' 수행!
            volatileData: originalMove.volatileDataTemplate 
            ? structuredClone(originalMove.volatileDataTemplate) // 깊은 복사 (Node v17+)
            : undefined
            
        };

        this.moves.push(newInstance);
        
    }

    /*learnMove(move: Move): void {
        this.moves.push(move);
        console.log(`[pokemon]: ${this.name}이(가) [${move.name}]을(를) 배웠다!`);
    }*/

    // 특정 기술로 공격하기
    useMove(moveIndex: number, target: Pokemon): void {
        const moveInst = this.moves[moveIndex];
        if (!moveInst) {
            console.log("[pokemon]: 잘못된 기술 선택입니다.");
            return;
        }
        const move = moveInst.def;
        
        console.log(`[Battle] ${this.name}의 ${move.name}!`);

        // 기술 사용 시
        ProcessMoveEffects(move, target, this, "OnUse");
        // PP는 사용 시점에 소모
        moveInst.currentPp--;
        // 명중 여부
        if (!this.CheckAcuracy(move, target)) {
            console.log(`[pokemon]: 상대 ${target.name}에게는 맞지 않았다!`);
            return;
        }

        // 적에게 사용하는 변화기
        if (move.category === "Status")
        {
            console.log("[pokemon]: 변화기 처리");
            ProcessMoveEffects(move, target, this, "OnHit");
            return;
        }

        // 데미지 계산
        { 
            let DMGRes = calculateDamage(this, target, move);

            let effectivenessMsg = "";
            if (DMGRes.effectiveness > 1) effectivenessMsg = " (효과가 굉장했다!)";
            if (DMGRes.effectiveness < 1 && DMGRes.effectiveness > 0) effectivenessMsg = " (효과가 별로인 듯하다...)";
            if (DMGRes.effectiveness === 0) effectivenessMsg = " (효과가 없다!)";
            console.log(`${effectivenessMsg}`);

            // 피해 적용
            target.takeDamage(DMGRes.damage);
            console.log(`[pokemon]:💥 ${target.name}은(는) ${DMGRes.damage}의 피해를 입었다! 남은 HP: ${target.hp}/${target.maxHp}`);
            // 기술 적중시 부가효과
            ProcessMoveEffects(move, target, this, "OnHit", DMGRes.damage);
        }
    }

    modifyRank(stat: keyof Rank, amount: number): void {
        this.Rank[stat] += amount;
        
        // 작성하신 clamp 로직을 여기에 적용 (이미 잘 짜셨습니다!)
        this.Rank[stat] = Math.max(-6, Math.min(6, this.Rank[stat]));
        
        console.log(`[pokemon]: ${this.name}의 ${stat} 랭크가 ${this.Rank[stat]}이 되었다!`);
    }

    takeDamage(amount: number): void {
        this.hp -= amount;
        console.log(`[pokemon]: ${this.name}의 남은 HP: ${this.hp}`);
        if (this.hp <= 0)
        {
            this.hp = 0;
            this.status = "FNT";
        }
    }

    recoverHp(amount: number) :void
    {
        this.hp += amount;
        if(this.hp > this.maxHp) 
            this.hp = this.maxHp;
        console.log(`[pokemon]/[recoverHp]: ${this.name}의 남은 HP: ${this.hp}`);
    }

    addVolatile(statusId: string, status: VolatileStatus) {
        if (this.volatileStatus.has(statusId)) {
            console.log(`${this.name}에게 이미 ${statusId}가 있어 갱신합니다.`);
        }
        this.volatileStatus.set(statusId, status);
        console.log(`✨ ${this.name}에게 [${statusId}] 상태가 부여됨!`);
    }
    
    removeVolatile(statusId?: string) : void
    {
        if (statusId)
            if (this.volatileStatus.delete(statusId)) {
            console.log(`✨ ${this.name}은 [${statusId}] 상태로부터 풀려났다!`);
        }
        else
        {
            this.volatileStatus.clear(); // clearVolatile()의 역할도 한번에 할 수 있게 해도 될거같아
        }
    }

    getVolatile(statusId: string): VolatileStatus | undefined {
        return this.volatileStatus.get(statusId);
    }

    CheckAcuracy(move: Move, target: Pokemon): boolean {
        
        if (move.accuracy === null) {
            return true; // 명중률이 없는 기술은 항상 명중
        }
        else {
            // 명중률 계산 (간단한 예시)
            const random = Math.random() * 100;
            return random < move.accuracy*(RankToMultiplierAccEv(this.Rank.acc-target.Rank.eva));
        }
        
    }

    ResetCondition(): void {
        // (1) 체력 회복
        this.hp = this.maxHp;
                
        // (2) 상태이상 제거
        this.status = null;
                    
        // (3) 랭크 초기화 (새 객체 할당이 가장 깔끔함)
        this.Rank = {
            atk: 0, def: 0, spa: 0, spd: 0, spe: 0,
            acc: 0, eva: 0, crit: 0 // pokemon.Rank.atk = 0; 이런식으로 해도 되긴하네
        }
    }
}

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
