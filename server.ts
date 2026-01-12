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
p1.showCurrent();
p2.showCurrent();

io.on('connection', (socket) => {
    console.log(`플레이어 접속: ${socket.id}`);

    // 3. 접속 시 UI 업데이트 (moves 정보 추가 전송!)
    socket.emit('update_ui', { 
        p1: { name: p1.name, hp: p1.hp, maxHp: p1.maxHp, moves: p1.moves },
        p2: { name: p2.name, hp: p2.hp, maxHp: p2.maxHp, moves: p2.moves }
    });

   // 공격 명령 수신 (이제 moveIndex를 같이 받습니다)
    socket.on('attack', (moveIndex) => {
        // C++: if (moveIndex < 0 || moveIndex >= moves.size()) return;
        // 유효성 검사 (간단하게)
        if (typeof moveIndex !== 'number') return;

        console.log(`기술 번호 ${moveIndex}번으로 공격 시도`);

        // ★ 임시 룰: 지금은 누가 눌렀든 무조건 "피카츄(P1) -> 파이리(P2)" 공격으로 고정
        // (다음 단계에서 '턴' 개념과 '플레이어 구분'을 넣을 예정)
        
        // pokemon.ts에 moves 인덱스 체크 로직이 있으면 안전
        if (p1.moves[moveIndex]) {
            p1.useMove(moveIndex, p2);
            
            io.emit('chat message', `${p1.name}의 ${p1.moves[moveIndex].name}!`);
        }

        // 상태 업데이트 방송
        io.emit('update_ui', { 
            p1: { name: p1.name, hp: p1.hp, maxHp: p1.maxHp, moves: p1.moves },
            p2: { name: p2.name, hp: p2.hp, maxHp: p2.maxHp, moves: p2.moves }
        });
        
        // 게임 로그도 전송
        io.emit('chat message', `${p1.name}가 공격했다! ${p2.name}의 체력: ${p2.hp}`);
    });
});

const PORT = 3000;
httpServer.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});