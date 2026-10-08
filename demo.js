/* ============================================================================
   MODO DEMO — Gestión de Barbería (RT Design)
   Se carga en index.html y reservar.html. Hace tres cosas:
   1) Arma una barbería ficticia con datos de ejemplo (turnos, cortes, ventas, gastos, cierres).
   2) Limita el tiempo de prueba (DEMO_DIAS) desde la primera vez que se abre en ese celular.
   3) Muestra una barra "Modo demo" con el botón "Reiniciar demo".
   Todo vive en localStorage del dispositivo: no hay servidor, no hay mails, no hay datos reales.
   ========================================================================== */
(function () {
  "use strict";

  /* ---------- Configuración (lo único que hace falta tocar) ---------- */
  var DEMO_DIAS = 3;                                  // días de prueba desde el primer ingreso
  var CONTACTO_URL = "https://wa.me/5491141627425?text=" + encodeURIComponent("Hola! Probé la demo del sistema para barberías y quiero el mío.");
  var CONTACTO_TXT = "WhatsApp 11 4162-7425";
  var PIN_DEMO = "1234";                              // clave del perfil Dueño en la demo

  var KEY = "barberia_v1";                            // misma clave que usa el sistema
  var INICIO_KEY = "barberia_demo_inicio_v1";         // fecha del primer ingreso (no se borra al reiniciar)
  var PAGOS = ["Efectivo", "Tarjeta de crédito", "Tarjeta de débito", "Mercado Pago"];

  /* ---------- Utilidades ---------- */
  function pad(n) { return String(n).padStart(2, "0"); }
  function fechaStr(d) { return d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate()); }
  function hoy() { return fechaStr(new Date()); }
  function offsetDias(n) { var d = new Date(); d.setDate(d.getDate() + n); return fechaStr(d); }
  function pid(rnd) { return Math.floor(rnd() * 36 ** 7).toString(36).padStart(7, "x"); }
  // generador pseudo-aleatorio con semilla: la demo se ve siempre igual de "realista"
  function mulberry32(a) {
    return function () {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      var t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  function elegir(rnd, arr) { return arr[Math.floor(rnd() * arr.length)]; }
  function sum(a, f) { return a.reduce(function (s, x) { return s + f(x); }, 0); }

  /* ---------- Datos ficticios ---------- */
  var BARBEROS = [
    { n: "Lucas", com: 0.5, foto: null },
    { n: "Mateo", com: 0.5, foto: null },
    { n: "Nico", com: 0.45, foto: null }
  ];
  var PRECIOS = [
    { tipo: "Corte", precio: 8000, visible: true },
    { tipo: "Corte + Barba", precio: 12000, visible: true },
    { tipo: "Barba", precio: 5000, visible: true },
    { tipo: "Otro", precio: 0, visible: false }
  ];
  var NOMBRES = ["Martín", "Santiago", "Joaquín", "Facundo", "Tomás", "Agustín", "Bruno", "Franco", "Gonzalo", "Ignacio",
    "Leandro", "Matías", "Pablo", "Ramiro", "Sebastián", "Valentín", "Emilio", "Dante", "Julián", "Thiago"];
  var APELLIDOS = ["Gómez", "Pérez", "Rodríguez", "Fernández", "López", "Díaz", "Sosa", "Romero", "Álvarez", "Torres"];

  function construirDB() {
    var rnd = mulberry32(20261008);
    var hoyStr = hoy();
    var db = {
      demo: true,
      demoSemilla: hoyStr,
      nombre: "Barbería Demo",
      logo: null,
      barberos: JSON.parse(JSON.stringify(BARBEROS)),
      pin: PIN_DEMO,
      precios: JSON.parse(JSON.stringify(PRECIOS)),
      horario: { apertura: "09:00", cierre: "20:00", duracion: 30, dias: [1, 2, 3, 4, 5, 6] },
      productos: [
        { id: pid(rnd), nombre: "Cera para pelo", cat: "Peinado", costo: 2500, precio: 5000, cargado: 40, min: 5 },
        { id: pid(rnd), nombre: "Pomada mate", cat: "Peinado", costo: 3000, precio: 6000, cargado: 14, min: 9 },
        { id: pid(rnd), nombre: "Aceite para barba", cat: "Cuidado", costo: 3500, precio: 7500, cargado: 25, min: 4 },
        { id: pid(rnd), nombre: "Aftershave", cat: "Cuidado", costo: 1800, precio: 3500, cargado: 30, min: 5 },
        { id: pid(rnd), nombre: "Perfume", cat: "Perfumería", costo: 5000, precio: 9000, cargado: 18, min: 3 }
      ],
      servicios: [], ventas: [], gastos: [], turnos: [], cierres: [], clientes: []
    };

    /* --- Cortes y ventas de los últimos ~70 días (sin domingos, sin hoy) --- */
    var clientesVistos = {};
    var tipos = [["Corte", 0.5], ["Corte + Barba", 0.3], ["Barba", 0.2]];
    function tipoAleatorio() {
      var r = rnd(), acc = 0;
      for (var i = 0; i < tipos.length; i++) { acc += tipos[i][1]; if (r < acc) return tipos[i][0]; }
      return "Corte";
    }
    function pagoAleatorio() {
      var r = rnd();
      return r < 0.4 ? "Efectivo" : r < 0.65 ? "Mercado Pago" : r < 0.9 ? "Tarjeta de débito" : "Tarjeta de crédito";
    }
    function precioDe(tipo) { return PRECIOS.filter(function (p) { return p.tipo === tipo; })[0].precio; }
    var vendidos = {};
    for (var i = 70; i >= 1; i--) {
      var f = offsetDias(-i);
      var dow = new Date(f + "T00:00:00").getDay();
      if (dow === 0) continue;
      db.barberos.forEach(function (b) {
        var cant = 3 + Math.floor(rnd() * 5); // 3 a 7 cortes por barbero por día
        for (var k = 0; k < cant; k++) {
          var tipo = tipoAleatorio(), precio = precioDe(tipo);
          var hora = pad(9 + Math.floor(rnd() * 10)) + ":" + (rnd() < 0.5 ? "00" : "30");
          var cli = elegir(rnd, NOMBRES) + " " + elegir(rnd, APELLIDOS);
          db.servicios.push({
            id: pid(rnd), fecha: f, hora: hora, barbero: b.n, tipo: tipo, precio: precio, desc: cli,
            pago: pagoAleatorio(), comBarbero: precio * b.com, comBarberia: precio * (1 - b.com), mes: f.slice(0, 7)
          });
        }
        // venta de producto de vez en cuando (sin pasarse del stock cargado)
        if (rnd() < 0.18) {
          var prod = elegir(rnd, db.productos);
          var ya = vendidos[prod.nombre] || 0;
          var tope = prod.nombre === "Pomada mate" ? prod.cargado - 3 : prod.cargado - 8;
          if (ya + 1 <= tope) {
            vendidos[prod.nombre] = ya + 1;
            db.ventas.push({
              id: pid(rnd), fecha: f, barbero: b.n, producto: prod.nombre, cat: prod.cat, cant: 1,
              precioU: prod.precio, costoU: prod.costo, total: prod.precio, costoTotal: prod.costo,
              margen: prod.precio - prod.costo, pago: pagoAleatorio(), mes: f.slice(0, 7)
            });
          }
        }
      });
    }

    /* --- Gastos del mes anterior y del actual --- */
    var d0 = new Date();
    [-1, 0].forEach(function (mm) {
      var base = new Date(d0.getFullYear(), d0.getMonth() + mm, 1);
      var p = function (dia) { return fechaStr(new Date(base.getFullYear(), base.getMonth(), dia)); };
      [
        [p(1), "Alquiler", "Alquiler del local", 180000, "Efectivo"],
        [p(5), "Servicios", "Luz y gas", 38000, "Mercado Pago"],
        [p(8), "Insumos", "Navajas, toallas y descartables", 24000, "Tarjeta de débito"],
        [p(10), "Sueldo", "Recepción", 120000, "Efectivo"]
      ].forEach(function (g) {
        if (g[0] < hoyStr) {
          db.gastos.push({ id: pid(rnd), fecha: g[0], tipo: g[1], desc: g[2], monto: g[3], pago: g[4] });
        }
      });
    });

    /* --- Turnos de hoy y de los próximos días (los teléfonos son ficticios y no existen) --- */
    var telCount = 0;
    function telFicticio() { telCount++; return "11 0000-" + String(100 + telCount).padStart(4, "0"); }
    var estados = [];
    var plan = [[0, 7], [1, 6], [2, 4]];
    plan.forEach(function (pl) {
      var f = offsetDias(pl[0]);
      var dow = new Date(f + "T00:00:00").getDay();
      if (dow === 0) return;
      var usados = {};
      for (var n = 0; n < pl[1]; n++) {
        var b = elegir(rnd, db.barberos).n;
        var hora = pad(10 + Math.floor(rnd() * 9)) + ":" + (rnd() < 0.5 ? "00" : "30");
        var clave = b + hora;
        if (usados[clave]) continue;
        usados[clave] = true;
        var cli = elegir(rnd, NOMBRES) + " " + elegir(rnd, APELLIDOS);
        var tel = telFicticio();
        db.turnos.push({
          id: pid(rnd), fecha: f, hora: hora, barbero: b, cliente: cli, telefono: tel,
          servicio: tipoAleatorio(), estado: "pend", origen: rnd() < 0.4 ? "web" : "app"
        });
        db.clientes.push({ telefono: tel, nombre: cli, notas: "" });
      }
    });
    // algunos clientes frecuentes más, para que la lista de Clientes no quede corta
    for (var c = 0; c < 14; c++) {
      db.clientes.push({ telefono: telFicticio(), nombre: elegir(rnd, NOMBRES) + " " + elegir(rnd, APELLIDOS), notas: c % 5 === 0 ? "Prefiere degradé bajo" : "" });
    }

    /* --- Cierres de caja de los últimos días hábiles (misma forma que arma el sistema) --- */
    var cerrados = 0;
    for (var j = 1; j <= 16 && cerrados < 10; j++) {
      var fc = offsetDias(-j);
      if (new Date(fc + "T00:00:00").getDay() === 0) continue;
      var servicios = db.servicios.filter(function (s) { return s.fecha === fc; });
      var ventas = db.ventas.filter(function (v) { return v.fecha === fc; });
      var gastos = db.gastos.filter(function (g) { return g.fecha === fc; });
      var factCortes = sum(servicios, function (s) { return s.precio; });
      var factProd = sum(ventas, function (v) { return v.total; });
      var gastosTotal = sum(gastos, function (g) { return g.monto; });
      var comTotal = sum(servicios, function (s) { return s.comBarbero; });
      var porMedio = {};
      PAGOS.forEach(function (m) {
        var ing = sum(servicios.filter(function (s) { return (s.pago || "Efectivo") === m; }), function (s) { return s.precio; }) +
          sum(ventas.filter(function (v) { return (v.pago || "Efectivo") === m; }), function (v) { return v.total; });
        var egr = sum(gastos.filter(function (g) { return (g.pago || "Efectivo") === m; }), function (g) { return g.monto; });
        porMedio[m] = { ingresos: ing, egresos: egr, neto: ing - egr };
      });
      var porBarbero = db.barberos.map(function (b) {
        var l = servicios.filter(function (s) { return s.barbero === b.n; });
        return { barbero: b.n, cortes: l.length, facturado: sum(l, function (s) { return s.precio; }), comision: sum(l, function (s) { return s.comBarbero; }) };
      }).filter(function (x) { return x.cortes > 0; });
      var cierre = new Date(fc + "T20:30:00");
      db.cierres.push({
        id: pid(rnd), fecha: fc, cerradoEn: cierre.toISOString(), cerradoPor: "Dueño",
        servicios: JSON.parse(JSON.stringify(servicios)), ventas: JSON.parse(JSON.stringify(ventas)), gastos: JSON.parse(JSON.stringify(gastos)),
        totales: {
          cortes: servicios.length, facturadoCortes: factCortes, ventasCant: ventas.length, facturadoProd: factProd,
          facturadoTotal: factCortes + factProd, gastosTotal: gastosTotal, comisionesTotal: comTotal,
          gananciaNeta: factCortes + factProd - comTotal - gastosTotal, porMedio: porMedio, porBarbero: porBarbero
        }
      });
      cerrados++;
    }
    db.cierres.sort(function (a, b) { return a.fecha.localeCompare(b.fecha); });
    return db;
  }

  /* ---------- Almacenamiento ---------- */
  function leer() {
    try { var r = localStorage.getItem(KEY); if (r) return JSON.parse(r); } catch (e) { }
    return null;
  }
  function guardarDB(db) { try { localStorage.setItem(KEY, JSON.stringify(db)); } catch (e) { } }
  // devuelve los datos guardados; si no hay nada (o son de otro día) arma la barbería ficticia de nuevo
  function cargarDB() {
    var db = leer();
    if (!db || !db.demo || db.demoSemilla !== hoy()) {
      db = construirDB();
      guardarDB(db);
    }
    return db;
  }
  function reiniciar() {
    try { localStorage.removeItem(KEY); } catch (e) { }
    location.reload();
  }

  /* ---------- Límite de prueba ---------- */
  function inicioPrueba() {
    var t = null;
    try { t = parseInt(localStorage.getItem(INICIO_KEY), 10); } catch (e) { }
    if (!t || isNaN(t)) {
      t = Date.now();
      try { localStorage.setItem(INICIO_KEY, String(t)); } catch (e) { }
    }
    return t;
  }
  function diasRestantes() {
    var ms = DEMO_DIAS * 86400000 - (Date.now() - inicioPrueba());
    return Math.max(0, Math.ceil(ms / 86400000));
  }
  function vencida() { return Date.now() - inicioPrueba() >= DEMO_DIAS * 86400000; }

  /* ---------- Interfaz: barra de demo y pantalla de fin de prueba ---------- */
  function estilos() {
    var s = document.createElement("style");
    s.textContent =
      "#demo-bar{display:flex;align-items:center;justify-content:center;gap:10px;flex-wrap:wrap;padding:7px 12px;background:#2a2008;color:#f3dfa6;font:600 12.5px/1.3 system-ui,-apple-system,Segoe UI,Roboto,sans-serif;border-bottom:1px solid #6b5316;text-align:center}" +
      "#demo-bar button{font:700 12px system-ui,sans-serif;background:transparent;color:#f3dfa6;border:1px solid #8a6d1f;border-radius:999px;padding:4px 11px;cursor:pointer}" +
      "#demo-bar button:hover{background:#3a2d0b}" +
      "#demo-fin{position:fixed;inset:0;z-index:2147483647;background:#0e0e12;color:#f4f1ea;display:flex;align-items:center;justify-content:center;padding:24px;font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif}" +
      "#demo-fin .box{max-width:420px;text-align:center}" +
      "#demo-fin h1{font-size:26px;margin:0 0 12px}" +
      "#demo-fin p{color:#b9b5aa;line-height:1.5;margin:0 0 22px;font-size:16px}" +
      "#demo-fin a{display:inline-block;background:#25D366;color:#06210f;font-weight:800;text-decoration:none;padding:14px 26px;border-radius:12px;font-size:16px}" +
      "#demo-fin small{display:block;margin-top:16px;color:#8c887e}";
    document.head.appendChild(s);
  }
  function pantallaFin() {
    var d = document.createElement("div");
    d.id = "demo-fin";
    d.innerHTML =
      '<div class="box"><h1>Tu prueba gratuita terminó</h1>' +
      "<p>Esperamos que hayas podido ver cómo funciona el sistema para tu barbería: turnos online, cortes, comisiones y cierre de caja en un solo lugar.</p>" +
      '<a href="' + CONTACTO_URL + '" target="_blank" rel="noopener">Quiero mi sistema · WhatsApp</a>' +
      "<small>Escribinos al " + CONTACTO_TXT + " y lo armamos con el nombre y los precios de tu barbería.</small></div>";
    document.body.appendChild(d);
    document.documentElement.style.overflow = "hidden";
  }
  function barra() {
    var n = diasRestantes();
    var b = document.createElement("div");
    b.id = "demo-bar";
    b.innerHTML =
      "<span>🧪 Modo demo · datos ficticios · " + (n === 1 ? "te queda 1 día" : "te quedan " + n + " días") + " de prueba</span>" +
      '<button type="button" id="demo-reset">Reiniciar demo</button>';
    document.body.insertBefore(b, document.body.firstChild);
    document.getElementById("demo-reset").onclick = function () {
      if (confirm("Se borra lo que cargaste y la demo vuelve a empezar con los datos de ejemplo. ¿Seguimos?")) reiniciar();
    };
  }
  function iniciarUI() {
    estilos();
    if (vencida()) { pantallaFin(); return; }
    barra();
  }

  window.DemoMode = {
    PIN: PIN_DEMO,
    cargarDB: cargarDB,
    guardarDB: guardarDB,
    reiniciar: reiniciar,
    vencida: vencida,
    diasRestantes: diasRestantes
  };

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", iniciarUI);
  else iniciarUI();
})();
