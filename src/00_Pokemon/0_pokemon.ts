import data_P from '../05_Data/pokedex.json' with { type: 'json' };
import type { Move, MoveInstance } from '../01_Moves/move.js';
import { GetMove } from '../01_Moves/MoveLoader.js';
import { RankToMultiplier, RankToMultiplierAccEv, RankToMultiplierCrit } from '../03_BattleSystem/Rank.js';
import { calculateDamage } from '../03_BattleSystem/dmgCalc.js';
import { ProcessMoveEffects } from '../03_BattleSystem/moveAbility.js';

import { MoveManager } from './moveManager.js';
import { VolatileStatusManager } from './volatileStatusManager.js';
import { StatsManager, type IPokemonData } from './statManager.js';
import { BattleStateManager } from './battlestateManager.js';
import { RankManager } from './rankManager.js';
import type { PokemonOptions } from './pokeOptions.js';


export class Pokemon {
    public name: string;
    
    public Stats: StatsManager; // 각종 수치들 다 여기로 몰았음
    public BattleState: BattleStateManager; // 전투상태(주요 상태이상) 관리
    public Rank: RankManager;
    public volatileList; // 휘발성 상태이상 관리

    // 2. 기술 배열 추가 (C++의 std::vector<Move> 느낌)
    public moves: MoveManager;

    constructor(name: string, data: IPokemonData, options?: PokemonOptions) 
    {
        this.name = name;
        this.Stats = new StatsManager(data, this);
        this.BattleState = new BattleStateManager(this);
        this.volatileList = new VolatileStatusManager(this);
        this.Rank = new RankManager(this);
        this.moves = new MoveManager(this, options?.moves);
    }

    // 상태 확인 메서드
    showCurrent(): void{
        console.log(`이름: ${this.name}, 체력: ${this.Stats.hp}, 공격 종족값: ${this.Stats.atk}`);
        this.moves.Show();
    }



    /*learnMove(move: Move): void {
        this.moves.push(move);
        console.log(`[pokemon]: ${this.name}이(가) [${move.name}]을(를) 배웠다!`);
    }*/

    // 특정 기술로 공격하기
    useMove(moveIndex: number, target: Pokemon): void {
        // 1. 행동 불능 체크 (마비, 잠듦, 풀죽음 등)
        // (BattleState나 VolatileList 체크 로직)
        // if (!this.canMove()) return; 

        if (!this.volatileList.CheckBeforeMove()) {
            console.log(`❌ ${this.name}은(는) 움직일 수 없다!`);
            return;
        }

        // 2. 실제 기술 실행은 매니저에게 위임
        this.moves.Execute(moveIndex, target);
    }

    CheckAcuracy(move: Move, target: Pokemon): boolean {
        
        if (move.accuracy === null) {
            return true; // 명중률이 없는 기술은 항상 명중
        }
        else {
            // 명중률 계산 (간단한 예시)
            const random = Math.random() * 100;
            return random < move.accuracy*(RankToMultiplierAccEv(this.Rank.get('acc')-target.Rank.get('eva')));
        }
        
    }

    ResetCondition(): void {
        this.Stats.reset();
        this.BattleState.reset();
        this.Rank.reset();
    }

    // 래퍼 함수(각각의 매니저 호출)
    // 1. 데미지 처리 (가장 중요)
    takeDamage(amount: number): void {
        const isFainted = this.Stats.takeDamage(amount);
        if (isFainted) {
            this.BattleState.Set("FNT");
            this.volatileList.Clear(); // 기절 시 버프/디버프 해제
            console.log(`💀 ${this.name}은(는) 쓰러졌다!`);
        }
    }

    // 2. 회복 처리
    recoverHp(amount: number): void {
        this.Stats.recoverHp(amount);
    }

    // 3. 상태이상 부여 시도 (방어 로직 포함)
    tryApplyStatus(status: string): void {
        // 이미 상태이상이 있거나, 타입 상성으로 무효화되는지 체크 (Pokemon 클래스에서 판단)
        if (this.BattleState.Get() !== null) return;
        
        // 로직 통과하면 매니저에게 지시
        this.BattleState.Set(status);
    }

}

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
