// server.ts
import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import path from 'path';
import { fileURLToPath } from 'url';
import { GameRoom } from './Game/room.js'; 
import type { BattleAction } from './Game/room.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer);

app.use(express.static(path.join(__dirname, 'public')));

// 방 관리자 (Map)
const rooms: { [roomId: string]: GameRoom } = {};

// ★ 소켓 ID가 어느 방에 있는지 추적하는 맵 (SocketID -> RoomID)
const socketToRoom: { [socketId: string]: string } = {};

io.on('connection', (socket) => {
    console.log(`[Lobby] 접속: ${socket.id}`);

    // 1. 방 입장 요청 처리 (클라이언트가 'join_game' 이벤트를 보내면 실행)
    socket.on('join_game', (roomId) => {
        // 이미 방에 들어가 있다면 무시하거나 기존 방 나가기 처리 (여기선 생략)
        if (socketToRoom[socket.id]) return;

        console.log(`[System] ${socket.id} 님이 [${roomId}] 방 입장을 요청했습니다.`);

        // Socket.io 룸 입장
        socket.join(roomId);
        socketToRoom[socket.id] = roomId; // 매핑 기록

        // 방 인스턴스 없으면 생성 (Lazy Init)
        if (!rooms[roomId]) {
            console.log(`[System] 새로운 방 생성: ${roomId}`);
            rooms[roomId] = new GameRoom(roomId);
        }

        const room = rooms[roomId];
        const myRole = room.join(socket.id);

        // 결과 전송
        socket.emit('role_assigned', { role: myRole, roomId: roomId });
        
        // 방 전체 알림 & UI 갱신
        io.to(roomId).emit('chat message', `[시스템] 새로운 유저(${myRole})가 입장했습니다.`);
        room.broadcastState(io);
    });

    
    // 2. 행동 요청 처리(공격/교체))
    socket.on('action', (actionData: BattleAction) => {
        // ★ 소켓 맵을 통해 이 유저가 어느 방 소속인지 찾음
        const roomId = socketToRoom[socket.id];

        console.log(`[server.ts]/[socket.on('action')]: Received from ${socket.id} / Type: ${actionData.type}`);

        if (roomId && rooms[roomId]) {
            rooms[roomId].handleAction(socket.id, actionData, io); // 차피 필터링은 handleAction에서 하니까 그냥 넘겨주기만 하면 돼
        }
    });

    // 행동 취소 처리
    socket.on('cancel_action', () => {
    const roomId = socketToRoom[socket.id];
    if (roomId && rooms[roomId]) {
        rooms[roomId].cancelAction(socket.id, io);
    }
    });

    // 3. 퇴장 처리
    socket.on('disconnect', () => {
        const roomId = socketToRoom[socket.id];
        if (roomId && rooms[roomId]) {
            console.log(`[System] 퇴장: ${socket.id} (Room: ${roomId})`);
            
            const room = rooms[roomId];
            const leftRole = room.leave(socket.id);

            if (leftRole === 'p1' || leftRole === 'p2') {
                io.to(roomId).emit('chat message', `[시스템] ${leftRole} 님이 퇴장하여 게임이 초기화됩니다.`);
                room.broadcastState(io);
            }
            
            // 맵에서 삭제
            delete socketToRoom[socket.id];
            
            // 방이 비었으면 방 삭제 (선택 사항: 메모리 관리)
            if (Object.keys(room.players).length === 0) {
                 delete rooms[roomId];
                 console.log(`[System] 방 삭제됨: ${roomId}`);
            }
        }
    });
});

const PORT = 3000;
httpServer.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});