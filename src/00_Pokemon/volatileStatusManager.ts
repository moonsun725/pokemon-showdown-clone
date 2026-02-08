// src/Game/VolatileStatusManager.ts
import { Pokemon } from './0_pokemon.js';
import { type VolatileStatus, VolatileRegistry } from '../03_BattleSystem/VolatileStatus.js';

export class VolatileStatusManager {
    private owner: Pokemon; // 이 상태들이 누구 것인지 알고 있어야 함
    private statuses: Map<string, VolatileStatus> = new Map();

    constructor(owner: Pokemon) {
        this.owner = owner;
    }

    // 1. 상태 추가 (Add)
    Add(id: string, data: VolatileStatus) {
        // 이미 있으면 덮어쓸지, 실패할지 등의 정책 결정 가능
        if (this.statuses.has(id)) {
            // 예: 지속시간만 갱신하거나, 그냥 덮어쓰기
            console.log(`그러나 ${this.owner.name}은 이미 [${id}] 상태에 빠져 있다!`)
            return;
        }

        // ★ 여기서 Init을 호출해버리면 Pokemon 클래스는 신경 안 써도 됨!
        const logic = VolatileRegistry[id];
        if (logic && logic.Init) {
            logic.Init(data, data.data);
        }

        this.statuses.set(id, data);
        console.log(`✨ ${this.owner.name}에게 [${id}] 상태 부여됨 (지속: ${data.duration})`);
    }

    // 2. 상태 제거 (Remove)
    Remove(id: string) {
        if (this.statuses.delete(id)) {
            console.log(`✨ ${this.owner.name}의 [${id}] 상태 해제`);
        }
    }

    // 3. 상태 확인 (Has/Get)
    Has(id: string): boolean {
        return this.statuses.has(id);
    }

    Get(id: string): VolatileStatus | undefined {
        return this.statuses.get(id);
    }

    // 4. ★ 턴 종료 업데이트 (Update)
    // Pokemon 클래스가 매번 for문을 돌릴 필요 없이, "야 업데이트 해" 한마디면 끝남
    UpdateTurn() {
        for (const [id, status] of this.statuses) {
            
            // (1) 턴 종료 효과 발동
            const logic = VolatileRegistry[id];
            if (logic && logic.OnTurnEnd) {
                logic.OnTurnEnd(this.owner, status.data);
            }

            // (2) 턴 감소 및 자동 해제
            if (status.duration !== undefined && status.duration !== -1) {
                status.duration--;
                if (status.duration <= 0) {
                    this.Remove(id);
                }
            }
        }
    }
    // 5. 행동 이전에 발동하는 효과(풀죽음, 헤롱헤롱, 혼란)
    CheckBeforeMove(): boolean {
        for (const [id, status] of this.statuses) {
            const logic = VolatileRegistry[id];
            
            // OnBeforeMove가 있고, 실행 결과가 false라면 행동 불가!
            if (logic && logic.OnBeforeMove) {
                const canMove = logic.OnBeforeMove(this.owner, status.data);
                if (!canMove) return false; // 하나라도 못 움직이게 하면 중단
            }
        }
        return true; // 아무 문제 없으면 행동 가능
    }

    // 6. 전체 초기화 (교체 시 등)
    Clear() {
        this.statuses.clear();
    }
}