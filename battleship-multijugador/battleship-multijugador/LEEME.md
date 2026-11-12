# Battleship · multijugador LAN e internet

Esta copia incorpora un botón **Multijugador · LAN e internet** al menú del HTML original. La partida normal, las campañas y los usuarios locales conservan su funcionamiento. El modo nuevo es batalla naval clásica independiente: tablero de 10 × 10, barcos de 5/4/3/2/2 casillas, colocación horizontal o vertical sin solapamientos, un disparo por turno incluso al acertar y victoria al hundir la flota completa. No incluye las cartas, armas, movimientos ni campañas del motor táctico original.

## Jugar en la misma red

1. Instala Node.js 20 o posterior en el equipo que será servidor.
2. Extrae todo el ZIP y ejecuta `iniciar.bat` (o `npm start`). No necesita `npm install`.
3. En ese equipo abre http://localhost:3000. Entra como invitado o con un perfil local y pulsa **Multijugador**.
4. Consulta la IPv4 del servidor con `ipconfig`. Los demás abren, por ejemplo, `http://192.168.1.20:3000`. Todos deben usar la dirección de un único servidor y estar en la misma red. Si Windows lo solicita, permite Node.js en redes privadas; la red no debe aislar a sus clientes.
5. Conecta con un apodo, elige **Red local / Wi-Fi** y pulsa **Buscar rival** en ambos dispositivos. También puedes crear una sala privada y compartir el código.

El servidor no descubre dispositivos automáticamente: ambos deben abrir su dirección. La invitación copiada desde localhost debe sustituirse por la IP del servidor para otro equipo.

## Jugar por internet

Sube esta carpeta a un servicio que ejecute aplicaciones Node.js persistentes o usa el Dockerfile. Comando de inicio: `node server.js`. El servidor escucha en `0.0.0.0` y acepta el puerto de la variable `PORT` (3000 por defecto). Configura HTTPS mediante el proveedor o un proxy inverso. Todos abren la misma URL pública, seleccionan **En línea / internet** y buscan rival o comparten una sala.

El alojamiento no está contratado ni desplegado con esta entrega. Seleccionar “En línea” separa la cola de emparejamiento; no crea una URL pública ni abre puertos. Los dos modos usan el mismo protocolo y las mismas reglas. Las colas y códigos pertenecen a cada instancia de servidor. Ejecuta **una sola instancia**, sin escalado horizontal; el estado reside en memoria.

## Uso y reconexión

- Coloca cada barco haciendo clic en su primera casilla; cambia la orientación o usa colocación aleatoria. Después confirma la flota.
- Empieza el creador de sala o el primer jugador de la cola. Dispara en el tablero enemigo cuando sea tu turno.
- Una recarga conserva la sesión en esa pestaña: entra de nuevo en Multijugador en menos de dos minutos. Cerrar la pestaña y abrir otra puede perder la sesión.
- Si no hay comunicación durante dos minutos, el rival gana por abandono. Abandonar explícitamente termina la partida de inmediato.
- Las sesiones multijugador usan tokens propios: no se envían las contraseñas ni los datos de las cuentas locales. Los apodos no son cuentas verificadas.
- Reiniciar el servidor elimina salas, colas y partidas. No hay ranking, chat ni historial persistente.

## Archivos y comprobación

`public/index.html`: copia del juego con los dos recursos nuevos. `public/multiplayer.js` y `.css`: interfaz. `server.js`: sesiones, emparejamiento y reglas autoritativas. `test.js`: pruebas de integración HTTP.

Ejecuta `npm test`. El servidor valida posiciones, duplicados, turnos y victoria y devuelve únicamente la flota propia y resultados visibles del rival. Para una apertura pública de gran escala añade límites de tráfico en el proxy, supervisión y almacenamiento persistente.

Los perfiles originales dependen del origen del navegador: abrir el juego desde HTTP en vez del archivo local no transfiere automáticamente las cuentas ni las partidas antiguas. El archivo original de Downloads no se modifica.

## Versión HTML integrada
La interfaz completa está ahora en public/index.html: CSS y JavaScript multijugador están incrustados. battleship_multijugador.html es una copia independiente de ese mismo archivo. Puedes abrirla directamente para los modos originales; el multijugador requiere servirla con server.js. Los archivos multiplayer.js y multiplayer.css se conservan como fuentes editables, pero el HTML ya no los carga. Para instalar el HTML independiente en este servidor, cópialo como public/index.html.

