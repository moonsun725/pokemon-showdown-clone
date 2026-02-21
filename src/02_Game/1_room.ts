// room.ts
import { Server } from 'socket.io';
import { Player } from './0_Player.js';
import { buildParty } from './Utils/buildParty.js';
import { ResolveStatusEffects } from '../03_BattleSystem/2_StatusSystem.js';

// 행동의 종류: 기술(move) or 교체(switch)
export type ActionType = 'move' | 'switch';

// 상태 머신
type RoomState = 'MOVE_SELECT' | 'BATTLE' | 'FORCE_SWITCH' | 'WAITING_OPPONENT';

// 행동 데이터 구조체
export interface BattleAction {
    type: ActionType;
    index: number; // 기술 번호(0~3) 혹은 파티 번호(0~5)
}

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

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
    join(socketId: string, teamData?: any[]): 'p1' | 'p2' | 'spectator'  // 여기 : 'p1' | 'p2' | 'spectator' 의미도 궁금해 >< 저렇게 적으면 오직 저 3가지 글자 중 하나만 반환한다고 보장 (오타 방지에 탁월)
    {
        if (!this.p1) {
            const newParty = buildParty(teamData); // join 시점에서 인수로 
            this.p1 = new Player(socketId, newParty);
            this.p1.activePokemon = this.p1.party[0]!; // >< 여기도 일단 느낌표처리
            this.players[socketId] = 'p1';
            return 'p1';
        } else if (!this.p2) {
            const newParty2  = buildParty(teamData);
            this.p2 = new Player(socketId, newParty2)
            this.p2.activePokemon = this.p2.party[0]!; // 어쨋든 피카츄 대 이상해씨로 결과는 같다
            this.players[socketId] = 'p2';

            console.log(`[Room: ${this.roomId}] 게임 시작! 선봉 특성 발동`);
        
            // 1. 선봉 포켓몬 특성/아이템 발동
            let activePoke: { player: any, speed: number }[] = [];
            activePoke.push({player: this.p1, speed: this.p1.activePokemon.GetStat('spe')});
            activePoke.push({player: this.p2, speed: this.p2.activePokemon.GetStat('spe')});

            activePoke.sort((a,b)=>{
                if(a.speed !== b.speed)
                {
                    return b.speed-a.speed;
                }
                return Math.random() - 0.5; 
            });
            for (const active of activePoke)
            {
                const p = active.player.activePokemon;
                p.ability.OnSwitchIn();
                // p.item.OnSwitchIn();
            }

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

    private handleForceSwitchInput(socketId: string, action: BattleAction, io: Server) 
    {
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

    private sortActs(p1: Player, p2: Player, act1: BattleAction, act2: BattleAction) : { player: Player, act: BattleAction, speed: number, priority: number }[] 
    {
        const actions = [
            { player: p1, act: act1 },
            { player: p2, act: act2 }
        ];

        const turnOrder = actions.map(({ player, act }) => {
            let priority = 0;
            let speed = player.activePokemon.GetStat('spe');

            if (act.type === 'switch') {
                priority = 6; // 교체 우선도
            } else if (act.type === 'move') {
                // act.index가 기술 인덱스
                const move = player.activePokemon.moves.Get(act.index);
                if (move && move.def.priority) 
                    priority = move.def.priority;
            }

            return { player, act, speed, priority };
        });

        // 정렬 로직 (내림차순)
        turnOrder.sort((a, b) => {
            if (a.priority !== b.priority) {
                return b.priority - a.priority; // 우선도 높은 순
            }
            if (a.speed !== b.speed) {
                return b.speed - a.speed; // 스피드 빠른 순
            }
            return Math.random() - 0.5; // 동속 보정 (스피드 타이)
        });

        return turnOrder;
    }
    // 턴 계산 로직 (기존 함수 이식)
    private async resolveTurn(io: Server) 
    {
        if (this.gameState !== 'BATTLE') return;
        if (!this.p1 || !this.p2 || !this.p1Action || !this.p2Action) return;

        // 1️⃣ 순서 정렬
        const turnOrder = this.sortActs(this.p1, this.p2, this.p1Action, this.p2Action);

        // 2️⃣ 행동 실행
        for (const item of turnOrder) {
            const user = item.player;
            const enemy = (user === this.p1) ? this.p2 : this.p1;
            const action = item.act; // sortActs에서 act를 통째로 가져옴

            // ★ 기절 체크: 내 턴이 오기 전에 이미 기절했으면 행동 불가
            if (user.activePokemon.BattleState.Get() === "FNT") continue;

            // A. 교체 행동
            if (action.type === 'switch') {
                const success = user.switchPokemon(action.index); // index는 포켓몬 슬롯 번호
                if (success) {
                    io.to(this.roomId).emit('chat message', `🔄 ${user.id}는 ${user.activePokemon.name}(으)로 교체했다!`);
                    this.broadcastState(io);
                    await sleep(1000);
                }
            } 
            // B. 공격 행동 (교체가 아닐 때만 실행!)
            else if (action.type === 'move') {
                // 공격 실행 (메시지 출력 등은 useMove 내부나 이펙트 처리에서 담당한다고 가정)
                io.to(this.roomId).emit('chat message', `⚔️ ${user.activePokemon.name}의 공격!`);
                
                user.activePokemon.useMove(action.index, enemy.activePokemon);
                this.broadcastState(io); // HP 갱신
                await sleep(1000);

                // 상대 기절 체크
                if (enemy.activePokemon.BattleState.Get() === "FNT") {
                    io.to(this.roomId).emit('chat message', `💀 ${enemy.activePokemon.name}는 쓰러졌다!`);
                    await sleep(1000);
                    
                    // 게임 종료 또는 강제 교체 페이즈로 전환
                    this.handleFaint(enemy, io);
                    return; // ★ 누군가 쓰러지면 턴 종료 로직(날씨, 상태이상) 스킵하고 교체 화면으로
                }
            }
        }

        // 3️⃣ 턴 종료 페이즈 (날씨, 상태이상 데미지 등)
        this.endTurn(io);
    }

    // 턴 종료 시 공통 처리 (함수로 분리 추천)
    private endTurn(io: Server) {
        console.log(`[room.ts]/[endTurn]: 턴 종료 처리 시작`);
        if (!this.p1 || !this.p2) return;

        let activePoke: { player: any, speed: number }[] = [];
        activePoke.push({player: this.p1, speed: this.p1.activePokemon.GetStat('spe')});
        activePoke.push({player: this.p2, speed: this.p2.activePokemon.GetStat('spe')});

        activePoke.sort((a,b)=>{
            if(a.speed !== b.speed)
            {
                return b.speed-a.speed;
            }
            return Math.random() - 0.5; 
        });
            
        for (const active of activePoke)
        {
            const p = active.player.activePokemon;
            
            p.ability.OnTurnEnd(); // 1. 특성 발동 (가속 등)

            p.item.OnTurnEnd(); // 2. 아이템 발동 (먹다남은음식 등)

            // 3. 기존 로직
            p.volatileList.UpdateTurn(); // 가변상태
            if (p.hp <= 0) continue;
            ResolveStatusEffects(p); // 상태이상
            if (p.hp <= 0) continue;
            
            /* 실제 순서
                날씨 (모래바람/싸라기눈)

                기술 효과 (설치형 기술 등)

                아이템 (먹다남은음식 / 검은진흙)

                가변 상태 (씨뿌리기 / 아쿠아링) ← volatileList

                상태 이상 (독 / 화상) ← ResolveStatusEffects
            */ 
        }
        
        // 행동 초기화
        this.p1Action = null;
        this.p2Action = null;

        // UI 업데이트 및 턴 시작 신호
        this.broadcastState(io);
        
        if(this.p1.activePokemon.BattleState.Get() === "FNT")
        {
            this.handleFaint(this.p1, io);
        } 
        else if (this.p2.activePokemon.BattleState.Get() === "FNT")
        {
            this.handleFaint(this.p2, io);
        }
        else 
        {
            // ====================================================
            // ★ [수정] 다음 턴 시작 및 자동 행동(잠금) 체크 로직
            // ====================================================
            console.log(`[room.ts]/[endTurn]: State (BATTLE -> MOVE_SELECT) / 다음 턴 시작`);
            this.gameState = 'MOVE_SELECT';

            // 1. P1 잠금 확인
            const p1Lock = this.p1.activePokemon.BattleState.lockedMoveIndex;
            if (p1Lock !== null) {
                console.log(`🔒 Player 1 행동 고정: Move ${p1Lock}`);
                // 입력을 기다리지 않고 서버가 바로 행동을 설정
                this.p1Action = { type: 'move', index: p1Lock };
                // 클라이언트에게 UI 잠금 신호 전송
                io.to(this.p1.id).emit('input_locked'); 
            }

            // 2. P2 잠금 확인
            const p2Lock = this.p2.activePokemon.BattleState.lockedMoveIndex;
            if (p2Lock !== null) {
                console.log(`🔒 Player 2 행동 고정: Move ${p2Lock}`);
                this.p2Action = { type: 'move', index: p2Lock };
                io.to(this.p2.id).emit('input_locked');
            }

            // 3. 상황별 처리
            if (this.p1Action && this.p2Action) {
                // Case A: 둘 다 행동 고정 (예: 둘 다 솔라빔 충전 중)
                console.log("⚡ 양쪽 모두 행동 고정 -> 즉시 턴 실행");
                
                // 1초 뒤에 바로 배틀 실행 (입력 단계 스킵)
                setTimeout(() => {
                    this.gameState = 'BATTLE';
                    this.resolveTurn(io);
                }, 1000);
            } 
            else {
                // Case B: 한 명이라도 입력을 해야 함
                // turn_start를 보내서 입력을 받을 수 있는 상태로 만듦
                // (이미 잠긴 플레이어는 input_locked를 받았으므로 클라이언트에서 버튼 비활성화 처리 필요)
                io.to(this.roomId).emit('turn_start');
            }
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
        // 1. 데이터 안전하게 준비 (없으면 null)
        const poke1Data = this.p1 ? this.p1.activePokemon.toData() : null;
        const poke2Data = this.p2 ? this.p2.activePokemon.toData() : null;
        
        // 파티 정보도 안전하게 매핑
        const p1PartyData = this.p1 ? this.p1.party.map(p => p.toData()) : null;
        const p2PartyData = this.p2 ? this.p2.party.map(p => p.toData()) : null;

        io.to(this.roomId).emit('update_ui', {
            p1: { 
                active: poke1Data, // 변환된 데이터 전송
                party: p1PartyData
             },

            p2: { 
                active: poke2Data, // 변환된 데이터 전송
                party: p2PartyData 
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