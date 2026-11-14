export async function rankingRequest(body) {
 const response=await fetch('/api/game',{
  method:body?'POST':'GET',credentials:'same-origin',cache:'no-store',
  headers:body?{'Content-Type':'application/json'}:undefined,
  body:body?JSON.stringify(body):undefined,
  signal:AbortSignal.timeout(12000),
 });
 let data;
 try{data=await response.json();}catch{throw new Error('No se ha podido conectar con el ranking. Inténtalo de nuevo.');}
 if(!response.ok){const error=new Error(data.error||'No se ha podido conectar con el ranking.');error.code=data.code;throw error;}
 return data;
}
export async function statusRequest(){
 const response=await fetch('/api/status',{cache:'no-store',signal:AbortSignal.timeout(10000)});
 if(!response.ok)throw new Error('No se ha podido comprobar la disponibilidad del juego.');
 return response.json();
}
