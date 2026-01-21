       if(this.p1.activePokemon.status === "FNT" && this.p1.hasRemainingPokemon())
        {
            io.to(this.p1.id).emit('force_switch_request');
            this.gameState = 'FORCE_SWITCH';
        }
        else if (this.p2.activePokemon.status === "FNT" && this.p2.hasRemainingPokemon())
        {
            io.to(this.p2.id).emit('force_switch_request');
            this.gameState = 'FORCE_SWITCH';
        }
        else if (!this.p1.hasRemainingPokemon() || !this.p2.hasRemainingPokemon())
        {
            this.resetGame(io);
        } else {
            console.log(`[room.ts]/[endTurn]: State (BATTLE -> MOVE_SELECT) / 다음 턴 시작`);
            this.gameState = 'MOVE_SELECT';
            io.to(this.roomId).emit('turn_start');
        }