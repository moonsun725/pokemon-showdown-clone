// room.ts
import { Server } from 'socket.io';
import { Player } from '../Game/Player.js';
import { Pokemon, createPokemon,} from './pokemon.js';
import type { Move } from './pokemon.js';
import { ResolveStatusEffects } from '../BattleSystem/StatusSystem.js';

export class GameRoom {
    public roomId: string;
    
    // 게임 상태 변수들 (server.ts의 전역 변수들이 멤버 변수가 됨)
// ... class Room ...
    p1: Player | null = null; // 이거 자세한 의미좀 알고 가야겠어
    // >< 의미: "p1 변수는 Player 객체일 수도 있고, 아무도 안 들어와서 null일 수도 있다. 그리고 시작할 때는 null이다."
    p2: Player | null = null;
    public players: { [socketId: string]: 'p1' | 'p2' } = {}; // 소켓ID -> 역할 매핑
    
    private p1MoveIndex: number | null = null; // 이거 인덱스는 p1의 엔트리 멤버가 돌려쓸거니까 크게 상관있진 않음
    private p2MoveIndex: number | null = null;

    constructor(id: string) {
        this.roomId = id;
    }
    // entry : Pokemon[] = [createPokemon("피카츄"), createPokemon("이상해씨")]; // 당장은 더미로 만들어
    // >< 이렇게 만들면 레퍼런스 복사라 플레이어별로 따로 만들어줘야 함

    // 유저 입장 처리
    join(socketId: string): 'p1' | 'p2' | 'spectator'  // 여기 : 'p1' | 'p2' | 'spectator' 의미도 궁금해 >< 저렇게 적으면 오직 저 3가지 글자 중 하나만 반환한다고 보장 (오타 방지에 탁월)
    {
        if (!this.p1) {
            const newParty = [createPokemon("피카츄"), createPokemon("이상해씨")];
            this.p1 = new Player(socketId, newParty)
            this.p1.activePokemon = this.p1.party[0]!; // >< 여기도 일단 느낌표처리
            this.players[socketId] = 'p1';
            return 'p1';
        } else if (!this.p2) {
            const newParty2  = [createPokemon("피카츄"), createPokemon("이상해씨")];
            this.p2 = new Player(socketId, newParty2)
            this.p2.activePokemon = this.p2.party[1]!; // 어쨋든 피카츄 대 이상해씨로 결과는 같다
            this.players[socketId] = 'p2';
            return 'p2';
        }
        return 'spectator';
    }
    
    // 유저 퇴장 처리
    leave(socketId: string) {
        const role = this.players[socketId];
        
        // socketId 매핑 정보 삭제
        delete this.players[socketId];

        if (role === 'p1') {
            this.p1 = null; // 자리 비우기 (객체 삭제)
            this.p1MoveIndex = null; // 선택 정보 초기화
            console.log(`[Room: ${this.roomId}] Player 1 퇴장. 자리가 비었습니다.`);
        } else if (role === 'p2') {
            this.p2 = null;
            this.p2MoveIndex = null;
            console.log(`[Room: ${this.roomId}] Player 2 퇴장. 자리가 비었습니다.`);
        }

        return role; // 누가 나갔는지 반환 (로그용)
    }

    // 공격 예약 처리
    handleAttack(socketId: string, moveIndex: number, io: Server) {
        const role = this.players[socketId];
        if (!role) return;

        if (role === 'p1') this.p1MoveIndex = moveIndex;
        if (role === 'p2') this.p2MoveIndex = moveIndex;

        // ★ 중요: 방 안에 있는 사람들에게만 전송 (io.to)
        io.to(socketId).emit('move_locked'); // >< this.RoomId: 방 전체에 전송, io.to(socketId): 해당 소켓에만 전송

        // 둘 다 선택했는지 확인
        if (this.p1MoveIndex !== null && this.p2MoveIndex !== null) {
            this.resolveTurn(io);
        } else {
            const waiter = role === 'p1' ? 'P1' : 'P2';
            io.to(this.roomId).emit('chat message', `[시스템] ${waiter} 준비 완료!`);
        }
    }

