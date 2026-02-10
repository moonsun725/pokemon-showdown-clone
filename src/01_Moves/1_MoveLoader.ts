// MoveManager.ts
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import type { Move } from './0_move.js'; // 위에서 만든 타입 import
import moves from '../05_Data/moves.json' with { type: 'json' };

// __dirname 설정 (ES Module 환경)
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// JSON 파일 경로 (위치에 따라 수정 필요)
// 보통 src/Game/moves.json 에 있다고 가정
const jsonPath = path.join(__dirname, '../05_Data/moves.json');

// ★ 기술 도감 (Dictionary)
// 이름만 대면 기술이 툭 튀어나오게 저장
export const MoveRegistry: { [name: string]: Move } = {};

export function LoadMoves() {
    try {
        const rawData = fs.readFileSync(jsonPath, 'utf-8');
        const json = JSON.parse(rawData);

        // JSON 배열을 돌면서 도감(Registry)에 등록
        // moves.json 구조가 { "moves": [ ... ] } 형태라고 가정
        const moveList = json.moves as Move[];

        moveList.forEach((move) => {
            MoveRegistry[move.name] = move;
        });

        console.log(`[System] 기술 ${moveList.length}개 로딩 완료!`);

    } catch (err) {
        console.error(`[Error] moves.json 로딩 실패:`, err);
    }
}

// 헬퍼 함수: 이름으로 기술 찾기
export function GetMove(name: string): Move | undefined {
    return MoveRegistry[name];
}