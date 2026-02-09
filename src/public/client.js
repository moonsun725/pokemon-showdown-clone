const socket = io();

// 화면 요소들
const lobbyScreen = document.getElementById('lobby-screen');
const gameScreen = document.getElementById('game-screen');
const roomInput = document.getElementById('room-input');
const btnJoin = document.getElementById('btn-join');
const gameTitle = document.querySelector('#game-screen h1');

// 게임 UI 요소들
const p1Name = document.getElementById('p1-name');
const p1Hp = document.getElementById('p1-hp');
const p2Name = document.getElementById('p2-name');
const p2Hp = document.getElementById('p2-hp');
const moveButtonsContainer = document.getElementById('move-buttons');
const switchButton = document.getElementById("change-button"); // 수정
const discardButton = document.getElementById("discard-button"); // 수정 2
const messages = document.getElementById('messages');

const attackPanel = document.getElementById('attack-panel'); // 토글 UI
const partyPanel = document.getElementById('party-panel');
const btnShowAttack = document.getElementById('btn-show-attack');
const btnShowParty = document.getElementById('btn-show-party');
const btnCancelSwitch = document.getElementById('btn-cancel-switch');

let myRole = '';

// ★ [로비] 입장 버튼 클릭 시
btnJoin.addEventListener('click', () => {
    const roomId = roomInput.value.trim();
    if (!roomId) {
        alert("방 이름을 입력해주세요!");
        return;
    }
    // 서버에 입장 요청 전송
    socket.emit('join_game', roomId);
});

// ★ [게임] 역할 할당받으면 화면 전환
socket.on('role_assigned', (data) => {
    myRole = data.role;
    const currentRoomId = data.roomId; // 서버가 같이 보내주게 수정했음

    // 1. 화면 전환 (로비 숨기기, 게임 보이기)
    lobbyScreen.classList.remove('active');
    gameScreen.classList.add('active');

    // 2. 제목 설정
    let roleText = "관전자 Mode";
    if (myRole === 'p1') roleText = "Player 1";
    else if (myRole === 'p2') roleText = "Player 2";

    gameTitle.innerText = `[${currentRoomId}번 방] - ${roleText}`;
});

// ★ [New] HP 업데이트 헬퍼 함수
function updateHpUI(current, max, barElement, textElement) {
    let pct = (current / max) * 100;
    if (pct < 0) pct = 0;

    // 너비 조절
    barElement.style.width = `${pct}%`;
    // 텍스트 업데이트
    textElement.innerText = `${current} / ${max}`;

    // 색상 변경
    barElement.className = 'hp-fill'; // 클래스 초기화
    if (pct > 50) {
        barElement.classList.add('hp-green');
    } else if (pct > 20) {
        barElement.classList.add('hp-yellow');
    } else {
        barElement.classList.add('hp-red');
    }
}

