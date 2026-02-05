import data_P from '../05_Data/pokedex.json' with { type: 'json' };
import type { Move, MoveInstance } from '../01_Moves/move.js';
import { GetMove } from '../01_Moves/MoveManager.js';
import { RankToMultiplier, RankToMultiplierAccEv, RankToMultiplierCrit } from '../03_BattleSystem/Rank.js';
import { calculateDamage } from '../03_BattleSystem/dmgCalc.js';
import { ProcessMoveEffects } from '../03_BattleSystem/moveAbility.js';

import { VolatileStatusManager } from './volatileStatusManager.js';
import { StatsManager, type IPokemonData } from './statManager.js';
import { BattleStateManager } from './battlestateManager.js';
import { RankManager } from './rankManager.js';

export class Pokemon {
    public name: string;
    
    public Stats: StatsManager; // 각종 수치들 다 여기로 몰았음
    public BattleState: BattleStateManager; // 전투상태(주요 상태이상) 관리
    public Rank: RankManager;
    public volatileList; // 휘발성 상태이상 관리

    // 2. 기술 배열 추가 (C++의 std::vector<Move> 느낌)
    public moves: MoveInstance[] = [];

    constructor(name: string, data: IPokemonData) 
    {
        this.name = name;
        this.Stats = new StatsManager(data, this);
        this.BattleState = new BattleStateManager(this);
        this.volatileList = new VolatileStatusManager(this);
        this.Rank = new RankManager(this);
        
        this.learnMove("독가스"); 
        this.learnMove("플레어드라이브"); 
        this.learnMove("병상첨병"); 
        this.learnMove("객기");  
        this.learnMove("자신을 공격하고 말았디!");
    }

    // 상태 확인 메서드
    showCurrent(): void{
        console.log(`이름: ${this.name}, 체력: ${this.Stats.hp}, 공격 종족값: ${this.Stats.atk}`);
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
            target.Stats.takeDamage(DMGRes.damage);
            console.log(`[pokemon]:💥 ${target.name}은(는) ${DMGRes.damage}의 피해를 입었다! 남은 HP: ${target.Stats.hp}/${target.Stats.maxHp}`);
            // 기술 적중시 부가효과
            ProcessMoveEffects(move, target, this, "OnHit", DMGRes.damage);
        }
    }

    CheckAcuracy(move: Move, target: Pokemon): boolean {
        
        if (move.accuracy === null) {
            return true; // 명중률이 없는 기술은 항상 명중
        }
        else {
            // 명중률 계산 (간단한 예시)
            const random = Math.random() * 100;
            return random < move.accuracy*(RankToMultiplierAccEv(this.Rank.rank.acc-target.Rank.rank.eva));
        }
        
    }

    ResetCondition(): void {
        this.Stats.reset();
        this.BattleState.reset();
        this.Rank.reset();
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
    return new Pokemon(pData.name, pData);
}
