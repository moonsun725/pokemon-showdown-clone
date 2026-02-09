
const socket = io();

// 화면 요소들
const lobbyScreen = document.getElementById('lobby-screen');
const gameScreen = document.getElementById('game-screen');
const roomInput = document.getElementById('room-input');
const btnJoin = document.getElementById('btn-join');
const gameTitle = document.querySelector('#game-screen h1');

// 파티 빌더 요소들
const btnTeambuilder = document.getElementById('btn-teambuilder');
const teambuilderScreen = document.getElementById('teambuilder-screen');
const teamSlotsContainer = document.getElementById('team-slots-container');
const btnSaveTeam = document.getElementById('btn-save-team');

/* **********임시************ */
// ★ [데이터베이스] 구현된 포켓몬/기술/아이템 목록 (실제론 서버에서 받아오거나 파일로 관리)
const AVAILABLE_POKEMON = ["피카츄", "파이리", "꼬부기", "이상해씨", "리자몽", "거북왕", "이상해꽃"];
const AVAILABLE_MOVES = [
    "몸통박치기", "전광석화", "10만볼트", "화염방사", "하이드로펌프", "솔라빔", 
    "지진", "칼춤", "껍질깨기", "맹독", "HP회복", "공중날기", "구멍파기", 
    "플레어드라이브", "용의춤", "용성군", "오물폭탄", "수면가루", "성장", "기가드레인"
];
const AVAILABLE_ITEMS = ["(없음)", "Leftovers", "Life_Orb", "Choice_Scarf"]; // ID로 사용

// ★ [상태] 내 팀 데이터 (기본값)
let myTeam = [
    { name: "피카츄", item: "Leftovers", moves: ["10만볼트", "전광석화", "칼춤", "독가스"] },
    { name: "파이리", item: "Life_Orb", moves: ["화염방사", "공중날기", "용의춤", "지진"] },
    // 나머지는 비워두거나 기본값 채움 (여기선 2마리만 예시)
];

// 게임 UI 요소들
const p1Name = document.getElementById('p1-name');
// ★ [수정] ID 변경됨 (p1-hp -> p1-hp-bar, p1-hp-text)
const p1HpBar = document.getElementById('p1-hp-bar');
const p1HpText = document.getElementById('p1-hp-text');

const p2Name = document.getElementById('p2-name');
// ★ [수정] ID 변경됨
const p2HpBar = document.getElementById('p2-hp-bar');
const p2HpText = document.getElementById('p2-hp-text');

const moveButtonsContainer = document.getElementById('move-buttons');
const switchButton = document.getElementById("change-button");
const discardButton = document.getElementById("discard-button");
const messages = document.getElementById('messages');

const attackPanel = document.getElementById('attack-panel');
const partyPanel = document.getElementById('party-panel');
const btnShowAttack = document.getElementById('btn-show-attack');
const btnShowParty = document.getElementById('btn-show-party');
const btnCancelSwitch = document.getElementById('btn-cancel-switch');

let myRole = '';

// ★ [New] HP 업데이트 헬퍼 함수 (필수!)
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

// 로비 입장
btnJoin.addEventListener('click', () => {
    const roomId = roomInput.value.trim();
    if (!roomId) {
        alert("방 이름을 입력해주세요!");
        return;
    }
    socket.emit('join_game', roomId);
});

// 파티 편집기
// =========================================================
// 1. 화면 전환 로직
// =========================================================
btnTeambuilder.addEventListener('click', () => {
    lobbyScreen.classList.remove('active');
    teambuilderScreen.classList.add('active');
    renderTeamBuilder(); // 화면 열 때마다 UI 갱신
});

btnSaveTeam.addEventListener('click', () => {
    saveTeamData(); // 입력된 값 저장
    teambuilderScreen.classList.remove('active');
    lobbyScreen.classList.add('active');
});

