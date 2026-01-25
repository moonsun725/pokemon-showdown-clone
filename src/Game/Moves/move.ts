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
    
    priority?: number; // JSON: "전광석화"에만 있음 (Optional)
    effect?: string;   // "PAR", "StatChange" 등
    chance?: number;   // 상태이상 확률
    
    data?: MoveMetadata; // ★ 위에서 정의한 구조체 연결
}