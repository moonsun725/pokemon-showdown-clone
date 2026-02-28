// js/battle.js
import { socket } from './network.js';

// DOM 요소들 (너무 많아서 주요 요소만 예시)
const p1Name = document.getElementById('p1-name');
const p1Sprite = document.getElementById('p1-sprite');
const p1HpBar = document.getElementById('p1-hp-bar');
const p1HpText = document.getElementById('p1-hp-text');
const p2Name = document.getElementById('p2-name');
const p2Sprite = document.getElementById('p2-sprite');
const p2HpBar = document.getElementById('p2-hp-bar');
const p2HpText = document.getElementById('p2-hp-text');

const moveButtonsContainer = document.getElementById('move-buttons');
const switchButton = document.getElementById("change-button");
const discardButton = document.getElementById("discard-button");
const messages = document.getElementById('messages');
const tooltip = document.getElementById('game-tooltip');

const attackPanel = document.getElementById('attack-panel');
const partyPanel = document.getElementById('party-panel');
const btnShowAttack = document.getElementById('btn-show-attack');
const btnShowParty = document.getElementById('btn-show-party');
const btnCancelSwitch = document.getElementById('btn-cancel-switch');

// 상태 변수
let myRole = '';
let p1ActiveData = null;
let p2ActiveData = null;

// ID 매핑 (임시)
const ID_MAP = { "피카츄": "pikachu", "파이리": "charmander", "꼬부기": "squirtle", "이상해씨": "bulbasaur", "리자몽": "charizard", "거북왕": "blastoise", "이상해꽃": "venusaur" };

export function initBattle() {
    // 1. 역할 확인 (Lobby와 같이 듣음)
    socket.on('role_assigned', (data) => {
        myRole = data.role;
    });

    // 2. UI 업데이트 (핵심)
    socket.on('update_ui', (data) => {
        renderBattleUI(data);
    });

    // 3. 채팅/로그
    socket.on('chat message', (msg) => {
        addLog(msg);
    });

    // 4. 툴팁 이벤트 연결
    addTooltipEvents(p1Sprite, () => p1ActiveData);
    addTooltipEvents(p2Sprite, () => p2ActiveData);
    
    // 5. 기타 버튼 이벤트들...
    // (discardButton, input_locked, turn_start 등 기존 코드 유지)
}

// =======================
// 헬퍼 함수들 (UI 렌더링)
// =======================

function renderBattleUI(data) {
    const gameState = data.gameState;
    
    // P1 업데이트
    if (data.p1 && data.p1.active) {
        p1ActiveData = data.p1.active;
        p1Name.innerText = data.p1.active.name;
        p1Sprite.src = getSpriteUrl(data.p1.active.name);
        updateHpUI(data.p1.active.hp, data.p1.active.maxHp, p1HpBar, p1HpText);
    }
    // P2 업데이트
    if (data.p2 && data.p2.active) {
        p2ActiveData = data.p2.active;
        p2Name.innerText = data.p2.active.name;
        p2Sprite.src = getSpriteUrl(data.p2.active.name);
        updateHpUI(data.p2.active.hp, data.p2.active.maxHp, p2HpBar, p2HpText);
    }

    // 기술 버튼 생성 로직
    updateActionButtons(data, gameState);
}

function updateActionButtons(data, gameState) {
    moveButtonsContainer.innerHTML = '';
    switchButton.innerHTML = '';
    
    let myData = (myRole === 'p1') ? data.p1 : data.p2;
    if (!myData || !myData.active) return; // 관전자거나 데이터 없음

    // 기술 버튼
    myData.active.moves.forEach((move, idx) => {
        const btn = document.createElement('button');
        btn.innerText = `${move.name}\n(${move.currentPp}/${move.maxPp})`;
        if (move.currentPp <= 0) btn.disabled = true;
        
        btn.onclick = () => socket.emit('action', { type: 'move', index: idx });
        moveButtonsContainer.appendChild(btn);
    });

    // 교체 버튼 (파티 목록 순회)
    if (myData.party) {
        const switchBtnContainer = document.createElement('div'); // 임시 컨테이너
        myData.party.forEach((poke, idx) => {
            const btn = document.createElement('button');
            btn.innerText = `${poke.name} (${poke.hp})`;
            if (poke.hp <= 0 || poke.name === myData.active.name) btn.disabled = true;

            btn.onclick = () => socket.emit('action', { type: 'switch', index: idx });
            switchButton.appendChild(btn);
        });
    }
}

function updateHpUI(current, max, bar, text) {
    const pct = Math.max(0, (current / max) * 100);
    bar.style.width = `${pct}%`;
    text.innerText = `${current} / ${max}`;
    
    bar.className = 'hp-fill';
    if (pct > 50) bar.classList.add('hp-green');
    else if (pct > 20) bar.classList.add('hp-yellow');
    else bar.classList.add('hp-red');
}

function getSpriteUrl(name) {
    return `https://play.pokemonshowdown.com/sprites/ani/${ID_MAP[name] || 'pikachu'}.gif`;
}

function addTooltipEvents(el, dataFn) {
    el.addEventListener('mouseenter', () => {
        const data = dataFn();
        if (data) {
            tooltip.style.display = 'block';
            tooltip.innerHTML = `<strong>${data.name}</strong><br>아이템: ${data.item}`; // 간단 예시
        }
    });
    el.addEventListener('mousemove', (e) => {
        tooltip.style.left = (e.pageX + 15) + 'px';
        tooltip.style.top = (e.pageY + 15) + 'px';
    });
    el.addEventListener('mouseleave', () => tooltip.style.display = 'none');
}

function addLog(msg) {
    const li = document.createElement('li');
    li.textContent = msg;
    messages.appendChild(li);
    messages.scrollTop = messages.scrollHeight;
}