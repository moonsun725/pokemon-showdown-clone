import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import path from 'path';
import { fileURLToPath } from 'url';

// ★ 우리가 만든 GameRoom 클래스 가져오기 (확장자 .js 주의!)
import { GameRoom } from './room.js'; 

// 1. 기본 설정 (ES Module 환경에서 경로 변수 만들기)
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 2. 서버 인스턴스 생성
const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer);

// 3. 정적 파일 호스팅 (public 폴더 공개)
app.use(express.static(path.join(__dirname, 'public')));


// ==========================================
// ★ 4. 방 관리자 (Room Manager) - 전역 변수
// ==========================================
// C++: std::map<string, GameRoom*> rooms;
const rooms: { [roomId: string]: GameRoom } = {};

io.on('connection', (socket) => {
    console.log(`[시스템] 접속: ${socket.id}`);

    // --- 5. 방 입장 로직 (Routing) ---
    // 지금은 테스트를 위해 모두가 'room1'이라는 하나의 방으로 들어갑니다.
    // (나중에는 클라이언트에서 roomID를 보내주게 수정 가능)
    const roomId = 'room1';

    socket.join(roomId); // Socket.io의 그룹 기능(채널 입장)

    // 방이 없으면 새로 생성 (Lazy Initialization)
    if (!rooms[roomId]) {
        console.log(`[시스템] 새로운 방 생성: ${roomId}`);
        rooms[roomId] = new GameRoom(roomId);
    }
    
    // 해당 방 인스턴스를 가져옴
    const room = rooms[roomId];

    // 방에 플레이어 추가 요청
    const myRole = room.join(socket.id);

    // 결과 전송
    socket.emit('role_assigned', { role: myRole });
    
    // 방 전체에 알림 & 현재 상태 동기화
    io.to(roomId).emit('chat message', `[시스템] ${socket.id}님이 ${myRole}(으)로 입장했습니다.`);
    room.broadcastState(io);


    // --- 6. 공격 패킷 라우팅 (Packet Dispatching) ---
    socket.on('attack', (moveIndex) => {
        // 유저가 속한 방을 찾아서 해당 방의 handleAttack 함수를 호출
        // (지금은 무조건 room1이지만, 나중엔 socket.rooms를 확인해서 처리)
        if (rooms[roomId]) {
            rooms[roomId].handleAttack(socket.id, moveIndex, io);
        }
    });


    // --- 7. 퇴장 처리 ---
    socket.on('disconnect', () => {
        console.log(`[시스템] 퇴장: ${socket.id}`);
        // 필요하다면 room.leave(socket.id) 등을 구현해서 호출
    });
});

// 8. 서버 리슨 (Port Open)
const PORT = 3000;
httpServer.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});