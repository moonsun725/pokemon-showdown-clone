import { Pokemon } from './0_pokemon.js';
import type { Move, MoveInstance } from '../01_Moves/move.js'; // 경로 확인 필요
import { GetMove } from '../01_Moves/MoveLoader.js';
import { calculateDamage } from '../03_BattleSystem/dmgCalc.js';
import { ProcessMoveEffects } from '../03_BattleSystem/moveAbility.js';
import { RankToMultiplierAccEv } from '../03_BattleSystem/Rank.js';

export class MoveManager {
    private owner: Pokemon;
    public list: MoveInstance[] = []; // 외부(room.ts)에서 우선도 체크 등을 위해 접근 필요

    constructor(owner: Pokemon, initialMoves?: string[]) {
        this.owner = owner;

        // 1. 초기 기술 목록이 있으면 배움
        if (initialMoves && initialMoves.length > 0) {
            initialMoves.forEach(name => this.Learn(name));
        } else {
            // 없으면 디폴트 기술 (테스트용)
            // this.Learn("몸통박치기"); 
            this.Learn("10만볼트");
        }
    }
    Show()
    {
        this.list.forEach(element => {
            if (element == null){
                throw new Error('[pokemon]:더 이상 배운 기술이 없습니다!');
            }
            console.log("[pokemon]: 기술명:", element.def.name, "공격 타입:", element.def.type, "기술 위력:", element.def.power);
        });
    }

    // 기술 배우기
    Learn(moveName: string): void {
        const originalMove = GetMove(moveName);
        if (!originalMove) {
            console.error(`[MoveManager] '${moveName}' 기술을 찾을 수 없습니다.`);
            return;
        }

        // 기술 칸 4개 제한 로직이 필요하다면 여기에 추가
        if (this.list.length >= 4) {
             console.log(`[MoveManager] 기술 창이 가득 찼습니다. (덮어쓰기 로직 필요)`);
             // 일단은 그냥 추가하거나 리턴
             return; 
        }

        const newInstance: MoveInstance = {
            def: originalMove,
            currentPp: originalMove.pp,
            maxPp: originalMove.pp,
            volatileData: originalMove.volatileDataTemplate 
                ? structuredClone(originalMove.volatileDataTemplate) 
                : undefined
        };

        this.list.push(newInstance);
        // console.log(`[MoveManager] ${this.owner.name}이(가) ${moveName}을(를) 배웠다!`);
    }

    // 기술 가져오기 (room.ts 등에서 사용)
    Get(index: number): MoveInstance | undefined {
        return this.list[index];
    }

    // ★ 기술 사용 로직 (핵심)
    Execute(moveIndex: number, target: Pokemon): void {
        const moveInst = this.list[moveIndex];
        if (!moveInst) {
            console.error("[MoveManager] 잘못된 기술 인덱스입니다.");
            return;
        }

        const move = moveInst.def;
        const owner = this.owner;

        console.log(`[Battle] ${owner.name}의 ${move.name}!`);

        // 1. [사용 시] 효과 처리 (솔라빔 충전 등)
        // shouldContinue가 false면(충전 시작 등) 여기서 중단
        const shouldContinue = ProcessMoveEffects(move, target, owner, "OnUse");
        if (!shouldContinue) {
            console.log(`⏳ [Battle] 기술 사용이 보류/중단되었습니다.`);
            return;
        }

        // 2. PP 소모 (충전 기술이어도 발사할 때 소모 or 충전 때 소모? 보통 사용 시 소모)
        moveInst.currentPp--;

        // 3. 명중 체크
        if (!this.CheckAccuracy(move, target)) {
            console.log(`[Battle] ${target.name}에게는 맞지 않았다! (빗나감)`);
            return;
        }

        // 4. 변화기(Status) 처리
        if (move.category === "Status") {
            // 변화기는 데미지 없이 효과만 발동
            ProcessMoveEffects(move, target, owner, "OnHit");
            return;
        }

        // 5. 공격기 처리 (물리/특수)
        // 데미지 계산
        const dmgRes = calculateDamage(owner, target, move);
        
        // 효과가 없음(0배) 처리
        if (dmgRes.effectiveness === 0) {
            console.log(`(효과가 없는 것 같다...)`);
        } else if (dmgRes.effectiveness > 1) {
            console.log(`(효과가 굉장했다!)`);
        } else if (dmgRes.effectiveness < 1) {
            console.log(`(효과가 별로인 듯하다...)`);
        }

        // 피해 적용 (Pokemon 래퍼 함수 호출 권장)
        target.takeDamage(dmgRes.damage);
        console.log(`[Battle] 💥 ${target.name}에게 ${dmgRes.damage} 데미지! (남은HP: ${target.Stats.hp})`);

        // 6. [적중 시] 부가 효과 처리 (화상 확률 등)
        ProcessMoveEffects(move, target, owner, "OnHit", dmgRes.damage);
    }

    // 명중률 계산
    private CheckAccuracy(move: Move, target: Pokemon): boolean {
        if (move.accuracy === null) return true; // 필중기

        // (내 명중 랭크 - 상대 회피 랭크)
        const accStage = this.owner.Rank.get('acc'); 
        const evaStage = target.Rank.get('eva');
        const stageDiff = accStage - evaStage;

        // 랭크 보정 * 기술 명중률
        const hitChance = move.accuracy * RankToMultiplierAccEv(stageDiff);
        
        return (Math.random() * 100) < hitChance;
    }
}