socket.on('update_ui', (data) => {

    const gameState = data.gameState;
    const faintId = data.faintPlayerId; // (필요하면 사용)

    // (선택사항) 디버깅용: 콘솔이나 화면 구석에 상태 표시
    console.log(`Current State: ${gameState}`);

    if (data.p1.active) {
        p1Name.innerText = data.p1.active.name;
        p1Hp.innerText = `HP: ${data.p1.active.hp} / ${data.p1.active.maxHp}`;
    }
    if (data.p2.active) {
        p2Name.innerText = data.p2.active.name;
        p2Hp.innerText = `HP: ${data.p2.active.hp} / ${data.p2.active.maxHp}`;
    }

    moveButtonsContainer.innerHTML = '';
    switchButton.innerHTML = '';
    discardButton.innerHTML = '';


    let myMoves = [];
    if (myRole === 'p1' && data.p1.active) myMoves = data.p1.active.moves;
    else if (myRole === 'p2' && data.p2.active) myMoves = data.p2.active.moves;
    // move 중에서도 이름, 타입, pp만 가져온다
    else {
        if (myRole === '') moveButtonsContainer.innerText = "로딩 중...";
        else moveButtonsContainer.innerText = "관전 중입니다.";
        return;
    }

    let myParty = [] // 이게 맞는지는 잘 모르겠다
    if (myRole === 'p1' && data.p1.party) myParty = data.p1.party;
    else if (myRole === 'p2' && data.p2.party) myParty = data.p2.party;
    else return;

    if (gameState === 'FORCE_SWITCH') {
        // 교체 강제 상태라면?
        // 1) 공격 패널 숨김, 교체 패널 보임
        attackPanel.style.display = 'none';
        partyPanel.style.display = 'block';

        // 2) 탭 전환 버튼이나 취소 버튼 숨겨버리기 (못 도망가게)
        btnShowAttack.disabled = true;
        btnCancelSwitch.style.display = 'none'; // 취소 버튼 숨김

        // 안내 메시지
        if (myRole === 'p1' && faintId === data.p1.id) { // 내 아이디랑 비교해야 하는데 여기선 로직이 좀 복잡할 수 있음
            // 일단 간단히 메시지 처리
        }
    } else {
        // 평상시엔 다시 버튼 활성화
        btnShowAttack.disabled = false;
        btnCancelSwitch.style.display = 'inline-block';
    }

    if (myMoves) { // 있겠지
        myMoves.forEach((moveElement, Moveindex) => {
            const name = moveElement.name; // 이제 데이터 / 실수치 구분할 필요 없음
            const type = moveElement.type // toData에서 묶어서 보내주거든
            const pp = moveElement.currentPp;
            const maxPp = moveElement.maxPp;

            const btn = document.createElement('button');

            // 버튼 텍스트에 PP 표시
            btn.innerText = `${name}\n(${pp}/${maxPp})`;

            // PP 없으면 비활성화
            if (pp <= 0) {
                btn.disabled = true;
                btn.style.backgroundColor = "#ccc"; // 회색 처리
            }
            btn.style.padding = '10px';
            btn.style.marginRight = '5px';
            btn.style.cursor = 'pointer';

            btn.onclick = () => {
                console.log(`[index.html]/[MoveBtn.onclick]: emit 'action' (move: ${Moveindex})`);
                socket.emit('action', { type: 'move', index: Moveindex });
            };
            moveButtonsContainer.appendChild(btn);
        });
        const Chbtn = document.createElement('button');
        Chbtn.innerText = `교체`;
        Chbtn.style.padding = '10px';
        Chbtn.style.marginRight = '5px';
        Chbtn.style.cursor = 'pointer';
        Chbtn.onclick = () => {
            if (myParty) {
                switchButton.innerHTML = '';
                myParty.forEach((pokemon, entryindex) => {
                    const Pokebtn = document.createElement('button');
                    Pokebtn.innerText = `${pokemon.name}\n(${pokemon.hp}/${pokemon.maxHp})`;
                    Pokebtn.style.padding = '10px';
                    Pokebtn.style.marginRight = '5px';
                    Pokebtn.style.cursor = 'pointer';
                    if (pokemon.status == "FNT")
                        Pokebtn.disabled = true;
                    Pokebtn.onclick = () => {
                        console.log(`[index.html]/[PokeBtn.onclick]: emit 'action' (switch: ${entryindex})`);
                        socket.emit('action', { type: 'switch', index: entryindex });
                    };
                    switchButton.appendChild(Pokebtn);
                });
            }
        };
        switchButton.appendChild(Chbtn);

        const Disbtn = document.createElement('button');
        Disbtn.innerText = `취소`;
        Disbtn.style.padding = '10px';
        Disbtn.style.marginRight = '5px';
        Disbtn.style.cursor = 'pointer';
        Disbtn.onclick = () => {
            if (gameState != 'FORCE_SWITCH') {
                const buttons = moveButtonsContainer.querySelectorAll('button');
                buttons.forEach(btn => btn.disabled = false);

                const switchBtns = switchButton.querySelectorAll('button');
                switchBtns.forEach(btn => btn.disabled = false); // 교체 버튼

                Disbtn.disabled = true;

                const li = document.createElement('li');
                li.style.color = "blue";
                li.textContent = "입력을 취소하였습니다."
                messages.appendChild(li);
                socket.emit('cancel_action');
            }
        };
        discardButton.appendChild(Disbtn);
        Disbtn.disabled = true;
    }
});

socket.on('chat message', (msg) => {
    const item = document.createElement('li');
    item.textContent = msg;
    messages.appendChild(item);
    window.scrollTo(0, document.body.scrollHeight);
});

socket.on('input_locked', () => {
    const buttons = moveButtonsContainer.querySelectorAll('button'); // >< 버튼 활성화/비활성화 코드
    buttons.forEach(btn => btn.disabled = true); // 행동 버튼
    const switchBtns = switchButton.querySelectorAll('button');
    switchBtns.forEach(btn => btn.disabled = true); // 교체 버튼
    const disBtn = discardButton.querySelectorAll('button');
    disBtn.forEach(btn => btn.disabled = false); // 취소 버튼
    const li = document.createElement('li');
    li.style.color = "blue";
    li.textContent = "⏳ 입력 완료! 상대방 기다리는 중...";
    messages.appendChild(li);
});

socket.on('turn_start', () => {
    const buttons = moveButtonsContainer.querySelectorAll('button');
    buttons.forEach(btn => btn.disabled = false); // >< 버튼 활성화/비활성화 코드

    const switchBtns = switchButton.querySelectorAll('button');
    switchBtns.forEach(btn => btn.disabled = false);
});

// [공격] 버튼 클릭 시
btnShowAttack.addEventListener('click', () => {
    attackPanel.style.display = 'block';
    partyPanel.style.display = 'none';
});

// [포켓몬] 버튼 클릭 시
btnShowParty.addEventListener('click', () => {
    attackPanel.style.display = 'none';
    partyPanel.style.display = 'block';
});

// 교체 패널 안의 [취소] 버튼
btnCancelSwitch.addEventListener('click', () => {
    attackPanel.style.display = 'block';
    partyPanel.style.display = 'none';
});