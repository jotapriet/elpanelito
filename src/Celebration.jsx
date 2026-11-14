import React,{useEffect,useState} from 'react';

export default function Celebration(){
 const [visible,setVisible]=useState(true);
 useEffect(()=>{const timer=setTimeout(()=>setVisible(false),2400);return()=>clearTimeout(timer);},[]);
 if(!visible)return null;
 return <div className="win-celebration" aria-hidden="true"><div className="win-sparkles">{Array.from({length:28},(_,index)=><i key={index} style={{'--x':`${8+(index*37)%85}%`,'--drift':`${(index%2?1:-1)*(25+index%6*12)}px`,'--delay':`${index%7*45}ms`,'--turn':`${180+index*29}deg`,'--color':['#c5e994','#edcd85','#9ccfc0','#e5eee0'][index%4]}}/>)}</div><span className="win-badge">✦ ¡Bien jugado!</span></div>;
}
