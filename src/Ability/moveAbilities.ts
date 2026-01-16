
export interface MoveAbiility {
    name: string;
    description: string;
    OnUse(): void;
    OnHit(): void;
    OnDamageCalc(): void;
    OnEndMove(): void;
}

export function ApplyEffect(debuf: string, acc: number): void {
    
}