// =========================================================
// 2. 팀 빌더 UI 렌더링 (동적 생성)
// =========================================================
function renderTeamBuilder() {
    teamSlotsContainer.innerHTML = ''; // 초기화

    // 6개 슬롯 생성
    for (let i = 0; i < 6; i++) {
        const member = myTeam[i] || { name: "", item: "", moves: ["", "", "", ""] };
        
        const slotDiv = document.createElement('div');
        slotDiv.className = 'team-slot';
        
        // 2-1. 포켓몬 선택
        let html = `<h4>Slot ${i + 1} ${i===0 ? "(선봉)" : ""}</h4>`;
        html += `<label>포켓몬:</label>`;
        html += `<select class="poke-select">
                    <option value="">(비움)</option>
                    ${AVAILABLE_POKEMON.map(p => `<option value="${p}" ${p === member.name ? 'selected' : ''}>${p}</option>`).join('')}
                 </select>`;

        // 2-2. 아이템 선택
        html += `<label>도구:</label>`;
        html += `<select class="item-select">
                    ${AVAILABLE_ITEMS.map(it => `<option value="${it}" ${it === member.item ? 'selected' : ''}>${it}</option>`).join('')}
                 </select>`;

        // 2-3. 기술 선택 (4개)
        html += `<label>기술:</label>`;
        for (let j = 0; j < 4; j++) {
            const moveVal = member.moves ? member.moves[j] : "";
            html += `<select class="move-select">
                        <option value="">(기술 ${j+1})</option>
                        ${AVAILABLE_MOVES.map(m => `<option value="${m}" ${m === moveVal ? 'selected' : ''}>${m}</option>`).join('')}
                     </select>`;
        }

        slotDiv.innerHTML = html;
        teamSlotsContainer.appendChild(slotDiv);
    }
}

// =========================================================
// 3. 데이터 저장 로직 (UI -> myTeam 배열)
// =========================================================
function saveTeamData() {
    const slots = document.querySelectorAll('.team-slot');
    const newTeam = [];

    slots.forEach(slot => {
        const name = slot.querySelector('.poke-select').value;
        if (!name) return; // 포켓몬 안 골랐으면 스킵

        const item = slot.querySelector('.item-select').value;
        
        const moveSelects = slot.querySelectorAll('.move-select');
        const moves = [];
        moveSelects.forEach(sel => {
            if (sel.value) moves.push(sel.value);
        });

        newTeam.push({
            name: name,
            item: item === "(없음)" ? undefined : item,
            moves: moves
        });
    });

    myTeam = newTeam;
    console.log("팀 저장 완료:", myTeam);
    alert("팀이 저장되었습니다!");
}

// =========================================================
// 4. 입장 요청 수정 (팀 데이터 같이 전송)
// =========================================================
btnJoin.addEventListener('click', () => {
    const roomId = roomInput.value.trim();
    if (!roomId) {
        alert("방 이름을 입력해주세요!");
        return;
    }
    
    if (myTeam.length === 0) {
        if(!confirm("설정된 팀이 없습니다. 기본 렌탈팀을 사용하시겠습니까?")) return;
    }

    // ★ [핵심] 방 ID와 함께 '내 팀 정보'도 보냄!
    socket.emit('join_game', { roomId: roomId, team: myTeam });
});

// 역할 할당
socket.on('role_assigned', (data) => {
    myRole = data.role;
    const currentRoomId = data.roomId;

    lobbyScreen.classList.remove('active');
    gameScreen.classList.add('active');

    let roleText = "관전자 Mode";
    if (myRole === 'p1') roleText = "Player 1";
    else if (myRole === 'p2') roleText = "Player 2";

    gameTitle.innerText = `[${currentRoomId}번 방] - ${roleText}`;
});

