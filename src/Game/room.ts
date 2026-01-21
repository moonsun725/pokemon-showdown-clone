// room.ts
import { Server } from 'socket.io';
import { Player } from '../Game/Player.js';
import { Pokemon, createPokemon,} from './pokemon.js';
import type { Move } from './pokemon.js';
import { ResolveStatusEffects } from '../BattleSystem/StatusSystem.js';

/*

변수/함수 목록
// 행동 종류
export type ActionType = 'move' | 'switch';

// 방의 상태 종류
type RoomState = 'MOVE_SELECT' | 'BATTLE' | 'FORCE_SWITCH' | 'WAITING_OPPONENT;

// 행동 데이터 구조체
export interface BattleAction {
    type: ActionType;
    index: number; // 기술 번호(0~3) 혹은 파티 번호(0~5)
}

// 게임 로직 
class GameRoom
{
    p1: Player | null = null; 
    p2: Player | null = null;
    public players: { [socketId: string]: 'p1' | 'p2' } = {}; 
    
    private p1Action: BattleAction | null = null;
    private p2Action: BattleAction | null = null;

    // ★ [New] 현재 방의 상태 (기본값: 전투 중)
    public gameState: RoomState = 'BATTLE'; 
    
    // ★ [New] 누가 교체해야 하는지 기억해둘 변수 (기절한 플레이어 ID)
    public faintPlayerId: string | null = null;

    join(socketId: string): 'p1' | 'p2' | 'spectator'
    leave(socketId: string)

    handleAction(socketId: string, action: BattleAction, io: Server)

    private resolveTurn(io: Server)
    private endTurn(io: Server)

    resetGame(io: Server)
    broadcastState(io: Server)
}


*/


// 행동의 종류: 기술(move) or 교체(switch)
export type ActionType = 'move' | 'switch';

// 상태 머신
type RoomState = 'MOVE_SELECT' | 'BATTLE' | 'FORCE_SWITCH' | 'WAITING_OPPONENT';

// 행동 데이터 구조체
export interface BattleAction {
    type: ActionType;
    index: number; // 기술 번호(0~3) 혹은 파티 번호(0~5)
}

export class GameRoom {
    public roomId: string;
    
    // 게임 상태 변수들 (server.ts의 전역 변수들이 멤버 변수가 됨)
    
    // 플레이어 객체 / 포켓몬 객체 생성
    p1: Player | null = null; // 이거 자세한 의미좀 알고 가야겠어
    // >< 의미: "p1 변수는 Player 객체일 수도 있고, 아무도 안 들어와서 null일 수도 있다. 그리고 시작할 때는 null이다."
    p2: Player | null = null;
    public players: { [socketId: string]: 'p1' | 'p2' } = {}; // 소켓ID -> 역할 매핑
    
    private p1Action: BattleAction | null = null;
    private p2Action: BattleAction | null = null;

    // ★ [New] 현재 방의 상태 (기본값: 전투 중)
    public gameState: RoomState = 'MOVE_SELECT'; 
    
