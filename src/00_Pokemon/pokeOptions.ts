export interface PokemonOptions {
    moves?: string[]; // 배우고 싶은 기술 이름 목록
    ivs?: { [key: string]: number }; // 개체값 (나중을 위해)
    evs?: { [key: string]: number }; // 노력치
    nature?: string; // 성격
}