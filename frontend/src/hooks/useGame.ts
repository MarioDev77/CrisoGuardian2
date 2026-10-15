import { useCallback, useEffect, useRef, useState } from 'react';
import { GameCanvas, type GameSnapshot } from '../game/GameCanvas';
import { levelConfigs } from '../game/levels/levelConfigs';
type Control='left'|'right'|'jump'|'shoot';
const initial:GameSnapshot={hp:3,score:0,materials:0,total:0,seed:1,paused:false,won:false,lost:false};
export function useGame(){const canvasRef=useRef<HTMLCanvasElement|null>(null);const engineRef=useRef<GameCanvas|null>(null);const [snapshot,setSnapshot]=useState(initial);const [started,setStarted]=useState(false);const [paused,setPaused]=useState(false);const [result,setResult]=useState<'victory'|'defeat'|null>(null);const [selectedLevel,setSelectedLevel]=useState(0);
 const start=useCallback((sameSeed=false,levelIndex=selectedLevel)=>{setStarted(true);setPaused(false);setResult(null);if(engineRef.current&&levelIndex===selectedLevel){engineRef.current.restart(sameSeed);engineRef.current.setPaused(false);return;}if(engineRef.current){engineRef.current.destroy();engineRef.current=null;}const canvas=canvasRef.current;if(!canvas)return;const engine=new GameCanvas(canvas,{onUpdate:setSnapshot,onVictory:()=>setResult('victory'),onDefeat:()=>setResult('defeat')},undefined,levelConfigs[levelIndex]??levelConfigs[0]);setSelectedLevel(levelIndex);engineRef.current=engine;engine.attachResize();engine.start();},[selectedLevel]);
 const pause=useCallback((value:boolean)=>{setPaused(value);engineRef.current?.setPaused(value);},[]);
 const control=useCallback((key:Control,down:boolean)=>{engineRef.current?.setControl(key,down);},[]);
 const menu=useCallback(()=>{pause(true);setStarted(false);setResult(null);},[pause]);
 useEffect(()=>{if(!started)return;const map:Record<string,Control>={ArrowLeft:'left',a:'left',A:'left',ArrowRight:'right',d:'right',D:'right',Space:'jump',' ':'jump',j:'shoot',J:'shoot'};const down=(e:KeyboardEvent)=>{if(e.key==='Escape'){e.preventDefault();pause(!engineRef.current?.getSnapshot().paused);return;}const key=map[e.key]??map[e.code];if(key){e.preventDefault();control(key,true);}};const up=(e:KeyboardEvent)=>{const key=map[e.key]??map[e.code];if(key){e.preventDefault();control(key,false);}};window.addEventListener('keydown',down);window.addEventListener('keyup',up);return()=>{window.removeEventListener('keydown',down);window.removeEventListener('keyup',up);};},[started,control,pause]);
 useEffect(()=>()=>{engineRef.current?.destroy();engineRef.current=null;},[]);
 return {canvasRef,snapshot,started,paused,result,start,pause,control,menu,selectedLevel,levels:levelConfigs,restart:()=>{engineRef.current?.restart(true);setResult(null);setPaused(false);}};
}
