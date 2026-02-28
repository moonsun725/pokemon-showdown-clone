// js/teambuilder.js
import { socket } from './network.js';

// DOM 요소
const btnTeambuilder = document.getElementById('btn-teambuilder');
const teambuilderScreen = document.getElementById('teambuilder-screen');
const lobbyScreen = document.getElementById('lobby-screen');
const teamSlotsContainer = document.getElementById('team-slots-container');
const btnSaveTeam = document.getElementById('btn-save-team');

// 데이터 저장 변수
let AVAILABLE_POKEMON = [];
let AVAILABLE_MOVES = [];
let AVAILABLE_ITEMS = ["(없음)"];
let AVAILABLE_ABILITIES = [];

// 내 팀 데이터 (외부에서 가져갈 수 있게 export)
export let myTeam = [];

export function initTeamBuilder() {
    // 1. 저장된 팀 불러오기
    const savedTeam = localStorage.getItem('myPokemonTeam');
    if (savedTeam) {
        myTeam = JSON.parse(savedTeam);
    } else {
        // 기본 렌탈팀
        myTeam = [
            { name: "피카츄", item: "Leftovers", moves: ["10만볼트", "전광석화", "칼춤", "독가스"] },
            { name: "파이리", item: "Life_Orb", moves: ["화염방사", "공중날기", "용성군", "지진"] }
        ];
    }

    // 2. 팀 빌더 버튼 클릭 이벤트
    btnTeambuilder.addEventListener('click', () => {
        lobbyScreen.classList.remove('active');
        teambuilderScreen.classList.add('active');

        // 데이터가 없으면 서버에 요청
        if (AVAILABLE_POKEMON.length === 0) {
            console.log("[TeamBuilder] 서버에 데이터 요청...");
            socket.emit('get_database');
        } else {
            renderTeamBuilder();
        }
    });

    // 3. 저장 버튼 클릭 이벤트
    btnSaveTeam.addEventListener('click', () => {
        saveTeamData();
        teambuilderScreen.classList.remove('active');
        lobbyScreen.classList.add('active');
    });

    // 4. 소켓 이벤트: 데이터 수신
    socket.on('database_data', (data) => {
        console.log("[TeamBuilder] 데이터 수신 완료");
        AVAILABLE_POKEMON = data.pokemon;
        AVAILABLE_MOVES = data.moves;
        AVAILABLE_ITEMS = ["(없음)", ...data.items];
        AVAILABLE_ABILITIES = [...data.abilities];
        renderTeamBuilder();
    });
}

// UI 렌더링 함수
function renderTeamBuilder() {
    teamSlotsContainer.innerHTML = '';
    for (let i = 0; i < 6; i++) {
        const member = myTeam[i] || { name: "", item: "", moves: ["", "", "", ""] };
        const slotDiv = document.createElement('div');
        slotDiv.className = 'team-slot';

        let html = `<h4>Slot ${i + 1}</h4>`;
        
        // 포켓몬
        html += `<label>포켓몬:</label><select class="poke-select"><option value="">(비움)</option>
                 ${AVAILABLE_POKEMON.map(p => `<option value="${p}" ${p === member.name ? 'selected' : ''}>${p}</option>`).join('')}</select>`;
        
        // 아이템
        html += `<label>도구:</label><select class="item-select">
                 ${AVAILABLE_ITEMS.map(it => `<option value="${it}" ${it === member.item ? 'selected' : ''}>${it}</option>`).join('')}</select>`;
        
        // 특성 (추후 구현)
        html += `<label>특성:</label><select class="ability-select"><option>특성1</option></select>`;

        // 기술
        html += `<label>기술:</label>`;
        for (let j = 0; j < 4; j++) {
            const moveVal = member.moves ? member.moves[j] : "";
            html += `<select class="move-select"><option value="">(기술 ${j+1})</option>
                     ${AVAILABLE_MOVES.map(m => `<option value="${m}" ${m === moveVal ? 'selected' : ''}>${m}</option>`).join('')}</select>`;
        }
        slotDiv.innerHTML = html;
        teamSlotsContainer.appendChild(slotDiv);
    }
}

// 저장 로직
function saveTeamData() {
    const slots = document.querySelectorAll('.team-slot');
    const newTeam = [];
    slots.forEach(slot => {
        const name = slot.querySelector('.poke-select').value;
        if (!name) return;
        const item = slot.querySelector('.item-select').value;
        const moves = Array.from(slot.querySelectorAll('.move-select'))
                           .map(s => s.value).filter(v => v);
        newTeam.push({ name, item: item === "(없음)" ? undefined : item, moves });
    });
    myTeam = newTeam;
    localStorage.setItem('myPokemonTeam', JSON.stringify(myTeam));
    alert("팀 저장 완료!");
}