# ElPanelito

Juego diario con React, Tailwind CSS 4 y Vite. En producción utiliza funciones de Vercel y Upstash Redis para partidas y ranking compartidos. No requiere registro del jugador ni dependencias de base de datos en el navegador.

## Ejecutar y verificar

Requiere Node.js 20.19+ o 22.12+.

```sh
npm install
npm run dev
npm test
npm run build
```

En localhost, 127.0.0.1 y [::1] puedes saltar la espera de lanzamiento, reiniciar partidas y recorrer los 366 paneles. Los resultados de prueba se guardan solo en el navegador y no se publican. Los sonidos se pueden silenciar y recuerdan la preferencia.

Las casillas recién descubiertas se revelan en orden con un giro breve y escalonado. Los tableros restaurados no repiten la animación. Una victoria durante la partida muestra una celebración de menos de tres segundos, que no bloquea los controles ni se repite al recargar. Con `prefers-reduced-motion: reduce`, las letras aparecen directamente y la celebración es un mensaje estático sin confeti.

## Producción en Vercel

Proyecto: https://elpanelito.vercel.app

vercel.json configura Vite y la salida dist. api/game.js se despliega como función Node. Conecta Upstash Redis desde Vercel Marketplace e inyecta KV_REST_API_URL y KV_REST_API_TOKEN (también se admiten UPSTASH_REDIS_REST_URL y UPSTASH_REDIS_REST_TOKEN). Nunca uses el prefijo VITE_ para estas variables ni las incluyas en el repositorio.

La base elpanelito-ranking está conectada con plan gratuito y actualización automática de plan desactivada. Si se agotan los límites o falla el servicio, la interfaz permite reconectar; nunca sustituye resultados por rivales ficticios.

```sh
vercel deploy --prod
```

La API requiere backend: publicar solo dist en un alojamiento estático no habilita el ranking compartido.

## Calendario

Apertura: **12 de noviembre de 2026 a las 07:00, Europe/Madrid**. En producción, `/api/status` decide si el juego ha comenzado y comunica hora del servidor, fecha activa y próximo cambio. La apertura no se decide con el reloj del dispositivo: se comprueba al entrar, periódicamente, al volver a la pestaña y al recuperar conexión. La cuenta atrás utiliza una referencia de hora del servidor y `performance.now()`, que no cambia al ajustar la fecha del sistema. Al llegar a cero se consulta al servidor antes de abrir el juego. Si no hay conexión inicial, se ofrece reintentar sin abrir una partida por la fecha local.

El panel número 1 comienza en el lanzamiento; los siguientes se abren a las 07:00 de Madrid, respetando cambios de hora. `/api/game` selecciona el panel y devuelve sus casillas ya reveladas, aciertos y fecha de renovación. El cliente de producción dibuja ese tablero y no elige una frase a partir de su calendario. Cada acción debe incluir la fecha activa: una jugada de otro día se rechaza antes de modificar la partida y el cliente carga el nuevo panel, sin trasladar esa jugada. La API sigue validando vidas, errores, tiempo, puntuación y cierre de la partida.

Hay 366 frases únicas y el ciclo se repite después de 366 días. El contenido está en el JavaScript público: no se pretende impedir que alguien inspeccione las soluciones.

## Partidas y ranking real

- Una cookie anónima HttpOnly, Secure y SameSite=Lax, firmada por el servidor, identifica el navegador. Se conserva hasta 400 días y no contiene el apodo. Sin cuentas, borrar cookies o usar otro navegador permite una identidad nueva.
- El servidor guarda progreso por identidad y día, calcula vidas, errores, tiempo y puntuación, y bloquea partidas terminadas. El reloj empieza con la primera letra o respuesta y sigue contando al salir.
- Fórmula: max(0, vidas * 200 - segundos * 3 - letrasIncorrectas * 50). Resolver incorrectamente resta dos vidas; una letra fallada resta una vida y suma un error.
- Solo una partida terminada con puntos admite apodo. Máximo 12 caracteres: letras, números, espacios, puntos y guiones. El apodo y la puntuación se publican al guardarlos.
- El Top 10 se consulta al abrir el ranking y tras las acciones. Los empates favorecen la finalización más temprana. Se conservan hasta 100 entradas por día durante 400 días; las sesiones caducan después de tres días sin escrituras.
- Las escrituras usan Lua atómico con control de concurrencia. Reintentar un guardado no duplica entradas. Se limita el tráfico a 240 solicitudes/minuto por IP mediante hashes diarios que caducan al minuto; Redis no almacena la IP en claro.
- Si falla la conexión se bloquean nuevas jugadas hasta reconectar y se conserva lo confirmado en servidor. La API ignora puntuaciones, vidas y marcas de tiempo enviadas por el cliente.

## Estructura

### Estadísticas personales

Las partidas terminadas se registran automáticamente, aunque no se envíe un apodo al ranking. Incluyen partidas jugadas, porcentaje de victorias redondeado, mejor puntuación y racha de días consecutivos terminando un panel (también cuentan las derrotas). Una partida abandonada no cuenta. El día del juego empieza a las 07:00 en Madrid; la racha de ayer sigue activa mientras se puede completar el panel de hoy y se rompe si pasa un día completo sin terminarlo.

En producción, los resultados personales se guardan por identidad anónima en Redis, una sola vez por fecha y en la misma operación atómica que cierra la partida. Recargar, guardar el apodo o reintentar no duplica estadísticas. El historial caduca después de 400 días sin terminar nuevas partidas. En local se guarda un historial separado en localStorage: cuenta cada ensayo terminado, pero varios ensayos del mismo día solo suman un día a la racha.

Se muestran en la pantalla final y en el botón «Estadísticas personales» de la cabecera. No se vinculan al apodo: dependen de la identidad de este navegador. Borrar cookies de producción o el almacenamiento de pruebas elimina el acceso a los datos correspondientes.

- src/main.jsx: interfaz, modo local y conexión con API.
- src/game.js y src/panels.js: reglas y catálogo de 366 frases.
- src/schedule.js: lanzamiento y calendario de Madrid.
- src/ranking-api.js: cliente HTTP y errores.
- src/sound.js y src/styles.css: sonidos y diseño adaptable.
- api/game.js: API con cookie anónima firmada y tablero validado por servidor.
- api/status.js y src/server-clock.js: disponibilidad y reloj sincronizado de producción.
- server/rules.js y server/store.js: validación y acceso a Redis.
- tests/: reglas, catálogo, calendario y validación del servidor.

## Prueba de integración

Con credenciales en .env.local (ignorado por Git y por el despliegue):

```sh
vercel env pull .env.local --yes
node --env-file=.env.local scripts/check-ranking.mjs
```

Usa Redis real con claves aisladas y limpia sus datos al terminar. Simula el lanzamiento solo dentro del proceso de prueba. Comprueba apertura, cookies, puntuación, persistencia, concurrencia y clasificación entre navegadores; no introduce jugadores de prueba en el ranking público.
