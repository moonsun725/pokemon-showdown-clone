import data_P from '../05_Data/pokedex.json' with { type: 'json' };
import { MoveManager } from './Components/3_moveManager.js';
import { VolatileStatusManager } from './Components/6_volatileStatusManager.js';
import { StatsManager, type IPokemonData, type realStats } from './Components/0_statManager.js';
import { BattleStateManager } from './Components/1_battlestateManager.js';
import { RankManager } from './Components/7_rankManager.js';
import type { PokemonOptions } from './Components/2_pokeOptions.js';
import { AbilityManager } from './Components/5_abilityManager.js';
import { ItemManager } from './Components/4_itemManager.js';
import { GetPokemonData } from './1_pokeLoader.js';


export class Pokemon {
    public name: string;
    
    public Stats: StatsManager; // 각종 수치들 다 여기로 몰았음
    public BattleState: BattleStateManager; // 전투상태(주요 상태이상) 관리
    public Rank: RankManager; // 아 이거 대소문자 진짜 신경쓰이는데 어카지 
    public volatileList: VolatileStatusManager; // 휘발성 상태이상 관리
    public moves: MoveManager;
    public ability: AbilityManager;
    public item: ItemManager

    constructor(name: string, data: IPokemonData, options?: PokemonOptions) 
    {
        this.name = name;
        this.Stats = new StatsManager(data, this);
        this.BattleState = new BattleStateManager(this);
        this.volatileList = new VolatileStatusManager(this);
        this.Rank = new RankManager(this);
        this.moves = new MoveManager(this, options?.moves);
        this.ability = new AbilityManager(this, options?.ability);
        this.item = new ItemManager(this, options?.item)
    }

    GetStat(key: keyof realStats)
    {
        return this.Stats.get(key);
    }

    // 상태 확인 메서드
    showCurrent(): void{
        console.log(`이름: ${this.name}, 체력: ${this.Stats.hp}, 공격 종족값: ${this.GetStat('atk')}`);
        this.moves.Show();
    }

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

    // ★ [New] 클라이언트 전송용 데이터 변환 메서드
    toData() {
        return {
            name: this.name,
            hp: this.Stats.hp,
            maxHp: this.Stats.maxHp,
            stats: this.Stats.Stats, // 필요하다면
            // 보통 숨김 정보지만 UI 갱신용으로 필요하다면 추가
            
            // 상태이상 (BattleState가 객체라면 .status 문자열만 보냄)
            status: this.BattleState.Get(), // "PAR", "PSN" 등 문자열만

            // 기술 목록 (MoveManager 통째로 보내면 안 됨! 필요한 것만 매핑)
            moves: this.moves.list.map(m => ({
                name: m.def.name,
                type: m.def.type,
                currentPp: m.currentPp,
                maxPp: m.maxPp,
            })),
            
            // 이미지 경로 등을 위한 ID가 있다면 추가
            // id: this.data.id 
        };
    }
}

// 데이터를 기반으로 포켓몬 생성 (C++의 팩토리 패턴과 유사)
export function createPokemon(name: string, options?: PokemonOptions): Pokemon {
    // 1. 포켓로더를 만들었으니까 이제 json이 아니라 레지스트리에서 찾는다
    const pData = GetPokemonData(name);

    if (!pData) {
        throw new Error(`${name}을(를) 도감에서 찾을 수 없습니다.`);
    }

    // 2. 찾은 데이터로 객체 생성 및 반환
    return new Pokemon(pData.name, pData, options);
}
