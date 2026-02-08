import { Pokemon } from "../0_pokemon.js";
import { AbilityRegistry } from "../../04_Ability/PassiveAbilities.js";
// 매니저 클래스
export class AbilityManager {
    private owner: Pokemon;
    public currentId: string | null = null;

    constructor(owner: Pokemon, abilityId?: string) {
        this.owner = owner;
        this.currentId = abilityId || null;
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
    
    // ... 필요한 훅 계속 추가
}