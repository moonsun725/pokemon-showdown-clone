import { RankToMultiplier, RankToMultiplierAccEv, RankToMultiplierCrit } from '../03_BattleSystem/Rank.js';
import type { Rank } from '../03_BattleSystem/Rank.js';
import type { Pokemon } from './0_pokemon.js';
export class RankManager
{
    owner: Pokemon;
    constructor(owner: Pokemon)
    {
        this.owner = owner;
    }

    private rank: Rank = {
        atk: 0, 
        def: 0, 
        spa: 0,
        spd: 0,
        spe: 0,
        acc: 0,
        eva: 0,
        crit: 0
    }

    modifyRank(stat: keyof Rank, amount: number): void {
            this.rank[stat] += amount;
            
            // 작성하신 clamp 로직을 여기에 적용 (이미 잘 짜셨습니다!)
            this.rank[stat] = Math.max(-6, Math.min(6, this.rank[stat]));
            
            console.log(`[pokemon]: ${this.owner.name}의 ${stat} 랭크가 ${this.rank[stat]}이 되었다!`);
        }

    reset() :void
    {
        this.rank = {
            atk: 0, def: 0, spa: 0, spd: 0, spe: 0,
            acc: 0, eva: 0, crit: 0 // pokemon.Rank.atk = 0; 이런식으로 해도 되긴하네
        }
    }
    get(stat: keyof Rank)
    {
        return this.rank[stat]
    }

}