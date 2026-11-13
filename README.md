# Atlas Naval · multijugador táctico

Versión multijugador del juego Battleship Atlas Naval. Conserva el menú y los modos individuales del HTML original e incorpora combates entre dos jugadores con un servidor autoritativo.

## Funciones multijugador

- Carta naval continua con aguas enemigas y propias apiladas.
- Sprites originales del administrador gráfico integrado, incluidas las variantes de aspecto elegidas en el juego.
- Agua animada, sectores, radar, rosa de los vientos, escala, marcos tácticos y línea de contacto.
- Cinco naves con posición, orientación, resistencia y hundimiento.
- Tres puntos de acción por turno.
- Movimiento y cuatro ataques: cañón, torpedo, cohetes y ataque aéreo.
- Cartas tácticas: sonar, ataque coordinado, maniobra evasiva, reparación y señuelo.
- Emparejamiento en línea, cola LAN y salas privadas.
- Reconexión breve, abandono explícito y cierre no destructivo de la ventana.
- Validación de acciones y ocultación de la flota rival en el servidor.
- Hoja de servicio por cuenta local con partidas multijugador, victorias, derrotas y porcentaje de victoria.
- Medallas de bronce, plata y oro al vencer 5, 10 y 20 veces a cada dificultad clásica.
- Logros por completar la campaña y todos los capítulos históricos.

## Progreso del jugador

La hoja de servicio se abre desde el menú principal. El progreso queda asociado a la cuenta local iniciada en ese navegador; cambiar de cuenta muestra estadísticas diferentes y eliminar la cuenta también elimina su progreso. Los resultados terminados se deduplican para que recargar o reabrir una sala no sume una partida adicional.

## Render

Sube el contenido de esta carpeta a la raíz del repositorio. En Render crea un Web Service con:

- Runtime: Docker
- Root Directory: vacío, si estos archivos están en la raíz
- Dockerfile Path: `./Dockerfile`
- Docker Command: vacío
- Plan: Free

Si esta carpeta está dentro de otra carpeta del repositorio, configura esa ruta como Root Directory.

Render usa el puerto asignado mediante `PORT`. Al terminar el despliegue, todos los jugadores deben abrir la misma URL pública.

## Desarrollo

Requiere Node.js 20 o posterior. No tiene dependencias externas.

```text
npm start
npm test
```

Las salas y partidas están en memoria. Un reinicio o nuevo despliegue de Render elimina las partidas activas.
