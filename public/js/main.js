// js/main.js
import { initTeamBuilder } from './teambuilder.js';
import { initLobby } from './lobby.js';
import { initBattle } from './battle.js';

document.addEventListener('DOMContentLoaded', () => {
    console.log("[System] 클라이언트 모듈 로딩 시작");
    
    initTeamBuilder(); // 팀 빌더 & 데이터 수신 준비
    initLobby();       // 로비 입장 준비
    initBattle();      // 전투 UI 준비
});