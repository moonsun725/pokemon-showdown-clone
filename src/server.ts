// server.ts
import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import path from 'path';
import { fileURLToPath } from 'url';
import { GameRoom } from './02_Game/1_room.js'; 
import type { BattleAction } from './02_Game/1_room.js';
import { MoveRegistry, LoadMoves } from './01_Moves/1_MoveLoader.js';
import { PokeRegistry, LoadPokemonData } from './00_Pokemon/1_pokeLoader.js';
import { ItemRegistry } from './04_Ability/ItemAbilities.js'; 
import { AbilityRegistry } from './04_Ability/PassiveAbilities.js';

LoadPokemonData();
LoadMoves(); // 위치 상관없다니까...?

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer);

app.use(express.static(path.join(__dirname, '../public')));

// 방 관리자 (Map)
const rooms: { [roomId: string]: GameRoom } = {};

// ★ 소켓 ID가 어느 방에 있는지 추적하는 맵 (SocketID -> RoomID)
const socketToRoom: { [socketId: string]: string } = {};

io.on('connection', (socket) => {
    console.log(`[Lobby] 접속: ${socket.id}`);

    // 1. 방 입장 요청 처리 (클라이언트가 'join_game' 이벤트를 보내면 실행)
    socket.on('join_game', (data) => {
        // 1. 초기값 선언
        let roomId = "";
        let teamData = null;

        // 2. 타입에 따른 분기 (심플 이즈 베스트)
        if (typeof data === 'string') {
            // 예전 방식: 방 제목만 보냈을 때
            roomId = data;
            console.log(`[Server] 단순 입장: ${roomId}`);
        } else {
            // 새 방식: 객체({ roomId, team })로 보냈을 때
            roomId = data.roomId;
            teamData = data.team;
            console.log(`[Server] 팀 데이터 입장: ${roomId} (팀원: ${teamData?.length || 0}명)`);
        }

        if (socketToRoom[socket.id]) return;
        console.log(`[System] ${socket.id} 님이 [${roomId}] 방 입장을 요청했습니다.`);

        // Socket.io 룸 입장
        socket.join(roomId);
        socketToRoom[socket.id] = roomId; // 매핑 기록

        // 1. 일단 가져와봄
        let room = rooms[roomId];

        // 2. 없으면 만들어서 넣고, 변수에도 할당
        if (!room) {
            console.log(`[System] 새로운 방 생성: ${roomId}`);
            room = new GameRoom(roomId);
            rooms[roomId] = room;
        }

        console.log(`[server]/join_game: 파티 데이터 확인 ${teamData}`);
        // 3. 이제 room은 무조건 GameRoom 타입임 (undefined 아님)
        const myRole = room.join(socket.id, teamData);

        // 결과 전송
        socket.emit('role_assigned', { role: myRole, roomId: roomId });
        
        // 방 전체 알림 & UI 갱신
        io.to(roomId).emit('chat message', `[시스템] 새로운 유저(${myRole})가 입장했습니다.`);
        room.broadcastState(io);
    });

    
    socket.on('get_database', () => {
        console.log(`[Server] ${socket.id}에게 게임 데이터 전송 중...`);

        // 전체 데이터를 다 보내면 너무 크니까, 이름(name)이나 ID만 추려서 보냅니다.
        // (나중에 상세 스탯이 필요하면 그때 구조를 바꾸면 됩니다)
        const payload = {
            pokemon: Object.keys(PokeRegistry), // ★ Pokedex 키만 보내면 끝!
            moves: Object.keys(MoveRegistry),
            
            // 아이템은 객체(Registry) 형태라서 키(Key)나 name 속성을 추출
            items: Object.keys(ItemRegistry),
            abilities: Object.keys(AbilityRegistry)
        };

        socket.emit('database_data', payload);
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

const PORT = process.env.PORT || 3000; 

httpServer.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});