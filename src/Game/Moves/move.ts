// Move.ts
/*
// 1. data 내부 구조 (JSON의 "data" 필드와 일치시킴)
export interface MoveMetadata {
    selfChanges?: { stat: string, value: number }[];   // moves.json의 "selfChanges"
    targetChanges?: { stat: string, value: number }[]; // moves.json의 "targetChanges"
    // 여기에 나중에 다른 것들 채운다(회복, 특수효과 등등등)
}
*/

export type EffectTiming = 'OnUse' | 'OnHit' | 'OnTurnEnd' | 'OnBasePower';
export type EffectTarget = 'Self' | 'Enemy'; // 대상
export interface MoveEffectEntry {
    type: string;       // 효과 이름 (예: "Recoil", "BRN")
    timing: EffectTiming; // 발동 타이밍(OnHit, OnTurnEnd)
    target: EffectTarget;

    chance?: number;    // 개별 확률 (없으면 100%)
    data?: any;         // 개별 데이터 (예: { ratio: 0.33 })
}

// 2. 메인 인터페이스
export interface Move {
    name: string;      // JSON: "10만볼트"
    power: number | null; // JSON: 90 or null
    type: string;      // JSON: "Electric"
    accuracy: number | null;
    category: string;  // "Physical" | "Special" | "Status"
    pp: number;
    
    priority?: number; // JSON: "전광석화"에만 있음 (Optional)

    effects? : MoveEffectEntry[]; //

    // ★ 가변 데이터의 '초기값' (Template)
    // 예: 연속 사용 횟수, 락온 대상 목록 등
    volatileDataTemplate?: {
        consecutiveHits: number;
        lockedTargets: string[]; // 배열! (참조 타입)
    };
}

// ★ [New] 포켓몬이 실제로 가지게 될 구조체
export interface MoveInstance {
    def: Move;      // 원본 기술 데이터 (참조 포인터)
    currentPp: number; // 현재 남은 PP (가변 데이터)
    maxPp: number;     // 최대 PP (나중에 포인트업 아이템 쓰면 늘어남)

    // ★ 실제 변하는 데이터 (Instance 고유) ex: 연속자르기, 구르기(n턴에 걸쳐 버프)
    volatileData?: {
        consecutiveHits: number;
        lockedTargets: string[]; 
    } | undefined; // {}안에 있는 뭉탱이 또는 없음(undefined)이 대입됩니다.
}