    // ★ [New] 누가 교체해야 하는지 기억해둘 변수 (기절한 플레이어 ID)
    public faintPlayerId: string | null = null;

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
            this.p1Action = null; // 선택 정보 초기화
            console.log(`[Room: ${this.roomId}] Player 1 퇴장. 자리가 비었습니다.`);
        } else if (role === 'p2') {
            this.p2 = null;
            this.p2Action = null;
            console.log(`[Room: ${this.roomId}] Player 2 퇴장. 자리가 비었습니다.`);
        }

        return role; // 누가 나갔는지 반환 (로그용)
    }

    // 행동 분할: 공격 and 교체
    handleAction(socketId: string, action: BattleAction, io: Server) {
        // FSM: 현재 상태에 따라 처리 로직을 완전히 분리

        console.log(`[room.ts]/[handleAction]: User(${socketId}) Action: ${action.type}, Current State: ${this.gameState}`);

        switch (this.gameState) {
            case 'MOVE_SELECT':
            case 'WAITING_OPPONENT': // 이 두 상태는 '전투 입력'을 받는 단계
                this.handleBattleInput(socketId, action, io);
                break;

            case 'FORCE_SWITCH': // 기절 교체 대기 중
                this.handleForceSwitchInput(socketId, action, io);
                break;

            case 'BATTLE': // 연산 중일 때는 입력 차단
                return; 
        }
    }

    private handleBattleInput(socketId: string, action: BattleAction, io: Server) {
        const role = this.players[socketId];
        if (!role) return;

        // 1. 이미 선택한 사람이 또 보낸 경우 (WAITING 상태 방어)
        if (role === 'p1' && this.p1Action) return; 
        if (role === 'p2' && this.p2Action) return;

        // 2. 행동 저장
        if (role === 'p1') this.p1Action = action;
        if (role === 'p2') this.p2Action = action;
        
        // UI 잠금 (해당 유저에게만)
        io.to(socketId).emit('input_locked');
        console.log(`[room.ts]/[handleBattleInput]: ${socketId} 입력 잠금 (WAITING_OPPONENT 진입 예상)`);

        // 3. 상태 전이 판단
        if (this.p1Action && this.p2Action) {
            // 둘 다 준비 완료! -> 전투 개시
            this.gameState = 'BATTLE'; // 잠시 배틀 상태로 변경
            console.log(`[room.ts]/[handleBattleInput]: State (WAITING -> BATTLE) / 턴 계산 시작`);
            this.resolveTurn(io);      // 턴 계산 (여기서 다시 MOVE_SELECT나 FORCE_SWITCH로 바뀜)
        } else {
            // 한 명만 준비됨 -> 대기 상태
            console.log(`[room.ts]/[handleBattleInput]: State (MOVE_SELECT -> WAITING_OPPONENT) / 상대 대기 중`);
            this.gameState = 'WAITING_OPPONENT';
            const waiter = role === 'p1' ? 'P1' : 'P2';
            io.to(this.roomId).emit('chat message', `[시스템] ${waiter} 준비 완료!`);
        }
        console.log("[room.ts]/[handleBattleInput]: ",this.gameState);
    }

    private handleFaint(target: Player, io: Server) {
        if (target.hasRemainingPokemon()) {
            // 1. 상태 변경
            console.log(`[room.ts]/[endTurn]: State (${this.gameState} -> FORCE_SWITCH)`);
            this.gameState = 'FORCE_SWITCH';
            
            // 2. ★ [중요] 누가 죽었는지 기억해야 함!
            this.faintPlayerId = target.id; 

            // 3. 요청 전송
            io.to(target.id).emit('force_switch_request');
            io.to(this.roomId).emit('chat message', `[시스템] ${target.id}님이 다음 포켓몬을 고르고 있습니다.`);
            console.log(`[Battle] State changed to FORCE_SWITCH. Waiting for ${target.id}`);

            this.broadcastState(io); // >< 포켓몬이 기절했는데 UI 갱신 처리가 안 되어있었다...

        } else {
            // 전멸 -> 게임 종료 및 리셋
            io.to(this.roomId).emit('chat message', `🏆 ${target.id} 패배! 게임 종료.`);
            this.resetGame(io); 
        }
    }

    private handleForceSwitchInput(socketId: string, action: BattleAction, io: Server) {
        // 1. 교체해야 할 사람이 맞는지 확인
        if (socketId !== this.faintPlayerId) return;

        // 2. 공격(move)은 안됨, 교체(switch)만 허용
        if (action.type !== 'switch') return;

        const player = (this.players[socketId] === 'p1') ? this.p1 : this.p2;
        if (!player) return;

        // 3. 교체 시도
        if (player.switchPokemon(action.index)) {
            
            // 성공 시 상태 복구 -> 다시 기술 선택 단계로
            this.gameState = 'MOVE_SELECT';
            this.faintPlayerId = null; // 초기화

            this.endTurn(io);
        } else {
            // 실패 (이미 기절한 놈 고름 등)
            io.to(socketId).emit('chat message', '비활성 포켓몬입니다. 다시 선택해주세요.');
        }
    }

    // 턴 계산 로직 (기존 함수 이식)
    private resolveTurn(io: Server) {
        
        if(this.gameState != 'BATTLE') return; 
        if (!this.p1 || !this.p2) return; // >< 안전장치
        if (!this.p1Action || !this.p2Action) return;
        // (!this.p1.activePokemon || !this.p2.activePokemon) 이렇게쓰면 개체가 null이라고 오류남

        const p1 = this.p1; // 짧게 쓰고싶으니까
        const p2 = this.p2;
        const act1 = this.p1Action;
        const act2 = this.p2Action;

        // ====================================================
        // 1️⃣ [교체 페이즈] Switching Phase (우선도 최상)
        // ====================================================
        
        // P1 교체 처리
        if (act1.type === 'switch') {
            const success = p1.switchPokemon(act1.index);
            if (success) {
                io.to(this.roomId).emit('chat message', `🔄 Player 1이 ${p1.activePokemon.name}(으)로 교체했다!`);
            }
        }

        // P2 교체 처리
        if (act2.type === 'switch') {
            const success = p2.switchPokemon(act2.index);
            if (success) {
                io.to(this.roomId).emit('chat message', `🔄 Player 2가 ${p2.activePokemon.name}(으)로 교체했다!`);
            }
        }

        // ====================================================
        // 2️⃣ [공격 페이즈] Attacking Phase
        // ====================================================

        // 둘 중 하나라도 공격을 선택했는지 확인
        const p1Attacks = act1.type === 'move';
        const p2Attacks = act2.type === 'move';

        // 둘 다 교체했으면 공격 페이즈는 스킵됨
        if (!p1Attacks && !p2Attacks) {
            this.endTurn(io); // 턴 종료 처리로 직행
            return;
        }
        let attackers: { player: any, moveIndex: number, speed: number, priority: number }[] = [];

        if (p1Attacks) {
            const move = p1.activePokemon.moves[act1.index];
            if (move) {
                attackers.push({ 
                    player: p1, 
                    moveIndex: act1.index, 
                    speed: p1.activePokemon.speed, // (임시) 현재 스피드
                    priority: move.priority || 0 
                });
            }
        }

        if (p2Attacks) {
            const move = p2.activePokemon.moves[act2.index];
            if (move) {
                attackers.push({ 
                    player: p2, 
                    moveIndex: act2.index, 
                    speed: p2.activePokemon.speed, 
                    priority: move.priority || 0 
                });
            }
        }

        // 스피드/우선도 정렬 (내림차순)
        attackers.sort((a, b) => {
            if (a.priority !== b.priority) return b.priority - a.priority; // 우선도 먼저
            if (a.speed !== b.speed) return b.speed - a.speed; // 스피드 다음
            return Math.random() - 0.5; // 동속 랜덤
        });

        // 정렬된 순서대로 공격 실행
        for (const attacker of attackers) {
            const user = attacker.player;
            const enemy = (user === p1) ? p2 : p1; // 상대방 찾기
            
            // ★ 기절 체크: 내 턴이 오기 전에 맞아 죽었으면 공격 못함
            if (user.activePokemon.status === "FNT") continue;

            // 공격 실행
            user.activePokemon.useMove(attacker.moveIndex, enemy.activePokemon);

            // 공격 후 상대가 쓰러졌는지 체크 (게임 종료 로직)
            if (enemy.activePokemon.status === "FNT") {
                io.to(this.roomId).emit('chat message', `💀 ${enemy.activePokemon.name}는 쓰러졌다!`);
                // 여기서 resetGame 혹은 '강제 교체' 페이즈로 넘어가야 함
                this.handleFaint(enemy, io); 
                return; 
            }
            // 원래 실수로 return이 여기 있었음. 그러니까 resolveTurn이 강제 종료 -> endTurn 메서드 호출 실패함...
        }

        // ====================================================
        // 3️⃣ [턴 종료 페이즈] End Phase
        // ====================================================
        this.endTurn(io);
    }

    // 턴 종료 시 공통 처리 (함수로 분리 추천)
    private endTurn(io: Server) {
        console.log(`[room.ts]/[endTurn]: 턴 종료 처리 시작`);
        if (!this.p1 || !this.p2) return;

        // 상태이상 데미지
        ResolveStatusEffects(this.p1.activePokemon);
        ResolveStatusEffects(this.p2.activePokemon); // (오타 주의: p2여야 함) -> ResolveStatusEffects(this.p2.activePokemon);

        // 행동 초기화
        this.p1Action = null;
        this.p2Action = null;

        // UI 업데이트 및 턴 시작 신호
        this.broadcastState(io);
        
        if(this.p1.activePokemon.status === "FNT")
        {
            this.handleFaint(this.p1, io);
        } 
        else if (this.p2.activePokemon.status === "FNT")
        {
            this.handleFaint(this.p2, io);
        }
        else {
            console.log(`[room.ts]/[endTurn]: State (BATTLE -> MOVE_SELECT) / 다음 턴 시작`);
            this.gameState = 'MOVE_SELECT';
            io.to(this.roomId).emit('turn_start');
        }
 
    }


    // 행동 취소 반영 함수
    cancelAction(socketId: string, io: Server)
    {
        if (this.gameState !== 'WAITING_OPPONENT') return; // 아마 이 상황을 볼 일은 없을겁니다(왜냐하면 button.disabled에서 처리를 해주고 있으니 최소한의 안전장치라 생각)

        const role = this.players[socketId];
        if (!role) return;

        // 1. 행동 데이터 삭제
        if (role === 'p1') this.p1Action = null;
        if (role === 'p2') this.p2Action = null;

        // 2. 로그 출력 (선택사항)
        console.log(`[Cancel] ${role} 행동 취소`);

        // 3. (중요) 상대방에게 알림?
        // 보통 포켓몬 쇼다운에서는 상대가 취소했는지 안 알려줍니다. (심리전)
        // 하지만 나한테는 "취소되었습니다"라고 확실히 알려주는 게 좋습니다.
        io.to(socketId).emit('chat message', '✅ 행동을 취소했습니다.');
        this.gameState = 'MOVE_SELECT';
    }

    // UI 업데이트 헬퍼
    broadcastState(io: Server) {
        if (!this.p1 || !this.p2) return;
        let poke1 = this.p1.activePokemon;
        let poke2 = this.p2.activePokemon;

        io.to(this.roomId).emit('update_ui', {
            
            p1: { 
                active : poke1,
                party : this.p1.party
             },

            p2: { active : poke2,
                party : this.p2.party 
            },
            gameState: this.gameState,
            faintPlayerId: this.faintPlayerId
        });
    }

    resetGame(io: Server) {
        // 1. 공통 초기화 로직 (함수로 분리하여 중복 제거)
        const resetPlayerTeam = (player: Player | null) => {
            if (!player) return;

            // ★ forEach 사용법
            // player.party 배열의 모든 요소를 순회하며 'pokemon' 변수에 담아 실행
            player.party.forEach((pokemon)=>{pokemon.ResetCondition()});

            // (4) 선봉 초기화 (다시 1번 타자로 설정)
            // 게임이 리셋됐으니 다시 첫 번째 포켓몬이 나와야겠죠?
            if (player.party.length > 0) {
                player.activePokemon = player.party[0]!;
            }};

        // 2. 양쪽 플레이어 팀 리셋
        resetPlayerTeam(this.p1);
        resetPlayerTeam(this.p2);

        // 3. 행동 선택 정보 초기화
        this.p1Action = null;
        this.p2Action = null;

        this.gameState = 'MOVE_SELECT'; 
        this.faintPlayerId = null;

        // 4. UI 업데이트 및 알림
        io.to(this.roomId).emit('chat message', `🔄 게임이 재시작되었습니다. 모든 포켓몬이 회복되었습니다.`);
            
        // 정보 갱신 (이제 activePokemon이 0번으로 바뀌었으므로 갱신 필수)
        this.broadcastState(io);
            
        // 턴 시작 신호
        io.to(this.roomId).emit('turn_start');
    }
}