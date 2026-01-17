// BattleSystem/StatusSystem.ts
import { Pokemon } from '../Game/pokemon.js';
import data_Debufs from '../Data/bufsNdebufs.json' with { type: 'json' };

// 상태이상 부여 함수 (Manager)
export function TryApplyStatus(target: Pokemon, statusTag: string): boolean {
    
    // 1. 이미 상태이상이 있으면 실패
    if (target.status !== null) {
        console.log("[StatusSystem]: 그러나 실패하고 말았다!");
        return false;
    }

    // 2. 데이터 확인 (유효한 상태 태그인가?)
    const statusData = data_Debufs.debufs.find(d => d.info === statusTag);
    if (!statusData) {
        console.error(`[StatusSystem]: 알 수 없는 상태 태그: ${statusTag}`);
        return false;
    }

    // 3. 상태 적용
    target.status = statusTag;
    console.log(`✨ [Status] ${target.name}에게 '${statusData.name}'(${statusTag}) 적용 완료!`);
    
    return true;
}

export function ResolveStatusEffects(pokemon: Pokemon): void {
    
    // 1. 상태이상이 없으면 패스
    if (!pokemon.status) return;

    // 2. 데이터 조회 (C++의 Lookup)
    const statusData = data_Debufs.debufs.find(d => d.info === pokemon.status);
    if (!statusData) return;

    // 3. 도트 데미지(DoT) 처리
    // JSON에 "dmg" 필드가 있는 경우에만 처리 (화상, 독)
    // 예: 화상(0.0625) -> 최대 체력의 1/16
    if (statusData.dmg) {
        const damage = Math.floor(pokemon.maxHp * statusData.dmg);
        
        // 최소 데미지 보정 (1이라도 깎여야 함)
        const finalDamage = Math.max(1, damage);

        console.log(`[StatusSystem]:⏳ [Turn End] ${pokemon.name}이(가) ${statusData.name} 피해를 입었다! (-${finalDamage})`);
        pokemon.takeDamage(finalDamage);
    }
}

// 나중에 여기에 'ApplyTurnEndDamage' (독 데미지 등) 함수가 추가됩니다.