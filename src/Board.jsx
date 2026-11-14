import React,{useLayoutEffect,useRef} from 'react';

export default function Board({words,lost}) {
 const elements=useRef([]),previous=useRef(null);
 const snapshot=JSON.stringify(words);
 useLayoutEffect(()=>{
  const flat=words.flat(),before=previous.current;
  previous.current=flat;
  // Initial/restored boards are static. Only new reveals animate, in reading order.
  if(!before||before.length!==flat.length)return;
  const preference=window.matchMedia('(prefers-reduced-motion: reduce)');
  if(preference.matches)return;
  const animations=[];
  let order=0;
  flat.forEach((char,index)=>{
   if(before[index]!==null||char===null)return;
   const element=elements.current[index];
   if(!element?.animate)return;
   animations.push(element.animate([
    {transform:'perspective(500px) rotateX(-85deg) scale(.94)',opacity:0},
    {transform:'perspective(500px) rotateX(8deg) scale(1.04)',opacity:1,offset:.7},
    {transform:'perspective(500px) rotateX(0) scale(1)',opacity:1},
   ],{duration:340,delay:Math.min(order++*55,900),easing:'cubic-bezier(.22,.7,.3,1)',fill:'backwards'}));
  });
  const stop=()=>{if(preference.matches)animations.forEach(animation=>animation.cancel());};
  preference.addEventListener('change',stop);
  // A stable snapshot prevents clock ticks from interrupting the sequence.
  const timer=setTimeout(()=>preference.removeEventListener('change',stop),1400);
  return()=>{clearTimeout(timer);preference.removeEventListener('change',stop);animations.forEach(animation=>animation.cancel());};
 },[snapshot]);
 let position=0;
 return <div className="board" aria-label="Frase oculta">{words.map((word,i)=><div className="word" key={i} style={{'--word-length':word.length}}>{word.map((char,j)=>{
  const index=position++;
  return <span ref={element=>{elements.current[index]=element;}} key={j} aria-label={char??'Letra oculta'} className={`tile ${char!==null?'revealed':''}${lost?' lost-tile':''}`}>{char??<span className="tile-line"/>}</span>;
 })}</div>)}</div>;
}
