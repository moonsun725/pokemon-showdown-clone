// npx ts-node --esm server.ts : 터미널에서 이거로 실행 ㄱㄱ
import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import path from 'path';
import { fileURLToPath } from 'url';

// 1. 우리가 만든 게임 로직 가져오기
// 주의: ESM 환경에서는 .ts 파일이라도 import 할 때 .js 확장자를 붙여야 인식될 때가 많습니다.
// (ts-node 설정에 따라 다르지만, 표준은 .js 혹은 확장자 생략입니다. 에러나면 .ts로 바꿔보세요)
import { createPokemon } from './pokemon.ts'; 

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer);

app.use(express.static(path.join(__dirname, 'public')));

let player1Id: string | null = null;
let player2Id: string | null = null;
let p1 = createPokemon("피카츄");
let p2 = createPokemon("파이리");

// 각 플레이어의 선택을 임시로 저장
let p1MoveIndex: number | null = null;
let p2MoveIndex: number | null = null;

// --- 2. 서버 메모리에 게임 상태 저장 (Global State) ---
// 실제 게임에선 방(Room)마다 따로 만들어야 하지만, 지금은 연습용으로 전역 변수에 둡니다.
io.on('connection', (socket) => {
    console.log(`새로운 접속자: ${socket.id}`);

    // ★ 2. 빈자리 찾아서 역할 배정 (Role Assignment)
    let myRole = 'spectator'; // 기본은 관전자

    if (!player1Id) {
        player1Id = socket.id;
        myRole = 'player1';
        console.log(`[시스템] ${socket.id} 님이 Player 1 (피카츄)로 배정되었습니다.`);
    } else if (!player2Id) {
        player2Id = socket.id;
        myRole = 'player2';
        console.log(`[시스템] ${socket.id} 님이 Player 2 (파이리)로 배정되었습니다.`);
    } else {
        console.log(`[시스템] ${socket.id} 님은 관전자입니다.`);
    }

    // ★ 3. 클라이언트에게 "너는 누구다"라고 알려줌
    socket.emit('role_assigned', { role: myRole });

    // UI 정보 전송 (기존 코드)
    socket.emit('update_ui', { 
        p1: { name: p1.name, hp: p1.hp, maxHp: p1.maxHp, moves: p1.moves },
        p2: { name: p2.name, hp: p2.hp, maxHp: p2.maxHp, moves: p2.moves }
    });

    // 공격 처리 (로직 변경됨)
    socket.on('attack', (moveIndex) => {
        // 유효성 검사
        if (typeof moveIndex !== 'number') return;

        // ★ 2. 기술을 바로 쓰지 않고 "예약"만 함
        let role = '';
        if (socket.id === player1Id) {
            role = 'P1';
            p1MoveIndex = moveIndex; // P1의 선택 저장
        } else if (socket.id === player2Id) {
            role = 'P2';
            p2MoveIndex = moveIndex; // P2의 선택 저장
        } else {
            return; // 관전자 무시
        }

        console.log(`[Turn] ${role} 선택 완료 (기술 번호: ${moveIndex})`);
        
        // "선택 완료되었습니다" 메시지 전송 (UI 잠금용)
        socket.emit('move_locked');

        // ★ 3. 두 명 다 선택했는지 확인 (Check Conditions)
        if (p1MoveIndex !== null && p2MoveIndex !== null) {
            console.log("== 두 명 다 선택함! 턴 계산 시작 ==");
            resolveTurn();
        } else {
            // 한 명만 선택한 경우: "상대방 기다리는 중..." 메시지 방송
            io.emit('chat message', `[시스템] ${role} 준비 완료! 상대방을 기다리는 중...`);
        }
    });

    // 접속 종료 처리 (자리가 비면 null로 초기화)
    socket.on('disconnect', () => {
        if (socket.id === player1Id) {
            player1Id = null;
            console.log("Player 1 퇴장. 자리가 비었습니다.");
        } else if (socket.id === player2Id) {
            player2Id = null;
            console.log("Player 2 퇴장. 자리가 비었습니다.");
        }
    });
});

// ★ 4. 턴 계산 및 실행 함수 (Game Loop Logic)
function resolveTurn() {
    // 기술 객체 가져오기 (p1MoveIndex가 null이 아님을 보장해야 함)
    const move1 = p1.moves[p1MoveIndex!];
    const move2 = p2.moves[p2MoveIndex!];

    if (!move1 || !move2) return; // 에러 방지

    // 스피드 계산 로직 (지금은 간단하게 무조건 P1 선공, 나중에 speed 비교 추가)
    // 순서: P1 공격 -> P2 생존 확인 -> P2 공격
    
    // --- Phase 1: P1 공격 ---
    io.emit('chat message', `⚡ ${p1.name}의 ${move1.name}!`);
    p1.useMove(p1MoveIndex!, p2); // pokemon.ts의 useMove 호출

    if (p2.hp <= 0) {
        io.emit('chat message', `🏆 ${p2.name} 쓰러짐! ${p1.name} 승리!`);
        resetGame(); // 게임 초기화 함수 (아래 구현)
        return;
    }

    // --- Phase 2: P2 공격 ---
    io.emit('chat message', `🔥 ${p2.name}의 ${move2.name}!`);
    p2.useMove(p2MoveIndex!, p1);

    if (p1.hp <= 0) {
        io.emit('chat message', `🏆 ${p1.name} 쓰러짐! ${p2.name} 승리!`);
        resetGame();
        return;
    }

    // --- Phase 3: 턴 종료 및 상태 업데이트 ---
    // 선택 초기화
    p1MoveIndex = null;
    p2MoveIndex = null;

    // 모든 클라이언트에게 최신 상태 전송 & 입력 잠금 해제
    io.emit('update_ui', { 
        p1: { name: p1.name, hp: p1.hp, maxHp: p1.maxHp, moves: p1.moves },
        p2: { name: p2.name, hp: p2.hp, maxHp: p2.maxHp, moves: p2.moves }
    });
    
    // 클라이언트들에게 "다음 턴 시작해" 신호 (버튼 활성화)
    io.emit('turn_start');
}

function resetGame() {
    // 간단하게 체력만 원상복구
    p1.hp = p1.maxHp;
    p2.hp = p2.maxHp;
    p1MoveIndex = null;
    p2MoveIndex = null;
    
    io.emit('chat message', `🔄 게임이 재시작되었습니다.`);
    io.emit('update_ui', { 
        p1: { name: p1.name, hp: p1.hp, maxHp: p1.maxHp, moves: p1.moves },
        p2: { name: p2.name, hp: p2.hp, maxHp: p2.maxHp, moves: p2.moves }
    });
    io.emit('turn_start');
}

const PORT = 3000;
httpServer.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});