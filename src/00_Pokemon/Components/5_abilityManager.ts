import { Pokemon } from "../0_pokemon.js";
import { AbilityRegistry } from "../../04_Ability/PassiveAbilities.js";
// 매니저 클래스
export class AbilityManager {
    private owner: Pokemon;
    public currentId: string | null = null;
    public name: string = '이거 나오면 수정해야됨'

    constructor(owner: Pokemon, abilityId?: string) {
        this.owner = owner;
        this.currentId = abilityId || null;
        if (abilityId && AbilityRegistry[abilityId])
            this.name = AbilityRegistry[abilityId].name;
    }

    // 트리거 메서드들 (외부에서 호출)
    OnSwitchIn() {
        if (!this.currentId) return;
        const logic = AbilityRegistry[this.currentId];
        if (logic && logic.OnSwitchIn) logic.OnSwitchIn(this.owner);
    }

    OnTurnEnd() {
        if (!this.currentId) return;
        const logic = AbilityRegistry[this.currentId];
        if (logic && logic.OnTurnEnd) logic.OnTurnEnd(this.owner);
    }
    
    GetDamageMod(move: any, currentPower: number): number {
        if (!this.currentId) return 1.0;
        
        const logic = AbilityRegistry[this.currentId];
        if (logic && logic.OnDamageMod) {
            return logic.OnDamageMod(this.owner, move, currentPower);
        }
        return 1.0; // 특성 없으면 배율 1.0
    }
    
    // ... 필요한 훅 계속 추가
}