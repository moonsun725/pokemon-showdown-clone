export interface Rank{
    atk: number; // 당장은 공격 수치만 쓸거야
    def: number;
    spd: number;
    satk: number;
    sdef: number;
    acc: number;
    eva: number;
}

export function RankToMultiplier(rank: number): number {
    if (rank >= 0) {
        return (2 + rank) / 2; // 랭크가 0 이상일 때
    } else {
        return 2 / (2 - rank); // 랭크가 음수일 때 
    } 
    // math.min/math.max로도 구현 가능
}

