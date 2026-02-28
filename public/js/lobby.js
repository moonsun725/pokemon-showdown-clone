// js/lobby.js
import { socket } from './network.js';
import { myTeam } from './teambuilder.js'; // ★ 팀 데이터 가져오기

// DOM 요소
const lobbyScreen = document.getElementById('lobby-screen');
const gameScreen = document.getElementById('game-screen');
const roomInput = document.getElementById('room-input');
const btnJoin = document.getElementById('btn-join');
const gameTitle = document.querySelector('#game-screen h1');

export function initLobby() {
    // 입장 버튼 클릭
    btnJoin.addEventListener('click', () => {
        const roomId = roomInput.value.trim();
        if (!roomId) {
            alert("방 이름을 입력해주세요!");
            return;
        }
        
        // 서버로 입장 요청 (팀 데이터 포함)
        socket.emit('join_game', { roomId: roomId, team: myTeam });
    });

    // 역할 배정 받으면 게임 화면으로 이동
    socket.on('role_assigned', (data) => {
        const myRole = data.role;
        const currentRoomId = data.roomId;

        lobbyScreen.classList.remove('active');
        gameScreen.classList.add('active');

        let roleText = "관전자 Mode";
        if (myRole === 'p1') roleText = "Player 1";
        else if (myRole === 'p2') roleText = "Player 2";

        gameTitle.innerText = `[${currentRoomId}번 방] - ${roleText}`;
        
        // Battle 모듈에게 내 역할을 알려주기 위해 이벤트를 다시 발생시키거나
        // 전역 상태 관리를 해야 하는데, 일단은 Battle.js도 같은 이벤트를 듣게 하면 됩니다.
    });
}