// UI 업데이트
socket.on('update_ui', (data) => {
    const gameState = data.gameState;
    const faintId = data.faintPlayerId;

    // ★ [수정] HP 업데이트 로직 변경
    // P1 업데이트
    if (data.p1 && data.p1.active) {
        p1Name.innerText = data.p1.active.name;
        // 기존 innerText 에러 나던 곳 -> 함수 호출로 변경
        updateHpUI(data.p1.active.hp, data.p1.active.maxHp, p1HpBar, p1HpText);
    }
    
    // P2 업데이트
    if (data.p2 && data.p2.active) {
        p2Name.innerText = data.p2.active.name;
        updateHpUI(data.p2.active.hp, data.p2.active.maxHp, p2HpBar, p2HpText);
    }

    // 버튼 초기화
    moveButtonsContainer.innerHTML = '';
    switchButton.innerHTML = '';
    discardButton.innerHTML = '';

    // 기술 버튼 생성 로직
    let myMoves = [];
    if (myRole === 'p1' && data.p1 && data.p1.active) myMoves = data.p1.active.moves;
    else if (myRole === 'p2' && data.p2 && data.p2.active) myMoves = data.p2.active.moves;
    else {
        // 관전자거나 데이터 로딩 전
        return; 
    }

    let myParty = [];
    if (myRole === 'p1' && data.p1.party) myParty = data.p1.party;
    else if (myRole === 'p2' && data.p2.party) myParty = data.p2.party;

    // 강제 교체 상태 처리
    if (gameState === 'FORCE_SWITCH') {
        attackPanel.style.display = 'none';
        partyPanel.style.display = 'block';
        btnShowAttack.disabled = true;
        btnCancelSwitch.style.display = 'none';
    } else {
        btnShowAttack.disabled = false;
        btnCancelSwitch.style.display = 'inline-block';
    }

    // 기술 버튼 생성
    if (myMoves) {
        myMoves.forEach((moveElement, index) => { // MoveIndex -> index로 수정
            const name = moveElement.name;
            const pp = moveElement.currentPp;
            const maxPp = moveElement.maxPp;

            const btn = document.createElement('button');
            btn.innerText = `${name}\n(${pp}/${maxPp})`;

            if (pp <= 0) {
                btn.disabled = true;
                btn.style.backgroundColor = "#ccc";
            }
            btn.style.padding = '10px';
            btn.style.marginRight = '5px';
            btn.style.cursor = 'pointer';

            btn.onclick = () => {
                socket.emit('action', { type: 'move', index: index });
            };
            moveButtonsContainer.appendChild(btn);
        });

        // 교체 버튼
        const Chbtn = document.createElement('button');
        Chbtn.innerText = `교체`;
        Chbtn.style.padding = '10px'; Chbtn.style.marginRight = '5px'; Chbtn.style.cursor = 'pointer';
        
        Chbtn.onclick = () => {
            if (myParty) {
                switchButton.innerHTML = '';
                myParty.forEach((pokemon, entryindex) => {
                    const Pokebtn = document.createElement('button');
                    // pokemon.toData()로 변환된 데이터이므로 active status 등 확인 필요
                    // 일단 hp 정보가 있다고 가정
                    Pokebtn.innerText = `${pokemon.name}\n(${pokemon.hp}/${pokemon.maxHp})`;
                    Pokebtn.style.padding = '10px';
                    Pokebtn.style.marginRight = '5px';
                    Pokebtn.style.cursor = 'pointer';
                    
                    if (pokemon.status == "FNT" || pokemon.hp <= 0) // HP 0 체크 추가
                        Pokebtn.disabled = true;
                        
                    Pokebtn.onclick = () => {
                        socket.emit('action', { type: 'switch', index: entryindex });
                    };
                    switchButton.appendChild(Pokebtn);
                });
            }
        };
        switchButton.appendChild(Chbtn);

        // 취소 버튼
        const Disbtn = document.createElement('button');
        Disbtn.innerText = `취소`;
        Disbtn.style.padding = '10px'; Disbtn.style.marginRight = '5px'; Disbtn.style.cursor = 'pointer';
        
        Disbtn.onclick = () => {
            if (gameState != 'FORCE_SWITCH') {
                const buttons = moveButtonsContainer.querySelectorAll('button');
                buttons.forEach(btn => btn.disabled = false);
                const switchBtns = switchButton.querySelectorAll('button');
                switchBtns.forEach(btn => btn.disabled = false);
                Disbtn.disabled = true;
                
                const li = document.createElement('li');
                li.style.color = "blue";
                li.textContent = "입력을 취소하였습니다.";
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
    const buttons = moveButtonsContainer.querySelectorAll('button');
    buttons.forEach(btn => btn.disabled = true);
    const switchBtns = switchButton.querySelectorAll('button');
    switchBtns.forEach(btn => btn.disabled = true);
    const disBtn = discardButton.querySelectorAll('button');
    disBtn.forEach(btn => btn.disabled = false);
    
    const li = document.createElement('li');
    li.style.color = "blue";
    li.textContent = "⏳ 입력 완료! 상대방 기다리는 중...";
    messages.appendChild(li);
});

socket.on('turn_start', () => {
    const buttons = moveButtonsContainer.querySelectorAll('button');
    buttons.forEach(btn => btn.disabled = false);
    const switchBtns = switchButton.querySelectorAll('button');
    switchBtns.forEach(btn => btn.disabled = false);
});

// 패널 토글 버튼
btnShowAttack.addEventListener('click', () => {
    attackPanel.style.display = 'block';
    partyPanel.style.display = 'none';
});
btnShowParty.addEventListener('click', () => {
    attackPanel.style.display = 'none';
    partyPanel.style.display = 'block';
});
btnCancelSwitch.addEventListener('click', () => {
    attackPanel.style.display = 'block';
    partyPanel.style.display = 'none';
});