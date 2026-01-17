// BattleSystem/moveAbilities.ts
import { Pokemon } from '../src/Game/pokemon.js';
import data_Debufs from '../src/Data/bufsNdebufs.json' with { type: 'json' };

// 1. 인터페이스 (사용자님이 작성하신 것 유지)
export interface MoveAbility {
    OnUse(user: Pokemon): void;
    OnHit(target: Pokemon): void;
    OnDamageCalc(damage: number): number;
    OnEndMove(user: Pokemon): void;
}

// 2. 기본(빈) 구현체 (Null Object Pattern)
// 모든 메서드를 구현하기 귀찮을 때 상속받아 쓰기 위함
const DefaultAbility: MoveAbility = {
    OnUse: () => {},
    OnHit: () => {},
    OnDamageCalc: (d) => d,
    OnEndMove: () => {}
};

// 3. [리팩토링] 통합 상태이상 로직 생성기 (Factory Function)
// =========================================================
// statusTag: "BRN", "PAR" 등 적용할 상태 코드
// emoji: 로그에 띄울 이모지
// name: 로그에 띄울 한글 이름
function createStatusLogic(statusTag: string, emoji: string, name: string): MoveAbility {
    return {
        ...DefaultAbility, // 기본값 깔고
        OnHit: (target: Pokemon) => {
            if (target.status) return; // 이미 상태이상이면 무시
            
            console.log(`${emoji} [Effect] ${target.name}에게 ${name}을(를) 걸었다!`);
            target.status = statusTag;
        }
    };
}

// =========================================================
// 4. 레지스트리 (훨씬 깔끔해짐!)
// =========================================================
const AbilityRegistry: { [scriptName: string]: MoveAbility } = {
    // 1. 단순 상태이상들은 '생성기'로 한 줄 컷
    "burn":      createStatusLogic("BRN", "🔥", "화상"),
    "poison":    createStatusLogic("PSN", "☠️", "독"),
    "paralysis": createStatusLogic("PAR", "⚡", "마비"),
    "freeze":    createStatusLogic("FRZ", "❄️", "얼음"),

    // 2. 특수 로직이 필요한 경우만 따로 정의 (예: 잠듦은 턴 수가 필요함)
    "sleep": {
        ...DefaultAbility,
        OnHit: (target: Pokemon) => {
            if (target.status) return;
            console.log(`💤 [Effect] ${target.name}이(가) 깊은 잠에 빠졌다!`);
            target.status = "SLP";
            // target.sleepTurns = Math.floor(Math.random() * 3) + 1; // 특수 로직
        }
    }
};

// =========================================================
// 5. 메인 함수: ApplyEffect
// =========================================================
export function ApplyEffect(effectInfo: string, chance: number, target: Pokemon): void {
    
    // 1. 확률 체크 (0 ~ 100)
    const random = Math.random() * 100;
    if (random > chance) {
        // console.log(`🎲 [Effect] 확률 실패 (${random.toFixed(1)} > ${chance})`);
        return; 
    }

    // 2. JSON 데이터에서 정보 찾기 (PAR -> script: "paralysis" 찾기)
    // C++의 find_if와 동일
    const debufData = data_Debufs.debufs.find(d => d.info === effectInfo);

    if (!debufData) {
        console.error(`⚠️ [System] '${effectInfo}'에 해당하는 상태이상 데이터가 없습니다.`);
        return;
    }

    // 3. 스크립트 이름으로 로직 객체 가져오기
    const logic = AbilityRegistry[debufData.script];

    if (logic) {
        console.log(`🎲 [Effect] 효과 발동! (${effectInfo})`);
        logic.OnHit(target); // ★ 훅 실행!
    } else {
        console.warn(`⚠️ [System] 스크립트 '${debufData.script}'가 구현되지 않았습니다.`);
    }
}