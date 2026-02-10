import type { IPokemonData } from './Components/0_statManager.js'; // 그래 너가 이미 만들어뒀잖아 왜 다른걸 또 가져다 써
import pokeData from '../05_Data/pokedex.json' with { type: 'json' };

// ★ 포켓몬 도감 (Registry)
// 키: 포켓몬 이름 (예: "Pikachu"), 값: 데이터 객체
export const PokeRegistry: { [name: string]: IPokemonData } = {};

export function LoadPokemonData() {
    try {
        // 배열을 순회하며 레지스트리에 등록
        const list = pokeData.pokedex as unknown as IPokemonData[];
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