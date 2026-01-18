// room.ts
import { Server } from 'socket.io';
import { Pokemon, createPokemon,} from './pokemon.js';
import type { Move } from './pokemon.js';
import { ResolveStatusEffects } from '../BattleSystem/StatusSystem.js';

export class GameRoom {
    public roomId: string;
    
    // 게임 상태 변수들 (server.ts의 전역 변수들이 멤버 변수가 됨)
    public p1: Pokemon | null = null;
    public p2: Pokemon | null = null;
    public players: { [socketId: string]: 'p1' | 'p2' } = {}; // 소켓ID -> 역할 매핑
    
    private p1MoveIndex: number | null = null;
    private p2MoveIndex: number | null = null;

    constructor(id: string) {
        this.roomId = id;
    }

    // 유저 입장 처리
    join(socketId: string): 'p1' | 'p2' | 'spectator' {
        if (!this.p1) {
            this.p1 = createPokemon("피카츄"); // 나중엔 유저가 고른 걸로 변경 가능
            this.players[socketId] = 'p1';
            return 'p1';
        } else if (!this.p2) {
            this.p2 = createPokemon("이상해씨");
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

        // 기술 객체 가져오기 (p1MoveIndex가 null이 아님을 보장해야 함)
        const move1 = this.p1.moves[this.p1MoveIndex!];
        const move2 = this.p2.moves[this.p2MoveIndex!];

        if (!move1 || !move2) return; // 에러 방지 >< : p1, p2, move1, move2가 null일 경우 방어

        // 스피드 계산 로직
        let first: { mon: any, move: any, target: any, role: string };
        let second: { mon: any, move: any, target: any, role: string };

        // P1이 더 빠르거나, 스피드가 같으면 랜덤으로 P1 선공 (Speed Tie)
        if (this.p1.speed > this.p2.speed || (this.p1.speed === this.p2.speed && Math.random() < 0.5)) {
            first = { mon: this.p1, move: move1, target: this.p2, role: 'P1' };
            second = { mon: this.p2, move: move2, target: this.p1, role: 'P2' };
        } else {
            first = { mon: this.p2, move: move2, target: this.p1, role: 'P2' };
            second = { mon: this.p1, move: move1, target: this.p2, role: 'P1' };
        }
        
        // --- 선공 ---
        io.to(this.roomId).emit('chat message', `💨 ${first.mon.name}이(가) 더 빠르다!`);
        io.to(this.roomId).emit('chat message', `⚔️ ${first.mon.name}의 ${first.move.name}!`);
        first.mon.useMove(first.mon.moves.indexOf(first.move), first.target);

        if (first.target.hp <= 0) {
            io.to(this.roomId).emit('chat message', `💀 ${first.target.name} 쓰러짐! ${first.role} 승리!`);
            this.resetGame(io);
            return;
        }

        // --- 후공 ---
        io.to(this.roomId).emit('chat message', `⚔️ ${second.mon.name}의 ${second.move.name}!`);
        second.mon.useMove(second.mon.moves.indexOf(second.move), second.target);

        if (second.target.hp <= 0) {
            io.to(this.roomId).emit('chat message', `💀 ${second.target.name} 쓰러짐! ${second.role} 승리!`);
            this.resetGame(io);
            return;
        }

        // --- Phase 3: 턴 종료 및 상태 업데이트 ---
        // 선택 초기화
        ResolveStatusEffects(this.p1);
        ResolveStatusEffects(this.p2);
        this.p1MoveIndex = null;
        this.p2MoveIndex = null;

        // 모든 클라이언트에게 최신 상태 전송 & 입력 잠금 해제
        io.to(this.roomId).emit('update_ui', { 
            p1: { name: this.p1.name, hp: this.p1.hp, maxHp: this.p1.maxHp, moves: this.p1.moves },
            p2: { name: this.p2.name, hp: this.p2.hp, maxHp: this.p2.maxHp, moves: this.p2.moves }
        });

        if (this.p1.hp <= 0)
        {
            io.to(this.roomId).emit('chat message', `💀 ${first.target.name} 쓰러짐! ${first.role} 승리!`);
            this.resetGame(io);
            return;
        }
        if (this.p2.hp <= 0)
        {
            io.to(this.roomId).emit('chat message', `💀 ${second.target.name} 쓰러짐! ${second.role} 승리!`);
            this.resetGame(io);
            return;
        }

        
        // 클라이언트들에게 "다음 턴 시작해" 신호 (버튼 활성화)
        io.to(this.roomId).emit('turn_start');
    }
    
    resetGame(io: Server) {
    // 간단하게 체력만 원상복구
        if (!this.p1 || !this.p2) return;
        this.p1.hp = this.p1.maxHp;
        this.p2.hp = this.p2.maxHp;
        this.p1MoveIndex = null;
        this.p2MoveIndex = null;
        
        io.to(this.roomId).emit('chat message', `🔄 게임이 재시작되었습니다.`);
        io.to(this.roomId).emit('update_ui', { 
            p1: { name: this.p1.name, hp: this.p1.hp, maxHp: this.p1.maxHp, moves: this.p1.moves },
            p2: { name: this.p2.name, hp: this.p2.hp, maxHp: this.p2.maxHp, moves: this.p2.moves }
        });
        io.to(this.roomId).emit('turn_start');
    }

    // UI 업데이트 헬퍼
    broadcastState(io: Server) {
        if (!this.p1 || !this.p2) return;
        io.to(this.roomId).emit('update_ui', {
            p1: { name: this.p1.name, hp: this.p1.hp, maxHp: this.p1.maxHp, moves: this.p1.moves },
            p2: { name: this.p2.name, hp: this.p2.hp, maxHp: this.p2.maxHp, moves: this.p2.moves }
        });
    }
}