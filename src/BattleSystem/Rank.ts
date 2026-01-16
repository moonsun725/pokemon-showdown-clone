export interface Rank{
    atk: number; // 당장은 공격 수치만 쓸거야
    def: number;
    spd: number;
    satk: number;
    sdef: number;

    acc: number;
    eva: number;
    crit: number;
}

export function RankToMultiplier(rank: number): number {
    if (rank >= 0) {
        return (2 + rank) / 2; // 랭크가 0 이상일 때
    } else {
        return 2 / (2 - rank); // 랭크가 음수일 때 
    } 
    // math.min/math.max로도 구현 가능
}

export function RankToMultiplierAccEv(rank: number): number {
    if (rank >= 0) {
        return (3 + rank) / 3; // 랭크가 0 이상일 때
    } else {
        return 3 / (3 - rank); // 랭크가 음수일 때 
    }
}

export function RankToMultiplierCrit(rank: number): number {
    if (rank <= 0) {
        return 1.0; // 랭크가 0 이하일 때는 변화 없음
    } else if (rank === 1) {
        return 1.33; // 랭크 1일 때
    } else if (rank === 2) {
        return 1.66; // 랭크 2일 때
    } else {
        return 2.0; // 랭크 3 이상일 때
    }
}
