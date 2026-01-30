// Move.ts

// 1. data 내부 구조 (JSON의 "data" 필드와 일치시킴)
export interface MoveMetadata {
    selfChanges?: { stat: string, value: number }[];   // moves.json의 "selfChanges"
    targetChanges?: { stat: string, value: number }[]; // moves.json의 "targetChanges"
    // 여기에 나중에 다른 것들 채운다(회복, 특수효과 등등등)
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
    effect?: string;   // "PAR", "StatChange" 등
    chance?: number;   // effect가 적용될 확률(ex: 10만볼트의 마비 10%, 섀도볼 특방떨 20%)
    
    effectdata?: MoveMetadata; // ★ 위에서 정의한 구조체 연결
    isContact?: boolean; // 접촉기 여부
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
    };
}