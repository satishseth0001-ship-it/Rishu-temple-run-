import React, { useState, useEffect, useRef } from "react";
import { Play, RotateCcw, Trophy, Coins, Settings } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import GameRunner, { sounds } from "./GameRunner";
import conceptBg from "./assets/images/temple_run_concept_1780819797733.png";

type GameState = "startscreen" | "menu" | "playing" | "gameover";

export default function App() {
  const [gameState, setGameState] = useState<GameState>("startscreen");
  const [score, setScore] = useState(0);
  const [coins, setCoins] = useState(0);
  const [highScore, setHighScore] = useState(0);

  // Swipe logic
  const touchStartRef = useRef({ x: 0, y: 0 });

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartRef.current.x = e.changedTouches[0].screenX;
    touchStartRef.current.y = e.changedTouches[0].screenY;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (gameState !== 'playing') return;
    
    const touchEndX = e.changedTouches[0].screenX;
    const touchEndY = e.changedTouches[0].screenY;
    
    const dx = touchEndX - touchStartRef.current.x;
    const dy = touchEndY - touchStartRef.current.y;
    
    if (Math.abs(dx) > 40 || Math.abs(dy) > 40) {
      if (Math.abs(dx) > Math.abs(dy)) {
         // Horizontal swipe
         if (dx > 0) window.dispatchEvent(new KeyboardEvent('keydown', { code: 'ArrowRight' }));
         else window.dispatchEvent(new KeyboardEvent('keydown', { code: 'ArrowLeft' }));
      } else {
         // Vertical swipe
         if (dy > 0) window.dispatchEvent(new KeyboardEvent('keydown', { code: 'ArrowDown' }));
         else window.dispatchEvent(new KeyboardEvent('keydown', { code: 'ArrowUp' }));
      }
    }
  };

  const handleGameOver = () => {
    setGameState("gameover");
    if (score > highScore) setHighScore(score);
  };

  const startGame = async () => {
    await sounds.init();
    sounds.startBGM();
    setScore(0);
    setCoins(0);
    setGameState('playing');
  };

  return (
    <div 
      className="min-h-screen bg-slate-950 font-sans text-slate-100 overflow-hidden relative select-none touch-none"
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      <div className="absolute inset-0 z-0 pointer-events-none">
        <GameRunner 
          gameState={gameState}
          onGameOver={handleGameOver}
          onScore={setScore}
          onCoin={() => setCoins((c) => c + 1)}
        />
      </div>

      <AnimatePresence mode="wait">
        {gameState === "startscreen" && (
          <motion.div
            key="startscreen"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-slate-950 px-8"
          >
            <h1 className="text-6xl md:text-8xl font-black tracking-tighter text-white uppercase italic skew-x-[-5deg] mb-12">
               Rishu <br className="hidden md:block" />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-orange-500 drop-shadow-2xl">
                Temple Run
              </span>
            </h1>
            <button
              onClick={() => setGameState('menu')}
              className="bg-slate-800 text-white font-bold text-2xl uppercase tracking-widest px-12 py-5 rounded-2xl shadow-xl transition-transform hover:scale-105 active:scale-95"
            >
              Menu
            </button>
          </motion.div>
        )}

        {gameState === "menu" && (
          <motion.div
            key="menu"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, scale: 1.05 }}
            transition={{ duration: 0.6, ease: "easeInOut" }}
            className="absolute inset-0 z-10 flex flex-col justify-end pb-24 md:pb-32 px-8"
          >
            <div className="absolute inset-0 z-[-1] bg-gradient-to-t from-black via-black/60 to-transparent" />

            <div className="max-w-4xl mx-auto w-full flex flex-col items-center md:items-end md:flex-row justify-between gap-8 z-10">
              <div className="space-y-4 max-w-xl text-center md:text-left">
                <h1 className="text-6xl md:text-8xl font-black tracking-tighter text-white uppercase italic skew-x-[-5deg]">
                   Rishu <br className="hidden md:block" />
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-orange-500 drop-shadow-2xl">
                    Temple Run
                  </span>
                </h1>
                <p className="text-slate-300 max-w-md mx-auto md:mx-0 font-medium">Swipe to move Left/Right, Swipe Up to jump, Swipe Down to slide under obstacles.</p>
              </div>

              <div className="flex flex-col gap-6 w-full md:w-auto">
                <div className="bg-black/60 backdrop-blur-xl border border-amber-500/30 rounded-2xl p-6 flex items-center justify-between gap-8 shadow-lg">
                  <div>
                    <h3 className="text-amber-400 text-sm font-bold uppercase tracking-wider mb-1">High Score</h3>
                    <div className="text-4xl font-black font-mono text-white flex items-center gap-3">
                       <Trophy className="w-8 h-8 text-amber-500" /> {highScore.toString().padStart(6, '0')}
                    </div>
                  </div>
                </div>

                <button
                  onClick={startGame}
                  className="group relative overflow-hidden bg-gradient-to-r from-amber-600 to-orange-700 text-white font-black text-2xl px-12 py-6 rounded-2xl shadow-xl transition-transform hover:scale-[1.03] active:scale-95 flex items-center justify-center gap-4"
                >
                  <Play className="w-8 h-8 fill-current relative z-10" />
                  <span className="relative z-10 uppercase tracking-widest italic">Play Now (3D)</span>
                </button>
              </div>
            </div>
          </motion.div>
        )}

        {gameState === "playing" && (
          <motion.div
            key="game"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-10 pointer-events-none" 
          >
            {/* HUD */}
            <div className="absolute top-0 left-0 w-full p-6 flex justify-between items-start z-10 pointer-events-none">
              <div className="flex flex-col gap-3">
                <div className="bg-black/60 backdrop-blur-md rounded-xl px-5 py-3 border border-white/20 flex items-center gap-3 shadow-lg">
                  <span className="font-mono text-3xl font-black text-white slash-zero drop-shadow-md">
                    {score.toString().padStart(7, '0')}
                  </span>
                </div>
              </div>
              <div className="flex gap-4 items-center pointer-events-auto">
                <div className="bg-black/60 backdrop-blur-md rounded-xl px-5 py-3 border border-amber-500/30 flex items-center gap-3 shadow-lg">
                   <Coins className="w-6 h-6 text-amber-400" />
                   <span className="font-mono font-black text-xl text-amber-400 drop-shadow-md">{coins}</span>
                </div>
              </div>
            </div>
            
            {/* Controls Helper */}
            <div className="absolute bottom-10 left-1/2 -translate-x-1/2 w-full text-center pointer-events-none z-10 opacity-60">
              <p className="text-white font-bold tracking-widest uppercase text-sm">Use Arrow Keys or Swipe</p>
            </div>
          </motion.div>
        )}

        {gameState === "gameover" && (
          <motion.div
            key="gameover"
            initial={{ opacity: 0, scale: 1.1, backdropFilter: "blur(0px)" }}
            animate={{ opacity: 1, scale: 1, backdropFilter: "blur(10px)" }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-30 flex items-center justify-center bg-black/80 p-4 pointer-events-auto"
          >
            <div className="bg-gradient-to-br from-slate-900 to-black border border-slate-700 rounded-3xl p-10 max-w-lg w-full flex flex-col items-center text-center relative overflow-hidden shadow-2xl">
              <h2 className="text-6xl font-black text-transparent bg-clip-text bg-gradient-to-b from-amber-400 to-amber-700 mb-2 uppercase tracking-tighter italic skew-x-[-5deg]">
                GAME OVER
              </h2>

              <div className="w-full bg-black/80 rounded-2xl p-8 mb-10 border border-white/10 mt-8">
                <div className="text-amber-500 uppercase font-bold tracking-widest text-sm mb-2">Final Score</div>
                <div className="text-6xl font-black font-mono text-white mb-8">
                  {score.toString().padStart(7, '0')}
                </div>

                <div className="flex justify-between items-center border-t border-white/10 pt-6">
                  <span className="text-slate-400 font-bold uppercase tracking-wider text-sm">Coins Collected</span>
                  <span className="font-mono font-black text-2xl text-amber-400 flex items-center gap-2">
                    <Coins className="w-6 h-6" /> {coins}
                  </span>
                </div>
              </div>

              <div className="flex w-full gap-4">
                <button
                  onClick={() => setGameState("menu")}
                  className="flex-1 py-5 rounded-xl font-black uppercase tracking-widest bg-slate-800 text-slate-300 hover:bg-slate-700 transition"
                >
                  Menu
                </button>
                <button
                  onClick={startGame}
                  className="flex-[2] py-5 rounded-xl font-black uppercase tracking-widest bg-amber-600 text-white hover:bg-amber-500 transition flex justify-center items-center gap-3"
                >
                  <RotateCcw className="w-6 h-6" /> Play Again
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
