// Credentials stay in the Vercel function environment, never in the Vite bundle.
export function credentials() {
 const url=process.env.KV_REST_API_URL||process.env.UPSTASH_REDIS_REST_URL;
 const token=process.env.KV_REST_API_TOKEN||process.env.UPSTASH_REDIS_REST_TOKEN;
 if(!url||!token)throw new Error('Storage unavailable');
 return {url,token};
}
export async function redis(...command) {
 const {url,token}=credentials();
 const response=await fetch(url,{method:'POST',headers:{Authorization:`Bearer ${token}`,'Content-Type':'application/json'},body:JSON.stringify(command),signal:AbortSignal.timeout(7000)});
 if(!response.ok)throw new Error('Storage unavailable');
 const data=await response.json();
 if(data.error)throw new Error('Storage command failed');
 return data.result;
}
export const SAVE_GAME_SCRIPT = `
 if redis.call('GET', KEYS[1]) ~= ARGV[1] then return {0} end
 redis.call('SET', KEYS[1], ARGV[2], 'EX', 259200)
 if ARGV[5] ~= '' then
  redis.call('HSETNX', KEYS[3], ARGV[5], ARGV[6])
  redis.call('EXPIRE', KEYS[3], 34560000)
 end
 if ARGV[3] ~= '' then
  redis.call('ZADD', KEYS[2], ARGV[3], ARGV[4])
  redis.call('ZREMRANGEBYRANK', KEYS[2], 0, -101)
  redis.call('EXPIRE', KEYS[2], 34560000)
 end
 return {1, redis.call('ZREVRANGE', KEYS[2], 0, 9), redis.call('HGETALL', KEYS[3])}
`;
// One HTTP round trip for rate limiting, initialization and the game snapshot.
export const LOAD_GAME_SCRIPT = `
 local count=redis.call('INCR',KEYS[1])
 if count==1 then redis.call('EXPIRE',KEYS[1],60) end
 if count>tonumber(ARGV[1]) then return {0} end
 redis.call('SET',KEYS[2],ARGV[2],'NX','EX',259200)
 local game=redis.call('GET',KEYS[2])
 if ARGV[3]=='full' then
  return {1,game,redis.call('ZREVRANGE',KEYS[3],0,9),redis.call('HGETALL',KEYS[4])}
 end
 return {1,game}
`;
export const READ_SUMMARY_SCRIPT = `return {redis.call('ZREVRANGE',KEYS[1],0,9),redis.call('HGETALL',KEYS[2])}`;
export async function rateLimit(key,limit) {
 const count=await redis('EVAL',`local n=redis.call('INCR',KEYS[1]); if n==1 then redis.call('EXPIRE',KEYS[1],60) end; return n`,1,key);
 return count<=limit;
}
