// js/network.js

// 1. 소켓 연결 (전역에서 딱 한 번만 실행됨)
// socket.io.js는 html에서 불러왔으므로 window.io로 접근 가능
export const socket = io(); 

console.log("[Network] 소켓 초기화 완료");