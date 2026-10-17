/* traductor.js — traductor compacto (Google Translate).
 * Una píldora pequeña abajo a la derecha: [Español] ⇄ [English]  Más ▾
 * - Las flechas ⇄ cambian entre español y el otro idioma.
 * - "Más" muestra el resto de idiomas.
 * - Google solo se carga si la persona elige traducir.
 */
(function () {
  var ORIGEN = 'es';
  var IDIOMAS = [
    ['en', 'English', 'EN'], ['pt', 'Português', 'PT'], ['fr', 'Français', 'FR'], ['de', 'Deutsch', 'DE'],
    ['it', 'Italiano', 'IT'], ['zh-CN', '中文', '中'], ['ja', '日本語', '日'], ['ko', '한국어', '한'],
    ['ru', 'Русский', 'RU'], ['ar', 'العربية', 'ع'], ['hi', 'हिन्दी', 'हि']
  ];
  var LLAVE = 'ppi_idioma';
  var ULTIMO = 'ppi_ultimo_idioma';
  var FORZAR_ES = 'ppi_forzar_es';

  // Google Translate envuelve el texto en <font>; este parche evita que React falle al re-renderizar.
  if (typeof Node === 'function' && Node.prototype) {
    var quitar = Node.prototype.removeChild;
    Node.prototype.removeChild = function (hijo) {
      if (hijo.parentNode !== this) { return hijo; }
      return quitar.apply(this, arguments);
    };
    var insertar = Node.prototype.insertBefore;
    Node.prototype.insertBefore = function (nuevo, referencia) {
      if (referencia && referencia.parentNode !== this) { return nuevo; }
      return insertar.apply(this, arguments);
    };
  }

  function leer(k, almacen) { try { return (almacen || localStorage).getItem(k); } catch (e) { return null; } }
  function escribir(k, v, almacen) { try { (almacen || localStorage).setItem(k, v); } catch (e) { /* sin almacenamiento */ } }
  function borrar(k, almacen) { try { (almacen || localStorage).removeItem(k); } catch (e) { /* sin almacenamiento */ } }

  function datosDe(codigo) {
    if (codigo === ORIGEN) { return [ORIGEN, 'Español', 'ES']; }
    for (var i = 0; i < IDIOMAS.length; i++) { if (IDIOMAS[i][0] === codigo) { return IDIOMAS[i]; } }
    return IDIOMAS[0];
  }

  // Google puede guardar la cookie "googtrans" en distintas rutas y dominios: se borran todas.
  function quitarCookies() {
    var vencida = 'googtrans=; expires=Thu, 01 Jan 1970 00:00:00 GMT';
    var partes = location.pathname.split('/').filter(Boolean);
    var rutas = ['/'];
    var acumulada = '';
    for (var i = 0; i < partes.length; i++) {
      acumulada += '/' + partes[i];
      rutas.push(acumulada, acumulada + '/');
    }
    var host = location.hostname.split('.');
    var dominios = [null];
    for (var j = 0; j < host.length - 1; j++) {
      var d = host.slice(j).join('.');
      dominios.push(d, '.' + d);
    }
    for (var r = 0; r < rutas.length; r++) {
      for (var k = 0; k < dominios.length; k++) {
        document.cookie = vencida + '; path=' + rutas[r] + (dominios[k] ? '; domain=' + dominios[k] : '');
      }
    }
  }
  function ponerCookie(codigo) { document.cookie = 'googtrans=/' + ORIGEN + '/' + codigo + '; path=/'; }
  function estaTraducida() { return /translated/.test(document.documentElement.className); }

  var googleCargado = false;
  function cargarGoogle() {
    if (googleCargado) { return; }
    googleCargado = true;
    var cont = document.createElement('div');
    cont.id = 'google_translate_element';
    cont.style.display = 'none';
    document.body.appendChild(cont);
    window.googleTranslateElementInit = function () {
      new google.translate.TranslateElement({
        pageLanguage: ORIGEN,
        includedLanguages: IDIOMAS.map(function (i) { return i[0]; }).join(','),
        autoDisplay: false
      }, 'google_translate_element');
    };
    var s = document.createElement('script');
    s.src = 'https://translate.google.com/translate_a/element.js?cb=googleTranslateElementInit';
    document.body.appendChild(s);
  }

  var render = function () {};

  function volverAEspanol() {
    quitarCookies();
    borrar(LLAVE);
    escribir(FORZAR_ES, '1', sessionStorage);
    location.reload();
  }

  function aplicar(codigo) {
    if (codigo === ORIGEN) {
      if (estaTraducida() || /googtrans=/.test(document.cookie) || leer(LLAVE)) { volverAEspanol(); return; }
      render();
      return;
    }
    borrar(FORZAR_ES, sessionStorage);
    escribir(LLAVE, codigo);
    escribir(ULTIMO, codigo);
    ponerCookie(codigo);
    render();
    cargarGoogle();
    var intentos = 0;
    var t = setInterval(function () {
      var combo = document.querySelector('.goog-te-combo');
      if (combo) {
        combo.value = codigo;
        combo.dispatchEvent(new Event('change'));
        clearInterval(t);
      } else if (++intentos > 40) {
        clearInterval(t);
        location.reload(); // la cookie hace que Google traduzca al recargar
      }
    }, 250);
  }

  function iniciar() {
    var css = document.createElement('style');
    css.textContent =
      '.ppi-tr{font-family:Nunito,system-ui,Arial,sans-serif;color:#202124}' +
      '.ppi-tr button{border:0;cursor:pointer;font-family:inherit}' +
      '#idioma-flotante{position:fixed;right:14px;bottom:14px;z-index:99998}' +
      '#idioma-flotante .pildora{display:flex;align-items:center;gap:2px;padding:4px;border-radius:999px;background:rgba(255,255,255,.92);backdrop-filter:blur(10px);-webkit-backdrop-filter:blur(10px);border:1px solid rgba(63,140,240,.3);box-shadow:0 8px 22px rgba(63,140,240,.24)}' +
      '#idioma-flotante .globo{padding:0 4px 0 8px;font-size:14px}' +
      '#idioma-flotante .op{padding:6px 12px;border-radius:999px;background:transparent;color:#2c5c9e;font-weight:700;font-size:13px;transition:background .2s,color .2s,box-shadow .2s}' +
      '#idioma-flotante .op:hover{background:#eaf3ff}' +
      '#idioma-flotante .op.activo{background:linear-gradient(135deg,#3f8cf0,#6aaefc);color:#fff;box-shadow:0 4px 10px rgba(63,140,240,.35)}' +
      '#idioma-flotante .cambiar{width:28px;height:28px;padding:0;border-radius:50%;background:#eaf3ff;color:#2c5c9e;font-size:15px;line-height:1;transition:transform .25s}' +
      '#idioma-flotante .cambiar:hover{transform:scale(1.1)}' +
      '#idioma-flotante .mas{padding:6px 10px;border-radius:999px;background:transparent;color:#2c5c9e;font-weight:700;font-size:12.5px}' +
      '#idioma-flotante .mas:hover{background:#eaf3ff}' +
      '#idioma-flotante .mas-panel{display:none;position:absolute;right:0;bottom:50px;width:250px;padding:12px;border-radius:20px;background:rgba(255,255,255,.97);border:1px solid rgba(63,140,240,.25);box-shadow:0 14px 40px rgba(31,95,191,.3);flex-wrap:wrap;gap:6px}' +
      '#idioma-flotante .mas-panel.abierto{display:flex}' +
      '#idioma-flotante .mas-panel button{padding:7px 12px;border-radius:999px;border:1.5px solid #cfe3fb;background:#fff;color:#2c5c9e;font-weight:700;font-size:13px}' +
      '#idioma-flotante .mas-panel button:hover{background:#eaf3ff}' +
      '#idioma-flotante .corto{display:none}' +
      '@media (max-width:420px){#idioma-flotante{right:8px;bottom:8px}#idioma-flotante .largo{display:none}#idioma-flotante .corto{display:inline}#idioma-flotante .mas-panel{width:220px}}' +
      '.goog-te-banner-frame,.skiptranslate iframe,.VIpgJd-ZVi9od-ORHb-OEVmcd,.VIpgJd-ZVi9od-aZ2wEe-wOHMyf{display:none!important}' +
      'body{top:0!important}.goog-text-highlight{background:none!important;box-shadow:none!important}' +
      '#goog-gt-tt,.goog-te-balloon-frame{display:none!important}';
    document.head.appendChild(css);

    // Si se pidió volver a español, no se vuelve a traducir automáticamente.
    var forzarEs = leer(FORZAR_ES, sessionStorage) === '1';
    if (forzarEs) { quitarCookies(); borrar(LLAVE); }
    var guardado = forzarEs ? null : leer(LLAVE);
    if (guardado && guardado !== ORIGEN) { ponerCookie(guardado); cargarGoogle(); }

    var caja = document.createElement('div');
    caja.id = 'idioma-flotante';
    caja.className = 'ppi-tr notranslate';
    caja.setAttribute('translate', 'no');
    caja.innerHTML =
      '<div class="mas-panel" role="listbox" aria-label="Más idiomas"></div>' +
      '<div class="pildora" role="group" aria-label="Idioma de la página">' +
        '<span class="globo" aria-hidden="true">🌐</span>' +
        '<button type="button" class="op op-es" data-idioma="es"><span class="largo">Español</span><span class="corto">ES</span></button>' +
        '<button type="button" class="cambiar" aria-label="Cambiar entre idiomas" title="Cambiar">⇄</button>' +
        '<button type="button" class="op op-otro"><span class="largo"></span><span class="corto"></span></button>' +
        '<button type="button" class="mas" aria-expanded="false" aria-label="Ver más idiomas">Más <span aria-hidden="true">▾</span></button>' +
      '</div>';
    document.body.appendChild(caja);

    var panel = caja.querySelector('.mas-panel');
    var botonEs = caja.querySelector('.op-es');
    var botonOtro = caja.querySelector('.op-otro');
    var botonCambiar = caja.querySelector('.cambiar');
    var botonMas = caja.querySelector('.mas');

    function otroCodigo() {
      var cod = leer(LLAVE);
      return (cod && cod !== ORIGEN) ? cod : (leer(ULTIMO) || 'en');
    }
    function cerrarPanel() {
      panel.className = 'mas-panel';
      botonMas.setAttribute('aria-expanded', 'false');
    }

    render = function () {
      var traducida = estaTraducida() || (leer(LLAVE) && leer(LLAVE) !== ORIGEN && !forzarEs && /googtrans=/.test(document.cookie));
      var otro = datosDe(otroCodigo());
      botonOtro.setAttribute('data-idioma', otro[0]);
      botonOtro.querySelector('.largo').textContent = otro[1];
      botonOtro.querySelector('.corto').textContent = otro[2];
      botonEs.className = 'op op-es' + (traducida ? '' : ' activo');
      botonOtro.className = 'op op-otro' + (traducida ? ' activo' : '');
      botonEs.setAttribute('aria-pressed', traducida ? 'false' : 'true');
      botonOtro.setAttribute('aria-pressed', traducida ? 'true' : 'false');
    };

    botonEs.onclick = function () { cerrarPanel(); aplicar(ORIGEN); };
    botonOtro.onclick = function () { cerrarPanel(); aplicar(botonOtro.getAttribute('data-idioma')); };
    botonCambiar.onclick = function () {
      cerrarPanel();
      if (estaTraducida() || leer(LLAVE)) { aplicar(ORIGEN); } else { aplicar(otroCodigo()); }
    };
    botonMas.onclick = function () {
      var abrir = panel.className.indexOf('abierto') === -1;
      if (abrir) {
        var actual = otroCodigo();
        panel.innerHTML = '';
        // Español siempre aparece primero en la lista.
        [[ORIGEN, 'Español']].concat(IDIOMAS).forEach(function (i) {
          if (i[0] === actual) { return; }
          var b = document.createElement('button');
          b.type = 'button';
          b.setAttribute('role', 'option');
          b.setAttribute('data-idioma', i[0]);
          b.textContent = i[1];
          b.onclick = function () { cerrarPanel(); aplicar(i[0]); };
          panel.appendChild(b);
        });
      }
      panel.className = abrir ? 'mas-panel abierto' : 'mas-panel';
      botonMas.setAttribute('aria-expanded', abrir ? 'true' : 'false');
    };
    document.addEventListener('click', function (e) { if (!caja.contains(e.target)) { cerrarPanel(); } });

    render();
    setInterval(render, 600);
  }

  if (document.body) { iniciar(); } else { document.addEventListener('DOMContentLoaded', iniciar); }
})();
