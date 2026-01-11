// server.ts
// npx ts-node --esm server.ts
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

// --- 2. 서버 메모리에 게임 상태 저장 (Global State) ---
// 실제 게임에선 방(Room)마다 따로 만들어야 하지만, 지금은 연습용으로 전역 변수에 둡니다.
let p1 = createPokemon("피카츄");
let p2 = createPokemon("파이리");

// 임시: 기술 하나씩 강제로 배우게 하기 (데이터 인덱스 0, 1)
// data.json을 직접 import하거나 pokemon.ts에 기술 배우는 함수를 활용
// 여기선 간단하게직접 주입하지 않고 로직상 있다고 가정하거나, createPokemon 내부에서 처리하면 좋습니다.
// (일단 로직이 복잡해지니, pokemon.ts의 createPokemon 안에 '기본 기술'을 주는 코드를 넣는 걸 추천합니다)

io.on('connection', (socket) => {
    console.log(`플레이어 접속: ${socket.id}`);

    // 3. 접속하자마자 현재 상태(체력 등)를 보내줌 (Sync)
    socket.emit('update_ui', { 
        p1: { name: p1.name, hp: p1.hp},
        p2: { name: p2.name, hp: p2.hp}
    });

    // 4. 클라이언트가 'attack' 명령을 보내면 처리
    socket.on('attack', () => {
        console.log("공격 명령 수신!");

        // 간단한 턴 로직: 피카츄가 파이리를 때림 (하드코딩)
        // 실제론 누가 눌렀는지(socket.id) 확인해서 처리해야 함
        p1.useMove(0, p2); // pokemon.ts에 기술이 없으면 에러납니다! (기술 추가 필요)

        // 5. 변경된 체력 정보를 모든 클라이언트에게 방송(Broadcast)
        io.emit('update_ui', { 
            p1: { name: p1.name, hp: p1.hp},
            p2: { name: p2.name, hp: p2.hp}
        });
        
        // 게임 로그도 전송
        io.emit('chat message', `${p1.name}가 공격했다! ${p2.name}의 체력: ${p2.hp}`);
    });
});

const PORT = 3000;
httpServer.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});