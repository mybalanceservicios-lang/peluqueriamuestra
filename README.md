# Demo — Sistema de gestión para barberías (RT Design)

Versión de **demostración** del sistema: la persona escanea un QR, se abre con una barbería ficticia ya cargada y puede probar todo desde su celular.

- `index.html` — panel de gestión (agenda, cortes, comisiones, ventas, gastos, cierre de caja, stock).
- `reservar.html` — portal público donde el cliente reserva turno. Lo que se reserva aparece en la agenda del panel.
- `demo.js` — datos ficticios, límite de prueba y barra "Modo demo".

## Cómo funciona la demo
- **Sin servidor ni cuentas:** no hay Supabase, ni mails, ni claves reales. Todo se guarda en el `localStorage` del dispositivo de quien prueba.
- **Perfiles:** cada barbero entra con un toque; el perfil **Dueño** usa la clave `1234` (se muestra en pantalla).
- **Datos de ejemplo:** ~70 días de cortes, ventas, gastos, cierres de caja y turnos para hoy y los próximos días. Se regeneran solos cada día para que la agenda nunca quede vacía. Los teléfonos son ficticios (`11 0000-xxxx`).
- **Límite de prueba:** 3 días desde el primer ingreso en ese dispositivo. Después aparece una pantalla de "Tu prueba terminó" con el contacto. Se cambia en `demo.js` (`DEMO_DIAS`, `CONTACTO_URL`, `CONTACTO_TXT`); el botón final abre WhatsApp.
- **Reiniciar demo:** botón en la barra superior; vuelve a los datos de ejemplo pero **no** reinicia el reloj de prueba.

> El límite se controla desde el propio navegador: si alguien borra los datos del sitio o entra en pestaña privada, la prueba vuelve a empezar. Para una demo alcanza; un límite estricto requiere servidor y cuentas.

## Publicar
Es un sitio estático (sin build). En Netlify: *Add new site → Import from Git* → elegir este repo → dejar vacíos el comando de build y la carpeta de publicación. El QR debe apuntar a la raíz del sitio (panel) y/o a `/reservar.html`.

## Probar en local
Abrir `index.html` en el navegador (o `python3 -m http.server`).
