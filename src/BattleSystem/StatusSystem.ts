// BattleSystem/StatusSystem.ts
import { Pokemon } from '../Game/pokemon.js';
import data_Debufs from '../Data/bufsNdebufs.json' with { type: 'json' };

// 상태이상 부여 함수 (Manager)
export function TryApplyStatus(target: Pokemon, statusTag: string): boolean {
    
    // 1. 이미 상태이상이 있으면 실패
    if (target.status !== null) {
        console.log("그러나 실패하고 말았다!");
        return false;
    }

    // 2. 데이터 확인 (유효한 상태 태그인가?)
    const statusData = data_Debufs.debufs.find(d => d.info === statusTag);
    if (!statusData) {
        console.error(`[StatusSystem] 알 수 없는 상태 태그: ${statusTag}`);
        return false;
    }

    // 3. 상태 적용
    target.status = statusTag;
    console.log(`✨ [Status] ${target.name}에게 '${statusData.name}'(${statusTag}) 적용 완료!`);
    
    return true;
}

// 나중에 여기에 'ApplyTurnEndDamage' (독 데미지 등) 함수가 추가됩니다.