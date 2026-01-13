// server.ts
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
        p1: { name: p1.name, hp: p1.hp, moves: p1.moves },
        p2: { name: p2.name, hp: p2.hp, moves: p2.moves }
    });

    // 공격 처리
    socket.on('attack', (moveIndex) => {
        // ★ 4. 권한 검증 (Server Authority)
        // 요청 보낸 사람이 해당 포켓몬의 주인이 맞는지 확인
        if (myRole === 'player1' && socket.id === player1Id) {
            // P1의 턴 처리 (피카츄가 공격)
            if (p1.moves[moveIndex]) {
                console.log(`P1(${p1.name}) 공격 시도`);
                p1.useMove(moveIndex, p2);
                io.emit('chat message', `${p1.name}의 ${p1.moves[moveIndex].name}!`);
            }
        } 
        else if (myRole === 'player2' && socket.id === player2Id) {
            // P2의 턴 처리 (파이리가 공격)
            if (p2.moves[moveIndex]) {
                console.log(`P2(${p2.name}) 공격 시도`);
                p2.useMove(moveIndex, p1);
                io.emit('chat message', `${p2.name}의 ${p2.moves[moveIndex].name}!`);
            }
        } 
        else {
            console.log(`[경고] 권한 없는 유저(${socket.id})의 공격 시도 차단됨.`);
            return; // 해킹 시도 or 관전자의 클릭 무시
        }

        // 결과 방송
        io.emit('update_ui', { 
            p1: { name: p1.name, hp: p1.hp, moves: p1.moves },
            p2: { name: p2.name, hp: p2.hp, moves: p2.moves }
        });
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

const PORT = 3000;
httpServer.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});