    // 턴 계산 로직 (기존 함수 이식)
    private resolveTurn(io: Server) {
        
        if (!this.p1 || !this.p2) return; // >< 안전장치
        // (!this.p1.activePokemon || !this.p2.activePokemon) 이렇게쓰면 개체가 null이라고 오류남

        // 기술 객체 가져오기 (p1MoveIndex가 null이 아님을 보장해야 함)
        const move1 = this.p1.activePokemon.moves[this.p1MoveIndex!];
        const move2 = this.p2.activePokemon.moves[this.p2MoveIndex!];

        if (!move1 || !move2) return; // 에러 방지 >< : p1, p2, move1, move2가 null일 경우 방지

        let poke1 = this.p1.activePokemon;
        let poke2 = this.p2.activePokemon;
        // 스피드 계산 로직
        let first = poke1;
        let second = poke2;
        let firstMove = move1;
        let secondMove = move2; // 일단은 초깃값을 둔다

        // 우선도 먼저
        const pri1 = move1.priority || 0; // OR연산: 좌측값이 null, undefined, false값이면 우측값 반환
        const pri2 = move2.priority || 0;
        let p1goesFirst = false;

        if(pri1 > pri2)
        {
            p1goesFirst = true;
        }
        else if (pri1 < pri2)
        {
            p1goesFirst = false;
        }
        else
        {
            if(first.speed > second.speed)
                p1goesFirst = true;
            else if (first.speed < second.speed)
                p1goesFirst = false;
            else 
                p1goesFirst = Math.random() < 0.5; // random 함수는 0 <= x <1의 값을 반환 
        }

        if (!p1goesFirst)
        {
            first = poke2; firstMove = move2;
            second = poke1; secondMove = move1;
        }
        // [Step A] 선공의 공격
        first.useMove(first.moves.indexOf(firstMove), second);
        
        // 중간에 죽었는지 체크 (매우 중요!)
        if (second.hp <= 0) {
            console.log(`${second.name} 기절! ${first.name} 승리!`);
            this.resetGame(io); // 게임 종료 처리
            return;
        }

        // [Step B] 후공의 공격
        second.useMove(second.moves.indexOf(secondMove), first);

        // 죽었는지 체크
        if (first.hp <= 0) {
            console.log(`${first.name} 기절! ${second.name} 승리!`);
            this.resetGame(io);
            return;
        }

        // --- 턴 종료 및 상태 업데이트 ---
        // 선택 초기화
        ResolveStatusEffects(first); 
        ResolveStatusEffects(second); // 당장은 행동 순서 기준으로 
        this.p1MoveIndex = null;
        this.p2MoveIndex = null;

        // 모든 클라이언트에게 최신 상태 전송 & 입력 잠금 해제
        io.to(this.roomId).emit('update_ui', { 
            p1: { name: poke1.name, hp: poke1.hp, maxHp: poke1.maxHp, moves: poke1.moves },
            p2: { name: poke2.name, hp: poke2.hp, maxHp: poke2.maxHp, moves: poke2.moves }
        });

        if (poke1.hp <= 0)
        {
            io.to(this.roomId).emit('chat message', `💀 ${poke1.name} 쓰러짐! ${poke2.name} 승리!`);
            this.resetGame(io);
            return;
        }
        if (poke2.hp <= 0)
        {
            io.to(this.roomId).emit('chat message', `💀 ${poke2.name} 쓰러짐! ${poke1.name} 승리!`);
            this.resetGame(io);
            return;
        }

        
        // 클라이언트들에게 "다음 턴 시작해" 신호 (버튼 활성화)
        io.to(this.roomId).emit('turn_start');
    }
    
    resetGame(io: Server) {
    // 간단하게 체력만 원상복구
        if (!this.p1 || !this.p2) return;
        let poke1 = this.p1.activePokemon; // 이게 다 레퍼런스 복사라 가능한거다 이말이야
        let poke2 = this.p2.activePokemon;

        poke1.hp = poke1.maxHp;
        poke2.hp = poke2.maxHp;

        this.p1MoveIndex = null;
        this.p2MoveIndex = null;
        poke1.Rank = {
            atk: 0, 
            def: 0, 
            spd: 0,
            satk: 0,
            sdef: 0,
            acc: 0,
            eva: 0,
            crit: 0
        }
        poke2.Rank = {
            atk: 0, 
            def: 0, 
            spd: 0,
            satk: 0,
            sdef: 0,
            acc: 0,
            eva: 0,
            crit: 0
        }
        
        poke1.status = null;
        poke2.status = null;

        io.to(this.roomId).emit('chat message', `🔄 게임이 재시작되었습니다.`);
        io.to(this.roomId).emit('update_ui', { 
            p1: { name: poke1.name, hp: poke1.hp, maxHp: poke1.maxHp, moves: poke1.moves },
            p2: { name: poke2.name, hp: poke2.hp, maxHp: poke2.maxHp, moves: poke2.moves }
        });
        io.to(this.roomId).emit('turn_start');
    }

    // UI 업데이트 헬퍼
    broadcastState(io: Server) {
        if (!this.p1 || !this.p2) return;
        let poke1 = this.p1.activePokemon;
        let poke2 = this.p2.activePokemon;

        io.to(this.roomId).emit('update_ui', {
            p1: { name: poke1.name, hp: poke1.hp, maxHp: poke1.maxHp, moves: poke1.moves },
            p2: { name: poke2.name, hp: poke2.hp, maxHp: poke2.maxHp, moves: poke2.moves }
        });
    }
}