import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import type { IPokemonData } from './Components/0_statManager.js'; // 그래 너가 이미 만들어뒀잖아 왜 다른걸 또 가져다 써

// __dirname 설정
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// JSON 경로 (본인 프로젝트 구조에 맞게 수정!)
const jsonPath = path.join(__dirname, '../05_Data/pokedex.json'); // 예시

// ★ 포켓몬 데이터 인터페이스 (JSON 구조와 일치해야 함)


// ★ 포켓몬 도감 (Registry)
// 키: 포켓몬 이름 (예: "Pikachu"), 값: 데이터 객체
export const PokeRegistry: { [name: string]: IPokemonData } = {};

export function LoadPokemonData() {
    try {
        if (!fs.existsSync(jsonPath)) {
            console.error(`[Error] pokedex.json 파일이 없습니다: ${jsonPath}`);
            return;
        }
        const rawData = fs.readFileSync(jsonPath, 'utf-8');
        const json = JSON.parse(rawData); // { "pokemon": [...] } 구조라고 가정

        // 배열을 순회하며 레지스트리에 등록
        const list = json.pokedex as IPokemonData[]; 
        list.forEach((p) => {
            PokeRegistry[p.name] = p; // 이름으로 즉시 찾을 수 있게 매핑
        });

        console.log(`[System] 포켓몬 ${list.length}마리 로딩 완료!`);

    } catch (err) {
        console.error(`[Error] 포켓몬 데이터 로딩 실패:`, err);
    }
}

// 헬퍼 함수
export function GetPokemonData(name: string): IPokemonData | undefined {
    return PokeRegistry[name];
}