import { Pokemon, createPokemon } from "../../00_Pokemon/0_pokemon.js";
export function buildParty(data?: any[]): Pokemon[]
{ 
    const party: Pokemon[] = [];
    
    // 데이터가 유효하면 그걸로 생성
    if (data && Array.isArray(data) && data.length > 0) {
        for (const p of data) {
            try {
                // createPokemon 옵션으로 moves, item 전달
                const newPoke = createPokemon(p.name, {
                    moves: p.moves,
                    item: p.item,
                    ability: p.ability
                });
                party.push(newPoke);
            } catch (e) {
                console.error(`[Room] 포켓몬 생성 실패 (${p.name}):`, e);
            }
        }
    }

    // 만약 생성된 게 없으면 (데이터 오류 or 빈 팀) -> 기본 렌탈팀 제공
    if (party.length === 0) {
        console.log("[Room] 렌탈팀을 제공합니다.");
        party.push(createPokemon("피카츄", { moves: ["10만볼트", "전광석화", "울음소리"], item: "Choice_Scarf" }));
        party.push(createPokemon("파이리", { moves: ["화염방사", "공중날기"], item: "Leftovers" }));
    }
    
    return party;
}